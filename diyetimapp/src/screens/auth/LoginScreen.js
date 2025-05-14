import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Dimensions,
  Alert
} from 'react-native';
import { TextInput, Button, HelperText } from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import { useFeedback } from '../../contexts/FeedbackContext';
import theme from '../../themes/theme';
import { attemptLogin, testApiConnection } from '../../utils/loginHelper';

const { width } = Dimensions.get('window');

const LoginScreen = ({ navigation }) => {
  const { login, error: authError, clearErrors } = useAuth();
  const { showLoading, hideLoading, showErrorDialog, showInfo, showSuccess } = useFeedback();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [errors, setErrors] = useState({});
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [apiStatus, setApiStatus] = useState({ checked: false, connected: true });

  // Animasyon değerleri
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // API bağlantısını kontrol et
  useEffect(() => {
    const checkApiConnection = async () => {
      try {
        const result = await testApiConnection();
        setApiStatus({ checked: true, connected: result.success });
        
        if (!result.success) {
          setTimeout(() => {
            showInfo('API Sunucusu Durumu', 'API sunucusuna bağlantı kurulamadı. Lütfen internet bağlantınızı kontrol edin veya daha sonra tekrar deneyin.');
          }, 1000);
        }
      } catch (error) {
        setApiStatus({ checked: true, connected: false });
        console.error('API bağlantı kontrolü sırasında hata:', error);
      }
    };
    
    checkApiConnection();
  }, []);

  useEffect(() => {
    // Ekran ilk açıldığında animasyonu başlat
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Auth hata mesajını daha güvenli bir şekilde kontrol edelim
  useEffect(() => {
    if (authError) {
      // Hata iletişim kutusunu göster ve sonra hatayı temizle
      try {
        showErrorDialog('Giriş Hatası', authError, () => {
          if (clearErrors) clearErrors();
        });
      } catch (error) {
        console.error('Hata gösterme sırasında bir sorun oluştu:', error);
        
        // Fallback olarak basit bir uyarı göster
        Alert.alert('Giriş Hatası', authError);
        
        // Hataları temizlemeye çalış
        if (clearErrors) clearErrors();
      }
    }
  }, [authError]);

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

    if (!email.trim()) {
      newErrors.email = 'E-posta adresi gereklidir';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Geçerli bir e-posta adresi giriniz';
      isValid = false;
    }

    if (!password) {
      newErrors.password = 'Şifre gereklidir';
      isValid = false;
    } else if (password.length < 6) {
      newErrors.password = 'Şifre en az 6 karakter olmalıdır';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;
    
    // API bağlantısı yok uyarısı
    if (apiStatus.checked && !apiStatus.connected) {
      Alert.alert(
        'Bağlantı Sorunu',
        'Sunuculara bağlanılamıyor. Lütfen internet bağlantınızı kontrol edin ve tekrar deneyin.',
        [{ text: 'Tamam' }]
      );
      return;
    }

    try {
      showLoading('Giriş yapılıyor...');
      
      // Eğer üç giriş denemesi başarısız olduysa, yardımcı fonksiyonla direkt API üzerinden doğrudan bir deneme yap
      if (loginAttempts >= 3) {
        const result = await attemptLogin(email, password);
        if (result.success) {
          // Başarılı giriş - login fonksiyonunu çağırmadan direkt ana ekrana yönlendir
          showSuccess('Başarılı', 'Giriş işlemi başarılı! Erişim başlatılıyor.');
          
          // Ağır bir sorun varsa uygulamayı yeniden başlatma seçeneği sun
          setTimeout(() => {
            Alert.alert(
              'Giriş Başarılı',
              'Hesabınıza giriş yapıldı, ancak hesap bilgileriniz tam olarak yüklenemedi. Uygulamayı yeniden başlatmak ister misiniz?',
              [
                { text: 'Hayır', style: 'cancel' },
                { text: 'Evet', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] }) }
              ]
            );
          }, 1500);
          return;
        } else {
          // API'den gelen özel hatayı göster
          Alert.alert(
            'Giriş Yapılamadı', 
            result.message || 'Giriş yapılamadı, lütfen bilgilerinizi kontrol edin.',
            [
              { text: 'Tamam' },
              { 
                text: 'Şifremi Unuttum', 
                onPress: handleForgotPassword,
                style: 'cancel' 
              }
            ]
          );
        }
      } else {
        // Normal login işlemi
        const success = await login(email, password);
        setLoginAttempts(prev => prev + 1);
        
        if (!success) {
          if (loginAttempts === 1) {
            // İkinci başarısız denemede ipucu göster
            showInfo(
              'Giriş Bilgisi', 
              'E-posta adresinizi ve şifrenizi kontrol edip tekrar deneyin. Şifrenizi unuttuysanız "Şifremi Unuttum" seçeneğini kullanabilirsiniz.'
            );
          } else if (loginAttempts === 2) {
            // Üçüncü başarısız denemede farklı ipucu göster
            Alert.alert(
              'Giriş İpucu', 
              'Eğer kayıtlı bir hesabınız yoksa, kayıt olabilir veya daha sonra tekrar deneyebilirsiniz.',
              [
                { text: 'Tamam' },
                { 
                  text: 'Kayıt Ol', 
                  onPress: () => navigation.navigate('Register'),
                  style: 'cancel' 
                }
              ]
            );
          }
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert(
        'Bağlantı Hatası', 
        'Giriş işlemi sırasında bağlantı sorunu oluştu. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.'
      );
    } finally {
      hideLoading();
    }
  };

  const handleForgotPassword = () => {
    // Şifremi unuttum
    Alert.alert(
      'Şifremi Unuttum',
      'Şifremi unuttum özelliği henüz aktif değil. Yardım için lütfen sistem yöneticisiyle iletişime geçin.',
      [{ text: 'Tamam' }]
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim }
              ],
            },
          ]}
        >
          <Image
            source={require('../../../assets/images/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>Dietçim</Text>
          <Text style={styles.appSlogan}>Kolay ve Profesyonel Beslenme Yönetimi</Text>
          
          {apiStatus.checked && !apiStatus.connected && (
            <View style={styles.connectionWarning}>
              <Text style={styles.connectionWarningText}>
                ⚠️ Sunucu bağlantısı kurulamadı
              </Text>
            </View>
          )}
        </Animated.View>

        <Animated.View
          style={[
            styles.formContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: Animated.multiply(slideAnim, 1.2) }],
            },
          ]}
        >
          <TextInput
            label="E-posta"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            outlineColor={theme.palette.grey[300]}
            activeOutlineColor={theme.palette.primary.main}
            error={!!errors.email}
            left={<TextInput.Icon icon="email" color={theme.palette.grey[600]} />}
          />
          {errors.email && <HelperText type="error">{errors.email}</HelperText>}

          <TextInput
            label="Şifre"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry={secureTextEntry}
            style={styles.input}
            outlineColor={theme.palette.grey[300]}
            activeOutlineColor={theme.palette.primary.main}
            error={!!errors.password}
            left={<TextInput.Icon icon="lock" color={theme.palette.grey[600]} />}
            right={
              <TextInput.Icon
                icon={secureTextEntry ? 'eye' : 'eye-off'}
                color={theme.palette.grey[600]}
                onPress={() => setSecureTextEntry(!secureTextEntry)}
              />
            }
          />
          {errors.password && <HelperText type="error">{errors.password}</HelperText>}

          <Button
            mode="contained"
            onPress={handleLogin}
            style={styles.loginButton}
            contentStyle={styles.buttonContent}
            buttonColor={theme.palette.primary.main}
          >
            Giriş Yap
          </Button>

          <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPasswordContainer}>
            <Text style={styles.forgotPasswordText}>Şifremi Unuttum</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View
          style={[
            styles.registerContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: Animated.multiply(slideAnim, 1.5) }],
            },
          ]}
        >
          <Text style={styles.registerText}>Hesabınız yok mu?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerLink}>Kayıt Ol</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.palette.background.default,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xl * 2,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: theme.spacing.md,
  },
  appName: {
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.palette.primary.main,
    marginBottom: theme.spacing.xs,
  },
  appSlogan: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.palette.text.secondary,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    ...theme.shadows.md,
    alignSelf: 'center',
  },
  input: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.palette.background.paper,
    width: '100%',
    alignSelf: 'center',
  },
  loginButton: {
    marginTop: theme.spacing.md,
    borderRadius: theme.shape.borderRadius.md,
  },
  buttonContent: {
    height: 48,
  },
  forgotPasswordContainer: {
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  forgotPasswordText: {
    color: theme.palette.primary.main,
    fontSize: theme.typography.fontSize.sm,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    color: theme.palette.text.secondary,
    marginRight: theme.spacing.xs,
  },
  registerLink: {
    color: theme.palette.primary.main,
    fontWeight: theme.typography.fontWeight.medium,
  },
  connectionWarning: {
    marginTop: 10,
    padding: 5,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.5)',
  },
  connectionWarningText: {
    color: '#856404',
    fontSize: 12,
    textAlign: 'center',
  }
});

export default LoginScreen; 