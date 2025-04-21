import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';

// .env dosyasını yükle
dotenv.config();

// MongoDB yapılandırması
export const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dietcim';

// JWT yapılandırması
export const JWT_SECRET = process.env.JWT_SECRET || 'dietcim-super-gizli-anahtar';
export const JWT_EXPIRES_IN = '7d';

// Cloudinary yapılandırması
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Belleğe depolayan Multer yapılandırması
// CloudinaryStorage kullanmak yerine, doğrudan belleğe alıp sonra uploadService içinde yükleyeceğiz
const memoryStorage = multer.memoryStorage();

// Multer upload işleyicisi
export const upload = multer({ 
  storage: memoryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // max 10MB
  }
});

// Uygulama port ayarı
export const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5000;

// Uygulama ortamı
export const NODE_ENV = process.env.NODE_ENV || 'development'; 