import { useState, useEffect } from 'react';
import { Formik, Form, FormikHelpers } from 'formik';
import { Link, useNavigate } from 'react-router-dom';
import * as Yup from 'yup';
import { useAuth } from '../hooks/useAuth';
import { InputField, FormActions, CheckboxField } from '../components/FormFields';
import { toast } from 'react-hot-toast';
import logoImg from "@/assets/images/Diyetcim Logo - Original.png";

// Şifre gücü türleri
enum PasswordStrength {
  WEAK = 'weak',
  MEDIUM = 'medium',
  STRONG = 'strong'
}

// Şifre gücünü hesaplama fonksiyonu
const calculatePasswordStrength = (password: string): PasswordStrength => {
  if (password.length < 6) return PasswordStrength.WEAK;
  
  let score = 0;
  // Uzunluk kontrolü
  if (password.length >= 8) score += 1;
  if (password.length >= 10) score += 1;
  
  // Karakter çeşitliliği kontrolü
  if (/[A-Z]/.test(password)) score += 1; // Büyük harf
  if (/[a-z]/.test(password)) score += 1; // Küçük harf
  if (/[0-9]/.test(password)) score += 1; // Rakam
  if (/[^A-Za-z0-9]/.test(password)) score += 1; // Özel karakter
  
  if (score >= 5) return PasswordStrength.STRONG;
  if (score >= 3) return PasswordStrength.MEDIUM;
  return PasswordStrength.WEAK;
};

