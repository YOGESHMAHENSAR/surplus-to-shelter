import Donation from '../models/Donation.js';
import User from '../models/User.js';
import { haversineKm } from '../utils/geo.js';
import { emitTo, sendSMS, announce } from './notify.js';
import { releaseSlot } from './matching.js';

const MAX = () => Number(process.env.MAX_DISPATCH_ATTEMPTS) || 3;
const TIMEOUT = () => Number(process.env.ACCEPT_TIMEOUT_MS) || 60000;

// Notify available drivers; if nobody accepts before the timeout, re-dispatch with a wider net.
export async function dispatch(donationId, attempt = 1) {
  const d = await Donation.findById(donationId).populate('match.shelter');
  if (!d || !['matched', 'dispatching'].includes(d.status)) return;

  const radius = 10 * attempt + 5;
  const drivers = (await User.find({ role: 'driver', isAvailable: true, vehicleCapacityKg: { $gte: d.weightKg }, 'location.lat': { $exists: true } }))
    .map((u) => ({ u, dist: haversineKm(d.pickup, u.location) }))
    .filter((x) => x.dist <= radius)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 3 * attempt);

  d.dispatchAttempts = attempt;
  d.notifiedDrivers = drivers.map((x) => x.u._id);
  d.status = 'dispatching';
  d.timeline.push({ status: 'dispatching', note: `Attempt ${attempt}: notified ${drivers.length} driver(s) within ${radius} km` });
  await d.save();
  await announce(d);

  for (const { u, dist } of drivers) {
    const msg = `New pickup: ${d.itemName} (${d.weightKg} kg), ${dist.toFixed(1)} km away. Open the app to accept.`;
    emitTo(u._id, 'job:new', { id: d._id, itemName: d.itemName, weightKg: d.weightKg, distanceKm: +dist.toFixed(1) });
    sendSMS(u.phone, msg);
  }

  setTimeout(async () => {
    const f = await Donation.findById(donationId);
    if (!f || f.status !== 'dispatching' || f.dispatchAttempts !== attempt) return;
    if (attempt < MAX()) return dispatch(donationId, attempt + 1);           // re-dispatch
    f.status = 'unassigned';
    f.timeline.push({ status: 'unassigned', note: 'No driver accepted after all attempts' });
    await f.save();
    if (f.match?.shelter) await releaseSlot(f.match.shelter, f.weightKg);
    await announce(f);
  }, TIMEOUT());
}
