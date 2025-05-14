import { API_TIMEOUT } from '../utils/constants';

// API URL konfigürasyonu
export const API_URL = 'https://diettrackerproo.onrender.com/api';

// Global hata ayıklama modu - geliştirme için true, üretim için false
const DEBUG_MODE = false;

/**
 * API isteği yardımcı fonksiyonu - geliştirilmiş hata yönetimi ile
 * @param {string} method - HTTP metodu ('GET', 'POST', 'PUT', 'DELETE')
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Gönderilecek veri (opsiyonel)
 * @param {string} token - Kimlik doğrulama token'ı (opsiyonel)
 * @param {number} timeout - İstek zaman aşımı (ms cinsinden, opsiyonel)
 * @param {number} retries - Başarısız istekleri yeniden deneme sayısı
 * @returns {Promise<any>} - API yanıtı
 */
export const apiRequest = async (method, endpoint, data = null, token = null, timeout = API_TIMEOUT, retries = 1) => {
  let currentRetry = 0;
  
  const executeRequest = async () => {
    try {
      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const config = {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
      };
      
      if (DEBUG_MODE) {
        console.log(`API İsteği: ${method} ${endpoint}`, config);
      }
      
      // Timeout Promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('İstek zaman aşımına uğradı')), timeout);
      });
      
      // Fetch Promise
      const fetchPromise = fetch(`${API_URL}${endpoint}`, config);
      
      // Race - hangisi önce tamamlanırsa
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      
      // İsteğin tam içeriğini debug modunda göster
      if (DEBUG_MODE) {
        console.log(`API Yanıt Durumu: ${response.status} ${response.statusText}`);
      }
      
      // Başarılı yanıt kontrolü
      if (response.ok) {
        try {
          const responseData = await response.json();
          if (DEBUG_MODE) {
            console.log('API Yanıt Verisi:', responseData);
          }
          return responseData;
        } catch (parseError) {
          // JSON ayrıştırma hatası
          if (DEBUG_MODE) {
            console.error('Başarılı yanıt ayrıştırma hatası:', parseError);
          }
          return { success: true, message: 'İstek başarılı, ancak yanıt ayrıştırılamadı' };
        }
      }
      
      // Hata yanıtı işleme
      try {
        const errorData = await response.json();
        if (DEBUG_MODE) {
          console.error('API Hata Verisi:', errorData);
        }
        const errorMessage = errorData.message || `HTTP Hata: ${response.status}`;
        const error = new Error(errorMessage);
        error.status = response.status;
        error.data = errorData;
        throw error;
      } catch (parseError) {
        // JSON ayrıştırma hatası
        if (DEBUG_MODE) {
          console.error('API Yanıt Ayrıştırma Hatası:', parseError);
        }
        const error = new Error(`HTTP Hata: ${response.status} ${response.statusText}`);
        error.status = response.status;
        throw error;
      }
    } catch (error) {
      // Yeniden deneme mantığı
      if (currentRetry < retries) {
        currentRetry++;
        if (DEBUG_MODE) {
          console.log(`İstek başarısız oldu, yeniden deneniyor (${currentRetry}/${retries})...`);
        }
        // Artan bekleme süresi ile yeniden deneme
        await new Promise(resolve => setTimeout(resolve, 1000 * currentRetry));
        return executeRequest();
      }
      
      if (DEBUG_MODE) {
        console.error('API İsteği Hatası:', error);
      } else {
        // Üretim modunda sadece hata tipi ve mesajını logla
        const errorType = error.name || 'Error';
        const simplifiedError = `${errorType}: ${error.message}`;
        
        // Giriş hatası gibi hassas mesajları loglamaya gerek yok
        if (!error.message.includes('Geçersiz e-posta veya şifre')) {
          console.error('API Hatası:', simplifiedError);
        }
      }
      throw error;
    }
  };
  
  return executeRequest();
};

/**
 * GET isteği gönderen yardımcı fonksiyon
 * @param {string} endpoint - API endpoint
 * @param {string} token - Kimlik doğrulama token'ı (opsiyonel)
 * @param {Object} options - Ek seçenekler
 * @returns {Promise<any>} - API yanıtı
 */
export const get = (endpoint, token, options = {}) => 
  apiRequest('GET', endpoint, null, token, options.timeout, options.retries);

/**
 * POST isteği gönderen yardımcı fonksiyon
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Gönderilecek veri
 * @param {string} token - Kimlik doğrulama token'ı (opsiyonel)
 * @param {Object} options - Ek seçenekler
 * @returns {Promise<any>} - API yanıtı
 */
export const post = (endpoint, data, token, options = {}) => 
  apiRequest('POST', endpoint, data, token, options.timeout, options.retries);

/**
 * PUT isteği gönderen yardımcı fonksiyon
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Gönderilecek veri
 * @param {string} token - Kimlik doğrulama token'ı (opsiyonel)
 * @param {Object} options - Ek seçenekler
 * @returns {Promise<any>} - API yanıtı
 */
export const put = (endpoint, data, token, options = {}) => 
  apiRequest('PUT', endpoint, data, token, options.timeout, options.retries);

/**
 * DELETE isteği gönderen yardımcı fonksiyon
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Gönderilecek veri (opsiyonel)
 * @param {string} token - Kimlik doğrulama token'ı (opsiyonel)
 * @param {Object} options - Ek seçenekler
 * @returns {Promise<any>} - API yanıtı
 */
export const del = (endpoint, data, token, options = {}) => 
  apiRequest('DELETE', endpoint, data, token, options.timeout, options.retries);

// Cloudinary konfigürasyonu
export const CLOUDINARY_CONFIG = {
  cloudName: 'dqthfbgwb',
  uploadPreset: 'diet_tracker_uploads',
  apiKey: 'your_api_key' // İsteğe bağlı, ihtiyaca göre değiştirin
};

export default {
  apiRequest,
  get,
  post,
  put,
  del,
  API_URL,
  CLOUDINARY_CONFIG
}; 