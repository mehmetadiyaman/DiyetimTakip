import mongoose from 'mongoose';
import { MONGODB_URI } from './config';

// MongoDB bağlantı işlevi
export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(MONGODB_URI);
    console.log(`MongoDB bağlantısı başarılı: ${conn.connection.host}`);
  } catch (error: any) {
    console.error(`MongoDB bağlantı hatası: ${error.message}`);
    process.exit(1);
  }
};

// MongoDB bağlantısını kapat
export const closeDB = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB bağlantısı kapatıldı');
  } catch (error: any) {
    console.error(`MongoDB bağlantı kapatma hatası: ${error.message}`);
  }
}; 