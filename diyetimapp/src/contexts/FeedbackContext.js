import React, { createContext, useState, useContext, useCallback } from 'react';
import { Button } from 'react-native-paper';
import Dialog from '../components/common/Dialog';
import LoadingOverlay from '../components/common/LoadingOverlay';
import { showSuccessToast, showErrorToast, showWarningToast, showInfoToast } from '../utils/toast';

// Context'i oluştur
const FeedbackContext = createContext();

// Hook
export const useFeedback = () => {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback hook must be used within a FeedbackProvider');
  }
  return context;
};

// Sağlayıcı bileşeni
export const FeedbackProvider = ({ children }) => {
  const [dialogConfig, setDialogConfig] = useState({
    visible: false,
    title: '',
    content: '',
    actions: null,
    type: 'info',
    icon: null,
    iconColor: null,
    dismissable: true,
    dismissableBackButton: true,
    centered: true,
    animationType: 'scale',
  });

  const [loadingConfig, setLoadingConfig] = useState({
    visible: false,
    message: 'Yükleniyor...',
    backdropOpacity: 0.6,
  });

  // Dialog
  const showDialog = useCallback((config) => {
    setDialogConfig({
      ...dialogConfig,
      ...config,
      visible: true,
    });
  }, [dialogConfig]);

  const hideDialog = useCallback(() => {
    setDialogConfig((prev) => ({
      ...prev,
      visible: false,
    }));
  }, []);

  // Loading
  const showLoading = useCallback((message = 'Yükleniyor...', options = {}) => {
    setLoadingConfig({
      ...loadingConfig,
      ...options,
      message,
      visible: true,
    });
  }, [loadingConfig]);

  const hideLoading = useCallback(() => {
    setLoadingConfig((prev) => ({
      ...prev,
      visible: false,
    }));
  }, []);

  // Toasts
  const showToastSuccess = useCallback((message, duration) => {
    showSuccessToast(message, duration);
  }, []);

  const showToastError = useCallback((message, duration) => {
    showErrorToast(message, duration);
  }, []);

  const showToastWarning = useCallback((message, duration) => {
    showWarningToast(message, duration);
  }, []);

  const showToastInfo = useCallback((message, duration) => {
    showInfoToast(message, duration);
  }, []);

  // Yardımcı diyalog fonksiyonları
  const showSuccessDialog = useCallback((title, content, onDismiss) => {
    showDialog({
      title,
      content,
      type: 'success',
      dismissable: true,
      actions: (
        <Button 
          mode="text" 
          onPress={() => {
            hideDialog();
            onDismiss && onDismiss();
          }}
        >
          Tamam
        </Button>
      ),
    });
  }, [showDialog, hideDialog]);

  const showErrorDialog = useCallback((title, content, onDismiss) => {
    showDialog({
      title,
      content,
      type: 'error',
      dismissable: true,
      actions: (
        <Button 
          mode="text" 
          onPress={() => {
            hideDialog();
            onDismiss && onDismiss();
          }}
        >
          Tamam
        </Button>
      ),
    });
  }, [showDialog, hideDialog]);

  const showConfirmDialog = useCallback((
    title, 
    content, 
    onConfirm, 
    onCancel,
    confirmText = 'Evet',
    cancelText = 'İptal'
  ) => {
    showDialog({
      title,
      content,
      type: 'warning',
      dismissable: true,
      actions: (
        <>
          <Button 
            mode="text" 
            onPress={() => {
              hideDialog();
              onCancel && onCancel();
            }}
          >
            {cancelText}
          </Button>
          <Button 
            mode="text" 
            onPress={() => {
              hideDialog();
              onConfirm && onConfirm();
            }}
          >
            {confirmText}
          </Button>
        </>
      ),
    });
  }, [showDialog, hideDialog]);

  // Değer
  const value = {
    // Dialog
    showDialog,
    hideDialog,
    showSuccessDialog,
    showErrorDialog,
    showConfirmDialog,
    
    // Loading
    showLoading,
    hideLoading,
    
    // Toasts
    showToastSuccess,
    showToastError,
    showToastWarning,
    showToastInfo,
    
    // Shorthands
    showSuccess: showToastSuccess,
    showError: showToastError,
    showWarning: showToastWarning,
    showInfo: showToastInfo,
  };

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <Dialog
        {...dialogConfig}
        onDismiss={hideDialog}
      />
      <LoadingOverlay
        {...loadingConfig}
      />
    </FeedbackContext.Provider>
  );
};

export default FeedbackContext; 