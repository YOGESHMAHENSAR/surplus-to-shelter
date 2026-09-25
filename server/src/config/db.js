import mongoose from 'mongoose';
export const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/surplus_to_shelter');
  console.log('MongoDB connected');
};
