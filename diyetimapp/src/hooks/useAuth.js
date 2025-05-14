import { useState, useEffect, createContext, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from '../api/config';

// Context oluşturma
const AuthContext = createContext(null);

// Provider bileşeni
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Uygulama başlangıcında token kontrolü
  useEffect(() => {
    const loadToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        const storedUser = await AsyncStorage.getItem('user');
        
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          
          // Token geçerliliğini kontrol et
          try {
            await apiRequest('GET', '/auth/me', null, storedToken);
          } catch (error) {
            // Token geçersizse çıkış yap
            console.log('Token geçersiz, çıkış yapılıyor');
            await logout();
          }
        }
      } catch (error) {
        console.error('Token yükleme hatası:', error);
      } finally {
        setLoading(false);
      }
    };

    loadToken();
  }, []);

  // Giriş fonksiyonu
  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await apiRequest('POST', '/auth/login', { email, password });
      
      if (data && data.token) {
        await AsyncStorage.setItem('token', data.token);
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        
        setToken(data.token);
        setUser(data.user);
        return true;
      }
      return false;
    } catch (error) {
      setError(error.message || 'Giriş yapılırken bir hata oluştu');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Kayıt fonksiyonu
  const register = async (userData) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await apiRequest('POST', '/auth/register', userData);
      
      if (data && data.token) {
        await AsyncStorage.setItem('token', data.token);
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        
        setToken(data.token);
        setUser(data.user);
        return true;
      }
      return false;
    } catch (error) {
      setError(error.message || 'Kayıt olurken bir hata oluştu');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Çıkış fonksiyonu
  const logout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Çıkış hatası:', error);
    }
  };

  // Kullanıcı profil güncellemesi
  const updateProfile = async (profileData) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await apiRequest('PUT', '/auth/profile', profileData, token);
      
      if (data) {
        await AsyncStorage.setItem('user', JSON.stringify(data));
        setUser(data);
        return true;
      }
      return false;
    } catch (error) {
      setError(error.message || 'Profil güncellenirken bir hata oluştu');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Hata temizleme fonksiyonu
  const clearErrors = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      loading, 
      error, 
      login, 
      register, 
      logout, 
      updateProfile,
      clearErrors
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth hook must be used within an AuthProvider');
  }
  
  return context;
}; 