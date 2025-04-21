import { useFeedback } from '../contexts/FeedbackContext';

/**
 * Toast (bildirim) göstermek için hook
 * @returns {Object} Toast fonksiyonları
 */
export const useToast = () => {
  const feedback = useFeedback();
  
  return {
    /**
     * Başarı bildirimi gösterir
     * @param {string} message - Bildirim metni
     * @param {string} duration - Gösterim süresi ('short' veya 'long')
     */
    showToastSuccess: (message, duration = 'short') => {
      feedback.showToastSuccess(message, duration);
    },
    
    /**
     * Hata bildirimi gösterir
     * @param {string} message - Bildirim metni
     * @param {string} duration - Gösterim süresi ('short' veya 'long')
     */
    showToastError: (message, duration = 'long') => {
      feedback.showToastError(message, duration);
    },
    
    /**
     * Uyarı bildirimi gösterir
     * @param {string} message - Bildirim metni
     * @param {string} duration - Gösterim süresi ('short' veya 'long')
     */
    showToastWarning: (message, duration = 'short') => {
      feedback.showToastWarning(message, duration);
    },
    
    /**
     * Bilgi bildirimi gösterir
     * @param {string} message - Bildirim metni
     * @param {string} duration - Gösterim süresi ('short' veya 'long')
     */
    showToastInfo: (message, duration = 'short') => {
      feedback.showToastInfo(message, duration);
    }
  };
};

export default useToast; 