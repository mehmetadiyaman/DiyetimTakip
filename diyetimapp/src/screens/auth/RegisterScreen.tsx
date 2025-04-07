import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { TextInput, Button, Text, Surface, IconButton } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthStackParamList } from '../../types';
import { useAuthStore } from '../../store/authStore';

// Validasyon şeması
const registerSchema = z.object({
  name: z.string().min(3, 'Ad soyad en az 3 karakter olmalıdır'),
  email: z.string().email('Geçerli bir e-posta adresi girin'),
  password: z.string().min(6, 'Şifre en az 6 karakterden oluşmalıdır'),
  passwordConfirmation: z.string().min(6, 'Şifre tekrarı en az 6 karakterden oluşmalıdır'),
}).refine((data) => data.password === data.passwordConfirmation, {
  message: 'Şifreler eşleşmiyor',
  path: ['passwordConfirmation'],
});

type RegisterFormData = z.infer<typeof registerSchema>;
type RegisterScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Register'>;

const RegisterScreen = () => {
  const navigation = useNavigation<RegisterScreenNavigationProp>();
  const [secureTextEntry, setSecureTextEntry] = useState({
    password: true,
    passwordConfirmation: true,
  });
  const { register, isLoading, error, clearError } = useAuthStore();

  const { control, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      passwordConfirmation: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await register(data);
    } catch (error) {
      // Register işlemi store içinde ele alınıyor
      console.error('Register failed:', error);
    }
  };

  const toggleSecureEntry = (field: 'password' | 'passwordConfirmation') => {
    setSecureTextEntry({
      ...secureTextEntry,
      [field]: !secureTextEntry[field],
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Surface style={styles.surface}>
        <View style={styles.header}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => navigation.goBack()}
          />
          <Text style={styles.title}>Kayıt Ol</Text>
          <View style={{ width: 24 }} />
        </View>

        <Text style={styles.subtitle}>
          Diet Tracker Pro'ya hoş geldiniz! Hesap oluşturarak başlayın.
        </Text>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.formContainer}>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Ad Soyad"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                mode="outlined"
                error={!!errors.name}
                style={styles.input}
              />
            )}
          />
          {errors.name && (
            <Text style={styles.errorText}>{errors.name.message}</Text>
          )}

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="E-posta"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                error={!!errors.email}
                style={styles.input}
              />
            )}
          />
          {errors.email && (
            <Text style={styles.errorText}>{errors.email.message}</Text>
          )}

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Şifre"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                mode="outlined"
                secureTextEntry={secureTextEntry.password}
                error={!!errors.password}
                style={styles.input}
                right={
                  <TextInput.Icon 
                    icon={secureTextEntry.password ? "eye" : "eye-off"} 
                    onPress={() => toggleSecureEntry('password')} 
                  />
                }
              />
            )}
          />
          {errors.password && (
            <Text style={styles.errorText}>{errors.password.message}</Text>
          )}

          <Controller
            control={control}
            name="passwordConfirmation"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Şifre Tekrarı"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                mode="outlined"
                secureTextEntry={secureTextEntry.passwordConfirmation}
                error={!!errors.passwordConfirmation}
                style={styles.input}
                right={
                  <TextInput.Icon 
                    icon={secureTextEntry.passwordConfirmation ? "eye" : "eye-off"} 
                    onPress={() => toggleSecureEntry('passwordConfirmation')} 
                  />
                }
              />
            )}
          />
          {errors.passwordConfirmation && (
            <Text style={styles.errorText}>{errors.passwordConfirmation.message}</Text>
          )}

          <Button 
            mode="contained" 
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            disabled={isLoading}
            style={styles.button}
          >
            Kayıt Ol
          </Button>

          <View style={styles.loginContainer}>
            <Text>Zaten hesabınız var mı? </Text>
            <TouchableOpacity 
              onPress={() => {
                clearError();
                navigation.navigate('Login');
              }}
            >
              <Text style={styles.loginText}>Giriş Yap</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Surface>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: '#F5F5F5',
  },
  surface: {
    padding: 24,
    borderRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#2E7D32',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    color: '#757575',
  },
  formContainer: {
    marginTop: 16,
  },
  input: {
    marginBottom: 8,
  },
  button: {
    marginTop: 16,
    paddingVertical: 8,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  loginText: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 4,
    marginBottom: 16,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 12,
    marginBottom: 8,
  },
});

export default RegisterScreen; 