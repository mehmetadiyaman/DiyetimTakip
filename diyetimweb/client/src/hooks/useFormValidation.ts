import * as Yup from 'yup';
import { isValidDate } from '../utils/formatDate';

// Yaygın veri tipleri için doğrulama şemaları
export const validationSchemas = {
  // Boş olamayan metin alanı
  requiredString: Yup.string().required('Bu alan gereklidir'),
  
  // E-posta doğrulama
  email: Yup.string()
    .email('Geçerli bir e-posta adresi giriniz')
    .required('E-posta adresi gereklidir'),
  
  // Telefon numarası doğrulama (Türkiye formatı)
  phone: Yup.string()
    .matches(/^(\+90|0)?\s*5\d{2}\s*\d{3}\s*\d{2}\s*\d{2}$/, 'Geçerli bir Türkiye telefon numarası giriniz (5XX XXX XX XX)')
    .transform((value) => {
      if (!value) return value;
      // Telefon numarasını standartlaştır
      return value.replace(/\s+/g, '').replace(/^0/, '+90');
    }),
  
  // Şifre doğrulama (minimum 8 karakter, en az 1 büyük harf, 1 küçük harf ve 1 rakam)
  password: Yup.string()
    .min(8, 'Şifre en az 8 karakter olmalıdır')
    .matches(/[a-z]/, 'Şifre en az bir küçük harf içermelidir')
    .matches(/[A-Z]/, 'Şifre en az bir büyük harf içermelidir')
    .matches(/[0-9]/, 'Şifre en az bir rakam içermelidir')
    .required('Şifre gereklidir'),
  
  // Tarih doğrulama (YYYY-MM-DD formatı)
  date: Yup.string()
    .test('is-date', 'Geçerli bir tarih giriniz (GG.AA.YYYY)', (value) => {
      if (!value) return true; // Boş değer kontrolü yapılmıyor, gerekirse .required() ekle
      
      // YYYY-MM-DD formatı kontrolü
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [year, month, day] = value.split('-').map(Number);
        return isValidDate(year, month - 1, day);
      }
      
      // DD.MM.YYYY formatı kontrolü
      if (/^\d{2}\.\d{2}\.\d{4}$/.test(value)) {
        const [day, month, year] = value.split('.').map(Number);
        return isValidDate(year, month - 1, day);
      }
      
      return false;
    }),
  
  // Saat doğrulama (HH:MM formatı)
  time: Yup.string()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Geçerli bir saat giriniz (SS:DD)'),
  
  // Sayısal değer doğrulama
  number: Yup.number()
    .typeError('Geçerli bir sayı giriniz')
    .required('Bu alan gereklidir'),
  
  // Para değeri doğrulama
  currency: Yup.number()
    .typeError('Geçerli bir tutar giriniz')
    .positive('Tutar pozitif olmalıdır')
    .required('Tutar gereklidir')
    .transform((value) => parseFloat(value.toFixed(2))), // 2 ondalık basamak
  
  // Yaş doğrulama
  age: Yup.number()
    .typeError('Geçerli bir yaş giriniz')
    .integer('Yaş tam sayı olmalıdır')
    .min(0, 'Yaş negatif olamaz')
    .max(120, 'Geçerli bir yaş giriniz'),
  
  // TC Kimlik numarası doğrulama
  tcIdentity: Yup.string()
    .matches(/^\d{11}$/, 'TC Kimlik numarası 11 rakamdan oluşmalıdır')
    .test('is-valid-tc', 'Geçerli bir TC Kimlik numarası giriniz', (value) => {
      if (!value) return true;
      
      // TC Kimlik algoritma doğrulaması
      if (!/^\d{11}$/.test(value)) return false;
      
      const digits = value.split('').map(Number);
      
      // İlk 10 basamağın toplamının modulo 10'u son basamağa eşit olmalıdır
      const lastDigitCheck = (digits.slice(0, 10).reduce((sum, digit) => sum + digit, 0) % 10) === digits[10];
      
      // 1, 3, 5, 7, 9. basamakların toplamı * 7 eksi 2, 4, 6, 8. basamakların toplamı modulo 10 10. basamağa eşit olmalıdır
      const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
      const evenSum = digits[1] + digits[3] + digits[5] + digits[7];
      const tenthDigitCheck = ((oddSum * 7) - evenSum) % 10 === digits[9];
      
      return lastDigitCheck && tenthDigitCheck;
    }),
  
  // URL doğrulama
  url: Yup.string()
    .url('Geçerli bir URL giriniz')
    .required('URL gereklidir'),
};

