import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Animated,
  Platform,
  StatusBar,
  Image,
  RefreshControl
} from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  Button, 
  TextInput,
  Avatar, 
  Badge,
  Divider,
  IconButton,
  Portal,
  Modal,
  Dialog,
  RadioButton,
  Snackbar,
  FAB,
  Surface,
  SegmentedButtons,
  Chip,
  ProgressBar
} from 'react-native-paper';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../hooks/useAuth';
import { apiRequest } from '../../api/config';
import theme from '../../themes/theme';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { Svg, Rect, Text as SvgText } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

// Tarih formatı fonksiyonları
const formatDate = (dateString) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR');
  } catch (e) {
    console.error('Tarih formatı hatası:', e);
    return dateString;
  }
};

const formatShortDate = (dateString) => {
  try {
    const date = new Date(dateString);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  } catch (e) {
    console.error('Tarih formatı hatası:', e);
    return '';
  }
};

const formatDateMonth = (dateString) => {
  try {
    const date = new Date(dateString);
    const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  } catch (e) {
    console.error('Tarih formatı hatası:', e);
    return '';
  }
};

const MeasurementsScreen = ({ navigation, route }) => {
  const { token } = useAuth();
  const { clientId, clientName } = route.params || {};
  
  // Header konfigürasyonu
  useEffect(() => {
    navigation.setOptions({
      headerShown: false
    });
    
    return () => {
      navigation.setOptions({
        headerShown: true,
        headerLeft: undefined
      });
    };
  }, [navigation]);
  
  // Ana state'ler
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [measurements, setMeasurements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal ve form state'leri
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    weight: '',
    neck: '',
    arm: '',
    chest: '',
    waist: '',
    abdomen: '',
    hip: '',
    thigh: '',
    calf: '',
    notes: ''
  });
  const [selectedMeasurement, setSelectedMeasurement] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Silme işlemi için state'ler
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [selectedMeasurementId, setSelectedMeasurementId] = useState(null);
  
  // Snackbar state'leri
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState('info'); // info, success, error
  
  // Modal animasyonları için ref'ler
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Clients panel açık/kapalı durumu
  const [clientsPanelVisible, setClientsPanelVisible] = useState(false);
  
  // Grafik görünüm seçenekleri
  const [chartType, setChartType] = useState('weight'); // weight, bodyMetrics, comparison
  const [chartPeriod, setChartPeriod] = useState('3months'); // 1month, 3months, 6months, 1year, all
  
  // Görünüm tipi (tablo/kartlar/grafik)
  const [viewMode, setViewMode] = useState('dashboard'); // dashboard, table, chart
  
  // Tooltip durumu
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipData, setTooltipData] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Ekran odaklandığında verileri yükle
  useFocusEffect(
    React.useCallback(() => {
      if (clientId) {
        loadClientData(clientId);
      } else {
        loadClients();
      }
      return () => {};
    }, [clientId])
  );
  
  // Danışanları yükle
  const loadClients = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('GET', '/clients', null, token);
      
      if (data && Array.isArray(data)) {
        setClients(data);
        
        // Eğer route params'ta clientId varsa, o danışanı seç
        if (clientId) {
          const client = data.find(c => c._id === clientId);
          if (client) {
            setSelectedClient(client);
            loadMeasurements(clientId);
          }
        }
      }
    } catch (err) {
      console.error('Danışanları yükleme hatası:', err);
      showSnackbar('Danışanları yüklerken bir hata oluştu', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Belirli bir danışanı yükle
  const loadClientData = async (id) => {
    try {
      const clientData = await apiRequest('GET', `/clients/${id}`, null, token);
      
      if (clientData) {
        setSelectedClient(clientData);
        loadMeasurements(id);
      }
    } catch (err) {
      console.error('Danışan verisi yükleme hatası:', err);
      showSnackbar('Danışan bilgilerini yüklerken bir hata oluştu', 'error');
    }
  };
  
  // Ölçümleri yükle
  const loadMeasurements = async (clientId) => {
    try {
      setLoading(true);
      const data = await apiRequest('GET', `/clients/${clientId}/measurements`, null, token);
      
      if (data && Array.isArray(data)) {
        // Tarih sırasına göre sırala (en yeni üstte)
        const sortedData = data.sort((a, b) => 
          new Date(b.date) - new Date(a.date)
        );
        setMeasurements(sortedData);
      } else {
        setMeasurements([]);
      }
    } catch (err) {
      console.error('Ölçümleri yükleme hatası:', err);
      showSnackbar('Ölçümleri yüklerken bir hata oluştu', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Yenile
  const handleRefresh = () => {
    setRefreshing(true);
    if (selectedClient) {
      loadMeasurements(selectedClient._id);
    } else {
      loadClients();
    }
  };
  
  // Danışan seçimi
  const handleSelectClient = (client) => {
    setSelectedClient(client);
    loadMeasurements(client._id);
    setClientsPanelVisible(false);
  };
  
  // Modal gösterme animasyonu - formun açılışını resetliyoruz
  const showAddModal = () => {
    // Form verilerini sıfırla
    setFormData({
      weight: '',
      neck: '',
      arm: '',
      chest: '',
      waist: '',
      abdomen: '',
      hip: '',
      thigh: '',
      calf: '',
      notes: ''
    });
    setErrors({});
    
    // Modalı göster
    setAddModalVisible(true);
    
    // Debug log
    console.log("Ekleme modalı açılıyor", new Date().toISOString());
  };
  
  // Düzenleme modalını göster
  const showEditModal = (measurement) => {
    if (!measurement) {
      console.error('Ölçüm verisi bulunamadı!');
      showSnackbar('Ölçüm verisi bulunamadı', 'error');
      return;
    }
    
    // Seçilen ölçümü state'e kaydet
    setSelectedMeasurement(measurement);
    
    // Form verilerini seçilen ölçüm verileriyle doldur
    const newFormData = {
      weight: measurement.weight ? measurement.weight.toString() : '',
      neck: measurement.neck ? measurement.neck.toString() : '',
      arm: measurement.arm ? measurement.arm.toString() : '',
      chest: measurement.chest ? measurement.chest.toString() : '',
      waist: measurement.waist ? measurement.waist.toString() : '',
      abdomen: measurement.abdomen ? measurement.abdomen.toString() : '',
      hip: measurement.hip ? measurement.hip.toString() : '',
      thigh: measurement.thigh ? measurement.thigh.toString() : '',
      calf: measurement.calf ? measurement.calf.toString() : '',
      notes: measurement.notes || ''
    };
    
    // Form verilerini set et
    setFormData(newFormData);
    setErrors({});
    
    // Modalı göster (animasyonsuz, daha güvenilir)
    setEditModalVisible(true);
    
    console.log("Düzenleme modalı açılıyor", new Date().toISOString());
  };
  
  // Modal gizleme
  const hideModal = (isEdit) => {
    if (isEdit) {
      setEditModalVisible(false);
      setSelectedMeasurement(null);
    } else {
      setAddModalVisible(false);
    }
    
    // Form verilerini temizle
    setFormData({
      weight: '',
      neck: '',
      arm: '',
      chest: '',
      waist: '',
      abdomen: '',
      hip: '',
      thigh: '',
      calf: '',
      notes: ''
    });
    
    console.log("Modal kapatılıyor", new Date().toISOString());
  };
  
  // Snackbar gösterme
  const showSnackbar = (message, type = 'info') => {
    setSnackbarMessage(message);
    setSnackbarType(type);
    setSnackbarVisible(true);
  };
  
  // Form doğrulama
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.weight || formData.weight.trim() === '') {
      newErrors.weight = 'Ağırlık zorunludur';
    } else if (isNaN(parseFloat(formData.weight)) || parseFloat(formData.weight) < 20 || parseFloat(formData.weight) > 300) {
      newErrors.weight = 'Geçerli bir ağırlık giriniz (20-300 kg)';
    }
    
    // Diğer alanlar opsiyonel, ama sayısal değer olmalı
    const numericFields = ['neck', 'arm', 'chest', 'waist', 'abdomen', 'hip', 'thigh', 'calf'];
    numericFields.forEach(field => {
      if (formData[field] && formData[field].trim() !== '' && (isNaN(parseFloat(formData[field])) || parseFloat(formData[field]) <= 0)) {
        newErrors[field] = 'Geçerli bir değer giriniz';
      }
    });
    
    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    
    if (!isValid) {
      console.log('Form doğrulama hataları:', newErrors);
    }
    
    return isValid;
  };
  
  // Ölçüm kaydetme
  const handleSaveMeasurement = async () => {
    if (!validateForm()) {
      return;
    }
    
    setSubmitting(true);
    
    // Sayısal değerlere dönüştür
    const numericData = {
      weight: parseFloat(formData.weight),
      notes: formData.notes || ''
    };
    
    // Diğer opsiyonel alanları ekle
    const fields = ['neck', 'arm', 'chest', 'waist', 'abdomen', 'hip', 'thigh', 'calf'];
    fields.forEach(field => {
      if (formData[field] && formData[field].trim() !== '') {
        numericData[field] = parseFloat(formData[field]);
      }
    });
    
    try {
      if (!selectedClient || !selectedClient._id) {
        throw new Error('Danışan bilgisi bulunamadı');
      }
      
      // ClientId değeri açıkça belirtiliyor - önemli!
      const data = await apiRequest('POST', `/clients/${selectedClient._id}/measurements`, {
        clientId: selectedClient._id,
        ...numericData
      }, token);
      
      if (data) {
        hideModal(false);
        showSnackbar('Ölçüm başarıyla kaydedildi', 'success');
        // Biraz bekleyip verileri yeniden yükle
        setTimeout(() => {
          loadMeasurements(selectedClient._id);
        }, 500);
      }
    } catch (err) {
      console.error('Ölçüm kaydetme hatası:', err);
      showSnackbar('Ölçüm kaydedilirken bir hata oluştu', 'error');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Ölçüm güncelleme
  const handleUpdateMeasurement = async () => {
    if (!validateForm()) {
      return;
    }
    
    if (!selectedMeasurement || !selectedMeasurement._id) {
      console.error('Güncellenecek ölçüm bulunamadı');
      showSnackbar('Güncellenecek ölçüm bulunamadı', 'error');
      return;
    }
    
    setSubmitting(true);
    
    // Sayısal değerlere dönüştür
    const numericData = {
      weight: parseFloat(formData.weight),
      notes: formData.notes || ''
    };
    
    // Diğer opsiyonel alanları ekle
    const fields = ['neck', 'arm', 'chest', 'waist', 'abdomen', 'hip', 'thigh', 'calf'];
    fields.forEach(field => {
      if (formData[field] && formData[field].trim() !== '') {
        numericData[field] = parseFloat(formData[field]);
      }
    });
    
    try {
      if (!selectedClient || !selectedClient._id) {
        throw new Error('Danışan bilgisi bulunamadı');
      }
      
      // PUT isteği ile ölçüm güncelleme
      const data = await apiRequest('PUT', `/measurements/${selectedMeasurement._id}`, {
        clientId: selectedClient._id,
        ...numericData
      }, token);
      
      if (data) {
        hideModal(true);
        showSnackbar('Ölçüm başarıyla güncellendi', 'success');
        // Biraz bekleyip verileri yeniden yükle
        setTimeout(() => {
          loadMeasurements(selectedClient._id);
        }, 500);
      }
    } catch (err) {
      console.error('Ölçüm güncelleme hatası:', err);
      showSnackbar('Ölçüm güncellenirken bir hata oluştu', 'error');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Ölçüm silme
  const handleDeleteMeasurement = (measurementId) => {
    setSelectedMeasurementId(measurementId);
    setDeleteDialogVisible(true);
  };
  
  // Ölçüm silme onayı
  const confirmDeleteMeasurement = async () => {
    try {
      await apiRequest('POST', `/measurements/delete`, {
        clientId: selectedClient._id,
        measurementId: selectedMeasurementId
      }, token);
      
      setDeleteDialogVisible(false);
      showSnackbar('Ölçüm başarıyla silindi', 'success');
      loadMeasurements(selectedClient._id);
    } catch (err) {
      console.error('Ölçüm silme hatası:', err);
      showSnackbar('Ölçüm silinirken bir hata oluştu', 'error');
    }
  };
  
  // BMI hesaplama
  const calculateBMI = (weight, height) => {
    if (!weight || !height) return null;
    
    const heightInMeters = height / 100;
    return weight / (heightInMeters * heightInMeters);
  };
  
  // BMI sınıflandırması
  const getBMICategory = (bmi) => {
    if (!bmi) return null;
    
    if (bmi < 18.5) return { label: 'Zayıf', color: '#3498db' };
    if (bmi < 24.9) return { label: 'Normal', color: '#2ecc71' };
    if (bmi < 29.9) return { label: 'Fazla Kilolu', color: '#f39c12' };
    if (bmi < 34.9) return { label: 'Obez (Sınıf I)', color: '#e74c3c' };
    if (bmi < 39.9) return { label: 'Obez (Sınıf II)', color: '#c0392b' };
    return { label: 'Aşırı Obez (Sınıf III)', color: '#8e44ad' };
  };
  
  // Vücut yağ oranı tahmini
  const estimateBodyFatPercentage = (bmi, age, gender) => {
    if (!bmi || !age || !gender) return null;
    
    // Basitleştirilmiş tahmin formülü
    if (gender === 'male') {
      return 1.20 * bmi + 0.23 * age - 16.2;
    } else {
      return 1.20 * bmi + 0.23 * age - 5.4;
    }
  };
  
  // En son ve önceki ölçüm değişimleri
  const calculateChanges = () => {
    if (!measurements || measurements.length < 2) return null;
    
    const latest = measurements[0];
    const previous = measurements[1];
    
    const changes = {};
    const fields = ['weight', 'neck', 'arm', 'chest', 'waist', 'abdomen', 'hip', 'thigh', 'calf'];
    
    fields.forEach(field => {
      if (latest[field] !== undefined && previous[field] !== undefined) {
        changes[field] = latest[field] - previous[field];
      } else {
        changes[field] = null;
      }
    });
    
    return changes;
  };
  
  // Durum renkleri ve ikonları
  const getChangeColor = (value, isWeight = false) => {
    if (value === null || value === undefined) return theme.palette.text.secondary;
    
    // Kilo için azalma pozitif, diğer ölçümler için negatif
    const isPositive = isWeight ? value < 0 : value < 0;
    
    return isPositive 
      ? theme.palette.success.main 
      : value > 0 
        ? theme.palette.error.main 
        : theme.palette.text.secondary;
  };
  
  const getChangeIcon = (value, isWeight = false) => {
    if (value === null || value === undefined) return null;
    
    const isPositive = isWeight ? value < 0 : value < 0;
    
    return isPositive
      ? 'arrow-down'
      : value > 0
        ? 'arrow-up'
        : 'remove';
  };

  // Grafik verileri için filtreleme
  const getFilteredMeasurements = () => {
    if (!measurements || measurements.length === 0) return [];
    
    // Tarihe göre eski->yeni sırala
    const sortedMeasurements = [...measurements].sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );
    
    // Seçilen periyoda göre filtrele
    const now = new Date();
    let filteredData = sortedMeasurements;
    
    if (chartPeriod === '1month') {
      const oneMonthAgo = new Date(now);
      oneMonthAgo.setMonth(now.getMonth() - 1);
      filteredData = sortedMeasurements.filter(m => new Date(m.date) >= oneMonthAgo);
    } else if (chartPeriod === '3months') {
      const threeMonthsAgo = new Date(now);
      threeMonthsAgo.setMonth(now.getMonth() - 3);
      filteredData = sortedMeasurements.filter(m => new Date(m.date) >= threeMonthsAgo);
    } else if (chartPeriod === '6months') {
      const sixMonthsAgo = new Date(now);
      sixMonthsAgo.setMonth(now.getMonth() - 6);
      filteredData = sortedMeasurements.filter(m => new Date(m.date) >= sixMonthsAgo);
    } else if (chartPeriod === '1year') {
      const oneYearAgo = new Date(now);
      oneYearAgo.setFullYear(now.getFullYear() - 1);
      filteredData = sortedMeasurements.filter(m => new Date(m.date) >= oneYearAgo);
    }
    
    return filteredData;
  };
  
  // Grafik verileri hesaplama
  const chartData = useMemo(() => {
    const filteredMeasurements = getFilteredMeasurements();
    
    if (filteredMeasurements.length === 0) return null;
    
    // Grafik için eksen etiketleri (tarihler)
    const labels = filteredMeasurements.map(m => formatShortDate(m.date));
    
    // Kilo grafiği
    if (chartType === 'weight') {
      return {
        labels,
        datasets: [
          {
            data: filteredMeasurements.map(m => m.weight || 0),
            color: (opacity = 1) => `rgba(71, 136, 199, ${opacity})`,
            strokeWidth: 2
          }
        ],
        legend: ['Kilo (kg)']
      };
    }
    
    // Vücut ölçüleri grafiği
    else if (chartType === 'bodyMetrics') {
      return {
        labels,
        datasets: [
          {
            data: filteredMeasurements.map(m => m.waist || 0),
            color: (opacity = 1) => `rgba(255, 99, 71, ${opacity})`,
            strokeWidth: 2
          },
          {
            data: filteredMeasurements.map(m => m.hip || 0),
            color: (opacity = 1) => `rgba(75, 192, 192, ${opacity})`,
            strokeWidth: 2
          },
          {
            data: filteredMeasurements.map(m => m.chest || 0),
            color: (opacity = 1) => `rgba(153, 102, 255, ${opacity})`,
            strokeWidth: 2
          }
        ],
        legend: ['Bel (cm)', 'Kalça (cm)', 'Göğüs (cm)']
      };
    }
    
    // Karşılaştırma grafiği (Bel/Kalça oranı veya seçilen 2 metrik)
    else if (chartType === 'comparison') {
      const waistHipRatio = filteredMeasurements.map(m => {
        if (m.waist && m.hip) {
          return parseFloat((m.waist / m.hip).toFixed(2));
        }
        return 0;
      });
      
      return {
        labels,
        datasets: [
          {
            data: waistHipRatio,
            color: (opacity = 1) => `rgba(255, 193, 7, ${opacity})`,
            strokeWidth: 2
          }
        ],
        legend: ['Bel/Kalça Oranı']
      };
    }
    
    return null;
  }, [measurements, chartType, chartPeriod]);
  
  // Tooltip'i göster
  const handleChartTooltip = (data) => {
    if (data.index !== undefined && chartData) {
      const measurementIndex = data.index;
      const filteredMeasurements = getFilteredMeasurements();
      
      if (filteredMeasurements[measurementIndex]) {
        const measurement = filteredMeasurements[measurementIndex];
        setTooltipData({
          date: formatDate(measurement.date),
          values: chartType === 'weight' 
            ? [{ label: 'Kilo', value: `${measurement.weight} kg` }]
            : chartType === 'bodyMetrics'
              ? [
                  { label: 'Bel', value: `${measurement.waist || '-'} cm` },
                  { label: 'Kalça', value: `${measurement.hip || '-'} cm` },
                  { label: 'Göğüs', value: `${measurement.chest || '-'} cm` }
                ]
              : [{ label: 'Bel/Kalça', value: measurement.waist && measurement.hip ? (measurement.waist / measurement.hip).toFixed(2) : '-' }]
        });
        
        setTooltipPos({
          x: data.x,
          y: data.y
        });
        
        setTooltipVisible(true);
      }
    }
  };
  
  // Tooltip'i kapat
  const hideTooltip = () => {
    setTooltipVisible(false);
  };
  
  // İlerleme bilgilerini hesapla (hedef)
  const calculateProgress = () => {
    if (!selectedClient || !measurements || measurements.length === 0) return null;
    
    const initialWeight = measurements[measurements.length - 1].weight;
    const currentWeight = measurements[0].weight;
    const targetWeight = selectedClient.targetWeight;
    
    if (!initialWeight || !currentWeight || !targetWeight) return null;
    
    // Hedef kilo kaybı/kazanımı
    const targetChange = targetWeight - initialWeight;
    const currentChange = currentWeight - initialWeight;
    
    // İlerleme yüzdesi
    let progressPercentage = 0;
    
    if (targetChange !== 0) {
      progressPercentage = (currentChange / targetChange) * 100;
      
      // Eğer kilo alımı hedefleniyorsa ve kilo alındıysa, veya
      // kilo kaybı hedefleniyorsa ve kilo kaybedildiyse, pozitif ilerleme
      if ((targetChange > 0 && currentChange > 0) || (targetChange < 0 && currentChange < 0)) {
        progressPercentage = Math.min(Math.abs(progressPercentage), 100);
      } 
      // Eğer yanlış yönde ilerleme varsa (hedef kilo kaybı ama kilo alımı gibi)
      else if ((targetChange > 0 && currentChange < 0) || (targetChange < 0 && currentChange > 0)) {
        progressPercentage = 0;
      }
    }
    
    return {
      initialWeight,
      currentWeight,
      targetWeight,
      targetChange,
      currentChange,
      progressPercentage: progressPercentage
    };
  };
  
  // Render: Hiç danışan seçili değilse
  const renderNoClientSelected = () => (
    <View style={styles.noDataContainer}>
      <MaterialCommunityIcons name="account-question" size={80} color={theme.palette.grey[400]} />
      <Text style={styles.noDataTitle}>Lütfen bir danışan seçin</Text>
      <Text style={styles.noDataDescription}>
        Ölçümleri görüntülemek için bir danışan seçin.
      </Text>
      <Button 
        mode="contained" 
        style={styles.actionButton}
        contentStyle={styles.buttonContent}
        onPress={() => setClientsPanelVisible(true)}
        icon="account-multiple"
      >
        Danışan Seç
      </Button>
    </View>
  );
  
  // Render: Seçili danışanın ölçümü yoksa
  const renderNoMeasurements = () => (
    <View style={styles.noDataContainer}>
      <MaterialCommunityIcons name="tape-measure" size={80} color={theme.palette.grey[400]} />
      <Text style={styles.noDataTitle}>Henüz ölçüm kaydedilmemiş</Text>
      <Text style={styles.noDataDescription}>
        {selectedClient?.name} için ilk ölçümü kaydetmek için 'Yeni Ölçüm' butonuna tıklayın.
      </Text>
      <Button 
        mode="contained" 
        style={styles.actionButton}
        contentStyle={styles.buttonContent}
        onPress={showAddModal}
        icon="plus"
      >
        Yeni Ölçüm Ekle
      </Button>
    </View>
  );
  
  // Render: Üst durum kartı
  const renderStatusCard = () => {
    if (!measurements || measurements.length === 0 || !selectedClient) return null;
    
    const latestMeasurement = measurements[0];
    const changes = calculateChanges();
    const progress = calculateProgress();
    
    // BMI hesaplama
    let bmi = null;
    let bmiCategory = null;
    
    if (latestMeasurement.weight && selectedClient.height) {
      bmi = calculateBMI(latestMeasurement.weight, selectedClient.height);
      bmiCategory = getBMICategory(bmi);
    }
    
    return (
      <Surface style={styles.statusCard}>
        <View style={styles.statusCardHeader}>
          <View style={styles.clientInfoContainer}>
            <Avatar.Image 
              size={60} 
              source={selectedClient.profilePicture ? { uri: selectedClient.profilePicture } : require('../../../assets/images/icon.png')}
              style={styles.clientAvatar}
            />
            <View style={styles.clientInfo}>
              <Text style={styles.clientName}>{selectedClient.name}</Text>
              <Text style={styles.clientDetails}>
                {selectedClient.age ? `${selectedClient.age} yaş • ` : ''}
                {selectedClient.height ? `${selectedClient.height} cm • ` : ''}
                {selectedClient.gender === 'male' ? 'Erkek' : selectedClient.gender === 'female' ? 'Kadın' : ''}
              </Text>
            </View>
          </View>
          
          <Button 
            mode="text" 
            onPress={() => setClientsPanelVisible(true)}
            style={styles.changeClientButton}
            contentStyle={{height: 32}}
            icon="account-switch"
          >
            Değiştir
          </Button>
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.statusCardBody}>
          <View style={styles.statusColumn}>
            <Text style={styles.statusLabel}>Güncel Ağırlık</Text>
            <Text style={styles.statusValue}>{latestMeasurement.weight} <Text style={styles.statusUnit}>kg</Text></Text>
            
            {changes && changes.weight !== null && (
              <View style={styles.changeIndicator}>
                <MaterialCommunityIcons 
                  name={changes.weight < 0 ? "arrow-down" : "arrow-up"} 
                  size={16} 
                  color={changes.weight < 0 ? theme.palette.success.main : theme.palette.error.main} 
                />
                <Text style={[
                  styles.changeText, 
                  {color: changes.weight < 0 ? theme.palette.success.main : theme.palette.error.main}
                ]}>
                  {Math.abs(changes.weight).toFixed(1)} kg
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.statusDivider} />
          
          {bmi && bmiCategory && (
            <>
              <View style={styles.statusColumn}>
                <Text style={styles.statusLabel}>Vücut Kitle İndeksi</Text>
                <Text style={styles.statusValue}>{bmi.toFixed(1)}</Text>
                <View style={[styles.bmiIndicator, {backgroundColor: `${bmiCategory.color}20`}]}>
                  <Text style={[styles.bmiText, {color: bmiCategory.color}]}>{bmiCategory.label}</Text>
                </View>
              </View>
              
              <View style={styles.statusDivider} />
            </>
          )}
          
          {progress && (
            <View style={styles.statusColumn}>
              <Text style={styles.statusLabel}>Hedef İlerleme</Text>
              <Text style={styles.statusValue}>
                {progress.targetWeight} <Text style={styles.statusUnit}>kg</Text>
              </Text>
              
              <View style={styles.progressContainer}>
                <ProgressBar 
                  progress={progress.progressPercentage / 100} 
                  color={theme.palette.primary.main}
                  style={styles.progressBar}
                />
                <Text style={styles.progressText}>%{Math.round(progress.progressPercentage)}</Text>
              </View>
            </View>
          )}
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.statusCardFooter}>
          <View style={styles.lastMeasurementInfo}>
            <MaterialCommunityIcons name="clock-outline" size={16} color={theme.palette.text.secondary} />
            <Text style={styles.lastMeasurementText}>
              Son ölçüm: {formatDate(latestMeasurement.date)}
            </Text>
          </View>
          
          <View style={styles.viewButtons}>
            <SegmentedButtons
              value={viewMode}
              onValueChange={setViewMode}
              buttons={[
                { value: 'dashboard', icon: 'view-dashboard-outline', label: '' },
                { value: 'chart', icon: 'chart-line', label: '' },
                { value: 'table', icon: 'table', label: '' }
              ]}
              style={styles.viewModeButtons}
            />
          </View>
        </View>
      </Surface>
    );
  };
  
  // Render: Özet kartları (dashboard görünümü)
  const renderSummaryCards = () => {
    if (!measurements || measurements.length === 0) return null;
    
    const latestMeasurement = measurements[0];
    const changes = calculateChanges();
    
    // Bel/Kalça oranı hesaplama
    let waistHipRatio = null;
    if (latestMeasurement.waist && latestMeasurement.hip) {
      waistHipRatio = (latestMeasurement.waist / latestMeasurement.hip).toFixed(2);
    }
    
    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.summaryCardsContainer}
      >
        {/* Bel Ölçüsü Kartı */}
        {latestMeasurement.waist && (
          <Surface style={styles.summaryCard}>
            <View style={styles.summaryCardHeader}>
              <Text style={styles.summaryCardTitle}>Bel Çevresi</Text>
              <View style={[styles.iconContainer, {backgroundColor: '#e3f2fd'}]}>
                <MaterialCommunityIcons name="human-male" size={20} color="#2196f3" />
              </View>
            </View>
            
            <Text style={styles.summaryCardValue}>
              {latestMeasurement.waist} <Text style={styles.summaryCardUnit}>cm</Text>
            </Text>
            
            {changes && changes.waist !== null && (
              <View style={styles.summaryCardChange}>
                <MaterialCommunityIcons 
                  name={changes.waist < 0 ? "arrow-down" : "arrow-up"} 
                  size={14} 
                  color={changes.waist < 0 ? theme.palette.success.main : theme.palette.error.main} 
                />
                <Text style={[
                  styles.summaryCardChangeText, 
                  {color: changes.waist < 0 ? theme.palette.success.main : theme.palette.error.main}
                ]}>
                  {Math.abs(changes.waist).toFixed(1)} cm
                </Text>
              </View>
            )}
          </Surface>
        )}
        
        {/* Kalça Ölçüsü Kartı */}
        {latestMeasurement.hip && (
          <Surface style={styles.summaryCard}>
            <View style={styles.summaryCardHeader}>
              <Text style={styles.summaryCardTitle}>Kalça Çevresi</Text>
              <View style={[styles.iconContainer, {backgroundColor: '#fff8e1'}]}>
                <MaterialCommunityIcons name="human-female" size={20} color="#ff9800" />
              </View>
            </View>
            
            <Text style={styles.summaryCardValue}>
              {latestMeasurement.hip} <Text style={styles.summaryCardUnit}>cm</Text>
            </Text>
            
            {changes && changes.hip !== null && (
              <View style={styles.summaryCardChange}>
                <MaterialCommunityIcons 
                  name={changes.hip < 0 ? "arrow-down" : "arrow-up"} 
                  size={14} 
                  color={changes.hip < 0 ? theme.palette.success.main : theme.palette.error.main} 
                />
                <Text style={[
                  styles.summaryCardChangeText, 
                  {color: changes.hip < 0 ? theme.palette.success.main : theme.palette.error.main}
                ]}>
                  {Math.abs(changes.hip).toFixed(1)} cm
                </Text>
              </View>
            )}
          </Surface>
        )}
        
        {/* Bel/Kalça Oranı Kartı */}
        {waistHipRatio && (
          <Surface style={styles.summaryCard}>
            <View style={styles.summaryCardHeader}>
              <Text style={styles.summaryCardTitle}>Bel/Kalça Oranı</Text>
              <View style={[styles.iconContainer, {backgroundColor: '#e8f5e9'}]}>
                <MaterialCommunityIcons name="compare" size={20} color="#4caf50" />
              </View>
            </View>
            
            <Text style={styles.summaryCardValue}>
              {waistHipRatio}
            </Text>
            
            <Text style={styles.summaryCardInfo}>
              {parseFloat(waistHipRatio) < 0.85 && selectedClient.gender === 'female' ? 'Sağlıklı aralıkta' : 
               parseFloat(waistHipRatio) < 0.95 && selectedClient.gender === 'male' ? 'Sağlıklı aralıkta' : 
               'Risk faktörü'}
            </Text>
          </Surface>
        )}
        
        {/* Göğüs Ölçüsü Kartı */}
        {latestMeasurement.chest && (
          <Surface style={styles.summaryCard}>
            <View style={styles.summaryCardHeader}>
              <Text style={styles.summaryCardTitle}>Göğüs Çevresi</Text>
              <View style={[styles.iconContainer, {backgroundColor: '#f3e5f5'}]}>
                <MaterialCommunityIcons name="tshirt-crew" size={20} color="#9c27b0" />
              </View>
            </View>
            
            <Text style={styles.summaryCardValue}>
              {latestMeasurement.chest} <Text style={styles.summaryCardUnit}>cm</Text>
            </Text>
            
            {changes && changes.chest !== null && (
              <View style={styles.summaryCardChange}>
                <MaterialCommunityIcons 
                  name={changes.chest < 0 ? "arrow-down" : "arrow-up"} 
                  size={14} 
                  color={changes.chest < 0 ? theme.palette.success.main : theme.palette.error.main} 
                />
                <Text style={[
                  styles.summaryCardChangeText, 
                  {color: changes.chest < 0 ? theme.palette.success.main : theme.palette.error.main}
                ]}>
                  {Math.abs(changes.chest).toFixed(1)} cm
                </Text>
              </View>
            )}
          </Surface>
        )}
        
        {/* Kol Ölçüsü Kartı */}
        {latestMeasurement.arm && (
          <Surface style={styles.summaryCard}>
            <View style={styles.summaryCardHeader}>
              <Text style={styles.summaryCardTitle}>Kol Çevresi</Text>
              <View style={[styles.iconContainer, {backgroundColor: '#ffebee'}]}>
                <MaterialCommunityIcons name="arm-flex" size={20} color="#f44336" />
              </View>
            </View>
            
            <Text style={styles.summaryCardValue}>
              {latestMeasurement.arm} <Text style={styles.summaryCardUnit}>cm</Text>
            </Text>
            
            {changes && changes.arm !== null && (
              <View style={styles.summaryCardChange}>
                <MaterialCommunityIcons 
                  name={changes.arm < 0 ? "arrow-down" : "arrow-up"} 
                  size={14} 
                  color={changes.arm < 0 ? theme.palette.success.main : theme.palette.error.main} 
                />
                <Text style={[
                  styles.summaryCardChangeText, 
                  {color: changes.arm < 0 ? theme.palette.success.main : theme.palette.error.main}
                ]}>
                  {Math.abs(changes.arm).toFixed(1)} cm
                </Text>
              </View>
            )}
          </Surface>
        )}
      </ScrollView>
    );
  };
  
  // Render: Grafik görünümü
  const renderChartView = () => {
    if (!chartData) return null;
    
    const chartConfig = {
      backgroundColor: '#ffffff',
      backgroundGradientFrom: '#ffffff',
      backgroundGradientTo: '#ffffff',
      decimalPlaces: 1,
      color: (opacity = 1) => `rgba(71, 136, 199, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
      style: {
        borderRadius: 16
      },
      propsForDots: {
        r: '6',
        strokeWidth: '2',
        stroke: '#ffa726'
      }
    };
    
    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartTypeSelector}>
          <SegmentedButtons
            value={chartType}
            onValueChange={setChartType}
            buttons={[
              { value: 'weight', label: 'Kilo' },
              { value: 'bodyMetrics', label: 'Vücut' },
              { value: 'comparison', label: 'Oran' }
            ]}
            style={styles.chartTypeButtons}
          />
        </View>
        
        <View style={styles.chartPeriodSelector}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.periodChipsContainer}
          >
            <Chip 
              selected={chartPeriod === '1month'} 
              onPress={() => setChartPeriod('1month')}
              style={styles.periodChip}
            >
              1 Ay
            </Chip>
            <Chip 
              selected={chartPeriod === '3months'} 
              onPress={() => setChartPeriod('3months')}
              style={styles.periodChip}
            >
              3 Ay
            </Chip>
            <Chip 
              selected={chartPeriod === '6months'} 
              onPress={() => setChartPeriod('6months')}
              style={styles.periodChip}
            >
              6 Ay
            </Chip>
            <Chip 
              selected={chartPeriod === '1year'} 
              onPress={() => setChartPeriod('1year')}
              style={styles.periodChip}
            >
              1 Yıl
            </Chip>
            <Chip 
              selected={chartPeriod === 'all'} 
              onPress={() => setChartPeriod('all')}
              style={styles.periodChip}
            >
              Tümü
            </Chip>
          </ScrollView>
        </View>
        
        <View style={styles.chartWrapper}>
          <LineChart
            data={chartData}
            width={width - 32}
            height={220}
            chartConfig={chartConfig}
            bezier
            fromZero={false}
            withInnerLines={true}
            withOuterLines={true}
            withHorizontalLabels={true}
            withVerticalLabels={true}
            hidePointsAtIndex={[]}
            onDataPointClick={handleChartTooltip}
            formatYLabel={(value) => value}
            formatXLabel={(value) => value}
            style={styles.chart}
          />
          
          {/* Tooltip */}
          {tooltipVisible && tooltipData && (
            <View 
              style={[
                styles.tooltip, 
                {
                  left: tooltipPos.x > width / 2 ? tooltipPos.x - 100 : tooltipPos.x,
                  top: tooltipPos.y - 80
                }
              ]}
            >
              <Text style={styles.tooltipDate}>{tooltipData.date}</Text>
              {tooltipData.values.map((item, index) => (
                <Text key={index} style={styles.tooltipValue}>
                  {item.label}: {item.value}
                </Text>
              ))}
              <View style={styles.tooltipArrow} />
            </View>
          )}
          
          <View style={styles.chartLegend}>
            {chartData.legend && chartData.legend.map((label, index) => (
              <View key={index} style={styles.legendItem}>
                <View 
                  style={[
                    styles.legendColor, 
                    { 
                      backgroundColor: typeof chartData.datasets[index]?.color === 'function' 
                        ? chartData.datasets[index].color(1) 
                        : chartData.datasets[index]?.color || '#000' 
                    }
                  ]} 
                />
                <Text style={styles.legendText}>{label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };
  
  // Render: Tablo görünümü
  const renderTableView = () => {
    if (!measurements || measurements.length === 0) return null;
    
    return (
      <View style={styles.tableContainer}>
        <Card style={styles.tableCard}>
          <Card.Title 
            title="Tüm Ölçümler" 
            subtitle="Ölçüm geçmişi"
            right={(props) => (
              <IconButton 
                {...props} 
                icon="information-outline" 
                onPress={() => showSnackbar('Ölçümleri düzenlemek için sağdaki simgelere tıklayın', 'info')} 
              />
            )}
          />
          <Card.Content>
            <ScrollView horizontal style={styles.tableScrollView}>
              <View>
                {/* Tablo başlığı */}
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.tableHeaderCell, { width: 100 }]}>Tarih</Text>
                  <Text style={[styles.tableHeaderCell, { width: 80 }]}>Ağırlık</Text>
                  <Text style={[styles.tableHeaderCell, { width: 70 }]}>Boyun</Text>
                  <Text style={[styles.tableHeaderCell, { width: 70 }]}>Göğüs</Text>
                  <Text style={[styles.tableHeaderCell, { width: 70 }]}>Bel</Text>
                  <Text style={[styles.tableHeaderCell, { width: 70 }]}>Karın</Text>
                  <Text style={[styles.tableHeaderCell, { width: 70 }]}>Kalça</Text>
                  <Text style={[styles.tableHeaderCell, { width: 70 }]}>Kol</Text>
                  <Text style={[styles.tableHeaderCell, { width: 70 }]}>Bacak</Text>
                  <Text style={[styles.tableHeaderCell, { width: 70 }]}>Baldır</Text>
                  <Text style={[styles.tableHeaderCell, { width: 100 }]}>İşlem</Text>
                </View>
                
                {/* Tablo içeriği */}
                <ScrollView style={styles.tableBodyContainer}>
                  {measurements.map((measurement, index) => (
                    <View 
                      key={measurement._id} 
                      style={[
                        styles.tableRow, 
                        index % 2 === 0 ? styles.evenRow : null
                      ]}
                    >
                      <Text style={[styles.tableCell, { width: 100 }]}>{formatDate(measurement.date)}</Text>
                      <Text style={[styles.tableCell, { width: 80 }]}>{measurement.weight ? `${measurement.weight} kg` : '-'}</Text>
                      <Text style={[styles.tableCell, { width: 70 }]}>{measurement.neck ? `${measurement.neck} cm` : '-'}</Text>
                      <Text style={[styles.tableCell, { width: 70 }]}>{measurement.chest ? `${measurement.chest} cm` : '-'}</Text>
                      <Text style={[styles.tableCell, { width: 70 }]}>{measurement.waist ? `${measurement.waist} cm` : '-'}</Text>
                      <Text style={[styles.tableCell, { width: 70 }]}>{measurement.abdomen ? `${measurement.abdomen} cm` : '-'}</Text>
                      <Text style={[styles.tableCell, { width: 70 }]}>{measurement.hip ? `${measurement.hip} cm` : '-'}</Text>
                      <Text style={[styles.tableCell, { width: 70 }]}>{measurement.arm ? `${measurement.arm} cm` : '-'}</Text>
                      <Text style={[styles.tableCell, { width: 70 }]}>{measurement.thigh ? `${measurement.thigh} cm` : '-'}</Text>
                      <Text style={[styles.tableCell, { width: 70 }]}>{measurement.calf ? `${measurement.calf} cm` : '-'}</Text>
                      <View style={[styles.tableCell, { width: 100, flexDirection: 'row' }]}>
                        <IconButton
                          icon="pencil-outline"
                          size={18}
                          iconColor={theme.palette.primary.main}
                          onPress={() => showEditModal(measurement)}
                        />
                        <IconButton
                          icon="trash-can-outline"
                          size={18}
                          iconColor={theme.palette.error.main}
                          onPress={() => handleDeleteMeasurement(measurement._id)}
                        />
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </ScrollView>
          </Card.Content>
        </Card>
      </View>
    );
  };
  
  // Render: Ölçüm Ekleme Modalı
  const renderAddMeasurementModal = () => (
    <Portal>
      <Modal
        visible={addModalVisible}
        onDismiss={() => hideModal(false)}
        contentContainerStyle={styles.simpleModalContainer}
        dismissable={true}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Yeni Ölçüm Ekle</Text>
            <IconButton 
              icon="close" 
              size={24} 
              onPress={() => hideModal(false)} 
              iconColor="#ffffff"
            />
          </View>
          
          <Divider />
          
          {/* Scrollable content */}
          <View style={styles.modalScrollContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formScrollView}>
                <View style={styles.formSection}>
                  <Text style={styles.formSectionTitle}>Temel Ölçümler</Text>
                  
                  {/* Ağırlık */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Ağırlık (kg)*</Text>
                    <View style={styles.inputWrapper}>
                      <MaterialCommunityIcons name="weight-kilogram" size={20} color={theme.palette.primary.main} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={formData.weight}
                        onChangeText={(text) => setFormData({...formData, weight: text})}
                        keyboardType="numeric"
                        placeholder="Örn: 70.5"
                        error={!!errors.weight}
                      />
                    </View>
                    {errors.weight && <Text style={styles.errorText}>{errors.weight}</Text>}
                  </View>
                  
                  <View style={styles.inputRow}>
                    {/* Boyun */}
                    <View style={[styles.inputContainer, styles.halfInput]}>
                      <Text style={styles.inputLabel}>Boyun (cm)</Text>
                      <View style={styles.inputWrapper}>
                        <MaterialCommunityIcons name="human-male" size={20} color={theme.palette.primary.main} style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          value={formData.neck}
                          onChangeText={(text) => setFormData({...formData, neck: text})}
                          keyboardType="numeric"
                          placeholder="Boyun"
                          error={!!errors.neck}
                        />
                      </View>
                      {errors.neck && <Text style={styles.errorText}>{errors.neck}</Text>}
                    </View>
                    
                    {/* Kol */}
                    <View style={[styles.inputContainer, styles.halfInput]}>
                      <Text style={styles.inputLabel}>Kol (cm)</Text>
                      <View style={styles.inputWrapper}>
                        <MaterialCommunityIcons name="arm-flex" size={20} color={theme.palette.primary.main} style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          value={formData.arm}
                          onChangeText={(text) => setFormData({...formData, arm: text})}
                          keyboardType="numeric"
                          placeholder="Kol"
                          error={!!errors.arm}
                        />
                      </View>
                      {errors.arm && <Text style={styles.errorText}>{errors.arm}</Text>}
                    </View>
                  </View>
                </View>
                
                <View style={styles.formSection}>
                  <Text style={styles.formSectionTitle}>Gövde Ölçümleri</Text>
                  
                  <View style={styles.inputRow}>
                    {/* Göğüs */}
                    <View style={[styles.inputContainer, styles.halfInput]}>
                      <Text style={styles.inputLabel}>Göğüs (cm)</Text>
                      <View style={styles.inputWrapper}>
                        <MaterialCommunityIcons name="tshirt-crew" size={20} color={theme.palette.primary.main} style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          value={formData.chest}
                          onChangeText={(text) => setFormData({...formData, chest: text})}
                          keyboardType="numeric"
                          placeholder="Göğüs"
                          error={!!errors.chest}
                        />
                      </View>
                      {errors.chest && <Text style={styles.errorText}>{errors.chest}</Text>}
                    </View>
                    
                    {/* Bel */}
                    <View style={[styles.inputContainer, styles.halfInput]}>
                      <Text style={styles.inputLabel}>Bel (cm)</Text>
                      <View style={styles.inputWrapper}>
                        <MaterialCommunityIcons name="human-handsdown" size={20} color={theme.palette.primary.main} style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          value={formData.waist}
                          onChangeText={(text) => setFormData({...formData, waist: text})}
                          keyboardType="numeric"
                          placeholder="Bel"
                          error={!!errors.waist}
                        />
                      </View>
                      {errors.waist && <Text style={styles.errorText}>{errors.waist}</Text>}
                    </View>
                  </View>
                  
                  <View style={styles.inputRow}>
                    {/* Karın */}
                    <View style={[styles.inputContainer, styles.halfInput]}>
                      <Text style={styles.inputLabel}>Karın (cm)</Text>
                      <View style={styles.inputWrapper}>
                        <MaterialCommunityIcons name="stomach" size={20} color={theme.palette.primary.main} style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          value={formData.abdomen}
                          onChangeText={(text) => setFormData({...formData, abdomen: text})}
                          keyboardType="numeric"
                          placeholder="Karın"
                          error={!!errors.abdomen}
                        />
                      </View>
                      {errors.abdomen && <Text style={styles.errorText}>{errors.abdomen}</Text>}
                    </View>
                    
                    {/* Kalça */}
                    <View style={[styles.inputContainer, styles.halfInput]}>
                      <Text style={styles.inputLabel}>Kalça (cm)</Text>
                      <View style={styles.inputWrapper}>
                        <MaterialCommunityIcons name="human-female" size={20} color={theme.palette.primary.main} style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          value={formData.hip}
                          onChangeText={(text) => setFormData({...formData, hip: text})}
                          keyboardType="numeric"
                          placeholder="Kalça"
                          error={!!errors.hip}
                        />
                      </View>
                      {errors.hip && <Text style={styles.errorText}>{errors.hip}</Text>}
                    </View>
                  </View>
                </View>
                
                <View style={styles.formSection}>
                  <Text style={styles.formSectionTitle}>Bacak Ölçümleri</Text>
                  
                  <View style={styles.inputRow}>
                    {/* Bacak */}
                    <View style={[styles.inputContainer, styles.halfInput]}>
                      <Text style={styles.inputLabel}>Bacak (cm)</Text>
                      <View style={styles.inputWrapper}>
                        <MaterialCommunityIcons name="human-female-dance" size={20} color={theme.palette.primary.main} style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          value={formData.thigh}
                          onChangeText={(text) => setFormData({...formData, thigh: text})}
                          keyboardType="numeric"
                          placeholder="Bacak"
                          error={!!errors.thigh}
                        />
                      </View>
                      {errors.thigh && <Text style={styles.errorText}>{errors.thigh}</Text>}
                    </View>
                    
                    {/* Baldır */}
                    <View style={[styles.inputContainer, styles.halfInput]}>
                      <Text style={styles.inputLabel}>Baldır (cm)</Text>
                      <View style={styles.inputWrapper}>
                        <MaterialCommunityIcons name="shoe-heel" size={20} color={theme.palette.primary.main} style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          value={formData.calf}
                          onChangeText={(text) => setFormData({...formData, calf: text})}
                          keyboardType="numeric"
                          placeholder="Baldır"
                          error={!!errors.calf}
                        />
                      </View>
                      {errors.calf && <Text style={styles.errorText}>{errors.calf}</Text>}
                    </View>
                  </View>
                </View>
                
                <View style={styles.formSection}>
                  <Text style={styles.formSectionTitle}>Notlar</Text>
                  
                  {/* Notlar */}
                  <View style={styles.inputContainer}>
                    <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                      <MaterialCommunityIcons name="note-text" size={20} color={theme.palette.primary.main} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        value={formData.notes}
                        onChangeText={(text) => setFormData({...formData, notes: text})}
                        placeholder="Ölçümle ilgili notlar..."
                        multiline={true}
                        numberOfLines={4}
                      />
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
          
          <Divider />
          
          {/* Footer */}
          <View style={styles.modalFooter}>
            <Button 
              mode="outlined" 
              onPress={() => hideModal(false)} 
              style={styles.cancelButton}
              labelStyle={{color: theme.palette.text.primary, fontWeight: '500'}}
              disabled={submitting}
            >
              İptal
            </Button>
            <Button 
              mode="contained" 
              onPress={handleSaveMeasurement} 
              style={styles.saveButton}
              labelStyle={{color: '#ffffff', fontWeight: '500'}}
              loading={submitting}
              disabled={submitting}
            >
              Kaydet
            </Button>
          </View>
        </View>
      </Modal>
    </Portal>
  );
  
  // Render: Ölçüm Düzenleme Modalı - Aynı yapıyı kullanıyoruz
  const renderEditMeasurementModal = () => (
    <Portal>
      <Modal
        visible={editModalVisible}
        onDismiss={() => hideModal(true)}
        contentContainerStyle={styles.simpleModalContainer}
        dismissable={true}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Ölçüm Düzenle</Text>
            <IconButton 
              icon="close" 
              size={24} 
              onPress={() => hideModal(true)}
              iconColor="#ffffff"
            />
          </View>
          
          <Divider />
          
          {/* Scrollable content */}
          <View style={styles.modalScrollContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formScrollView}>
                <View style={styles.formSection}>
                  <Text style={styles.formSectionTitle}>Temel Ölçümler</Text>
                  
                  {/* Ağırlık */}
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Ağırlık (kg)*</Text>
                    <View style={styles.inputWrapper}>
                      <MaterialCommunityIcons name="weight-kilogram" size={20} color={theme.palette.primary.main} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={formData.weight}
                        onChangeText={(text) => setFormData({...formData, weight: text})}
                        keyboardType="numeric"
                        placeholder="Örn: 70.5"
                        error={!!errors.weight}
                      />
                    </View>
                    {errors.weight && <Text style={styles.errorText}>{errors.weight}</Text>}
                  </View>
                  
                  <View style={styles.inputRow}>
                    {/* Boyun */}
                    <View style={[styles.inputContainer, styles.halfInput]}>
                      <Text style={styles.inputLabel}>Boyun (cm)</Text>
                      <View style={styles.inputWrapper}>
                        <MaterialCommunityIcons name="human-male" size={20} color={theme.palette.primary.main} style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          value={formData.neck}
                          onChangeText={(text) => setFormData({...formData, neck: text})}
                          keyboardType="numeric"
                          placeholder="Boyun"
                          error={!!errors.neck}
                        />
                      </View>
                      {errors.neck && <Text style={styles.errorText}>{errors.neck}</Text>}
                    </View>
                    
                    {/* Kol */}
                    <View style={[styles.inputContainer, styles.halfInput]}>
                      <Text style={styles.inputLabel}>Kol (cm)</Text>
                      <View style={styles.inputWrapper}>
                        <MaterialCommunityIcons name="arm-flex" size={20} color={theme.palette.primary.main} style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          value={formData.arm}
                          onChangeText={(text) => setFormData({...formData, arm: text})}
                          keyboardType="numeric"
                          placeholder="Kol"
                          error={!!errors.arm}
                        />
                      </View>
                      {errors.arm && <Text style={styles.errorText}>{errors.arm}</Text>}
                    </View>
                  </View>
                </View>
                
                <View style={styles.formSection}>
                  <Text style={styles.formSectionTitle}>Gövde Ölçümleri</Text>
                  
                  <View style={styles.inputRow}>
                    {/* Göğüs */}
                    <View style={[styles.inputContainer, styles.halfInput]}>
                      <Text style={styles.inputLabel}>Göğüs (cm)</Text>
                      <View style={styles.inputWrapper}>
                        <MaterialCommunityIcons name="tshirt-crew" size={20} color={theme.palette.primary.main} style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          value={formData.chest}
                          onChangeText={(text) => setFormData({...formData, chest: text})}
                          keyboardType="numeric"
                          placeholder="Göğüs"
                          error={!!errors.chest}
                        />
                      </View>
                      {errors.chest && <Text style={styles.errorText}>{errors.chest}</Text>}
                    </View>
                    
                    {/* Bel */}
                    <View style={[styles.inputContainer, styles.halfInput]}>
                      <Text style={styles.inputLabel}>Bel (cm)</Text>
                      <View style={styles.inputWrapper}>
                        <MaterialCommunityIcons name="human-handsdown" size={20} color={theme.palette.primary.main} style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          value={formData.waist}
                          onChangeText={(text) => setFormData({...formData, waist: text})}
                          keyboardType="numeric"
                          placeholder="Bel"
                          error={!!errors.waist}
                        />
                      </View>
                      {errors.waist && <Text style={styles.errorText}>{errors.waist}</Text>}
                    </View>
                  </View>
                  
                  <View style={styles.inputRow}>
                    {/* Karın */}
                    <View style={[styles.inputContainer, styles.halfInput]}>
                      <Text style={styles.inputLabel}>Karın (cm)</Text>
                      <View style={styles.inputWrapper}>
                        <MaterialCommunityIcons name="stomach" size={20} color={theme.palette.primary.main} style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          value={formData.abdomen}
                          onChangeText={(text) => setFormData({...formData, abdomen: text})}
                          keyboardType="numeric"
                          placeholder="Karın"
                          error={!!errors.abdomen}
                        />
                      </View>
                      {errors.abdomen && <Text style={styles.errorText}>{errors.abdomen}</Text>}
                    </View>
                    
                    {/* Kalça */}
                    <View style={[styles.inputContainer, styles.halfInput]}>
                      <Text style={styles.inputLabel}>Kalça (cm)</Text>
                      <View style={styles.inputWrapper}>
                        <MaterialCommunityIcons name="human-female" size={20} color={theme.palette.primary.main} style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          value={formData.hip}
                          onChangeText={(text) => setFormData({...formData, hip: text})}
                          keyboardType="numeric"
                          placeholder="Kalça"
                          error={!!errors.hip}
                        />
                      </View>
                      {errors.hip && <Text style={styles.errorText}>{errors.hip}</Text>}
                    </View>
                  </View>
                </View>
                
                <View style={styles.formSection}>
                  <Text style={styles.formSectionTitle}>Bacak Ölçümleri</Text>
                  
                  <View style={styles.inputRow}>
                    {/* Bacak */}
                    <View style={[styles.inputContainer, styles.halfInput]}>
                      <Text style={styles.inputLabel}>Bacak (cm)</Text>
                      <View style={styles.inputWrapper}>
                        <MaterialCommunityIcons name="human-female-dance" size={20} color={theme.palette.primary.main} style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          value={formData.thigh}
                          onChangeText={(text) => setFormData({...formData, thigh: text})}
                          keyboardType="numeric"
                          placeholder="Bacak"
                          error={!!errors.thigh}
                        />
                      </View>
                      {errors.thigh && <Text style={styles.errorText}>{errors.thigh}</Text>}
                    </View>
                    
                    {/* Baldır */}
                    <View style={[styles.inputContainer, styles.halfInput]}>
                      <Text style={styles.inputLabel}>Baldır (cm)</Text>
                      <View style={styles.inputWrapper}>
                        <MaterialCommunityIcons name="shoe-heel" size={20} color={theme.palette.primary.main} style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          value={formData.calf}
                          onChangeText={(text) => setFormData({...formData, calf: text})}
                          keyboardType="numeric"
                          placeholder="Baldır"
                          error={!!errors.calf}
                        />
                      </View>
                      {errors.calf && <Text style={styles.errorText}>{errors.calf}</Text>}
                    </View>
                  </View>
                </View>
                
                <View style={styles.formSection}>
                  <Text style={styles.formSectionTitle}>Notlar</Text>
                  
                  {/* Notlar */}
                  <View style={styles.inputContainer}>
                    <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                      <MaterialCommunityIcons name="note-text" size={20} color={theme.palette.primary.main} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        value={formData.notes}
                        onChangeText={(text) => setFormData({...formData, notes: text})}
                        placeholder="Ölçümle ilgili notlar..."
                        multiline={true}
                        numberOfLines={4}
                      />
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
          
          <Divider />
          
          {/* Footer */}
          <View style={styles.modalFooter}>
            <Button 
              mode="outlined" 
              onPress={() => hideModal(true)} 
              style={styles.cancelButton}
              labelStyle={{color: theme.palette.text.primary, fontWeight: '500'}}
              disabled={submitting}
            >
              İptal
            </Button>
            <Button 
              mode="contained" 
              onPress={handleUpdateMeasurement} 
              style={styles.saveButton}
              labelStyle={{color: '#ffffff', fontWeight: '500'}}
              loading={submitting}
              disabled={submitting}
            >
              Güncelle
            </Button>
          </View>
        </View>
      </Modal>
    </Portal>
  );
  
  // Ana render metodu
  return (
    <View style={styles.container}>
      {/* Durum Çubuğu */}
      <StatusBar backgroundColor={theme.palette.primary.main} barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.appBar}>
        <View style={styles.appBarContent}>
          <View style={styles.titleContainer}>
            <Text style={styles.appBarTitle}>Ölçümler</Text>
            {selectedClient && (
              <Text style={styles.appBarSubtitle}>{selectedClient.name}</Text>
            )}
          </View>
          
          <View style={styles.appBarActions}>
            {selectedClient && (
              <IconButton 
                icon="refresh" 
                iconColor="#fff" 
                size={24} 
                onPress={handleRefresh} 
              />
            )}
          </View>
        </View>
      </View>
      
      {/* İçerik */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.palette.primary.main} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={handleRefresh}
              colors={[theme.palette.primary.main]}
            />
          }
        >
          {!selectedClient ? (
            renderNoClientSelected()
          ) : measurements && measurements.length > 0 ? (
            <>
              {/* Üst durum kartı */}
              {renderStatusCard()}
              
              {viewMode === 'dashboard' && (
                <>
                  {/* Özet kartları */}
                  {renderSummaryCards()}
                </>
              )}
              
              {viewMode === 'chart' && (
                <>
                  {/* Grafik görünümü */}
                  {renderChartView()}
                </>
              )}
              
              {viewMode === 'table' && (
                <>
                  {/* Tablo görünümü */}
                  {renderTableView()}
                </>
              )}
            </>
          ) : (
            renderNoMeasurements()
          )}
        </ScrollView>
      )}
      
      {/* FAB */}
      {selectedClient && (
        <FAB
          style={styles.fab}
          icon="plus"
          onPress={showAddModal}
          visible={!addModalVisible && !editModalVisible}
          color="#fff"
        />
      )}
      
      {/* Modaller */}
      {renderAddMeasurementModal()}
      {renderEditMeasurementModal()}
      
      {/* Danışan Seçim Modalı */}
      <Portal>
        <Modal
          visible={clientsPanelVisible}
          onDismiss={() => setClientsPanelVisible(false)}
          contentContainerStyle={styles.clientsModalContainer}
        >
          <View style={styles.clientsModalHeader}>
            <Text style={styles.clientsModalTitle}>Danışan Seçimi</Text>
            <IconButton 
              icon="close" 
              size={24} 
              onPress={() => setClientsPanelVisible(false)} 
            />
          </View>
          
          <Divider />
          
          <ScrollView style={styles.clientsList}>
            {clients.map(client => (
              <TouchableOpacity
                key={client._id}
                style={[
                  styles.clientItem,
                  selectedClient?._id === client._id && styles.selectedClientItem
                ]}
                onPress={() => handleSelectClient(client)}
              >
                <Avatar.Image 
                  size={40} 
                  source={client.profilePicture ? { uri: client.profilePicture } : require('../../../assets/images/icon.png')} 
                />
                <Text style={[
                  styles.clientName,
                  selectedClient?._id === client._id && styles.selectedClientName
                ]}>
                  {client.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Modal>
      </Portal>
      
      {/* Silme Onay Dialog */}
      <Portal>
        <Dialog
          visible={deleteDialogVisible}
          onDismiss={() => setDeleteDialogVisible(false)}
        >
          <Dialog.Title>Ölçüm Silme</Dialog.Title>
          <Dialog.Content>
            <Paragraph>Bu ölçümü silmek istediğinize emin misiniz? Bu işlem geri alınamaz.</Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>İptal</Button>
            <Button 
              onPress={confirmDeleteMeasurement} 
              textColor={theme.palette.error.main}
            >
              Sil
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      {/* Snackbar */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={[
          styles.snackbar,
          snackbarType === 'success' && styles.snackbarSuccess,
          snackbarType === 'error' && styles.snackbarError
        ]}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.palette.background.default,
  },
  appBar: {
    backgroundColor: theme.palette.primary.main,
    paddingTop: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0,
    paddingBottom: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  appBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  titleContainer: {
    flex: 1,
  },
  appBarTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  appBarSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  appBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.palette.text.secondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 12,
    paddingBottom: 32,
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: theme.palette.background.paper,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    marginVertical: 16,
  },
  noDataTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.palette.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  noDataDescription: {
    fontSize: 14,
    color: theme.palette.text.secondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  actionButton: {
    marginTop: 12,
    backgroundColor: theme.palette.primary.main,
  },
  buttonContent: {
    padding: 8,
  },
  summaryCardsContainer: {
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  summaryCard: {
    width: 150,
    padding: 12,
    marginRight: 12,
    borderRadius: 12,
    backgroundColor: theme.palette.background.paper,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryCardTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.palette.text.secondary,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.palette.text.primary,
  },
  summaryCardChange: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  summaryCardChangeText: {
    fontSize: 12,
    marginLeft: 2,
  },
  summaryCardUnit: {
    fontSize: 14,
    color: theme.palette.text.secondary,
  },
  summaryCardInfo: {
    fontSize: 12,
    color: theme.palette.text.secondary,
    marginTop: 4,
  },
  chartContainer: {
    backgroundColor: theme.palette.background.paper,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  chartTypeSelector: {
    marginBottom: 16,
  },
  chartTypeButtons: {
    backgroundColor: theme.palette.background.default,
  },
  chartPeriodSelector: {
    marginBottom: 16,
  },
  periodChipsContainer: {
    paddingVertical: 4,
  },
  periodChip: {
    marginRight: 8,
  },
  chartWrapper: {
    position: 'relative',
    alignItems: 'center',
    paddingTop: 12,
  },
  chart: {
    borderRadius: 12,
    marginVertical: 12,
  },
  chartLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    marginBottom: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 4,
  },
  legendText: {
    fontSize: 12,
    color: theme.palette.text.secondary,
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    padding: 12,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 10,
  },
  tooltipDate: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.palette.text.primary,
    marginBottom: 4,
  },
  tooltipValue: {
    fontSize: 12,
    color: theme.palette.text.secondary,
  },
  tooltipArrow: {
    position: 'absolute',
    bottom: -10,
    left: '50%',
    marginLeft: -10,
    borderWidth: 5,
    borderTopColor: 'rgba(255, 255, 255, 0.95)',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  tableContainer: {
    backgroundColor: theme.palette.background.paper,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  tableCard: {
    borderRadius: 12,
  },
  tableScrollView: {
    marginVertical: 12,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: theme.palette.grey[100],
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.palette.divider,
  },
  tableHeaderCell: {
    fontWeight: 'bold',
    fontSize: 12,
    color: theme.palette.text.secondary,
    paddingHorizontal: 8,
  },
  tableBodyContainer: {
    maxHeight: 300,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.palette.divider,
    paddingVertical: 8,
  },
  evenRow: {
    backgroundColor: theme.palette.grey[50],
  },
  tableCell: {
    fontSize: 12,
    color: theme.palette.text.primary,
    paddingHorizontal: 8,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: theme.palette.primary.main,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    display: 'flex',
    flexDirection: 'column',
    maxHeight: height * 0.85,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: theme.palette.primary.main,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalScrollContainer: {
    maxHeight: height * 0.6,
    flexGrow: 1,
    flexShrink: 1,
  },
  formScrollView: {
    padding: 16,
  },
  formSection: {
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: theme.palette.primary.main,
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.palette.primary.main,
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.palette.text.primary,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    marginBottom: 4,
  },
  inputIcon: {
    padding: 10,
  },
  input: {
    flex: 1,
    backgroundColor: 'transparent',
    fontSize: 16,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderWidth: 0,
    elevation: 0,
    shadowColor: "transparent",
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#d32f2f',
    marginTop: 4,
    marginLeft: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    flexShrink: 0,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    elevation: 0,
  },
  saveButton: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: theme.palette.primary.main,
    borderRadius: 10,
    elevation: 2,
  },
  snackbar: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  snackbarSuccess: {
    backgroundColor: theme.palette.success.main,
  },
  snackbarError: {
    backgroundColor: theme.palette.error.main,
  },
  clientsModalContainer: {
    backgroundColor: theme.palette.background.paper,
    margin: 16,
    borderRadius: 12,
    maxHeight: height * 0.7,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  clientsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  clientsModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.palette.text.primary,
  },
  clientsList: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    maxHeight: height * 0.5,
  },
  clientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.palette.divider,
  },
  selectedClientItem: {
    backgroundColor: `${theme.palette.primary.main}15`,
    borderRadius: 8,
  },
  clientName: {
    marginLeft: 12,
    fontSize: 16,
    color: theme.palette.text.primary,
  },
  selectedClientName: {
    color: theme.palette.primary.main,
    fontWeight: 'bold',
  },
  statusCard: {
    backgroundColor: theme.palette.background.paper,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  statusCardHeader: {
    padding: 16,
  },
  clientInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientAvatar: {
    marginRight: 12,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.palette.text.primary,
  },
  clientDetails: {
    fontSize: 14,
    color: theme.palette.text.secondary,
    marginTop: 2,
  },
  changeClientButton: {
    marginTop: 0,
  },
  divider: {
    marginHorizontal: 16,
  },
  statusCardBody: {
    flexDirection: 'row',
    padding: 16,
  },
  statusColumn: {
    flex: 1,
    alignItems: 'center',
  },
  statusDivider: {
    width: 1,
    backgroundColor: theme.palette.divider,
    marginHorizontal: 12,
  },
  statusLabel: {
    fontSize: 12,
    color: theme.palette.text.secondary,
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.palette.text.primary,
  },
  statusUnit: {
    fontSize: 12,
    color: theme.palette.text.secondary,
  },
  changeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  changeText: {
    fontSize: 12,
  },
  bmiIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 4,
  },
  bmiText: {
    fontSize: 10,
    fontWeight: '500',
  },
  progressContainer: {
    width: '100%',
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    flex: 1,
  },
  progressText: {
    fontSize: 10,
    color: theme.palette.text.secondary,
    marginLeft: 8,
  },
  statusCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  lastMeasurementInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastMeasurementText: {
    fontSize: 10,
    color: theme.palette.text.secondary,
    marginLeft: 4,
  },
  viewButtons: {
    alignItems: 'flex-end',
  },
  viewModeButtons: {
    backgroundColor: theme.palette.background.default,
    borderWidth: 0,
  },
  simpleModalContainer: {
    margin: 20,
    padding: 0,
    justifyContent: 'center',
    backgroundColor: 'transparent',
    width: '90%',
    alignSelf: 'center',
    maxHeight: height * 0.8,
  },
  textAreaWrapper: {
    alignItems: 'flex-start',
  },
});

export default MeasurementsScreen;
