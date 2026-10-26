import express from 'express';
import cors from 'cors';
import { pool } from './db/pool.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', db: false });
  }
});

export default app;