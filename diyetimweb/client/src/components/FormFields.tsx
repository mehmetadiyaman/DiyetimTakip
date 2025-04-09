import { useEffect, useState } from 'react';
import { Field, FieldProps, useField, useFormikContext } from 'formik';
import cn from 'classnames';
import { 
  formatDateForInput, 
  formatTimeForInput,
  formatDateForDisplay,
  isValidDate 
} from '../utils/formatDate';

// Temel giriş alanı özellikleri
interface FieldBaseProps {
  name: string;
  label: string;
  className?: string;
  labelClass?: string;
  required?: boolean;
  helper?: string;
  containerClass?: string;
  disabled?: boolean;
}

// Input bileşeni özellikleri
interface InputFieldProps extends FieldBaseProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'date' | 'time' | 'datetime-local';
  placeholder?: string;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  autoComplete?: string;
  pattern?: string;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

// Formik ile entegre metin giriş alanı bileşeni
export const InputField: React.FC<InputFieldProps> = ({
  name,
  label,
  type = 'text',
  placeholder = '',
  className = '',
  labelClass = '',
  required = false,
  helper,
  min,
  max,
  step,
  autoComplete,
  containerClass = '',
  disabled = false,
  pattern,
  onBlur: customOnBlur,
  onChange: customOnChange,
}) => {
  const [field, meta, helpers] = useField(name);
  const hasError = meta.touched && meta.error;
  const { setFieldValue } = useFormikContext();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Özel değişiklik fonksiyonu
    if (customOnChange) {
      customOnChange(e);
    }

    // Sayısal alanlar için doğrulama
    if (type === 'number') {
      const value = e.target.value;
      
      // Boş değer kontrolü
      if (value === '') {
        field.onChange(e);
        return;
      }

      const numValue = Number(value);
      
      // Sayı geçerliliği kontrolü
      if (isNaN(numValue)) {
        return; // Geçersiz sayı girişini engelle
      }
      
      // Min/max sınırlarını kontrol et
      if (min !== undefined && numValue < Number(min)) {
        setFieldValue(name, min);
        return;
      }
      
      if (max !== undefined && numValue > Number(max)) {
        setFieldValue(name, max);
        return;
      }
    }

    field.onChange(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Özel blur fonksiyonu
    if (customOnBlur) {
      customOnBlur(e);
    }

    // Formik'in kendi blur işlemini çağır
    field.onBlur(e);
  };

  return (
    <div className={`mb-4 ${containerClass}`}>
      <label 
        htmlFor={name} 
        className={`block text-sm font-medium text-gray-700 dark:text-gray-200 ${labelClass} ${required ? 'required' : ''}`}
      >
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        {...field}
        id={name}
        type={type}
        placeholder={placeholder}
        className={cn(
          'mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary dark:focus:ring-primary-light dark:focus:border-primary-light sm:text-sm',
          {
            'border-red-500 dark:border-red-400': hasError,
            'bg-gray-100 dark:bg-gray-700': disabled,
          },
          className
        )}
        min={min}
        max={max}
        step={step}
        autoComplete={autoComplete}
        disabled={disabled}
        pattern={pattern}
        onChange={handleChange}
        onBlur={handleBlur}
      />
      {hasError ? (
        <div className="text-red-500 dark:text-red-400 text-xs mt-1">{meta.error}</div>
      ) : helper ? (
        <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">{helper}</div>
      ) : null}
    </div>
  );
};

