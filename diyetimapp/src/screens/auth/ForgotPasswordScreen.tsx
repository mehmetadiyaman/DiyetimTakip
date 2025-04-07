import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { TextInput, Button, Text, Surface, IconButton } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthStackParamList } from '../../types';
import { authAPI } from '../../api/authAPI';

// Validasyon şeması
const forgotPasswordSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi girin'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
type ForgotPasswordScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

const ForgotPasswordScreen = () => {
  const navigation = useNavigation<ForgotPasswordScreenNavigationProp>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { control, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      
      const response = await authAPI.forgotPassword(data);
      setSuccess(response.message || 'Şifre sıfırlama talimatları e-posta adresinize gönderildi.');
    } catch (error: any) {
      setError(error.response?.data?.message || 'Şifre sıfırlama isteği gönderilirken bir hata oluştu.');
      console.error('Forgot password failed:', error);
    } finally {
      setIsLoading(false);
    }
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
          <Text style={styles.title}>Şifremi Unuttum</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <Text style={styles.subtitle}>
          E-posta adresinizi girin ve size şifre sıfırlama talimatlarını göndereceğiz.
        </Text>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {success && (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>{success}</Text>
          </View>
        )}

        <View style={styles.formContainer}>
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

          <Button 
            mode="contained" 
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            disabled={isLoading || !!success}
            style={styles.button}
          >
            Şifre Sıfırlama Linki Gönder
          </Button>

          <TouchableOpacity 
            onPress={() => navigation.navigate('Login')}
            style={styles.loginLink}
          >
            <Text style={styles.loginLinkText}>Giriş Sayfasına Dön</Text>
          </TouchableOpacity>
        </View>
      </Surface>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    justifyContent: 'center',
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
  loginLink: {
    alignSelf: 'center',
    marginTop: 24,
  },
  loginLinkText: {
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
  successContainer: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 4,
    marginBottom: 16,
  },
  successText: {
    color: '#2E7D32',
    fontSize: 14,
  },
});

export default ForgotPasswordScreen; 