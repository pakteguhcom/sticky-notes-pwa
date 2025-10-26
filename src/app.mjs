import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { createClient } from '@libsql/client';
import { nanoid } from 'nanoid';

// Env requirements
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const JWT_SECRET = process.env.JWT_SECRET || '';
const LIBSQL_URL = process.env.LIBSQL_URL || '';
const LIBSQL_AUTH = process.env.LIBSQL_AUTH || '';

if (!ADMIN_PASSWORD || !JWT_SECRET || !LIBSQL_URL || !LIBSQL_AUTH) {
  console.warn('[WARN] Missing env: ADMIN_PASSWORD, JWT_SECRET, LIBSQL_URL, or LIBSQL_AUTH');
}

// DB client (Turso/libsql)
export const db = createClient({ url: LIBSQL_URL, authToken: LIBSQL_AUTH });

// Initialize schema
await db.execute(`
  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#FDE68A',
    created_at TEXT NOT NULL
  );
`);

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "script-src": ["'self'", "https://cdn.tailwindcss.com"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "img-src": ["'self'", "data:"],
      "connect-src": ["'self'"],
      "manifest-src": ["'self'"],
      "worker-src": ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));
app.use(cors({ origin: true, credentials: false }));
app.use(express.json({ limit: '256kb' }));

const createNoteLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak request. Coba lagi nanti.' }
});

function adminAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== 'admin') throw new Error('invalid role');
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token tidak valid' });
  }
}

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.get('/api/notes', async (req, res) => {
  const result = await db.execute(`SELECT id, content, color, created_at FROM notes ORDER BY datetime(created_at) DESC`);
  res.json(result.rows);
});

app.post('/api/notes', createNoteLimiter, async (req, res) => {
  const { content, color } = req.body || {};
  const trimmed = (content || '').toString().trim();
  if (!trimmed) return res.status(400).json({ error: 'Konten catatan wajib diisi.' });
  if (trimmed.length > 1000) return res.status(400).json({ error: 'Maksimum 1000 karakter.' });

  let col = (color || '#FDE68A').toString().trim();
  const isHexColor = /^#([0-9a-fA-F]{3}){1,2}$/.test(col);
  if (!isHexColor) col = '#FDE68A';

  const id = nanoid(12);
  const created_at = new Date().toISOString();
  await db.execute({
    sql: `INSERT INTO notes (id, content, color, created_at) VALUES (?, ?, ?, ?)`,
    args: [id, trimmed, col, created_at]
  });
  res.status(201).json({ id, content: trimmed, color: col, created_at });
});

app.put('/api/notes/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  const { content, color } = req.body || {};
  const fields = [];
  const values = [];

  if (typeof content === 'string') {
    const trimmed = content.trim();
    if (!trimmed) return res.status(400).json({ error: 'Konten tidak boleh kosong.' });
    if (trimmed.length > 1000) return res.status(400).json({ error: 'Maksimum 1000 karakter.' });
    fields.push('content = ?');
    values.push(trimmed);
  }

  if (typeof color === 'string') {
    const col = color.trim();
    if (!/^#([0-9a-fA-F]{3}){1,2}$/.test(col)) return res.status(400).json({ error: 'Format warna tidak valid.' });
    fields.push('color = ?');
    values.push(col);
  }

  if (!fields.length) return res.status(400).json({ error: 'Tidak ada perubahan yang dikirim.' });

  values.push(id);
  const result = await db.execute({ sql: `UPDATE notes SET ${fields.join(', ')} WHERE id = ?`, args: values });
  if (!result.rowsAffected) return res.status(404).json({ error: 'Catatan tidak ditemukan.' });

  const got = await db.execute({ sql: `SELECT id, content, color, created_at FROM notes WHERE id = ?`, args: [id] });
  res.json(got.rows[0]);
});

app.delete('/api/notes/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  const result = await db.execute({ sql: `DELETE FROM notes WHERE id = ?`, args: [id] });
  if (!result.rowsAffected) return res.status(404).json({ error: 'Catatan tidak ditemukan.' });
  res.json({ ok: true });
});

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};
  if (!password) return res.status(400).json({ error: 'Password wajib diisi.' });
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Password salah.' });

  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

export default app;
