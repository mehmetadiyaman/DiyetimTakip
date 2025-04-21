import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./index";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { ZodError } from "zod";
import { fromError } from "zod-validation-error";
import mongoose from "mongoose";
import { JWT_SECRET, JWT_EXPIRES_IN } from "./config";
import { upload } from "./config";
import { UploadService } from "./services/uploadService";
import { 
  userSchema, loginSchema, clientSchema, measurementSchema, 
  dietPlanSchema, appointmentSchema, activitySchema, 
} from "../shared/schema";
import { Activity } from "./models/index";
import { TelegramService } from "./services/telegramService";

// Authentication middleware
const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: "Yetkilendirme hatası: Token bulunamadı" });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string, email: string };
    res.locals.userId = decoded.id;
    res.locals.email = decoded.email;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Yetkilendirme hatası: Geçersiz token" });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Error handling middleware for zod validation errors
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof ZodError) {
      const formattedError = fromError(err);
      return res.status(400).json({ message: formattedError.message });
    }
    next(err);
  });

  // AUTH ROUTES
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const userData = userSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Bu e-posta adresi zaten kullanılıyor" });
      }
      
      const user = await storage.createUser(userData);
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user.toObject();
      
      // Generate token
      const token = jwt.sign(
        { id: user._id, email: user.email }, 
        JWT_SECRET, 
        { expiresIn: JWT_EXPIRES_IN }
      );
      
      res.status(201).json({ user: userWithoutPassword, token });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromError(error).message });
      }
      console.error(error);
      res.status(500).json({ message: "Kayıt sırasında bir hata oluştu" });
    }
  });

  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const credentials = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(credentials.email);
      if (!user) {
        return res.status(401).json({ message: "Geçersiz e-posta veya şifre" });
      }
      
      const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Geçersiz e-posta veya şifre" });
      }
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = user.toObject();
      
      // Generate token
      const token = jwt.sign(
        { id: user._id, email: user.email }, 
        JWT_SECRET, 
        { expiresIn: JWT_EXPIRES_IN }
      );
      
      res.json({ user: userWithoutPassword, token });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromError(error).message });
      }
      console.error(error);
      res.status(500).json({ message: "Giriş sırasında bir hata oluştu" });
    }
  });

  app.get('/api/auth/me', authenticate, async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }
      
      const { password, ...userWithoutPassword } = user.toObject();
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Kullanıcı bilgileri alınırken bir hata oluştu" });
    }
  });

  // Kullanıcı profil güncelleme endpoint'i
  app.put('/api/auth/profile', authenticate, async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }
      
      // Güncellenecek alanları kontrol et
      const updateData: any = {};
      if (req.body.name) updateData.name = req.body.name;
      if (req.body.email) updateData.email = req.body.email;
      if (req.body.profilePicture !== undefined) updateData.profilePicture = req.body.profilePicture;
      if (req.body.bio !== undefined) updateData.bio = req.body.bio;
      if (req.body.phone !== undefined) updateData.phone = req.body.phone;
      
      // Güncellenecek veri yoksa hata döndür
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "Güncellenecek veri bulunamadı" });
      }
      
      // Son güncelleme zamanını ekle
      updateData.updatedAt = new Date();
      
      console.log('Kullanıcı profili güncelleniyor:', updateData);
      
      // Kullanıcıyı güncelle
      const updatedUser = await storage.updateUser(userId, updateData);
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Kullanıcı güncellenirken bir hata oluştu" });
      }
      
      // Güncellenmiş kullanıcı bilgilerini döndür (şifre hariç)
      const { password, ...userWithoutPassword } = updatedUser.toObject();
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Profil güncelleme hatası:', error);
      res.status(500).json({ message: "Profil güncellenirken bir hata oluştu" });
    }
  });
  
  // Şifre değiştirme endpoint'i
  app.put('/api/auth/password', authenticate, async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Mevcut şifre ve yeni şifre gereklidir" });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }
      
      // Mevcut şifreyi kontrol et
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Mevcut şifre hatalı" });
      }
      
      // Yeni şifreyi hashle
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Şifreyi güncelle
      const updatedUser = await storage.updateUser(userId, { 
        password: hashedPassword,
        updatedAt: new Date()
      });
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Şifre değiştirilirken bir hata oluştu" });
      }
      
      res.json({ message: "Şifre başarıyla değiştirildi" });
    } catch (error) {
      console.error('Şifre değiştirme hatası:', error);
      res.status(500).json({ message: "Şifre değiştirilirken bir hata oluştu" });
    }
  });

  // CLIENT ROUTES
  app.get('/api/clients', authenticate, async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;
      const clients = await storage.getClientsForUser(userId);
      res.json(clients);
    } catch (error) {
      res.status(500).json({ message: "Danışanlar alınırken bir hata oluştu" });
    }
  });

  app.get('/api/clients/:id', authenticate, async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const client = await storage.getClient(id);
      
      if (!client) {
        return res.status(404).json({ message: "Danışan bulunamadı" });
      }
      
      // Check if client belongs to the authenticated user
      if (client.userId.toString() !== res.locals.userId) {
        return res.status(403).json({ message: "Bu danışana erişim izniniz yok" });
      }
      
      res.json(client);
    } catch (error) {
      res.status(500).json({ message: "Danışan alınırken bir hata oluştu" });
    }
  });

  app.post('/api/clients', authenticate, async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;
      
      // Önce istemciden gelen verileri validate et
      const validatedData = clientSchema.parse(req.body);
      
      // MongoDB ObjectId oluştur
      const clientData = {
        ...validatedData,
        userId: new mongoose.Types.ObjectId(userId) as unknown as mongoose.Schema.Types.ObjectId,
        status: validatedData.status || 'active',
        createdAt: new Date()
      };
      
      const client = await storage.createClient(clientData);
      res.status(201).json(client);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromError(error).message });
      }
      console.error('Danışan ekleme hatası:', error);
      res.status(500).json({ message: "Danışan eklenirken bir hata oluştu" });
    }
  });

  app.put('/api/clients/:id', authenticate, async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const client = await storage.getClient(id);
      
      if (!client) {
        return res.status(404).json({ message: "Danışan bulunamadı" });
      }
      
      // Check if client belongs to the authenticated user
      if (client.userId.toString() !== res.locals.userId) {
        return res.status(403).json({ message: "Bu danışanı güncelleme izniniz yok" });
      }
      
      const updatedClient = await storage.updateClient(id, req.body);
      res.json(updatedClient);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromError(error).message });
      }
      res.status(500).json({ message: "Danışan güncellenirken bir hata oluştu" });
    }
  });

  app.delete('/api/clients/:id', authenticate, async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const client = await storage.getClient(id);
      
      if (!client) {
        return res.status(404).json({ message: "Danışan bulunamadı" });
      }
      
      // Check if client belongs to the authenticated user
      if (client.userId.toString() !== res.locals.userId) {
        return res.status(403).json({ message: "Bu danışanı silme izniniz yok" });
      }
      
      await storage.deleteClient(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Danışan silinirken bir hata oluştu" });
    }
  });

  // MEASUREMENT ROUTES
  app.get('/api/clients/:clientId/measurements', authenticate, async (req: Request, res: Response) => {
    try {
      const clientId = req.params.clientId;
      const client = await storage.getClient(clientId);
      
      if (!client) {
        return res.status(404).json({ message: "Danışan bulunamadı" });
      }
      
      // Check if client belongs to the authenticated user
      if (client.userId.toString() !== res.locals.userId) {
        return res.status(403).json({ message: "Bu danışanın ölçümlerine erişim izniniz yok" });
      }
      
      const measurements = await storage.getMeasurementsForClient(clientId);
      res.json(measurements);
    } catch (error) {
      res.status(500).json({ message: "Ölçümler alınırken bir hata oluştu" });
    }
  });

  app.post('/api/clients/:clientId/measurements', authenticate, async (req: Request, res: Response) => {
    try {
      const clientId = req.params.clientId;
      const client = await storage.getClient(clientId);
      
      if (!client) {
        return res.status(404).json({ message: "Danışan bulunamadı" });
      }
      
      // Check if client belongs to the authenticated user
      if (client.userId.toString() !== res.locals.userId) {
        return res.status(403).json({ message: "Bu danışan için ölçüm ekleme izniniz yok" });
      }
      
      // Validate measurement data
      const validatedData = measurementSchema.parse(req.body);
      
      const measurementData = {
        ...validatedData,
        clientId: new mongoose.Types.ObjectId(clientId) as unknown as mongoose.Schema.Types.ObjectId,
        date: validatedData.date || new Date()
      };
      
      const measurement = await storage.createMeasurement(measurementData);
      res.status(201).json(measurement);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromError(error).message });
      }
      console.error('Ölçüm ekleme hatası:', error);
      res.status(500).json({ message: "Ölçüm eklenirken bir hata oluştu" });
    }
  });

  // DIET PLAN ROUTES
  app.get('/api/diet-plans', authenticate, async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;
      const dietPlans = await storage.getDietPlansForUser(userId);
      res.json(dietPlans);
    } catch (error) {
      res.status(500).json({ message: "Diyet planları alınırken bir hata oluştu" });
    }
  });

  // Yeni direkt diyet planı oluşturma endpoint'i
  app.post('/api/diet-plans', authenticate, async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;
      
      // ClientId field should be sent in the request
      if (!req.body.clientId) {
        return res.status(400).json({ message: "Danışan ID'si gereklidir" });
      }
      
      const clientId = req.body.clientId;
      const client = await storage.getClient(clientId);
      
      if (!client) {
        return res.status(404).json({ message: "Danışan bulunamadı" });
      }
      
      // Check if client belongs to the authenticated user
      if (client.userId.toString() !== userId) {
        return res.status(403).json({ message: "Bu danışan için diyet planı oluşturma izniniz yok" });
      }
      
      // Validate diet plan data
      const validatedData = dietPlanSchema.parse(req.body);
      
      const dietPlanData = {
        ...validatedData,
        createdBy: new mongoose.Types.ObjectId(userId) as unknown as mongoose.Schema.Types.ObjectId,
        clientId: new mongoose.Types.ObjectId(clientId) as unknown as mongoose.Schema.Types.ObjectId,
        status: validatedData.status || 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const dietPlan = await storage.createDietPlan(dietPlanData);
      res.status(201).json(dietPlan);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromError(error).message });
      }
      console.error('Diyet planı oluşturma hatası:', error);
      res.status(500).json({ message: "Diyet planı oluşturulurken bir hata oluştu" });
    }
  });

  app.get('/api/clients/:clientId/diet-plans', authenticate, async (req: Request, res: Response) => {
    try {
      const clientId = req.params.clientId;
      const client = await storage.getClient(clientId);
      
      if (!client) {
        return res.status(404).json({ message: "Danışan bulunamadı" });
      }
      
      // Check if client belongs to the authenticated user
      if (client.userId.toString() !== res.locals.userId) {
        return res.status(403).json({ message: "Bu danışanın diyet planlarına erişim izniniz yok" });
      }
      
      const dietPlans = await storage.getDietPlansForClient(clientId);
      res.json(dietPlans);
    } catch (error) {
      res.status(500).json({ message: "Diyet planları alınırken bir hata oluştu" });
    }
  });

  app.post('/api/clients/:clientId/diet-plans', authenticate, async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;
      const clientId = req.params.clientId;
      const client = await storage.getClient(clientId);
      
      if (!client) {
        return res.status(404).json({ message: "Danışan bulunamadı" });
      }
      
      // Check if client belongs to the authenticated user
      if (client.userId.toString() !== userId) {
        return res.status(403).json({ message: "Bu danışan için diyet planı oluşturma izniniz yok" });
      }
      
      // Validate diet plan data
      const validatedData = dietPlanSchema.parse(req.body);
      
      const dietPlanData = {
        ...validatedData,
        createdBy: new mongoose.Types.ObjectId(userId) as unknown as mongoose.Schema.Types.ObjectId,
        clientId: new mongoose.Types.ObjectId(clientId) as unknown as mongoose.Schema.Types.ObjectId,
        status: validatedData.status || 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const dietPlan = await storage.createDietPlan(dietPlanData);
      res.status(201).json(dietPlan);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromError(error).message });
      }
      console.error('Diyet planı oluşturma hatası:', error);
      res.status(500).json({ message: "Diyet planı oluşturulurken bir hata oluştu" });
    }
  });

  app.put('/api/diet-plans/:id', authenticate, async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const dietPlan = await storage.getDietPlan(id);
      
      if (!dietPlan) {
        return res.status(404).json({ message: "Diyet planı bulunamadı" });
      }
      
      // Check if diet plan belongs to the authenticated user
      if (dietPlan.createdBy.toString() !== res.locals.userId) {
        return res.status(403).json({ message: "Bu diyet planını güncelleme izniniz yok" });
      }
      
      const updatedDietPlan = await storage.updateDietPlan(id, req.body);
      res.json(updatedDietPlan);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromError(error).message });
      }
      res.status(500).json({ message: "Diyet planı güncellenirken bir hata oluştu" });
    }
  });

  // Diyet planı silme endpoint'i
  app.delete('/api/diet-plans/:id', authenticate, async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const dietPlan = await storage.getDietPlan(id);
      
      if (!dietPlan) {
        return res.status(404).json({ message: "Diyet planı bulunamadı" });
      }
      
      // Check if diet plan belongs to the authenticated user
      if (dietPlan.createdBy.toString() !== res.locals.userId) {
        return res.status(403).json({ message: "Bu diyet planını silme izniniz yok" });
      }
      
      const success = await storage.deleteDietPlan(id);
      
      if (success) {
        res.status(200).json({ message: "Diyet planı başarıyla silindi" });
      } else {
        res.status(500).json({ message: "Diyet planı silinemedi" });
      }
    } catch (error) {
      console.error('Diyet planı silme hatası:', error);
      res.status(500).json({ message: "Diyet planı silinirken bir hata oluştu" });
    }
  });

  // APPOINTMENT ROUTES
  app.get('/api/appointments', authenticate, async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;
      const appointments = await storage.getAppointmentsForUser(userId);
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ message: "Randevular alınırken bir hata oluştu" });
    }
  });

  app.get('/api/clients/:clientId/appointments', authenticate, async (req: Request, res: Response) => {
    try {
      const clientId = req.params.clientId;
      const client = await storage.getClient(clientId);
      
      if (!client) {
        return res.status(404).json({ message: "Danışan bulunamadı" });
      }
      
      // Check if client belongs to the authenticated user
      if (client.userId.toString() !== res.locals.userId) {
        return res.status(403).json({ message: "Bu danışanın randevularına erişim izniniz yok" });
      }
      
      const appointments = await storage.getAppointmentsForClient(clientId);
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ message: "Randevular alınırken bir hata oluştu" });
    }
  });

  app.post('/api/appointments', authenticate, async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;
      
      // Validate appointment data
      const validatedData = appointmentSchema.parse(req.body);
      
      // ClientId field should be sent in the request
      if (!req.body.clientId) {
        return res.status(400).json({ message: "Danışan ID'si gereklidir" });
      }
      
      const appointmentData = {
        ...validatedData,
        userId: new mongoose.Types.ObjectId(userId) as unknown as mongoose.Schema.Types.ObjectId,
        clientId: new mongoose.Types.ObjectId(req.body.clientId) as unknown as mongoose.Schema.Types.ObjectId,
        status: validatedData.status || 'scheduled',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Check if client exists and belongs to the user
      const client = await storage.getClient(appointmentData.clientId.toString());
      if (!client) {
        return res.status(404).json({ message: "Danışan bulunamadı" });
      }
      if (client.userId.toString() !== userId) {
        return res.status(403).json({ message: "Bu danışan için randevu oluşturma izniniz yok" });
      }
      
      const appointment = await storage.createAppointment(appointmentData);
      res.status(201).json(appointment);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromError(error).message });
      }
      console.error('Randevu oluşturma hatası:', error);
      res.status(500).json({ message: "Randevu oluşturulurken bir hata oluştu" });
    }
  });

  app.put('/api/appointments/:id', authenticate, async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const appointment = await storage.getAppointment(id);
      
      if (!appointment) {
        return res.status(404).json({ message: "Randevu bulunamadı" });
      }
      
      // Check if appointment belongs to the authenticated user
      if (appointment.userId.toString() !== res.locals.userId) {
        return res.status(403).json({ message: "Bu randevuyu güncelleme izniniz yok" });
      }
      
      const updatedAppointment = await storage.updateAppointment(id, req.body);
      res.json(updatedAppointment);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromError(error).message });
      }
      res.status(500).json({ message: "Randevu güncellenirken bir hata oluştu" });
    }
  });

  // ACTIVITY ROUTES
  app.get('/api/activities', authenticate, async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const searchTerm = req.query.search as string | undefined;
      const activityType = req.query.type as string | undefined;

      // Calculate skip value for pagination
      const skip = (page - 1) * limit;
      
      // Build query filter
      const filter: any = { userId };
      
      // Add type filter if provided
      if (activityType && activityType !== 'all') {
        filter.type = activityType;
      }
      
      // Add search filter if provided
      if (searchTerm) {
        filter.description = { $regex: searchTerm, $options: 'i' };
      }
      
      // Get activities with pagination
      const activities = await Activity.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      
      // Get total count for pagination
      const totalCount = await Activity.countDocuments(filter);
      const totalPages = Math.ceil(totalCount / limit);
      
      res.json({
        activities,
        totalCount,
        totalPages,
        currentPage: page
      });
    } catch (error) {
      console.error('Aktiviteler alınırken hata:', error);
      res.status(500).json({ message: "Aktiviteler alınırken bir hata oluştu" });
    }
  });

  // Aktiviteler için silme endpoint'i ekleyelim
  app.delete('/api/activities', authenticate, async (req: Request, res: Response) => {
    try {
      const { ids, deleteAll, type, search } = req.body;
      
      if (deleteAll) {
        // Tüm aktiviteleri silme işlemi
        let query: any = { userId: res.locals.userId };
        
        // Filtreleme yapılıyorsa query'e ekle
        if (type && type !== 'all') {
          query.type = type;
        }
        
        if (search) {
          query.description = { $regex: search, $options: 'i' };
        }
        
        const result = await Activity.deleteMany(query);
        
        return res.json({ 
          success: true, 
          message: `${result.deletedCount} aktivite başarıyla silindi.` 
        });
      } else if (ids && Array.isArray(ids) && ids.length > 0) {
        // Belirli aktiviteleri silme işlemi
        // Kullanıcının sadece kendi aktivitelerini silebilmesini sağlayalım
        const result = await Activity.deleteMany({
          _id: { $in: ids },
          userId: res.locals.userId
        });
        
        return res.json({ 
          success: true, 
          message: `${result.deletedCount} aktivite başarıyla silindi.` 
        });
      } else {
        return res.status(400).json({ 
          success: false, 
          message: "Silinecek aktiviteler belirtilmedi." 
        });
      }
    } catch (error) {
      console.error('Aktivite silme hatası:', error);
      res.status(500).json({ 
        success: false, 
        message: "Aktiviteler silinirken bir hata oluştu." 
      });
    }
  });

  // DASHBOARD STATS
  app.get('/api/dashboard/stats', authenticate, async (req: Request, res: Response) => {
    try {
      const userId = res.locals.userId;
      
      // Get all clients for this user
      const clients = await storage.getClientsForUser(userId);
      const activeClients = clients.filter(client => client.status === 'active').length;
      
      // Get all appointments for this user
      const allAppointments = await storage.getAppointmentsForUser(userId);
      
      // Filter appointments for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const todayAppointments = allAppointments.filter(appointment => {
        // MongoDB'den gelen tarih objesi veya string olabilir
        const appointmentDate = new Date(appointment.date);
        
        // Tarihleri yyyy-mm-dd formatına çevirerek karşılaştırma
        const apptDateStr = appointmentDate.toISOString().split('T')[0];
        const todayStr = today.toISOString().split('T')[0];
        
        return apptDateStr === todayStr;
      }).length;
      
      // Get all diet plans for this user
      const dietPlans = await storage.getDietPlansForUser(userId);
      const activeDietPlans = dietPlans.filter(plan => plan.status === 'active').length;
      
      // For telegram messages, we're assuming a counter would be obtained from a real integration
      // For demo purposes, we'll use a placeholder value
      const telegramMessages = 12;
      
      // İlerleme istatistikleri hesaplanması gerekseydi burada gerçek verilerle hesaplanırdı
      // Şu anda örnek veriler kullanıyoruz
      const totalActiveClients = activeClients || 1; // 0'a bölme hatası olmasın diye
      
      // Hedef ağırlığa ulaşan danışan sayısı (örnek veri)
      const weightGoalAchieved = Math.round(totalActiveClients * 0.28);
      
      // Diyet planına uyum gösteren danışan sayısı (örnek veri)
      const dietCompliance = Math.round(totalActiveClients * 0.64);
      
      // Egzersiz planına uyum gösteren danışan sayısı (örnek veri)
      const exerciseCompliance = Math.round(totalActiveClients * 0.43);
      
      // Su tüketimi takibi yapan danışan sayısı (örnek veri)
      const waterIntakeTracking = Math.round(totalActiveClients * 0.76);
      
      res.json({
        activeClients,
        todayAppointments,
        activeDietPlans,
        telegramMessages,
        weightGoalAchieved,
        dietCompliance,
        exerciseCompliance,
        waterIntakeTracking
      });
    } catch (error) {
      console.error('Dashboard stats alırken hata:', error);
      res.status(500).json({ message: "İstatistikler alınırken bir hata oluştu" });
    }
  });

  // Dosya Yükleme Endpoint'i
  app.post('/api/upload', authenticate, upload.single('file'), async (req: Request, res: Response) => {
    try {
      console.log('Upload çağrıldı, req.file:', req.file ? 'Dosya var' : 'Dosya yok');
      console.log('req.body:', req.body);
      
      if (!req.file) {
        console.error('Dosya eksik, form-data içinde file alanı bulunamadı');
        return res.status(400).json({ message: 'Dosya yüklenmedi veya form-data içinde file alanı bulunamadı' });
      }
      
      console.log('Dosya bilgileri:', {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });
      
      const folder = req.body.folder || 'dietcim';
      console.log('Upload klasörü:', folder);
      
      try {
        const fileUrl = await storage.uploadFile(req.file, folder);
        console.log('Upload başarılı, URL:', fileUrl);
        
        res.status(201).json({ 
          url: fileUrl,
          success: true 
        });
      } catch (uploadError) {
        console.error('Cloudinary Upload Hatası:', uploadError);
        res.status(500).json({ message: `Cloudinary'ye yükleme hatası: ${uploadError instanceof Error ? uploadError.message : 'Bilinmeyen hata'}` });
      }
    } catch (error) {
      console.error('Dosya yükleme hatası:', error);
      res.status(500).json({ message: `Dosya yüklenirken bir hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}` });
    }
  });

  // TELEGRAM BOT ROUTES
  const telegramService = TelegramService.getInstance();

  // Bot başlatma endpoint'i
  app.post('/api/telegram/initialize', authenticate, async (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ message: "Bot token'ı gereklidir" });
      }

      // Kullanıcının token'ını güncelle
      await storage.updateUser(res.locals.userId, { telegramToken: token });
      
      // Telegram botunu başlat
      await telegramService.initialize(token);
      
      // Aktivite kaydet
      await storage.createActivity({
        userId: new mongoose.Types.ObjectId(res.locals.userId) as unknown as mongoose.Schema.Types.ObjectId,
        type: "telegram",
        description: "Telegram botu başlatıldı"
      });

      res.json({ success: true, message: "Telegram botu başlatıldı" });
    } catch (error) {
      console.error('Telegram bot başlatma hatası:', error);
      res.status(500).json({ message: `Bot başlatılırken bir hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}` });
    }
  });

  // Bot durdurma endpoint'i
  app.post('/api/telegram/stop', authenticate, async (req: Request, res: Response) => {
    try {
      telegramService.stop();
      
      // Aktivite kaydet
      await storage.createActivity({
        userId: new mongoose.Types.ObjectId(res.locals.userId) as unknown as mongoose.Schema.Types.ObjectId,
        type: "telegram",
        description: "Telegram botu durduruldu"
      });

      res.json({ success: true, message: "Telegram botu durduruldu" });
    } catch (error) {
      console.error('Telegram bot durdurma hatası:', error);
      res.status(500).json({ message: `Bot durdurulurken bir hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}` });
    }
  });

  // Mesaj gönderme endpoint'i
  app.post('/api/telegram/send-message', authenticate, async (req: Request, res: Response) => {
    try {
      const { clientIds, message } = req.body;
      
      if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
        return res.status(400).json({ 
          error: 'Geçersiz istek: Danışan listesi eksik veya boş', 
          success: [], 
          failed: [] 
        });
      }
      
      if (!message) {
        return res.status(400).json({ 
          error: 'Geçersiz istek: Mesaj içeriği eksik', 
          success: [], 
          failed: [] 
        });
      }
      
      const telegramService = TelegramService.getInstance();
      
      // Bot durumunu kontrol et
      const user = await storage.getUser(res.locals.userId);
      if (!user || !user.telegramToken) {
        return res.status(400).json({ 
          error: 'Telegram bot henüz yapılandırılmamış. Lütfen önce bot token\'ı girin.', 
          success: [], 
          failed: clientIds 
        });
      }
      
      // İşlemi log'la
      await storage.createActivity({
        userId: new mongoose.Types.ObjectId(res.locals.userId) as unknown as mongoose.Schema.Types.ObjectId,
        type: 'telegram',
        description: `${clientIds.length} danışana Telegram mesajı gönderildi`
      });
      
      const result = await telegramService.sendMessageToMultipleClients(clientIds, message);
      
      return res.json(result);
    } catch (error) {
      console.error('Telegram mesaj gönderme hatası:', error);
      return res.status(500).json({ 
        error: 'Mesaj gönderilirken bir hata oluştu: ' + (error as Error).message, 
        success: [], 
        failed: req.body.clientIds || [] 
      });
    }
  });

  // Referans kodu oluşturma endpoint'i
  app.post('/api/clients/:clientId/telegram-reference', authenticate, async (req: Request, res: Response) => {
    try {
      const clientId = req.params.clientId;
      const client = await storage.getClient(clientId);
      
      if (!client) {
        return res.status(404).json({ message: "Danışan bulunamadı" });
      }
      
      // Danışanın kullanıcıya ait olup olmadığını kontrol et
      if (client.userId.toString() !== res.locals.userId) {
        return res.status(403).json({ message: "Bu danışan için işlem yapma yetkiniz yok" });
      }
      
      // Referans kodu oluştur
      const referenceCode = await storage.generateReferenceCode(clientId);
      if (!referenceCode) {
        return res.status(500).json({ message: "Referans kodu oluşturulamadı" });
      }

      // Bot adını al (örnek olarak, gerçek botun kullanıcı adını almanız gerekebilir)
      const user = await storage.getUser(res.locals.userId);
      const botName = user?.telegramToken ? "DietTrackerProBot" : "Henüz bot oluşturulmadı";
      
      res.json({ success: true, referenceCode, botName });
    } catch (error) {
      console.error('Referans kodu oluşturma hatası:', error);
      res.status(500).json({ message: `Referans kodu oluşturulurken bir hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}` });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
