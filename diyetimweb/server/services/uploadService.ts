import { v2 as cloudinary } from 'cloudinary';
import { upload } from '../config';

export interface UploadedFile {
  url: string;
  public_id: string;
  format: string;
  width: number;
  height: number;
  resource_type: string;
  bytes: number;
}

/**
 * Cloudinary'ye dosya yükleme servisi
 */
export const UploadService = {
  /**
   * Dosyayı Cloudinary'ye yükler
   * @param file Dosya
   * @param folder Klasör adı (opsiyonel, varsayılan: dietcim)
   * @returns Yüklenen dosya bilgisi
   */
  uploadFile: async (file: Express.Multer.File, folder: string = 'dietcim'): Promise<UploadedFile> => {
    console.log(`UploadService.uploadFile çağrıldı, folder: ${folder}`);
    console.log('Dosya bilgileri:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      buffer: file.buffer ? `Buffer (${file.buffer.length} bytes)` : 'Yok'
    });
    
    try {
      if (!file.buffer || file.buffer.length === 0) {
        console.error('Dosya içeriği (buffer) boş veya tanımsız!');
        throw new Error('Dosya içeriği boş veya tanımsız');
      }
      
      console.log('Cloudinary upload işlemi başlatılıyor...');
      
      const result = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder },
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload hatası:', error);
              return reject(error);
            }
            console.log('Cloudinary upload başarılı, sonuç:', { 
              public_id: result?.public_id,
              url: result?.secure_url
            });
            resolve(result);
          }
        );

        console.log('Stream oluşturuldu, dosya içeriği aktarılıyor...');
        // Dosya içeriğini upload stream'ine aktar
        uploadStream.end(file.buffer);
      });

      const uploadResult = {
        url: result.secure_url,
        public_id: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        resource_type: result.resource_type,
        bytes: result.bytes
      };
      
      console.log('Yükleme tamamlandı:', uploadResult);
      return uploadResult;
    } catch (error: any) {
      console.error('Dosya yükleme hatası (detaylı):', {
        message: error.message,
        stack: error.stack
      });
      throw new Error(`Dosya yükleme hatası: ${error.message}`);
    }
  },

  /**
   * URL'i kullanarak Cloudinary'ye dosya yükler
   * @param imageUrl Resim URL'i
   * @param folder Klasör adı (opsiyonel, varsayılan: dietcim)
   * @returns Yüklenen dosya bilgisi
   */
  uploadFromUrl: async (imageUrl: string, folder: string = 'dietcim'): Promise<UploadedFile> => {
    try {
      const result = await cloudinary.uploader.upload(imageUrl, { folder });
      
      return {
        url: result.secure_url,
        public_id: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        resource_type: result.resource_type,
        bytes: result.bytes
      };
    } catch (error: any) {
      throw new Error(`URL'den dosya yükleme hatası: ${error.message}`);
    }
  },

  /**
   * Cloudinary'den dosya siler
   * @param publicId Silinecek dosyanın public_id'si
   * @returns Silme işlemi sonucu
   */
  deleteFile: async (publicId: string): Promise<boolean> => {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    } catch (error: any) {
      throw new Error(`Dosya silme hatası: ${error.message}`);
    }
  },

  /**
   * Express middleware olarak multer upload işlemini döndürür
   * @param fieldName Form alanı adı
   * @returns Multer middleware
   */
  getUploadMiddleware: (fieldName: string) => {
    return upload.single(fieldName);
  },
  
  /**
   * Express middleware olarak çoklu dosya yükleme işlemini döndürür
   * @param fieldName Form alanı adı
   * @param maxCount Maksimum dosya sayısı
   * @returns Multer middleware
   */
  getMultiUploadMiddleware: (fieldName: string, maxCount: number = 5) => {
    return upload.array(fieldName, maxCount);
  }
}; 