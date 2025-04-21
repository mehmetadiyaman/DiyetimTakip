import bcrypt from "bcryptjs";
import {
  User, Client, Measurement, DietPlan, Appointment, Activity,
  IUser, IClient, IMeasurement, IDietPlan, IAppointment, IActivity
} from "./models";
import { UploadService } from "./services/uploadService";
import mongoose from "mongoose";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<IUser | null>;
  getUserByEmail(email: string): Promise<IUser | null>;
  createUser(user: Partial<IUser>): Promise<IUser>;
  updateUser(userId: string, updateData: Partial<IUser>): Promise<IUser | null>;
  
  // Client methods
  getClientsForUser(userId: string): Promise<IClient[]>;
  getClient(id: string): Promise<IClient | null>;
  createClient(client: Partial<IClient>): Promise<IClient>;
  updateClient(id: string, client: Partial<IClient>): Promise<IClient | null>;
  deleteClient(id: string): Promise<boolean>;
  
  // Measurement methods
  getMeasurementsForClient(clientId: string): Promise<IMeasurement[]>;
  getMeasurement(id: string): Promise<IMeasurement | null>;
  createMeasurement(measurement: Partial<IMeasurement>): Promise<IMeasurement>;
  updateMeasurement(id: string, measurement: Partial<IMeasurement>): Promise<IMeasurement | null>;
  deleteMeasurement(id: string): Promise<boolean>;
  
  // DietPlan methods
  getDietPlansForUser(userId: string): Promise<IDietPlan[]>;
  getDietPlansForClient(clientId: string): Promise<IDietPlan[]>;
  getDietPlan(id: string): Promise<IDietPlan | null>;
  createDietPlan(dietPlan: Partial<IDietPlan>): Promise<IDietPlan>;
  updateDietPlan(id: string, dietPlan: Partial<IDietPlan>): Promise<IDietPlan | null>;
  deleteDietPlan(id: string): Promise<boolean>;
  
  // Appointment methods
  getAppointmentsForUser(userId: string): Promise<IAppointment[]>;
  getAppointmentsForClient(clientId: string): Promise<IAppointment[]>;
  getAppointment(id: string): Promise<IAppointment | null>;
  createAppointment(appointment: Partial<IAppointment>): Promise<IAppointment>;
  updateAppointment(id: string, appointment: Partial<IAppointment>): Promise<IAppointment | null>;
  deleteAppointment(id: string): Promise<boolean>;
  
  // Activity methods
  getActivitiesForUser(userId: string, limit?: number): Promise<IActivity[]>;
  createActivity(activity: Partial<IActivity>): Promise<IActivity>;
  
  // Dosya yükleme
  uploadFile(file: Express.Multer.File, folder?: string): Promise<string>;

  // Örnek aktiviteler ekleme
  addSampleActivities(): Promise<void>;

  // IStorage interface'ine yeni metodlar ekleyin
  findClientByReferenceCode(referenceCode: string): Promise<IClient | null>;
  generateReferenceCode(clientId: string): Promise<string | null>;
}

