import crypto from 'node:crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import rateLimit from 'express-rate-limit';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { sendPasswordReset } from '../services/email.js';

const router = Router();
const googleClient = new OAuth2Client();

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(100),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

const forgotSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

const resetSchema = z.object({
  token: z.string().min(20).max(200),
  password: z.string().min(8).max(100),
});

const googleSchema = z.object({
  credential: z.string().min(20).max(4000),
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in a few minutes.' },
});

const forgotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many reset requests. Please try again later.' },
});

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function clientUrl() {
  return (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim();
}

router.post('/register', authLimiter, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues });
  }
  const { name, email, password } = parsed.data;

  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, role`,
      [name, email, hash]
    );
    const user = rows[0];
    res.status(201).json({ user, token: signToken(user) });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input' });
  }
  const { email, password } = parsed.data;

  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, role, password_hash FROM users WHERE email = $1',
      [email]
    );
    const user = rows[0];
    // Google-only accounts have no password, so they can't log in this way
    const ok = user && user.password_hash && (await bcrypt.compare(password, user.password_hash));

    if (!ok) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const { password_hash, ...safeUser } = user;
    res.json({ user: safeUser, token: signToken(safeUser) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, role FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Forgot password: always gives the same answer, so nobody can find out which emails have accounts
router.post('/forgot-password', forgotLimiter, async (req, res) => {
  const parsed = forgotSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT id, name, email FROM users WHERE email = $1',
      [parsed.data.email]
    );
    const user = rows[0];

    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id]);
      await pool.query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, now() + interval '30 minutes')`,
        [user.id, sha256(token)]
      );

      const link = `${clientUrl()}/reset-password?token=${token}`;
      // Not awaited, so the response time doesn't reveal whether the account exists
      sendPasswordReset({ to: user.email, name: user.name, link }).catch((err) =>
        console.error('Reset email failed:', err.message)
      );
    }

    res.json({ message: 'If an account exists for that email, a reset link is on its way.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset password: the token works once, and only before it expires
router.post('/reset-password', authLimiter, async (req, res) => {
  const parsed = resetSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues });
  }
  const { token, password } = parsed.data;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // One atomic UPDATE marks the token used, so it can't be used twice
    const used = await client.query(
      `UPDATE password_reset_tokens SET used_at = now()
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
       RETURNING user_id`,
      [sha256(token)]
    );

    if (used.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'This reset link is invalid or has expired.' });
    }

    const userId = used.rows[0].user_id;
    const hash = await bcrypt.hash(password, 10);
    await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, userId]);
    await client.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);

    await client.query('COMMIT');
    res.json({ message: 'Password updated. You can log in now.' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// Google sign-in: verify Google's signed token, then find, link or create the user
router.post('/google', authLimiter, async (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(503).json({ error: 'Google sign-in is not set up yet' });
  }
  const parsed = googleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: parsed.data.credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (err) {
    console.error('Google token check failed:', err.message);
    return res.status(401).json({ error: 'Google sign-in failed. Please try again.' });
  }

  if (!payload?.email || !payload.email_verified) {
    return res.status(401).json({ error: 'Your Google email address is not verified.' });
  }

  const email = payload.email.toLowerCase();
  const googleId = payload.sub;
  const name = (payload.name || email.split('@')[0]).slice(0, 100);

  try {
    // 1. Already signed in with Google before
    let { rows } = await pool.query(
      'SELECT id, name, email, role FROM users WHERE google_id = $1',
      [googleId]
    );
    let user = rows[0];

    // 2. Same email already has an account: link it and drop the old password
    if (!user) {
      ({ rows } = await pool.query(
        `UPDATE users SET google_id = $1, password_hash = NULL
         WHERE email = $2 AND google_id IS NULL
         RETURNING id, name, email, role`,
        [googleId, email]
      ));
      user = rows[0];
    }

    // 3. Brand new user
    if (!user) {
      ({ rows } = await pool.query(
        `INSERT INTO users (name, email, google_id)
         VALUES ($1, $2, $3)
         RETURNING id, name, email, role`,
        [name, email, googleId]
      ));
      user = rows[0];
    }

    res.json({ user, token: signToken(user) });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'This email is already linked to another Google account.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;