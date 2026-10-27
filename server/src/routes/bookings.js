import { sendBookingConfirmation,sendBookingCancellation } from '../services/email.js';

import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const bookSchema = z.object({
  event_id: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().min(1).max(10),
});

// Sends the confirmation email in the background; a failed email never fails the booking
async function sendConfirmationInBackground(userId, eventId, booking) {
  try {
    const { rows } = await pool.query(
      `SELECT u.name, u.email, e.title, e.venue, e.starts_at
       FROM users u, events e
       WHERE u.id = $1 AND e.id = $2`,
      [userId, eventId]
    );
    if (!rows[0]) return;
    const info = rows[0];
    await sendBookingConfirmation({
      to: info.email,
      name: info.name,
      title: info.title,
      venue: info.venue,
      startsAt: info.starts_at,
      quantity: booking.quantity,
      total: booking.total_amount,
      bookingId: booking.id,
    });
  } catch (err) {
    console.error('Confirmation email failed:', err.message);
  }
}

async function sendCancellationInBackground(userId, eventId, booking) {
  try {
    const { rows } = await pool.query(
      `SELECT u.name, u.email, e.title, e.venue, e.starts_at
       FROM users u, events e
       WHERE u.id = $1 AND e.id = $2`,
      [userId, eventId]
    );
    if (!rows[0]) return;
    const info = rows[0];
    await sendBookingCancellation({
      to: info.email,
      name: info.name,
      title: info.title,
      venue: info.venue,
      startsAt: info.starts_at,
      quantity: booking.quantity,
      total: booking.total_amount,
      bookingId: booking.id,
    });
  } catch (err) {
    console.error('Cancellation email failed:', err.message);
  }
}

// Book tickets (atomic: no overselling)
router.post('/', requireAuth, async (req, res) => {
  const parsed = bookSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues });
  }
  const { event_id, quantity } = parsed.data;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Reduce seats only if enough remain and the event hasn't started
    const seatUpdate = await client.query(
      `UPDATE events
       SET available_seats = available_seats - $1
       WHERE id = $2 AND available_seats >= $1 AND starts_at > now()
       RETURNING price`,
      [quantity, event_id]
    );

    if (seatUpdate.rowCount === 0) {
      await client.query('ROLLBACK');
      // Work out why it failed, to give a useful message
      const { rows } = await pool.query(
        'SELECT starts_at, available_seats FROM events WHERE id = $1',
        [event_id]
      );
      if (!rows[0]) return res.status(404).json({ error: 'Event not found' });
      if (new Date(rows[0].starts_at) <= new Date()) {
        return res.status(400).json({ error: 'This event has already started' });
      }
      return res.status(409).json({
        error: 'Not enough seats available',
        available: rows[0].available_seats,
      });
    }

    const { rows } = await client.query(
      `INSERT INTO bookings (user_id, event_id, quantity, total_amount)
       VALUES ($1, $2, $3::int, $4::numeric * $3::int)
       RETURNING id, event_id, quantity, total_amount, status, created_at`,
      [req.user.id, event_id, quantity, seatUpdate.rows[0].price]
    );

    await client.query('COMMIT');
    res.status(201).json({ booking: rows[0] });
    sendConfirmationInBackground(req.user.id, event_id, rows[0]);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// My bookings
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT b.id, b.quantity, b.total_amount, b.status, b.created_at,
              e.id AS event_id, e.title, e.venue, e.starts_at
       FROM bookings b
       JOIN events e ON e.id = b.event_id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json({ bookings: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Cancel a booking (returns the seats)
// Cancel a booking (returns the seats)
router.post('/:id/cancel', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'Invalid booking id' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Only cancels if it's yours AND still confirmed (blocks double refunds)
    const cancelled = await client.query(
      `UPDATE bookings SET status = 'cancelled'
       WHERE id = $1 AND user_id = $2 AND status = 'confirmed'
       RETURNING event_id, quantity, total_amount`,
      [id, req.user.id]
    );

    if (cancelled.rowCount === 0) {
      await client.query('ROLLBACK');
      const { rows } = await pool.query(
        'SELECT status FROM bookings WHERE id = $1 AND user_id = $2',
        [id, req.user.id]
      );
      if (!rows[0]) return res.status(404).json({ error: 'Booking not found' });
      return res.status(409).json({ error: 'Booking is already cancelled' });
    }

    const { event_id, quantity, total_amount } = cancelled.rows[0];
    await client.query(
      'UPDATE events SET available_seats = available_seats + $1 WHERE id = $2',
      [quantity, event_id]
    );

    await client.query('COMMIT');
    res.json({ message: 'Booking cancelled' });
    sendCancellationInBackground(req.user.id, event_id, { id, quantity, total_amount });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

export default router;