// Tarih giriş alanı bileşeni
export const DateField: React.FC<InputFieldProps> = (props) => {
  const { setFieldValue } = useFormikContext();
  const [field, meta, helpers] = useField(props.name);
  const [inputValue, setInputValue] = useState('');
  const [parsedDate, setParsedDate] = useState<string>('');
  const hasError = meta.touched && meta.error;

  // Form değeri değiştiğinde input değerini güncelle
  useEffect(() => {
    if (field.value) {
      const formattedDate = formatDateForInput(field.value);
      if (formattedDate) {
        setInputValue(formattedDate);
        setParsedDate(formatDateForDisplay(formattedDate));
      }
    } else {
      setInputValue('');
      setParsedDate('');
    }
  }, [field.value]);

  // Kullanıcı değişikliği
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // YYYY-MM-DD formatına uygun değeri formik'e aktar
    if (newValue) {
      setFieldValue(props.name, newValue);
      setParsedDate(formatDateForDisplay(newValue));
    } else {
      setFieldValue(props.name, '');
      setParsedDate('');
    }
  };

  // Odak kaybedildiğinde
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    field.onBlur(e);
    
    // Girilen değeri doğrula ve düzelt
    if (inputValue) {
      const formattedDate = formatDateForInput(inputValue);
      if (formattedDate !== inputValue) {
        setInputValue(formattedDate);
        setFieldValue(props.name, formattedDate);
      }
      
      // Görünen tarihi güncelle
      setParsedDate(formatDateForDisplay(formattedDate));
    }
  };

  return (
    <div className={`mb-4 ${props.containerClass || ''}`}>
      <label 
        htmlFor={props.name} 
        className={`block text-sm font-medium text-gray-700 dark:text-gray-200 ${props.labelClass || ''} ${props.required ? 'required' : ''}`}
      >
        {props.label} {props.required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          id={props.name}
          name={props.name}
          type="date"
          placeholder={props.placeholder}
          className={cn(
            'mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-primary focus:border-primary dark:focus:ring-primary-light dark:focus:border-primary-light sm:text-sm',
            {
              'border-red-500 dark:border-red-400': hasError,
              'bg-gray-100 dark:bg-gray-700': props.disabled,
            },
            props.className
          )}
          min={props.min as string}
          max={props.max as string}
          value={inputValue}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={props.disabled}
        />
        {parsedDate && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {parsedDate}
          </div>
        )}
      </div>
      {hasError ? (
        <div className="text-red-500 dark:text-red-400 text-xs mt-1">{meta.error}</div>
      ) : props.helper ? (
        <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">{props.helper}</div>
      ) : null}
    </div>
  );
};

// Saat giriş alanı bileşeni
export const TimeField: React.FC<InputFieldProps> = (props) => {
  const { setFieldValue } = useFormikContext();
  const [field, meta, helpers] = useField(props.name);
  const hasError = meta.touched && meta.error;

  // Form değeri değiştiğinde input değerini güncelle
  useEffect(() => {
    if (field.value && typeof field.value === 'string') {
      const formattedTime = formatTimeForInput(field.value);
      if (formattedTime !== field.value) {
        setFieldValue(props.name, formattedTime);
      }
    }
  }, [field.value, props.name, setFieldValue]);

  // Odak kaybedildiğinde
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    field.onBlur(e);
    
    // Girilen değeri doğrula ve düzelt
    if (field.value) {
      const formattedTime = formatTimeForInput(field.value);
      if (formattedTime !== field.value) {
        setFieldValue(props.name, formattedTime);
      }
    }
  };

  return (
    <div className={`mb-4 ${props.containerClass || ''}`}>
      <label 
        htmlFor={props.name} 
        className={`block text-sm font-medium text-gray-700 dark:text-gray-200 ${props.labelClass || ''} ${props.required ? 'required' : ''}`}
      >
        {props.label} {props.required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          id={props.name}
          name={props.name}
          type="time"
          className={cn(
            'mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-primary focus:border-primary dark:focus:ring-primary-light dark:focus:border-primary-light sm:text-sm',
            {
              'border-red-500 dark:border-red-400': hasError,
              'bg-gray-100 dark:bg-gray-700': props.disabled,
            },
            props.className
          )}
          min={props.min as string}
          max={props.max as string}
          value={field.value}
          onChange={field.onChange}
          onBlur={field.onBlur}
          disabled={props.disabled}
        />
      </div>
      {hasError ? (
        <div className="text-red-500 dark:text-red-400 text-xs mt-1">{meta.error}</div>
      ) : props.helper ? (
        <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">{props.helper}</div>
      ) : null}
    </div>
  );
};

