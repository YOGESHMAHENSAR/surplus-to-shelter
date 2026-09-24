import mongoose from 'mongoose';

export const connectDB = async () => {
  const uri = process.env.MONGO_URL || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/surplus_to_shelter';
  const hasDbName = /^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)/i.test(uri);
  const options = hasDbName ? {} : { dbName: 'surplus_to_shelter' };

  await mongoose.connect(uri, options);
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
};
