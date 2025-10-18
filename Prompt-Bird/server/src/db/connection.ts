import mongoose from 'mongoose';
import { env } from '../config/env.js';

mongoose.set('strictQuery', true);

export const connectMongo = async (uri?: string) => {
  if (mongoose.connection.readyState !== 0) {
    return;
  }

  await mongoose.connect(uri ?? env.mongoUri);
  mongoose.connection.on('connected', () => {
    console.log('[mongo] connected');
  });
  mongoose.connection.on('error', (err: unknown) => {
    console.error('[mongo] connection error', err);
  });
};

export const disconnectMongo = async () => {
  await mongoose.disconnect();
};
