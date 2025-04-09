export function formatDate(dateString: string | Date): string {
  if (!dateString) return '';
  
  let date: Date;
  try {
    date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    // Geçersiz tarih kontrolü
    if (isNaN(date.getTime())) {
      return '';
    }
  } catch (e) {
    console.error('Geçersiz tarih formatı:', e);
    return '';
  }
  
  const now = new Date();
  
  // Check if date is today
  if (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  ) {
    return `Bugün, ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }
  
  // Check if date is tomorrow
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear()
  ) {
    return `Yarın, ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }
  
  // For other dates, return formatted date
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

/**
 * Tarih formatları için yardımcı fonksiyonlar
 */

// Belirli bir süreden önce (ör: "5 dakika önce") formatında tarih gösterimi
export function getTimeSince(date: Date | string): string {
  if (!date) return '';
  
  let dateObj: Date;
  try {
    dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Geçersiz tarih kontrolü
    if (isNaN(dateObj.getTime())) {
      return '';
    }
  } catch (e) {
    console.error('Geçersiz tarih formatı:', e);
    return '';
  }
  
  const now = new Date();
  const seconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
  
  // Negatif zaman farkı kontrolü (gelecekteki tarihler)
  if (seconds < 0) {
    return 'Gelecekte';
  }
  
  // Saniye, dakika, saat, vb. hesaplama
  const intervals = [
    { label: 'yıl', seconds: 31536000 },
    { label: 'ay', seconds: 2592000 },
    { label: 'hafta', seconds: 604800 },
    { label: 'gün', seconds: 86400 },
    { label: 'saat', seconds: 3600 },
    { label: 'dakika', seconds: 60 },
    { label: 'saniye', seconds: 1 }
  ];
  
  // Özel durumlar
  if (seconds < 60) {
    return 'Az önce';
  }
  
  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) {
      return `${count} ${interval.label}${count > 1 ? '' : ''} önce`;
    }
  }
  
  return 'az önce';
}

/**
 * Farklı tarih formatlarını tanıyıp YYYY-MM-DD formatına çevirir
 * Desteklenen formatlar:
 * - DD.MM.YYYY
 * - DD/MM/YYYY
 * - DD-MM-YYYY
 * - YYYY.MM.DD
 * - YYYY/MM/DD
 * - ISO formatı ve diğer geçerli tarih formatları
 */
export function formatDateForInput(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  
  // Zaten YYYY-MM-DD formatındaysa
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    // Tarihin geçerliliğini kontrol et
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!isValidDate(year, month - 1, day)) {
      console.error('Geçersiz tarih:', dateStr);
      return '';
    }
    return dateStr;
  }
  
  // DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY formatları
  if (/^\d{2}[./-]\d{2}[./-]\d{4}$/.test(dateStr)) {
    const parts = dateStr.split(/[./-]/);
    if (parts.length === 3) {
      const [day, month, year] = parts.map(Number);
      
      // Tarih geçerliliğini kontrol et
      if (!isValidDate(year, month - 1, day)) {
        console.error('Geçersiz tarih:', dateStr);
        return '';
      }
      
      return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    }
  }
  
  // YYYY.MM.DD, YYYY/MM/DD formatları
  if (/^\d{4}[./-]\d{2}[./-]\d{2}$/.test(dateStr)) {
    const parts = dateStr.split(/[./-]/);
    if (parts.length === 3) {
      const [year, month, day] = parts.map(Number);
      
      // Tarih geçerliliğini kontrol et
      if (!isValidDate(year, month - 1, day)) {
        console.error('Geçersiz tarih:', dateStr);
        return '';
      }
      
      return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    }
  }
  
  // Diğer formatlar için Date nesnesini kullan
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (e) {
    console.error('Tarih dönüştürme hatası:', e);
  }
  
  console.warn('Tanınmayan tarih formatı:', dateStr);
  return '';
}

