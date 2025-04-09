import React, { useState, useEffect } from "react";
import { Formik, Form } from 'formik';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import * as Yup from 'yup';
import { useAuth } from '../hooks/useAuth';
import { InputField, FormActions } from '../components/FormFields';
import { toast } from 'react-hot-toast';
import logoImg from "@/assets/images/Diyetcim Logo - Original.png";

// Login form validation schema
const loginSchema = Yup.object().shape({
  email: Yup.string()
    .email('Geçerli bir e-posta adresi giriniz')
    .required('E-posta adresi gerekli'),
  password: Yup.string()
    .min(6, 'Şifre en az 6 karakter olmalıdır')
    .required('Şifre gerekli'),
});

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [redirected, setRedirected] = useState(false);

  // Redirect kullanıcıyı zaten giriş yapmışsa dashboard'a yönlendir
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // URL'den redirect parametresini al
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const redirectReason = params.get('redirect');
    
    if (redirectReason === 'session_expired') {
      toast.error('Oturumunuz sona erdi. Lütfen tekrar giriş yapın.');
      setRedirected(true);
    } else if (redirectReason === 'auth_required') {
      toast('Bu sayfaya erişmek için giriş yapmanız gerekiyor.', {
        icon: 'ℹ️',
      });
      setRedirected(true);
    }
  }, [location]);

  const handleLogin = async (values: { email: string; password: string }) => {
    setIsLoading(true);
    setErrorMessage(null);
    
    try {
      await login(values);
      navigate(redirected ? '/dashboard' : (location.state?.from || '/dashboard'));
    } catch (error: any) {
      setLoginAttempts(prev => prev + 1);
      
      // Hata mesajlarını daha kullanıcı dostu yap
      const errorMsg = error?.response?.data?.message || error.message || 'Giriş sırasında bir hata oluştu';
      
      if (errorMsg.includes('credentials') || errorMsg.includes('password')) {
        setErrorMessage('E-posta veya şifre hatalı. Lütfen bilgilerinizi kontrol edin.');
      } else if (errorMsg.includes('many attempts')) {
        setErrorMessage('Çok fazla başarısız giriş denemesi. Lütfen daha sonra tekrar deneyin veya şifrenizi sıfırlayın.');
      } else {
        setErrorMessage(errorMsg);
      }
      
      // 3 başarısız denemeden sonra şifre sıfırlama önerisi göster
      if (loginAttempts >= 2) {
        toast.error(
          <div>
            <p>Giriş yapmakta sorun mu yaşıyorsunuz?</p>
            <Link to="/forgot-password" className="text-primary hover:underline font-medium">
              Şifrenizi sıfırlayın
            </Link>
          </div>, 
          { duration: 5000 }
        );
      }
    } finally {
      setIsLoading(false);
    }
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
                Diyetisyen hesabınıza giriş yapın ve danışanlarınızı takip etmeye başlayın.
              </p>
              <div className="bg-white/80 dark:bg-slate-800/50 p-4 rounded-lg shadow-md">
                <p className="text-gray-700 dark:text-gray-200 text-sm">
                  "Diyetcim, danışanlarımın beslenme süreçlerini takip etmemi inanılmaz kolaylaştırdı."
                </p>
                <p className="mt-2 font-medium text-primary dark:text-primary-light text-right">- Uzman Diyetisyen</p>
              </div>
            </div>
          </div>
          
          {/* Giriş Formu */}
          <div className="lg:w-7/12 p-8">
            <div className="max-w-md mx-auto">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Giriş Yap</h2>
              
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
                initialValues={{ email: '', password: '' }}
                validationSchema={loginSchema}
                onSubmit={handleLogin}
              >
                {({ isSubmitting, values, errors, touched }) => (
                  <Form className="space-y-6">
                    <InputField 
                      name="email"
                      label="E-posta"
                      type="email" 
                      placeholder="ornek@diyet.com"
                      required
                      autoComplete="email"
                      containerClass="relative"
                    />
                    
                    <div className="relative">
                      <InputField 
                        name="password"
                        label="Şifre"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        required
                        autoComplete="current-password"
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
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          id="remember-me"
                          name="remember-me"
                          type="checkbox"
                          className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                        <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                          Beni hatırla
                        </label>
                      </div>
                      <div className="text-sm">
                        <Link to="/forgot-password" className="font-medium text-primary hover:text-primary-dark dark:text-primary-light dark:hover:text-primary transition-colors duration-200">
                          Şifrenizi mi unuttunuz?
                        </Link>
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
                              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                          </span>
                        )}
                        {isLoading ? "Giriş yapılıyor..." : "Giriş Yap"}
                      </button>
                    </div>

                    <div className="text-sm text-center mt-4">
                      <span className="text-gray-600 dark:text-gray-400">Hesabınız yok mu? </span>
                      <Link to="/register" className="font-medium text-primary hover:text-primary-dark dark:text-primary-light dark:hover:text-primary transition-colors duration-200">
                        Kayıt Olun
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

export default Login;