// Sayısal alan bileşeni
export const NumberField: React.FC<InputFieldProps & { 
  currency?: boolean; 
  decimals?: number;
  allowNegative?: boolean;
}> = ({
  currency = false,
  decimals = 2,
  allowNegative = false,
  ...props
}) => {
  const { setFieldValue } = useFormikContext();
  const [field, meta] = useField(props.name);
  const hasError = meta.touched && meta.error;

  // Sayısal alan değişikliği
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    // Boş değer kontrolü
    if (newValue === '') {
      setFieldValue(props.name, '');
      return;
    }
    
    // Sayı formatı kontrolü
    const regex = allowNegative ? 
      new RegExp(`^-?\\d*(\\.\\d{0,${decimals}})?$`) : 
      new RegExp(`^\\d*(\\.\\d{0,${decimals}})?$`);
    
    if (regex.test(newValue)) {
      setFieldValue(props.name, newValue);
    }
  };

  // Odak kaybedildiğinde
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    field.onBlur(e);
    
    // Sayıyı doğru formata dönüştür
    if (field.value !== '' && field.value !== null && field.value !== undefined) {
      const numValue = parseFloat(field.value);
      if (!isNaN(numValue)) {
        const formatted = currency 
          ? numValue.toFixed(decimals)
          : numValue.toString();
        setFieldValue(props.name, formatted);
      }
    }
  };

  return (
    <div className={`mb-4 ${props.containerClass || ''}`}>
      <label 
        htmlFor={props.name} 
        className={`block text-sm font-medium text-gray-700 dark:text-gray-200 ${props.labelClass || ''} ${props.required ? 'required' : ''}`}
      >
        {props.label} {props.required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {currency && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-500 sm:text-sm">₺</span>
          </div>
        )}
        <input
          {...field}
          id={props.name}
          type="text"
          inputMode="decimal"
          placeholder={props.placeholder}
          className={cn(
            'mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-primary focus:border-primary dark:focus:ring-primary-light dark:focus:border-primary-light sm:text-sm',
            {
              'border-red-500 dark:border-red-400': hasError,
              'bg-gray-100 dark:bg-gray-700': props.disabled,
              'pl-7': currency,
            },
            props.className
          )}
          min={props.min}
          max={props.max}
          step={props.step || (decimals > 0 ? `0.${'0'.repeat(decimals-1)}1` : '1')}
          disabled={props.disabled}
          onChange={handleChange}
          onBlur={handleBlur}
        />
      </div>
      {hasError ? (
        <div className="text-red-500 dark:text-red-400 text-xs mt-1">{meta.error}</div>
      ) : props.helper ? (
        <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">{props.helper}</div>
      ) : null}
    </div>
  );
};

// Seçim kutusu özellikleri
interface SelectFieldProps extends FieldBaseProps {
  options: Array<{ value: string | number; label: string }>;
  placeholder?: string;
  multiple?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

// Formik ile entegre seçim kutusu bileşeni
export const SelectField: React.FC<SelectFieldProps> = ({
  name,
  label,
  options,
  placeholder = 'Seçiniz',
  className = '',
  labelClass = '',
  required = false,
  helper,
  multiple = false,
  containerClass = '',
  disabled = false,
  onChange: customOnChange,
}) => {
  const [field, meta] = useField(name);
  const hasError = meta.touched && meta.error;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    // Özel değişiklik fonksiyonu
    if (customOnChange) {
      customOnChange(e);
    }

    field.onChange(e);
  };

  return (
    <div className={`mb-4 ${containerClass}`}>
      <label 
        htmlFor={name} 
        className={`block text-sm font-medium text-gray-700 dark:text-gray-200 ${labelClass} ${required ? 'required' : ''}`}
      >
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        id={name}
        name={name}
        value={field.value}
        onChange={handleChange}
        onBlur={field.onBlur}
        multiple={multiple}
        disabled={disabled}
        className={cn(
          'mt-1 block w-full py-2 px-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary dark:focus:ring-primary-light dark:focus:border-primary-light sm:text-sm text-gray-900 dark:text-gray-100',
          {
            'border-red-500 dark:border-red-400': hasError,
            'bg-gray-100 dark:bg-gray-700': disabled,
          },
          className
        )}
      >
        {!multiple && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hasError ? (
        <div className="text-red-500 dark:text-red-400 text-xs mt-1">{meta.error}</div>
      ) : helper ? (
        <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">{helper}</div>
      ) : null}
    </div>
  );
};

// Onay kutusu özellikleri
interface CheckboxFieldProps extends FieldBaseProps {
  text?: string;
}

