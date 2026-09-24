import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const s = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['donor', 'shelter', 'driver', 'admin'], required: true },
  phone: String,
  address: String,
  orgName: String,
  location: { lat: Number, lng: Number },
  // driver-only
  vehicleCapacityKg: { type: Number, default: 50 },
  isAvailable: { type: Boolean, default: false },
}, { timestamps: true });

s.pre('save', async function () {
  if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 10);
});
s.methods.matches = function (p) { return bcrypt.compare(p, this.password); };
export default mongoose.model('User', s);
