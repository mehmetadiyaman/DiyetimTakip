import { API_TIMEOUT } from '../utils/constants';

// API URL konfigürasyonu
export const API_URL = 'https://diettrackerproo.onrender.com/api';

/**
 * API isteği yardımcı fonksiyonu
 * @param {string} method - HTTP metodu ('GET', 'POST', 'PUT', 'DELETE')
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Gönderilecek veri (opsiyonel)
 * @param {string} token - Kimlik doğrulama token'ı (opsiyonel)
 * @param {number} timeout - İstek zaman aşımı (ms cinsinden, opsiyonel)
 * @returns {Promise<any>} - API yanıtı
 */
export const apiRequest = async (method, endpoint, data = null, token = null, timeout = API_TIMEOUT) => {
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
    
    // Timeout Promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('İstek zaman aşımına uğradı')), timeout);
    });
    
    // Fetch Promise
    const fetchPromise = fetch(`${API_URL}${endpoint}`, config);
    
    // Race - hangisi önce tamamlanırsa
    const response = await Promise.race([fetchPromise, timeoutPromise]);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: `HTTP Hata: ${response.status}` }));
      const errorMessage = errorData.message || 'Bir hata oluştu';
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = errorData;
      throw error;
    }
    
    return response.json();
  } catch (error) {
    console.error('API İsteği Hatası:', error);
    throw error;
  }
};

/**
 * GET isteği gönderen yardımcı fonksiyon
 * @param {string} endpoint - API endpoint
 * @param {string} token - Kimlik doğrulama token'ı (opsiyonel)
 * @returns {Promise<any>} - API yanıtı
 */
export const get = (endpoint, token) => apiRequest('GET', endpoint, null, token);

/**
 * POST isteği gönderen yardımcı fonksiyon
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Gönderilecek veri
 * @param {string} token - Kimlik doğrulama token'ı (opsiyonel)
 * @returns {Promise<any>} - API yanıtı
 */
export const post = (endpoint, data, token) => apiRequest('POST', endpoint, data, token);

/**
 * PUT isteği gönderen yardımcı fonksiyon
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Gönderilecek veri
 * @param {string} token - Kimlik doğrulama token'ı (opsiyonel)
 * @returns {Promise<any>} - API yanıtı
 */
export const put = (endpoint, data, token) => apiRequest('PUT', endpoint, data, token);

/**
 * DELETE isteği gönderen yardımcı fonksiyon
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Gönderilecek veri (opsiyonel)
 * @param {string} token - Kimlik doğrulama token'ı (opsiyonel)
 * @returns {Promise<any>} - API yanıtı
 */
export const del = (endpoint, data, token) => apiRequest('DELETE', endpoint, data, token);

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