// Formik ile entegre onay kutusu bileşeni
export const CheckboxField: React.FC<CheckboxFieldProps> = ({
  name,
  label,
  text,
  className = '',
  labelClass = '',
  required = false,
  helper,
  containerClass = '',
  disabled = false,
}) => {
  const [field, meta] = useField({ name, type: 'checkbox' });
  const hasError = meta.touched && meta.error;

  return (
    <div className={`mb-4 ${containerClass}`}>
      {label && (
        <span className={`block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1 ${labelClass} ${required ? 'required' : ''}`}>
          {label} {required && <span className="text-red-500">*</span>}
        </span>
      )}
      <div className="flex items-center">
        <input
          id={name}
          name={name}
          type="checkbox"
          checked={field.value}
          onChange={field.onChange}
          onBlur={field.onBlur}
          disabled={disabled}
          className={cn(
            'h-4 w-4 text-primary dark:text-primary-light focus:ring-primary dark:focus:ring-primary-light border-gray-300 dark:border-gray-600 rounded',
            {
              'bg-gray-100 dark:bg-gray-700': disabled,
            },
            className
          )}
        />
        {text && (
          <label
            htmlFor={name}
            className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
          >
            {text}
          </label>
        )}
      </div>
      {hasError ? (
        <div className="text-red-500 dark:text-red-400 text-xs mt-1">{meta.error}</div>
      ) : helper ? (
        <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">{helper}</div>
      ) : null}
    </div>
  );
};

// Metin alanı özellikleri
interface TextareaFieldProps extends FieldBaseProps {
  placeholder?: string;
  rows?: number;
  maxLength?: number;
}

// Formik ile entegre metin alanı bileşeni
export const TextareaField: React.FC<TextareaFieldProps> = ({
  name,
  label,
  placeholder = '',
  rows = 3,
  className = '',
  labelClass = '',
  required = false,
  helper,
  containerClass = '',
  disabled = false,
  maxLength,
}) => {
  const [field, meta] = useField(name);
  const hasError = meta.touched && meta.error;
  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    if (field.value) {
      setCharCount(String(field.value).length);
    } else {
      setCharCount(0);
    }
  }, [field.value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    
    if (maxLength && newValue.length > maxLength) {
      return; // Maksimum uzunluğu aşan değişiklikleri engelle
    }
    
    field.onChange(e);
    setCharCount(newValue.length);
  };

  return (
    <div className={`mb-4 ${containerClass}`}>
      <label 
        htmlFor={name} 
        className={`block text-sm font-medium text-gray-700 dark:text-gray-200 ${labelClass} ${required ? 'required' : ''}`}
      >
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        placeholder={placeholder}
        className={cn(
          'mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary dark:focus:ring-primary-light dark:focus:border-primary-light sm:text-sm',
          {
            'border-red-500 dark:border-red-400': hasError,
            'bg-gray-100 dark:bg-gray-700': disabled,
          },
          className
        )}
        onChange={handleChange}
        onBlur={field.onBlur}
        value={field.value}
        disabled={disabled}
        maxLength={maxLength}
      />
      {hasError ? (
        <div className="text-red-500 dark:text-red-400 text-xs mt-1">{meta.error}</div>
      ) : helper ? (
        <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">{helper}</div>
      ) : null}
      {maxLength && (
        <div className="text-xs text-gray-500 dark:text-gray-400 text-right mt-1">
          {field.value ? field.value.length : 0} / {maxLength}
        </div>
      )}
    </div>
  );
};

// Dosya yükleme alanı
interface FileFieldProps extends FieldBaseProps {
  accept?: string;
  multiple?: boolean;
  maxFileSize?: number; // in bytes
  onFileSelect?: (files: File[]) => void;
  preview?: boolean;
}

