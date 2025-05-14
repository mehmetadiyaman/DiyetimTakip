import { API_URL } from "../api/config";

/**
 * API bağlantısını test eden fonksiyon
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const testApiConnection = async () => {
  try {
    // Basit bir zamanaşımı uygulaması
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Bağlantı zaman aşımına uğradı')), 10000);
    });
    
    // Gerçek fetch işlemi
    const fetchPromise = fetch(`${API_URL}/auth/health`);
    
    // Hangisi önce gerçekleşirse
    const response = await Promise.race([fetchPromise, timeoutPromise]);
    
    if (response.ok) {
      return { success: true, message: 'API bağlantısı başarılı' };
    } else {
      return { 
        success: false, 
        message: `API sunucusu yanıt verdi fakat hata döndü: ${response.status} ${response.statusText}` 
      };
    }
  } catch (error) {
    return { 
      success: false, 
      message: `API bağlantısı başarısız: ${error.message}` 
    };
  }
};

/**
 * Farklı giriş bilgileri kombinasyonlarını test eden fonksiyon
 */
export const testLoginCombinations = async () => {
  const testCases = [
    { email: 'test@example.com', password: 'password123', description: 'Test hesabı' },
    { email: 'admin@example.com', password: 'admin123', description: 'Admin hesabı' }
  ];
  
  const results = [];
  
  for (const testCase of testCases) {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testCase.email,
          password: testCase.password,
        }),
      });
      
      const data = await response.json();
      
      results.push({
        description: testCase.description,
        success: response.ok,
        status: response.status,
        message: data.message || 'Yanıt mesajı yok',
        hasToken: !!data.token
      });
    } catch (error) {
      results.push({
        description: testCase.description,
        success: false,
        error: error.message
      });
    }
  }
  
  return results;
};

/**
 * Doğru kullanıcı bilgileri ile giriş yapmayı deneyen fonksiyon
 * @param {string} email - E-posta adresi
 * @param {string} password - Şifre
 */
export const attemptLogin = async (email, password) => {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await response.json();
    
    if (response.ok && data.token) {
      return {
        success: true,
        token: data.token,
        user: data.user
      };
    } else {
      return {
        success: false,
        message: data.message || 'Bilinmeyen bir hata oluştu'
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `İstek hatası: ${error.message}`
    };
  }
}; 