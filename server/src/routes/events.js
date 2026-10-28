import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

const COLUMNS =
  'id, title, description, venue, starts_at, price, total_seats, available_seats, image_url';

const imageUrlSchema = z
  .union([
    z.literal(''),
    z.string().trim().max(500).regex(/^https:\/\//i, 'Image URL must start with https://'),
  ])
  .optional();

const listQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  upcoming: z.enum(['true', 'false']).optional(),
});

const createSchema = z.object({
  title: z.string().trim().min(3).max(150),
  description: z.string().trim().max(2000).optional(),
  venue: z.string().trim().min(2).max(150),
  starts_at: z.coerce.date(),
  price: z.coerce.number().min(0).max(100000).default(0),
  total_seats: z.coerce.number().int().min(1).max(100000),
  image_url: imageUrlSchema,
});

const updateSchema = createSchema.partial();

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Public: list events with search + pagination
router.get('/', async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid query', details: parsed.error.issues });
  }
  const { search, page, limit, upcoming } = parsed.data;

  const conditions = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(title ILIKE $${params.length} OR venue ILIKE $${params.length})`);
  }
  if (upcoming === 'true') {
    conditions.push('starts_at > now()');
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM events ${where}`,
      params
    );
    const total = countResult.rows[0].total;

    const dataResult = await pool.query(
      `SELECT ${COLUMNS}
       FROM events ${where}
       ORDER BY starts_at ASC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, (page - 1) * limit]
    );

    res.json({
      data: dataResult.rows,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Public: one event
router.get('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid event id' });

  try {
    const { rows } = await pool.query(
      `SELECT ${COLUMNS} FROM events WHERE id = $1`,
      [id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Event not found' });
    res.json({ event: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: create
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues });
  }
  const { title, description, venue, starts_at, price, total_seats, image_url } = parsed.data;

  try {
    const { rows } = await pool.query(
      `INSERT INTO events
         (title, description, venue, starts_at, price, total_seats, available_seats, created_by, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8)
       RETURNING *`,
      [title, description ?? null, venue, starts_at, price, total_seats, req.user.id, image_url || null]
    );
    res.status(201).json({ event: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: update
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid event id' });

  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.issues });
  }
  const d = parsed.data;

  try {
    const { rows } = await pool.query(
      `UPDATE events SET
         title = COALESCE($1, title),
         description = COALESCE($2, description),
         venue = COALESCE($3, venue),
         starts_at = COALESCE($4, starts_at),
         price = COALESCE($5, price),
         image_url = CASE WHEN $8::boolean THEN $9::text ELSE image_url END,
         available_seats = available_seats + (COALESCE($6, total_seats) - total_seats),
         total_seats = COALESCE($6, total_seats)
       WHERE id = $7
       RETURNING *`,
      [
        d.title ?? null,
        d.description ?? null,
        d.venue ?? null,
        d.starts_at ?? null,
        d.price ?? null,
        d.total_seats ?? null,
        id,
        d.image_url !== undefined,
        d.image_url || null,
      ]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Event not found' });
    res.json({ event: rows[0] });
  } catch (err) {
    if (err.code === '23514') {
      return res.status(400).json({ error: 'Total seats cannot be lower than seats already booked' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: delete
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid event id' });

  try {
    const result = await pool.query('DELETE FROM events WHERE id = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Event not found' });
    res.status(204).send();
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({ error: 'Event has bookings and cannot be deleted' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;