export const FileField: React.FC<FileFieldProps> = ({
  name,
  label,
  className = '',
  labelClass = '',
  required = false,
  helper,
  containerClass = '',
  disabled = false,
  accept,
  multiple = false,
  maxFileSize,
  onFileSelect,
  preview = false,
}) => {
  const { setFieldValue } = useFormikContext();
  const [field, meta] = useField(name);
  const hasError = meta.touched && meta.error;
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  // Dosya önizlemelerini oluştur
  useEffect(() => {
    if (field.value && preview) {
      if (Array.isArray(field.value)) {
        // Çoklu dosya
        const urls = field.value.map((file: File) => URL.createObjectURL(file));
        setPreviewUrls(urls);
      } else if (field.value instanceof File) {
        // Tek dosya
        setPreviewUrls([URL.createObjectURL(field.value)]);
      }
    } else {
      setPreviewUrls([]);
    }
    
    // Temizlik
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [field.value, preview]);

  // Dosya seçimi değiştiğinde
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    
    if (!files || files.length === 0) {
      setFieldValue(name, multiple ? [] : null);
      setPreviewUrls([]);
      return;
    }
    
    const fileList = Array.from(files);
    
    // Dosya boyutu kontrolü
    if (maxFileSize) {
      const oversizedFiles = fileList.filter(file => file.size > maxFileSize);
      if (oversizedFiles.length > 0) {
        // Hata mesajı oluştur (ilk 3 dosyayı listele)
        const fileNames = oversizedFiles.slice(0, 3).map(f => f.name).join(', ');
        const mbSize = (maxFileSize / (1024 * 1024)).toFixed(2);
        const errorMsg = `Aşağıdaki dosyalar çok büyük (maks. ${mbSize} MB): ${fileNames}${oversizedFiles.length > 3 ? '...' : ''}`;
        
        setFieldValue(name, null);
        setFieldValue(`${name}-error`, errorMsg);
        return;
      }
    }
    
    // Kullanıcı callback'i
    if (onFileSelect) {
      onFileSelect(fileList);
    }
    
    // Tek veya çoklu dosya olarak ayarla
    setFieldValue(name, multiple ? fileList : fileList[0]);
  };

  return (
    <div className={`mb-4 ${containerClass}`}>
      <label 
        htmlFor={name} 
        className={`block text-sm font-medium text-gray-700 dark:text-gray-200 ${labelClass} ${required ? 'required' : ''}`}
      >
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
        <div className="space-y-1 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="flex text-sm text-gray-600">
            <label
              htmlFor={name}
              className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
            >
              <span>Dosya seçin</span>
              <input
                id={name}
                name={name}
                type="file"
                className="sr-only"
                accept={accept}
                multiple={multiple}
                disabled={disabled}
                onChange={handleChange}
              />
            </label>
            <p className="pl-1">veya sürükleyip bırakın</p>
          </div>
          <p className="text-xs text-gray-500">
            {accept ? `${accept.split(',').join(', ')} ${multiple ? 'dosyaları' : 'dosyası'}` : 'Tüm dosyalar'}
            {maxFileSize && ` (maks. ${(maxFileSize / (1024 * 1024)).toFixed(2)} MB)`}
          </p>
        </div>
      </div>
      
      {/* Önizleme alanı */}
      {preview && previewUrls.length > 0 && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {previewUrls.map((url, index) => (
            <div key={index} className="relative">
              <img 
                src={url} 
                alt={`Önizleme ${index + 1}`} 
                className="h-24 w-full object-cover rounded-md"
              />
              <button
                type="button"
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 w-6 h-6 flex items-center justify-center"
                onClick={() => {
                  if (multiple && Array.isArray(field.value)) {
                    const newFiles = [...field.value];
                    newFiles.splice(index, 1);
                    setFieldValue(name, newFiles.length > 0 ? newFiles : null);
                  } else {
                    setFieldValue(name, null);
                  }
                }}
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}
      
      {hasError ? (
        <div className="text-red-500 dark:text-red-400 text-xs mt-1">{meta.error}</div>
      ) : helper ? (
        <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">{helper}</div>
      ) : null}
    </div>
  );
};

// Hata mesajı bileşeni
export const ErrorMessage: React.FC<{ name: string }> = ({ name }) => (
  <Field name={name}>
    {({ meta }: FieldProps) => 
      meta.touched && meta.error ? (
        <div className="text-red-500 dark:text-red-400 text-xs mt-1">{meta.error}</div>
      ) : null
    }
  </Field>
);

// Form bölüm başlığı bileşeni
interface FormSectionProps {
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  className = '',
  children,
}) => {
  return (
    <div className={`mb-6 ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
};

// Form eylem butonları bileşeni
interface FormActionsProps {
  isSubmitting?: boolean;
  submitText?: string;
  cancelText?: string;
  onCancel?: () => void;
  className?: string;
  resetText?: string;
  showReset?: boolean;
  onReset?: () => void;
}

export const FormActions: React.FC<FormActionsProps> = ({
  isSubmitting = false,
  submitText = 'Kaydet',
  cancelText = 'İptal',
  onCancel,
  className = '',
  resetText = 'Sıfırla',
  showReset = false,
  onReset,
}) => {
  const { resetForm } = useFormikContext();

  const handleReset = () => {
    if (onReset) {
      onReset();
    } else {
      resetForm();
    }
  };

  return (
    <div className={`flex justify-end space-x-3 ${className}`}>
      {showReset && (
        <button
          type="button"
          onClick={handleReset}
          className="bg-gray-100 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {resetText}
        </button>
      )}
      
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {cancelText}
        </button>
      )}
      
      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
      >
        {isSubmitting ? (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : null}
        {submitText}
      </button>
    </div>
  );
}; 