// Kayıt formu validasyon şeması
const registerSchema = Yup.object().shape({
  email: Yup.string()
    .email('Geçerli bir e-posta adresi giriniz')
    .required('E-posta adresi gerekli'),
  password: Yup.string()
    .min(6, 'Şifre en az 6 karakter olmalıdır')
    .required('Şifre gerekli'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Şifreler eşleşmiyor')
    .required('Şifre onayı gerekli'),
  fullName: Yup.string()
    .required('Ad Soyad gerekli')
    .min(2, 'Ad Soyad en az 2 karakter olmalıdır'),
  username: Yup.string()
    .min(3, 'Kullanıcı adı en az 3 karakter olmalıdır')
    .matches(/^[a-zA-Z0-9_]+$/, 'Kullanıcı adı sadece harf, rakam ve alt çizgi içerebilir')
    .required('Kullanıcı adı gerekli'),
  termsAccepted: Yup.boolean()
    .oneOf([true], 'Devam etmek için kullanım koşullarını kabul etmelisiniz')
});

// Form değerleri tipi
interface RegisterFormValues {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  username: string;
  termsAccepted: boolean;
}

const Register = () => {
  const navigate = useNavigate();
  const { register, user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>(PasswordStrength.WEAK);
  const [passwordTouched, setPasswordTouched] = useState(false);

  // İlk formu değerleri
  const initialValues: RegisterFormValues = {
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    username: '',
    termsAccepted: false
  };

  // Kullanıcı zaten giriş yapmışsa yönlendir
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Şifre gücünü kontrol et
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>, setFieldValue: FormikHelpers<RegisterFormValues>['setFieldValue']) => {
    const password = e.target.value;
    setFieldValue('password', password);
    setPasswordStrength(calculatePasswordStrength(password));
    setPasswordTouched(true);
  };

  // Kayıt işlemini gerçekleştir
  const handleRegister = async (values: RegisterFormValues) => {
    // confirmPassword ve termsAccepted API'ye göndermeden önce kaldır
    const { confirmPassword, termsAccepted, ...registerData } = values;
    
    setIsLoading(true);
    setErrorMessage(null);
    
    try {
      await register(registerData);
      toast.success('Kayıt başarılı! Hoş geldiniz.');
      navigate('/dashboard');
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error.message || 'Kayıt sırasında bir hata oluştu';
      
      // Hata mesajlarını daha kullanıcı dostu hale getir
      if (errorMsg.includes('email') && errorMsg.includes('exists')) {
        setErrorMessage('Bu e-posta adresi zaten kullanılıyor. Lütfen farklı bir e-posta adresi deneyin.');
      } else if (errorMsg.includes('username') && errorMsg.includes('exists')) {
        setErrorMessage('Bu kullanıcı adı zaten kullanılıyor. Lütfen farklı bir kullanıcı adı deneyin.');
      } else {
        setErrorMessage(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Şifre kriteri kontrolü
  const checkPasswordCriteria = (password: string) => {
    return {
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[^A-Za-z0-9]/.test(password),
      hasMinLength: password.length >= 8
    };
  };

  // Şifre gücü göstergesi bileşeni
  interface PasswordStrengthIndicatorProps {
    strength: PasswordStrength;
    password: string;
  }

  const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({ strength, password }) => {
    const getColorClass = () => {
      switch (strength) {
        case PasswordStrength.STRONG:
          return 'bg-green-500';
        case PasswordStrength.MEDIUM:
          return 'bg-yellow-500';
        default:
          return 'bg-red-500';
      }
    };
    
    const getLabel = () => {
      switch (strength) {
        case PasswordStrength.STRONG:
          return 'Güçlü';
        case PasswordStrength.MEDIUM:
          return 'Orta';
        default:
          return 'Zayıf';
      }
    };
    
    return (
      <div className="mt-1">
        <div className="flex items-center justify-between">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`${getColorClass()} h-2 rounded-full transition-all duration-300`}
              style={{ width: strength === PasswordStrength.WEAK ? '33%' : 
                         strength === PasswordStrength.MEDIUM ? '66%' : '100%' }}
            ></div>
          </div>
          <span className={`ml-2 text-xs ${
            strength === PasswordStrength.WEAK ? 'text-red-500' :
            strength === PasswordStrength.MEDIUM ? 'text-yellow-600' : 'text-green-600'
          }`}>
            {getLabel()}
          </span>
        </div>
        {passwordTouched && strength !== PasswordStrength.STRONG && password && (
          <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            <p>Güçlü bir şifre için:</p>
            <ul className="list-disc list-inside">
              <li className={checkPasswordCriteria(password).hasUpperCase ? "text-green-600" : ""}>
                En az bir büyük harf
              </li>
              <li className={checkPasswordCriteria(password).hasLowerCase ? "text-green-600" : ""}>
                En az bir küçük harf
              </li>
              <li className={checkPasswordCriteria(password).hasNumber ? "text-green-600" : ""}>
                En az bir rakam
              </li>
              <li className={checkPasswordCriteria(password).hasSpecialChar ? "text-green-600" : ""}>
                En az bir özel karakter
              </li>
              <li className={checkPasswordCriteria(password).hasMinLength ? "text-green-600" : ""}>
                En az 8 karakter
              </li>
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gray-50 dark:bg-[#121a29]">
      {/* Arkaplan Deseni */}
      <div className="absolute inset-0 z-0 opacity-40 dark:opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI3MCIgaGVpZ2h0PSI3MCI+CjxyZWN0IHdpZHRoPSI3MCIgaGVpZ2h0PSI3MCIgZmlsbD0iI2ZmZmZmZjEwIj48L3JlY3Q+CjxjaXJjbGUgY3g9IjciIGN5PSI3IiByPSIyIiBmaWxsPSIjMzI5MmYxMjAiPjwvY2lyY2xlPgo8cG9seWxpbmUgcG9pbnRzPSIzNSwwIDcwLDM1IDM1LDcwIDAsOTAiIHN0cm9rZT0iIzMyOTJmMTEwIiBmaWxsPSJub25lIj48L3BvbHlsaW5lPgo8L3N2Zz4=')]"></div>
      
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
        <div className="flex flex-col lg:flex-row shadow-2xl rounded-xl overflow-hidden bg-white dark:bg-[#1a2234] border border-gray-200 dark:border-[#2a3441]">
          {/* Logo ve Hoşgeldiniz Bölümü */}
          <div className="lg:w-5/12 flex flex-col justify-center items-center py-12 px-8 bg-gradient-to-br from-primary-light/10 to-primary-dark/20 dark:from-primary-dark/20 dark:to-slate-900/40">
            <div className="text-center">
              <img 
                src={logoImg} 
                alt="Diyetcim Logo" 
                className="h-auto w-40 mx-auto mb-8 object-contain dark:brightness-110"
              />
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Diyetcim'e Hoş Geldiniz</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                Sağlıklı yaşam yolculuğunuzda danışanlarınızı kolayca takip edin.
              </p>
              <div className="bg-white/80 dark:bg-slate-800/50 p-4 rounded-lg shadow-md">
                <p className="text-gray-700 dark:text-gray-200 text-sm">
                  "Diyetcim uygulaması sayesinde tüm danışanlarımı ve diyet planlarını tek bir yerden kolayca yönetebiliyorum."
                </p>
                <p className="mt-2 font-medium text-primary dark:text-primary-light text-right">- Uzman Diyetisyen</p>
              </div>
            </div>
          </div>
          
          {/* Kayıt Formu */}
          <div className="lg:w-7/12 p-8">
            <div className="max-w-md mx-auto">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Hesap Oluştur</h2>
              
              {errorMessage && (
                <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 mb-6">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <Formik
                initialValues={initialValues}
                validationSchema={registerSchema}
                onSubmit={handleRegister}
              >
                {({ isSubmitting, values, errors, touched, setFieldValue }) => (
                  <Form className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <InputField 
                        name="fullName"
                        label="Ad Soyad"
                        type="text" 
                        placeholder="Adınız ve Soyadınız"
                        required
                      />
                      
                      <InputField 
                        name="username"
                        label="Kullanıcı Adı"
                        type="text" 
                        placeholder="kullanici_adi"
                        required
                      />
                    </div>
                    
                    <InputField 
                      name="email"
                      label="E-posta"
                      type="email" 
                      placeholder="ornek@diyet.com"
                      required
                      autoComplete="email"
                    />
                    
                    <div className="relative">
                      <InputField 
                        name="password"
                        label="Şifre"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        required
                        autoComplete="new-password"
                        onChange={(e) => handlePasswordChange(e, setFieldValue)}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-9 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                      
                      {values.password && <PasswordStrengthIndicator strength={passwordStrength} password={values.password} />}
                    </div>
                    
                    <div className="relative">
                      <InputField 
                        name="confirmPassword"
                        label="Şifre Onayı"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        required
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-9 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      <CheckboxField
                        name="termsAccepted"
                        label=""
                        text="Kullanım Koşulları ve Gizlilik Politikası'nı okudum ve kabul ediyorum"
                      />
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        <a href="/terms" className="text-primary hover:text-primary-dark dark:text-primary-light dark:hover:text-primary transition-colors duration-200" target="_blank" rel="noopener noreferrer">
                          Kullanım Koşulları
                        </a>
                        {' '}ve{' '}
                        <a href="/privacy" className="text-primary hover:text-primary-dark dark:text-primary-light dark:hover:text-primary transition-colors duration-200" target="_blank" rel="noopener noreferrer">
                          Gizlilik Politikası
                        </a>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isSubmitting || isLoading}
                        className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark dark:bg-primary-dark dark:hover:bg-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-primary-light transition-colors duration-200"
                      >
                        {isLoading ? (
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                            <svg className="h-5 w-5 text-primary-light group-hover:text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                          </span>
                        )}
                        {isLoading ? "Hesap oluşturuluyor..." : "Kayıt Ol"}
                      </button>
                    </div>

                    <div className="text-sm text-center mt-4">
                      <span className="text-gray-600 dark:text-gray-400">Zaten hesabınız var mı? </span>
                      <Link to="/login" className="font-medium text-primary hover:text-primary-dark dark:text-primary-light dark:hover:text-primary transition-colors duration-200">
                        Giriş Yapın
                      </Link>
                    </div>
                  </Form>
                )}
              </Formik>
            </div>
          </div>
        </div>
        
        {/* Alt Bilgi */}
        <div className="mt-8 text-center text-xs text-gray-500 dark:text-gray-400">
          <p>&copy; {new Date().getFullYear()} Diyetcim. Tüm hakları saklıdır.</p>
        </div>
      </div>
    </div>
  );
};

export default Register;