// YYYY-MM-DD formatından gün/ay/yıl gösterim formatına çevirir
export function formatDateForDisplay(dateStr: string | Date | null | undefined, locale: string = 'tr-TR'): string {
  if (!dateStr) return '';
  
  try {
    let date: Date;
    
    if (typeof dateStr === 'string') {
      // YYYY-MM-DD formatını algıla
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [year, month, day] = dateStr.split('-').map(Number);
        date = new Date(year, month - 1, day);
      } else {
        date = new Date(dateStr);
      }
    } else {
      date = dateStr;
    }
    
    if (isNaN(date.getTime())) {
      console.warn('Geçersiz tarih:', dateStr);
      return '';
    }
    
    return date.toLocaleDateString(locale);
  } catch (e) {
    console.error('Tarih gösterim hatası:', e);
    return '';
  }
}

/**
 * Saat formatını doğrular ve formatlar
 * Desteklenen formatlar:
 * - HH:MM
 * - HH:MM:SS
 * - HH.MM
 * - HH,MM
 */
export function formatTime(timeStr: string | Date | undefined): string {
  if (!timeStr) return '';
  
  try {
    // Saat formatlarını algıla ve dönüştür
    if (typeof timeStr === 'string') {
      // HH:MM, HH.MM veya HH,MM formatı
      const timeRegex = /^(\d{1,2})[:.,-](\d{1,2})(?:[:.,-](\d{1,2}))?$/;
      const match = timeStr.match(timeRegex);
      
      if (match) {
        const hour = parseInt(match[1], 10);
        const minute = parseInt(match[2], 10);
        
        // Geçerlilik kontrolü
        if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
          console.warn('Geçersiz saat değeri:', timeStr);
          return '';
        }
        
        return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      }
      
      // Diğer formatlar için Date nesnesini kullan
      const date = new Date(timeStr);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      }
    } else {
      // Date nesnesi
      return timeStr.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    }
  } catch (e) {
    console.error('Saat formatı hatası:', e);
  }
  
  console.warn('Tanınmayan saat formatı:', timeStr);
  return '';
}

// Tam tarih ve saat formatla
export function formatDateTime(dateStr: string | Date | undefined): string {
  if (!dateStr) return '';
  
  try {
    let date: Date;
    
    if (typeof dateStr === 'string') {
      date = new Date(dateStr);
    } else {
      date = dateStr;
    }
    
    if (isNaN(date.getTime())) {
      console.warn('Geçersiz tarih:', dateStr);
      return '';
    }
    
    return date.toLocaleString('tr-TR');
  } catch (e) {
    console.error('Tarih-saat formatı hatası:', e);
    return '';
  }
}

/**
 * HTML input[type=time] için değer formatlar
 * Sonuç: HH:MM formatında
 */
export function formatTimeForInput(timeStr: string | Date | undefined): string {
  if (!timeStr) return '';
  
  try {
    if (typeof timeStr === 'string') {
      // HH:MM formatındaysa ve geçerliyse
      if (/^\d{2}:\d{2}$/.test(timeStr)) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
          return timeStr;
        }
      }
      
      // Diğer formatları analiz et
      const date = new Date(timeStr);
      if (!isNaN(date.getTime())) {
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      }
    } else {
      // Date nesnesi
      return `${timeStr.getHours().toString().padStart(2, '0')}:${timeStr.getMinutes().toString().padStart(2, '0')}`;
    }
  } catch (e) {
    console.error('Saat formatı hatası:', e);
  }
  
  return '';
}

/**
 * Tarih aralıklarını formatlar
 * Örnek: "1 Ocak 2023 - 15 Ocak 2023"
 */
export function formatDateRange(startDate: string | Date, endDate: string | Date): string {
  const start = formatDateForDisplay(startDate);
  const end = formatDateForDisplay(endDate);
  
  if (!start || !end) return '';
  
  return `${start} - ${end}`;
}

/**
 * Tarih geçerliliğini kontrol eder
 */
export function isValidDate(year: number, month: number, day: number): boolean {
  // Ay indeksi 0-11 arasında
  if (year < 1900 || month < 0 || month > 11 || day < 1) {
    return false;
  }
  
  const date = new Date(year, month, day);
  return date.getFullYear() === year && 
         date.getMonth() === month && 
         date.getDate() === day;
}
