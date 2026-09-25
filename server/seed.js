import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './src/config/db.js';
import User from './src/models/User.js';
import Shelter from './src/models/Shelter.js';
import Donation from './src/models/Donation.js';

await connectDB();
await Promise.all([User.deleteMany(), Shelter.deleteMany(), Donation.deleteMany()]);
const P = 'password123';
const mk = (o) => User.create({ password: P, ...o });

const admin = await mk({ name: 'Ops Admin', email: 'admin@demo.com', role: 'admin' });
const d1 = await mk({ name: 'Rani Kitchen', orgName: 'Rani Kitchen Restaurant', email: 'donor@demo.com', role: 'donor', phone: '+911111111111', address: 'MI Road, Jaipur', location: { lat: 26.9124, lng: 75.7873 } });
const d2 = await mk({ name: 'Green Basket', orgName: 'Green Basket Grocers', email: 'donor2@demo.com', role: 'donor', address: 'C-Scheme, Jaipur', location: { lat: 26.9055, lng: 75.8 } });
const drivers = await Promise.all([
  mk({ name: 'Arjun Driver', email: 'driver@demo.com', role: 'driver', phone: '+912222222222', vehicleCapacityKg: 80, isAvailable: true, location: { lat: 26.915, lng: 75.79 } }),
  mk({ name: 'Meera Driver', email: 'driver2@demo.com', role: 'driver', vehicleCapacityKg: 200, isAvailable: true, location: { lat: 26.93, lng: 75.81 } }),
]);
const specs = [
  ['Asha Shelter', 'shelter@demo.com', 'Asha Shelter Home', { lat: 26.95, lng: 75.78 }, 200, ['cooked', 'produce', 'bakery', 'packaged'], ['cooked']],
  ['Seva Kitchen', 'shelter2@demo.com', 'Seva Community Kitchen', { lat: 26.88, lng: 75.82 }, 120, ['cooked', 'produce', 'dairy', 'bakery', 'beverages', 'packaged'], ['produce']],
  ['Hope House', 'shelter3@demo.com', 'Hope House', { lat: 26.85, lng: 75.75 }, 60, ['packaged', 'bakery', 'beverages'], []],
];
const shelters = [];
for (const [name, email, orgName, location, capacityKg, acceptedTypes, needs] of specs) {
  const u = await mk({ name, email, role: 'shelter', orgName, location, address: 'Jaipur' });
  shelters.push(await Shelter.create({ owner: u._id, name: orgName, location, capacityKg, acceptedTypes, needs, address: 'Jaipur' }));
}
// historical delivered donations for the impact dashboard
const now = Date.now();
for (let i = 0; i < 14; i++) {
  const when = new Date(now - i * 6 * 864e5);
  const donor = i % 3 ? d1 : d2;
  await Donation.create({
    donor: donor._id, itemName: ['Dal & rice trays', 'Fresh vegetables', 'Bread loaves', 'Packaged snacks'][i % 4],
    foodType: ['cooked', 'produce', 'bakery', 'packaged'][i % 4], weightKg: 8 + ((i * 7) % 25), pickup: { ...donor.location, address: donor.address },
    expiresAt: new Date(when.getTime() + 6 * 36e5), status: 'delivered', deliveredAt: when, driver: drivers[i % 2]._id,
    match: { shelter: shelters[i % 3]._id, distanceKm: 5, score: 0.7, riskScore: 0.4 },
    proof: { type: 'signature', receivedBy: 'Shelter staff', at: when },
    timeline: [{ status: 'submitted' }, { status: 'matched' }, { status: 'accepted' }, { status: 'picked_up' }, { status: 'delivered' }],
  });
}
await Donation.create({ donor: d2._id, itemName: 'Expired yoghurt cups', foodType: 'dairy', weightKg: 12, pickup: { ...d2.location, address: d2.address }, expiresAt: new Date(now - 864e5), status: 'expired', timeline: [{ status: 'expired' }] });
console.log('Seeded. Log in with any *@demo.com email, password:', P);
await mongoose.disconnect();
