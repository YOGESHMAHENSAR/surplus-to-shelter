import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import morgan from 'morgan';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { connectDB } from './src/config/db.js';
import { secret } from './src/middleware/auth.js';
import { errorMiddleware } from './src/middleware/errorMiddleware.js';
import { setIO, announce } from './src/services/notify.js';
import { dispatch } from './src/services/dispatch.js';
import { releaseSlot } from './src/services/matching.js';
import Donation from './src/models/Donation.js';
import auth from './src/routes/auth.js';
import donations from './src/routes/donations.js';
import shelters from './src/routes/shelters.js';
import driver from './src/routes/driver.js';
import impact from './src/routes/impact.js';

import dns from 'node:dns';
import { fileURLToPath } from 'node:url';

// Enforce IPv4 DNS order and set reliable fallbacks
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const app = express();
const server = http.createServer(app);
const origin = process.env.CLIENT_URL || 'http://localhost:5173';
const io = new Server(server, { cors: { origin } });
setIO(io);

io.use((socket, next) => {
  try { socket.data.userId = jwt.verify(socket.handshake.auth.token, secret()).id; next(); }
  catch { next(new Error('unauthorized')); }
});
io.on('connection', (s) => s.join(`user:${s.data.userId}`));

app.use(cors({ origin }));
app.use(express.json({ limit: '6mb' }));
app.use(morgan('dev'));
// Identity documents are only accessible through the authenticated auth route.
app.use('/uploads/documents', (_, res) => res.sendStatus(404));
app.get('/uploads/:filename', (req, res) => {
  const { filename } = req.params;
  if (!/^[\w.-]+$/.test(filename) || filename.startsWith('.')) return res.sendStatus(404);
  res.sendFile(filename, { root: fileURLToPath(new URL('./uploads/', import.meta.url)) });
});

app.get('/api/health', (_, res) => res.json({ ok: true }));
app.use('/api/auth', auth);
app.use('/api/donations', donations);
app.use('/api/shelters', shelters);
app.use('/api/driver', driver);
app.use('/api/impact', impact);

// Error handling middleware (must be last)
app.use(errorMiddleware);

// Housekeeping: expire donations past their expiry time and free the reserved shelter slot
async function expireStale() {
  const stale = await Donation.find({ expiresAt: { $lt: new Date() }, status: { $in: ['submitted', 'matched', 'dispatching', 'accepted', 'at_donor'] } });
  for (const d of stale) {
    d.status = 'expired'; d.timeline.push({ status: 'expired', note: 'Expiry time passed before pickup' });
    await d.save();
    if (d.match?.shelter) await releaseSlot(d.match.shelter, d.weightKg);
    await announce(d);
  }
}

const PORT = process.env.PORT || 5000;
connectDB().then(async () => {
  server.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
  // resume dispatches that were in flight when the server stopped
  const pending = await Donation.find({ status: 'dispatching' });
  pending.forEach((d) => dispatch(d._id, Math.max(1, d.dispatchAttempts)));
  setInterval(() => expireStale().catch(console.error), 5 * 60 * 1000);
}).catch((e) => { console.error('DB connection failed:', e.message); process.exit(1); });