// Yaygın veri formatları için dönüşüm fonksiyonları
export const dataTransformers = {
  // Boşlukları temizle
  trimString: (value: string) => (value ? value.trim() : value),
  
  // Yalnızca sayıya dönüştür
  toNumber: (value: any) => {
    if (typeof value === 'number') return value;
    if (!value) return undefined;
    
    // Virgül yerine nokta kullan
    const normalized = String(value).replace(',', '.');
    const num = parseFloat(normalized);
    return isNaN(num) ? undefined : num;
  },
  
  // Tarihi standartlaştır (YYYY-MM-DD formatına)
  standardizeDate: (value: string) => {
    if (!value) return '';
    
    // Zaten YYYY-MM-DD formatındaysa
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }
    
    // DD.MM.YYYY veya DD/MM/YYYY formatını YYYY-MM-DD'ye dönüştür
    if (/^(\d{2})[./-](\d{2})[./-](\d{4})$/.test(value)) {
      const parts = value.split(/[./-]/);
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    
    // Diğer durumlarda boş döndür
    return '';
  },
  
  // Saati standartlaştır (HH:MM formatına)
  standardizeTime: (value: string) => {
    if (!value) return '';
    
    // HH:MM formatındaysa
    if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(value)) {
      return value;
    }
    
    // H:MM formatını HH:MM'e dönüştür
    if (/^(\d):([0-5]\d)$/.test(value)) {
      const [hour, minute] = value.split(':');
      return `0${hour}:${minute}`;
    }
    
    // Diğer durumlarda boş döndür
    return '';
  },
  
  // Telefon numarasını standartlaştır
  formatPhoneNumber: (value: string) => {
    if (!value) return '';
    
    // Tüm boşlukları ve özel karakterleri kaldır
    let phone = value.replace(/\D/g, '');
    
    // Türkiye kodu ekle
    if (phone.length === 10 && phone.startsWith('5')) {
      phone = `+90${phone}`;
    } else if (phone.length === 11 && phone.startsWith('05')) {
      phone = `+9${phone}`;
    }
    
    // Formatla: +90 5XX XXX XX XX
    if (phone.length === 12 && phone.startsWith('90')) {
      return `+${phone.slice(0, 2)} ${phone.slice(2, 5)} ${phone.slice(5, 8)} ${phone.slice(8, 10)} ${phone.slice(10, 12)}`;
    }
    
    return value;
  },
  
  // Para birimi formatla
  formatCurrency: (value: number | string, decimals: number = 2) => {
    if (value === undefined || value === null || value === '') return '';
    
    const num = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value;
    
    if (isNaN(num)) return '';
    
    return num.toLocaleString('tr-TR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  },
  
  // TC Kimlik numarasını formatla (ilk 3 ve son 4 basamak gizli)
  maskTCIdentity: (value: string) => {
    if (!value || value.length !== 11) return value;
    
    return `${value.slice(0, 3)}******${value.slice(9)}`;
  }
};

// Yaygın form doğrulama şemalarını oluştur
export const createValidationSchema = (fields: Record<string, Yup.AnySchema>) => {
  return Yup.object().shape(fields);
};

// Örnek kullanım:
// const userFormSchema = createValidationSchema({
//   email: validationSchemas.email,
//   password: validationSchemas.password,
//   phone: validationSchemas.phone.notRequired(),
//   age: validationSchemas.age.notRequired()
// });

// Formlarda kullanılabilecek önceden tanımlanmış şemalar
export const predefinedSchemas = {
  // Kullanıcı giriş formu
  login: createValidationSchema({
    email: validationSchemas.email,
    password: Yup.string().required('Şifre gereklidir')
  }),
  
  // Kullanıcı kayıt formu
  register: createValidationSchema({
    fullName: validationSchemas.requiredString,
    email: validationSchemas.email,
    password: validationSchemas.password,
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('password')], 'Şifreler eşleşmiyor')
      .required('Şifre onayı gereklidir')
  }),
  
  // Kişisel bilgiler formu
  personalInfo: createValidationSchema({
    fullName: validationSchemas.requiredString,
    email: validationSchemas.email,
    phone: validationSchemas.phone.notRequired(),
    birthDate: validationSchemas.date.notRequired(),
    tcIdentity: validationSchemas.tcIdentity.notRequired(),
    address: Yup.string().notRequired()
  }),
  
  // Randevu oluşturma formu
  appointment: createValidationSchema({
    clientId: Yup.string().required('Danışan seçimi gereklidir'),
    date: validationSchemas.date.required('Tarih gereklidir'),
    time: validationSchemas.time.required('Saat gereklidir'),
    duration: Yup.number()
      .typeError('Süre bir sayı olmalıdır')
      .min(15, 'Minimum süre 15 dakika olmalıdır')
      .max(240, 'Maksimum süre 4 saat olmalıdır')
      .required('Süre gereklidir'),
    notes: Yup.string().notRequired()
  })
}; 