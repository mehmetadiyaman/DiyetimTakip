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
} from 'react-native';
import { TextInput, Button, HelperText } from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import { useFeedback } from '../../contexts/FeedbackContext';
import theme from '../../themes/theme';

const { width } = Dimensions.get('window');

const LoginScreen = ({ navigation }) => {
  const { login, error: authError, clearErrors } = useAuth();
  const { showLoading, hideLoading, showErrorDialog } = useFeedback();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [errors, setErrors] = useState({});

  // Animasyon değerleri
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

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

  useEffect(() => {
    // Auth hatası oluştuğunda diyalog göster
    if (authError) {
      showErrorDialog('Giriş Hatası', authError, clearErrors);
    }
  }, [authError, showErrorDialog, clearErrors]);

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

    try {
      showLoading('Giriş yapılıyor...');
      await login(email, password);
    } catch (error) {
      // Hata işleme useAuth hook'ta yapılıyor
      console.error('Login error:', error);
    } finally {
      hideLoading();
    }
  };

  const handleForgotPassword = () => {
    // Şifremi unuttum
    showErrorDialog('Bilgi', 'Şifremi unuttum özelliği yakında eklenecek');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
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
    paddingVertical: theme.spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
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
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
    ...theme.shadows.md,
  },
  input: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.palette.background.paper,
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
});

export default LoginScreen; 