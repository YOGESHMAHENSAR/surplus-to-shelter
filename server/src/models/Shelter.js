import mongoose from 'mongoose';
export const FOOD_TYPES = ['cooked', 'produce', 'bakery', 'dairy', 'meat', 'packaged', 'beverages', 'other'];

const s = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  address: String,
  phone: String,
  location: { lat: Number, lng: Number },
  capacityKg: { type: Number, default: 100 },   // max food the shelter can hold
  reservedKg: { type: Number, default: 0 },     // current stock + reserved slots
  acceptedTypes: { type: [String], enum: FOOD_TYPES, default: FOOD_TYPES }, // preference filter
  needs: { type: [String], enum: FOOD_TYPES, default: [] },                 // priority needs
  active: { type: Boolean, default: true },
}, { timestamps: true });
export default mongoose.model('Shelter', s);
