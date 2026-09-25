import mongoose from 'mongoose';
const { ObjectId } = mongoose.Schema.Types;

export const STATUSES = ['submitted', 'matched', 'rejected', 'dispatching', 'unassigned', 'accepted', 'at_donor', 'picked_up', 'at_shelter', 'delivered', 'expired'];

const s = new mongoose.Schema({
  donor: { type: ObjectId, ref: 'User', required: true },
  itemName: { type: String, required: true },
  foodType: { type: String, required: true },
  quantity: String,
  weightKg: { type: Number, required: true },
  photoUrl: String,
  classificationMethod: { type: String, enum: ['ai', 'manual'], default: 'manual' },
  aiConfidence: Number,
  pickup: { lat: Number, lng: Number, address: String },
  expiresAt: { type: Date, required: true },
  status: { type: String, enum: STATUSES, default: 'submitted', index: true },
  rejectReason: String,
  match: {
    shelter: { type: ObjectId, ref: 'Shelter' },
    distanceKm: Number, score: Number, riskScore: Number, hoursLeft: Number,
  },
  driver: { type: ObjectId, ref: 'User' },
  notifiedDrivers: [{ type: ObjectId, ref: 'User' }],
  dispatchAttempts: { type: Number, default: 0 },
  proof: { type: { type: String, enum: ['signature', 'photo'] }, data: String, receivedBy: String, at: Date },
  deliveredAt: Date,
  timeline: [{ status: String, note: String, at: { type: Date, default: Date.now } }],
}, { timestamps: true });

export default mongoose.model('Donation', s);
