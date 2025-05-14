import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';

const RegisterScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { register, loading, error } = useAuth();

  const handleRegister = async () => {
    // Validation
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurunuz');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Hata', 'Şifreler eşleşmiyor');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Hata', 'Şifre en az 6 karakter olmalıdır');
      return;
    }

    const userData = {
      name,
      email,
      password
    };

    const success = await register(userData);
    
    if (!success && !error) {
      Alert.alert('Hata', 'Kayıt işlemi başarısız oldu');
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Dietçim'e Kaydolun</Text>
          <Text style={styles.subtitle}>Diyetisyenlik uygulamanızı mobil erişimle güçlendirin</Text>
        </View>

        <View style={styles.formContainer}>
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}

          <TextInput
            label="Ad Soyad"
            value={name}
            onChangeText={setName}
            mode="outlined"
            style={styles.input}
            outlineColor="#4caf50"
            activeOutlineColor="#2e7d32"
            left={<TextInput.Icon icon="account" color="#4caf50" />}
          />

          <TextInput
            label="E-posta"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
            outlineColor="#4caf50"
            activeOutlineColor="#2e7d32"
            left={<TextInput.Icon icon="email" color="#4caf50" />}
          />

          <TextInput
            label="Şifre"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry={!showPassword}
            style={styles.input}
            outlineColor="#4caf50"
            activeOutlineColor="#2e7d32"
            left={<TextInput.Icon icon="lock" color="#4caf50" />}
            right={
              <TextInput.Icon 
                icon={showPassword ? "eye-off" : "eye"} 
                onPress={() => setShowPassword(!showPassword)} 
                color="#4caf50"
              />
            }
          />

          <TextInput
            label="Şifre Tekrar"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            mode="outlined"
            secureTextEntry={!showPassword}
            style={styles.input}
            outlineColor="#4caf50"
            activeOutlineColor="#2e7d32"
            left={<TextInput.Icon icon="lock-check" color="#4caf50" />}
          />

          <Button 
            mode="contained" 
            onPress={handleRegister} 
            style={styles.button}
            loading={loading}
            disabled={loading}
            buttonColor="#4caf50"
          >
            Kayıt Ol
          </Button>

          <TouchableOpacity 
            onPress={() => navigation.navigate('Login')}
            style={styles.loginLink}
          >
            <Text style={styles.loginText}>
              Zaten hesabınız var mı? <Text style={styles.loginTextBold}>Giriş Yapın</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 60,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4caf50',
    marginBottom: 5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    width: '100%',
    alignSelf: 'center',
  },
  input: {
    marginBottom: 15,
    backgroundColor: 'white',
    width: '100%',
    alignSelf: 'center',
  },
  button: {
    marginTop: 10,
    marginBottom: 20,
    paddingVertical: 8,
  },
  errorText: {
    color: '#d32f2f',
    marginBottom: 15,
    textAlign: 'center',
  },
  loginLink: {
    alignItems: 'center',
  },
  loginText: {
    color: '#757575',
    fontSize: 14,
  },
  loginTextBold: {
    color: '#4caf50',
    fontWeight: 'bold',
  },
});

export default RegisterScreen; 