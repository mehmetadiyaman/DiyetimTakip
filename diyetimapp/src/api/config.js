import { API_TIMEOUT } from '../utils/constants';

// API URL konfigürasyonu
export const API_URL = 'https://diettrackerproo.onrender.com/api';

// Global hata ayıklama modu - geliştirme için true, üretim için false
const DEBUG_MODE = true;

// HTML yanıt durumunda kullanılacak varsayılan diyet planı
const DEFAULT_DIET_PLAN = {
  _id: null,
  title: "",
  description: "",
  startDate: new Date(),
  endDate: new Date(new Date().setDate(new Date().getDate() + 30)),
  status: "active",
  dailyCalories: 0,
  macroProtein: 0,
  macroCarbs: 0,
  macroFat: 0,
  meals: [
    { name: 'Kahvaltı', foods: [] },
    { name: 'Öğle Yemeği', foods: [] },
    { name: 'Akşam Yemeği', foods: [] },
    { name: 'Ara Öğün', foods: [] }
  ]
};

// Düzenleme için önbelleğe alınan diyet planları
export let cachedDietPlans = [];

// Önbelleği güncelleme fonksiyonu
export const updateDietPlansCache = (plans) => {
  if (Array.isArray(plans)) {
    console.log('Diyet planları önbelleğe alınıyor:', plans.length);
    cachedDietPlans = [...plans];
  }
};

// Önbellekten bir planı ID'ye göre bulma
export const getCachedDietPlan = (planId) => {
  if (!planId || !cachedDietPlans.length) return null;
  
  const plan = cachedDietPlans.find(p => p._id === planId);
  if (plan) {
    console.log('Önbellekte plan bulundu:', plan.title);
  } else {
    console.log('Plan önbellekte bulunamadı:', planId);
  }
  return plan;
};

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
          // İlk olarak yanıt içeriğini text olarak alalım
          const textResponse = await response.text();
          
          // Boş yanıt kontrolü
          if (!textResponse || textResponse.trim() === '') {
            return { success: true, message: 'İşlem başarılı (boş yanıt)' };
          }
          
          // HTML yanıt kontrolü
          if (textResponse.trim().startsWith('<')) {
            console.error('API HTML yanıt döndü:', textResponse.substring(0, 100) + '...');
            
            // HTML yanıt alındığında ve diyet planı detayı isteniyorsa varsayılan plan döndür
            if (endpoint.match(/\/diet-plans\/[a-z0-9]+/) && method === 'GET') {
              console.log('HTML yanıt için varsayılan diyet planı kullanılıyor');
              return { 
                ...DEFAULT_DIET_PLAN,
                _id: endpoint.split('/').pop(), // URL'den ID'yi al
                clientId: data?.clientId || null 
              };
            }
            
            // Diğer durumlarda hata döndür
            return { success: false, message: 'API HTML yanıt döndü' };
          }
          
          // JSON olarak ayrıştırmayı deneyelim
          try {
            const jsonResponse = JSON.parse(textResponse);
            
            if (DEBUG_MODE) {
              console.log('API Yanıt Verisi:', jsonResponse);
            }
            
            // MongoDB Extended JSON formatı kontrolü (özellikle _id, tarihler için)
            if (endpoint.includes('/diet-plans/') && method === 'GET' && jsonResponse) {
              console.log('Diyet planı verisi MongoDB formatında alınıyor, işleniyor...');
              
              // Diyet planı verilerini işle
              if (jsonResponse._id) {
                // Tek bir plan için
                return processDietPlanData(jsonResponse);
              } else if (Array.isArray(jsonResponse)) {
                // Plan listesi için
                return jsonResponse.map(plan => processDietPlanData(plan));
              }
            }
            
            return jsonResponse;
          } catch (jsonError) {
            console.error('JSON ayrıştırma hatası:', jsonError);
            
            // JSON ayrıştırma hatası ve diyet planı detayı
            if (endpoint.match(/\/diet-plans\/[a-z0-9]+/) && method === 'GET') {
              console.log('JSON ayrıştırma hatası için varsayılan diyet planı kullanılıyor');
              return { 
                ...DEFAULT_DIET_PLAN,
                _id: endpoint.split('/').pop(),
                clientId: data?.clientId || null 
              };
            }
            
            return { success: false, message: 'Yanıt JSON olarak ayrıştırılamadı' };
          }
        } catch (parseError) {
          // JSON ayrıştırma hatası
          if (DEBUG_MODE) {
            console.error('Başarılı yanıt ayrıştırma hatası:', parseError);
          }
          return { success: false, message: 'Yanıt ayrıştırılamadı' };
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
 * MongoDB Extended JSON formatındaki diyet planı verilerini işleyen yardımcı fonksiyon
 */
const processDietPlanData = (data) => {
  if (!data) return null;
  
  // Nesneyi klonla
  const processedData = {...data};
  
  // MongoDB ObjectId ve Date formatlarını dönüştür
  if (data._id && data._id.$oid) {
    processedData._id = data._id.$oid;
  }
  
  if (data.clientId && data.clientId.$oid) {
    processedData.clientId = data.clientId.$oid;
  }
  
  if (data.createdBy && data.createdBy.$oid) {
    processedData.createdBy = data.createdBy.$oid;
  }
  
  // Tarih alanlarını dönüştür
  ['startDate', 'endDate', 'createdAt', 'updatedAt'].forEach(field => {
    if (data[field] && data[field].$date) {
      if (data[field].$date.$numberLong) {
        processedData[field] = new Date(parseInt(data[field].$date.$numberLong));
      } else {
        processedData[field] = new Date(data[field].$date);
      }
    }
  });
  
  // Sayısal değerleri dönüştür
  ['dailyCalories', 'macroProtein', 'macroCarbs', 'macroFat'].forEach(field => {
    if (data[field] && data[field].$numberInt) {
      processedData[field] = parseInt(data[field].$numberInt);
    }
  });
  
  // Öğün verilerini işle
  if (data.meals && Array.isArray(data.meals)) {
    processedData.meals = data.meals.map(meal => ({
      ...meal,
      _id: meal._id && meal._id.$oid ? meal._id.$oid : meal._id,
      foods: Array.isArray(meal.foods) ? meal.foods.map(food => ({
        ...food,
        _id: food._id && food._id.$oid ? food._id.$oid : food._id,
        calories: food.calories && food.calories.$numberInt ? 
                  parseInt(food.calories.$numberInt) : 
                  (typeof food.calories === 'number' ? food.calories : 0)
      })) : []
    }));
  } else if (data.content) {
    // Content string mi yoksa obje mi kontrol et
    try {
      if (typeof data.content === 'string') {
        const contentData = JSON.parse(data.content);
        if (Array.isArray(contentData)) {
          processedData.meals = contentData;
        }
      }
    } catch (e) {
      console.log('Content parse hatası:', e);
    }
  }
  
  return processedData;
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