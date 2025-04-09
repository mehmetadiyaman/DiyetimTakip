import { FormikHelpers } from 'formik';
import { toast } from 'react-hot-toast';
import { 
  formatDateForInput, 
  formatDateForDisplay,
  formatTime, 
  formatDateTime
} from './formatDate';
import { dataTransformers } from '../hooks/useFormValidation';

/**
 * Formlardaki yaygın hataları ele almak için yardımcı fonksiyonlar
 */

// API hata cevaplarını formik hatalarına dönüştürür
export const handleApiErrors = (
  error: any, 
  setErrors: FormikHelpers<any>['setErrors'], 
  defaultMessage: string = 'İşlem sırasında bir hata oluştu'
): void => {
  if (!error) {
    toast.error(defaultMessage);
    return;
  }

  const errorData = error.response?.data;
  
  // API'den gelen hata formatı: { field1: 'hata1', field2: 'hata2' }
  if (errorData && typeof errorData === 'object' && !Array.isArray(errorData)) {
    setErrors(errorData);
    
    // İlk hatayı toast olarak göster
    const firstError = Object.values(errorData)[0];
    if (firstError && typeof firstError === 'string') {
      toast.error(firstError);
    } else {
      toast.error(defaultMessage);
    }
    return;
  }
  
  // API'den gelen hata mesajı
  if (errorData?.message) {
    toast.error(errorData.message);
    return;
  }
  
  // Genel hata mesajı
  toast.error(error.message || defaultMessage);
};

// Form değerlerini API'ye göndermeden önce dönüştürür
export const prepareFormDataForApi = (values: Record<string, any>): Record<string, any> => {
  const result: Record<string, any> = {};
  
  Object.entries(values).forEach(([key, value]) => {
    // Undefined değerleri dahil etme
    if (value === undefined) return;
    
    // String değerleri temizle
    if (typeof value === 'string') {
      result[key] = value.trim();
      return;
    }
    
    // Date değerlerini ISO formatına çevir
    if (value instanceof Date) {
      result[key] = value.toISOString();
      return;
    }
    
    // Diğer değerleri olduğu gibi kullan
    result[key] = value;
  });
  
  return result;
};

// API'den gelen verileri form değerlerine dönüştürür
export const prepareApiDataForForm = (data: Record<string, any>): Record<string, any> => {
  const result: Record<string, any> = { ...data };
  
  // Tarih alanlarını doğru formata dönüştür
  const dateFields = ['date', 'birthDate', 'startDate', 'endDate', 'createdAt', 'updatedAt'];
  
  Object.keys(result).forEach(key => {
    const value = result[key];
    
    // Tarih formatındaki string değerlerini dönüştür
    if (typeof value === 'string' && dateFields.some(field => key.includes(field))) {
      result[key] = formatDateForInput(value);
    }
    
    // Boş string değerlerini null'a dönüştür
    if (value === '') {
      result[key] = null;
    }
  });
  
  return result;
};

// Formda değişiklikleri izler ve uyarı gösterir
export const hasFormChanged = (initialValues: any, currentValues: any): boolean => {
  return JSON.stringify(initialValues) !== JSON.stringify(currentValues);
};

// Form içeriğini temizleyen yardımcı fonksiyon
export const resetForm = (
  formik: FormikHelpers<any>,
  initialValues: any,
  setFieldValue?: (field: string, value: any) => void
): void => {
  // Tüm alanları sıfırla
  Object.keys(initialValues).forEach(key => {
    if (setFieldValue) {
      setFieldValue(key, initialValues[key] || '');
    }
  });
  
  // Formik'i sıfırla
  formik.resetForm({ values: initialValues });
};

// Form verilerini FormData objesine dönüştürür
export const createFormData = (
  values: Record<string, any>, 
  fileFields: string[] = []
): FormData => {
  const formData = new FormData();
  
  Object.entries(values).forEach(([key, value]) => {
    // Dosya alanları için özel işlem
    if (fileFields.includes(key)) {
      if (Array.isArray(value)) {
        // Çoklu dosya
        value.forEach((file: File, index: number) => {
          if (file instanceof File) {
            formData.append(`${key}[${index}]`, file);
          }
        });
      } else if (value instanceof File) {
        // Tek dosya
        formData.append(key, value);
      }
      return;
    }
    
    // Diğer alanlar için
    if (value !== null && value !== undefined) {
      if (typeof value === 'object' && !(value instanceof Blob)) {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value);
      }
    }
  });
  
  return formData;
};

// Form alanları için yardımcı fonksiyonlar
export const formFieldHelpers = {
  // Tarih alanları için
  formatDate: {
    fromApi: (value: string | null | undefined) => formatDateForInput(value), // API -> Form
    toApi: (value: string | null | undefined) => {
      if (!value) return null;
      // ISO formatına dönüştür, ama sadece tarih kısmını al
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
    }, // Form -> API
    forDisplay: (value: string | null | undefined) => formatDateForDisplay(value) // Görüntüleme için
  },
  
  // Saat alanları için
  formatTime: {
    fromString: (timeStr: string | null | undefined) => {
      if (!timeStr) return '';
      return formatTime(timeStr);
    },
    toMinutes: (timeStr: string | null | undefined) => {
      if (!timeStr) return 0;
      const [hours = '0', minutes = '0'] = timeStr.split(':');
      return parseInt(hours) * 60 + parseInt(minutes);
    },
    fromMinutes: (minutes: number) => {
      const hrs = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }
  },
  
  // Sayı dönüşümleri
  number: {
    // String'den sayıya dönüştürür, başarısız olursa varsayılan değeri döndürür
    parse: (value: string | null | undefined, defaultValue: number = 0): number => {
      if (!value) return defaultValue;
      
      const sanitized = value.replace(/[^\d.,]/g, '').replace(',', '.');
      const num = parseFloat(sanitized);
      
      return isNaN(num) ? defaultValue : num;
    },
    
    // Para birimini formatlar
    formatCurrency: (value: number | string | null | undefined, decimals: number = 2): string => {
      if (value === null || value === undefined || value === '') return '';
      
      const num = typeof value === 'string' ? parseFloat(value.replace(/[^\d.,]/g, '').replace(',', '.')) : value;
      
      if (isNaN(num)) return '';
      
      return num.toLocaleString('tr-TR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
    }
  },
  
  // Telefon numarası formatla
  formatPhone: (value: string | null | undefined): string => {
    if (!value) return '';
    return dataTransformers.formatPhoneNumber(value);
  },
  
  // Metin alanı formatlamaları
  text: {
    capitalize: (value: string | null | undefined): string => {
      if (!value) return '';
      
      return value
        .split(' ')
        .map(word => word.charAt(0).toLocaleUpperCase('tr-TR') + word.slice(1).toLocaleLowerCase('tr-TR'))
        .join(' ');
    },
    
    truncate: (value: string | null | undefined, maxLength: number = 50): string => {
      if (!value) return '';
      
      if (value.length <= maxLength) return value;
      
      return value.slice(0, maxLength) + '...';
    },
    
    slugify: (value: string | null | undefined): string => {
      if (!value) return '';
      
      return value
        .toLocaleLowerCase('tr-TR')
        .replace(/[üÜ]/g, 'u')
        .replace(/[iİ]/g, 'i')
        .replace(/[şŞ]/g, 's')
        .replace(/[ğĞ]/g, 'g')
        .replace(/[çÇ]/g, 'c')
        .replace(/[öÖ]/g, 'o')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    }
  }
}; 