export class MongoStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<IUser | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return User.findById(id);
  }

  async getUserByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email });
  }

  async createUser(userData: Partial<IUser>): Promise<IUser> {
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }
    
    const user = new User({
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return await user.save();
  }

  async updateUser(userId: string, updateData: Partial<IUser>): Promise<IUser | null> {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { ...updateData, updatedAt: new Date() },
        { new: true }
      );
      return user;
    } catch (error) {
      console.error('Kullanıcı güncelleme hatası:', error);
      return null;
    }
  }

  // Client methods
  async getClientsForUser(userId: string): Promise<IClient[]> {
    if (!mongoose.Types.ObjectId.isValid(userId)) return [];
    return Client.find({ userId });
  }

  async getClient(id: string): Promise<IClient | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return Client.findById(id);
  }

  async createClient(clientData: Partial<IClient>): Promise<IClient> {
    const client = new Client({
      ...clientData,
      createdAt: new Date()
    });
    
    await client.save();
    
    // Yeni danışan ekleme aktivitesi
    const user = await this.getUser(clientData.userId?.toString() || "");
    if (user) {
      await this.createActivity({
        userId: clientData.userId,
        type: "client",
        description: `Yeni danışan eklendi: ${clientData.name}`
      });
    }
    
    return client;
  }

  async updateClient(id: string, clientData: Partial<IClient>): Promise<IClient | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    
    return Client.findByIdAndUpdate(
      id,
      { ...clientData },
      { new: true }
    );
  }

  async deleteClient(id: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(id)) return false;
    
    try {
      // Danışanı bul (log amaçlı)
      const client = await Client.findById(id);
      if (!client) return false;
      
      // İlişkili verileri sil
      // 1. Bu danışana ait tüm ölçümleri sil
      await Measurement.deleteMany({ clientId: id });
      
      // 2. Bu danışana ait tüm diyet planlarını sil
      await DietPlan.deleteMany({ clientId: id });
      
      // 3. Bu danışana ait tüm randevuları sil
      await Appointment.deleteMany({ clientId: id });
      
      // 4. Son olarak danışanı sil
      const result = await Client.deleteOne({ _id: id });
      
      // İşlem başarılı olup olmadığını döndür
      return result.deletedCount === 1;
    } catch (error) {
      console.error("Danışan silme hatası:", error);
      return false;
    }
  }

  // Measurement methods
  async getMeasurementsForClient(clientId: string): Promise<IMeasurement[]> {
    if (!mongoose.Types.ObjectId.isValid(clientId)) return [];
    
    return Measurement.find({ clientId }).sort({ date: -1 });
  }

  async getMeasurement(id: string): Promise<IMeasurement | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    
    return Measurement.findById(id);
  }

  async createMeasurement(measurementData: Partial<IMeasurement>): Promise<IMeasurement> {
    const measurement = new Measurement({
      ...measurementData,
      date: measurementData.date || new Date()
    });
    
    await measurement.save();
    
    // Yeni ölçüm aktivitesi
    if (measurementData.clientId) {
      const client = await this.getClient(measurementData.clientId.toString());
      if (client) {
        await this.createActivity({
          userId: client.userId,
          type: "measurement",
          description: `Yeni ölçüm kaydedildi: ${client.name} için`
        });
      }
    }
    
    return measurement;
  }

  async updateMeasurement(id: string, measurementData: Partial<IMeasurement>): Promise<IMeasurement | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    
    return Measurement.findByIdAndUpdate(
      id,
      { ...measurementData },
      { new: true }
    );
  }

  async deleteMeasurement(id: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(id)) return false;
    
    const result = await Measurement.deleteOne({ _id: id });
    return result.deletedCount === 1;
  }

  // DietPlan methods
  async getDietPlansForUser(userId: string): Promise<IDietPlan[]> {
    if (!mongoose.Types.ObjectId.isValid(userId)) return [];
    
    return DietPlan.find({ createdBy: userId }).sort({ createdAt: -1 });
  }

  async getDietPlansForClient(clientId: string): Promise<IDietPlan[]> {
    if (!mongoose.Types.ObjectId.isValid(clientId)) return [];
    
    return DietPlan.find({ clientId }).sort({ startDate: -1 });
  }

  async getDietPlan(id: string): Promise<IDietPlan | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    
    return DietPlan.findById(id);
  }

  async createDietPlan(dietPlanData: Partial<IDietPlan>): Promise<IDietPlan> {
    const dietPlan = new DietPlan({
      ...dietPlanData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await dietPlan.save();
    
    // Yeni diyet planı aktivitesi
    if (dietPlanData.clientId && dietPlanData.createdBy) {
      const client = await this.getClient(dietPlanData.clientId.toString());
      if (client) {
        await this.createActivity({
          userId: dietPlanData.createdBy,
          type: "diet_plan",
          description: `Yeni diyet planı oluşturuldu: ${client.name} için "${dietPlanData.title}"`
        });
      }
    }
    
    return dietPlan;
  }

  async updateDietPlan(id: string, dietPlanData: Partial<IDietPlan>): Promise<IDietPlan | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    
    return DietPlan.findByIdAndUpdate(
      id,
      { ...dietPlanData, updatedAt: new Date() },
      { new: true }
    );
  }

  async deleteDietPlan(id: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(id)) return false;
    
    const result = await DietPlan.deleteOne({ _id: id });
    return result.deletedCount === 1;
  }

  // Appointment methods
  async getAppointmentsForUser(userId: string): Promise<IAppointment[]> {
    if (!mongoose.Types.ObjectId.isValid(userId)) return [];
    
    return Appointment.find({ userId }).sort({ date: 1 });
  }

  async getAppointmentsForClient(clientId: string): Promise<IAppointment[]> {
    if (!mongoose.Types.ObjectId.isValid(clientId)) return [];
    
    return Appointment.find({ clientId }).sort({ date: 1 });
  }

  async getAppointment(id: string): Promise<IAppointment | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    
    return Appointment.findById(id);
  }

  async createAppointment(appointmentData: Partial<IAppointment>): Promise<IAppointment> {
    const appointment = new Appointment({
      ...appointmentData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await appointment.save();
    
    // Yeni randevu aktivitesi
    if (appointmentData.clientId && appointmentData.userId) {
      const client = await this.getClient(appointmentData.clientId.toString());
      if (client) {
        const appointmentDate = appointmentData.date ? new Date(appointmentData.date) : new Date();
        const dateString = appointmentDate.toLocaleDateString('tr-TR');
        
        await this.createActivity({
          userId: appointmentData.userId,
          type: "appointment",
          description: `${client.name} için ${dateString} tarihinde yeni randevu oluşturuldu`
        });
      }
    }
    
    return appointment;
  }

  async updateAppointment(id: string, appointmentData: Partial<IAppointment>): Promise<IAppointment | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    
    return Appointment.findByIdAndUpdate(
      id,
      { ...appointmentData, updatedAt: new Date() },
      { new: true }
    );
  }

  async deleteAppointment(id: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(id)) return false;
    
    const result = await Appointment.deleteOne({ _id: id });
    return result.deletedCount === 1;
  }

  // Activity methods
  async getActivitiesForUser(userId: string, limit: number = 10): Promise<IActivity[]> {
    if (!mongoose.Types.ObjectId.isValid(userId)) return [];
    
    return Activity.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  async createActivity(activityData: Partial<IActivity>): Promise<IActivity> {
    const activity = new Activity({
      ...activityData,
      createdAt: new Date()
    });
    
    return await activity.save();
  }

  // Dosya yükleme
  async uploadFile(file: Express.Multer.File, folder: string = 'dietcim'): Promise<string> {
    const uploadedFile = await UploadService.uploadFile(file, folder);
    return uploadedFile.url;
  }

  // Örnek aktiviteler ekleme
  async addSampleActivities(): Promise<void> {
    const activitiesCount = await Activity.countDocuments();
    
    if (activitiesCount === 0) {
      const user = await User.findOne();
      
      if (user) {
        const activities = [
          {
            userId: user._id as unknown as mongoose.Schema.Types.ObjectId,
            type: "diet_plan",
            description: "Yeni diyet planı oluşturuldu: Ahmet Yılmaz için \"Akdeniz Diyeti Planı\"",
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3) // 3 days ago
          },
          {
            userId: user._id as unknown as mongoose.Schema.Types.ObjectId,
            type: "measurement",
            description: "Yeni ölçüm kaydedildi: Zeynep Kaya için",
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2) // 2 days ago
          },
          {
            userId: user._id as unknown as mongoose.Schema.Types.ObjectId,
            type: "appointment",
            description: "Mehmet Demir için 15.06.2023 tarihinde yeni randevu oluşturuldu",
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24) // 1 day ago
          },
          {
            userId: user._id as unknown as mongoose.Schema.Types.ObjectId,
            type: "client",
            description: "Yeni danışan eklendi: Ayşe Yıldız",
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12) // 12 hours ago
          },
          {
            userId: user._id as unknown as mongoose.Schema.Types.ObjectId,
            type: "telegram",
            description: "Telegram botu üzerinden Fatma Öztürk için yeni mesaj gönderildi",
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6) // 6 hours ago
          }
        ];
        
        for (const activity of activities) {
          await this.createActivity(activity);
        }
      }
    }
  }

  // IStorage interface'ine yeni metodlar ekleyin
  async findClientByReferenceCode(referenceCode: string): Promise<IClient | null> {
    try {
      console.log(`findClientByReferenceCode çağrıldı, referenceCode: ${referenceCode}`);
      
      if (!referenceCode) {
        console.error('Geçersiz referans kodu: Boş veya tanımsız');
        return null;
      }

      const client = await Client.findOne({ referenceCode });
      console.log('Referans kodu ile danışan arama sonucu:', client ? `Bulundu (ID: ${client._id})` : 'Bulunamadı');
      
      return client;
    } catch (error) {
      console.error('Referans kodu ile danışan bulma hatası:', error);
      return null;
    }
  }

  async generateReferenceCode(clientId: string): Promise<string | null> {
    try {
      console.log(`generateReferenceCode çağrıldı, clientId: ${clientId}`);
      
      if (!mongoose.Types.ObjectId.isValid(clientId)) {
        console.error('Geçersiz client ID formatı:', clientId);
        return null;
      }
      
      // 6 karakterlik benzersiz bir kod oluştur
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      console.log(`Oluşturulan referans kodu: ${code}`);
      
      // Danışanı güncelle
      const client = await Client.findByIdAndUpdate(
        clientId,
        { referenceCode: code },
        { new: true }
      );
      
      const result = client ? code : null;
      console.log('Referans kodu güncelleme sonucu:', result ? 'Başarılı' : 'Başarısız');
      return result;
    } catch (error) {
      console.error('Referans kodu oluşturma hatası:', error);
      return null;
    }
  }
}

