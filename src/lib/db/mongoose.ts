import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/courier-ai';

let cached = (global as any).mongoose || { conn: null, promise: null };

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    };
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((m) => m).catch((err) => {
      console.warn('MongoDB connection fallback (running in-memory mode):', err.message);
      return null;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
