import TelegramBot from 'node-telegram-bot-api';
import { MongoStorage } from '../storage';
import { IClient } from '../models/index';
import mongoose from 'mongoose';

export class TelegramService {
  private bot: TelegramBot | null = null;
  private static instance: TelegramService;
  private storage: MongoStorage;

  private constructor() {
    this.storage = new MongoStorage();
  }

  public static getInstance(): TelegramService {
    if (!TelegramService.instance) {
      TelegramService.instance = new TelegramService();
    }
    return TelegramService.instance;
  }

  private async saveChatId(chatId: number, referenceCode: string): Promise<boolean> {
    try {
      console.log(`saveChatId çağrıldı: chatId=${chatId}, referenceCode=${referenceCode}`);
      
      // Referans kodu ile danışanı bul
      const client = await this.storage.findClientByReferenceCode(referenceCode);
      console.log('Bulunan danışan:', client ? `ID: ${client._id}, Ad: ${client.name}` : 'Bulunamadı');
      
      if (!client) {
        return false;
      }
      
      // Danışanın Telegram Chat ID'sini güncelle
      const clientId = (client as any)._id?.toString() || '';
      if (!clientId) {
        console.error('Danışan ID değeri alınamadı');
        return false;
      }
      
      console.log(`Danışan güncellenecek: ID=${clientId}, chatId=${chatId}`);
      const updatedClient = await this.storage.updateClient(clientId, { telegramChatId: chatId.toString() });
      console.log('Danışan güncelleme sonucu:', updatedClient ? 'Başarılı' : 'Başarısız');
      
      return !!updatedClient;
    } catch (error) {
      console.error('Chat ID kaydetme hatası:', error);
      return false;
    }
  }

  public async initialize(token: string): Promise<void> {
    try {
      // Bot durumunu logla
      console.log('Telegram bot başlatılıyor... Token:', token ? `${token.substring(0, 5)}...${token.slice(-5)}` : 'Eksik');
      
      this.bot = new TelegramBot(token, { polling: true });
      console.log('Telegram bot başlatıldı, polling aktif');

      // Bot instance kontrol et
      if (!this.bot) {
        console.error('Bot instance oluşturulamadı');
        throw new Error('Bot instance oluşturulamadı');
      }

      // Bot komutlarını dinle - basit /start
      this.bot.onText(/^\/start$/, async (msg: TelegramBot.Message) => {
        console.log('Basit /start komutu alındı:', msg.chat.id);
        const chatId = msg.chat.id;
        await this.bot?.sendMessage(chatId, 
          'Merhaba! DietTrackerPro botuna hoş geldiniz. ' +
          'Diyetisyeninizden aldığınız bağlantı kodunu "/start KODUNUZ" şeklinde gönderiniz.'
        );
        console.log('Basit /start yanıtı gönderildi:', chatId);
      });

      // Bot komutlarını dinle - referans kodlu /start
      this.bot.onText(/^\/start\s+([A-Za-z0-9]+)$/, async (msg: TelegramBot.Message, match) => {
        const chatId = msg.chat.id;
        const referenceCode = match ? match[1] : '';
        
        console.log(`/start komutu alındı, chatId: ${chatId}, referenceCode: ${referenceCode}`);
        
        if (referenceCode) {
          try {
            const success = await this.saveChatId(chatId, referenceCode);
            console.log(`Referans kodu ${referenceCode} için chat ID kaydetme sonucu:`, success ? 'Başarılı' : 'Başarısız');
            
            if (success) {
              await this.bot?.sendMessage(chatId, 'Bağlantınız başarıyla kuruldu! Artık diyetisyeninizden mesaj alabilirsiniz.');
            } else {
              await this.bot?.sendMessage(chatId, 'Referans kodunuz geçersiz. Lütfen diyetisyeninizden doğru kodu isteyin.');
            }
          } catch (error) {
            console.error('Chat ID kaydetme hatası:', error);
            await this.bot?.sendMessage(chatId, 'Bir hata oluştu. Lütfen tekrar deneyin veya diyetisyeninize başvurun.');
          }
        } else {
          await this.bot?.sendMessage(chatId, 
            'Lütfen diyetisyeninizden aldığınız referans kodunu "/start KODUNUZ" şeklinde gönderiniz.'
          );
        }
      });
      
      // Diğer mesajlar için
      this.bot.on('message', async (msg: TelegramBot.Message) => {
        // Eğer /start komutu değilse, kontrol mesajı gönder
        if (!msg.text?.startsWith('/start')) {
          console.log('Start dışında bir mesaj alındı:', msg.text);
          const chatId = msg.chat.id;
          await this.bot?.sendMessage(chatId, 
            'DietTrackerPro botu şu anda sadece diyetisyeninizden gelen mesajları iletmek için kullanılmaktadır. ' +
            'Lütfen diyetisyeninizle telefon veya e-posta üzerinden iletişime geçin.'
          );
        }
      });

      // Hata yönetimi
      this.bot.on('polling_error', (error: Error) => {
        console.error('Telegram bot polling hatası:', error);
      });
      
      // Diğer hata olaylarını da dinle
      this.bot.on('error', (error: Error) => {
        console.error('Telegram bot genel hata:', error);
      });

      console.log('Telegram bot listener\'ları kuruldu');

    } catch (error) {
      console.error('Telegram bot başlatma hatası:', error);
      throw error;
    }
  }

  public async sendMessage(chatId: number, message: string): Promise<boolean> {
    try {
      if (!this.bot) {
        console.error('Mesaj gönderilemiyor: Bot henüz başlatılmamış. Lütfen önce botu başlatın.');
        throw new Error('Bot henüz başlatılmamış. Lütfen "Bot Ayarları" sayfasından botu başlatın.');
      }

      await this.bot.sendMessage(chatId, message);
      console.log(`Mesaj başarıyla gönderildi - ChatID: ${chatId}`);
      return true;
    } catch (error) {
      console.error('Mesaj gönderme hatası:', error);
      return false;
    }
  }

  public async sendMessageToClient(clientId: string, message: string): Promise<boolean> {
    try {
      const client = await this.storage.getClient(clientId);
      if (!client || !client.telegramChatId) {
        console.log(`Client: ${clientId} için mesaj gönderilemedi, Telegram ChatID: ${client?.telegramChatId || 'Eksik'}`);
        throw new Error('Danışan bulunamadı veya Telegram chat ID\'si yok. Danışan referans kodunu kullanarak botu başlatmalı.');
      }

      return await this.sendMessage(parseInt(client.telegramChatId), message);
    } catch (error) {
      console.error('Danışana mesaj gönderme hatası:', error);
      return false;
    }
  }

  public async sendMessageToMultipleClients(clientIds: string[], message: string): Promise<{
    success: string[];
    failed: string[];
  }> {
    const results = {
      success: [] as string[],
      failed: [] as string[]
    };

    for (const clientId of clientIds) {
      try {
        const success = await this.sendMessageToClient(clientId, message);
        if (success) {
          results.success.push(clientId);
        } else {
          results.failed.push(clientId);
        }
      } catch (error) {
        results.failed.push(clientId);
      }
    }

    return results;
  }

  public stop(): void {
    if (this.bot) {
      this.bot.stopPolling();
      this.bot = null;
      console.log('Telegram bot durduruldu');
    }
  }
} 