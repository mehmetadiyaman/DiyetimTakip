import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  FlatList, 
  RefreshControl,
  Alert,
  TouchableOpacity,
  Dimensions,
  Animated,
  Platform,
  KeyboardAvoidingView,
  Image,
  ScrollView
} from 'react-native';
import { 
  Card, 
  FAB, 
  Chip, 
  Title, 
  Button, 
  IconButton, 
  Portal, 
  Modal, 
  TextInput, 
  RadioButton, 
  Divider,
  Switch,
  Appbar,
  Menu
} from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import { apiRequest } from '../../api/config';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../themes/theme';
import { useFocusEffect } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const AppointmentsScreen = ({ navigation, route }) => {
  const { token } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  
  // Modal States
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  
  // Form States
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientsMenuVisible, setClientsMenuVisible] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date(),
    duration: '60',
    status: 'scheduled',
    type: 'in-person',
    notes: ''
  });
  
  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Menu state
  const [menuVisible, setMenuVisible] = useState(false);
  const [activeAppointmentId, setActiveAppointmentId] = useState(null);
  
  // Animation refs
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Snackbar State
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Ekran odaklandığında verileri yükle
  useFocusEffect(
    React.useCallback(() => {
      loadData();
      return () => {};
    }, [])
  );
  
  // Modal animation
  useEffect(() => {
    if (modalVisible) {
      showModal();
    }
  }, [modalVisible]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Danışanları yükle
      const clientsData = await apiRequest('GET', '/clients', null, token);
      if (clientsData) {
        setClients(clientsData);
      }

      // Randevuları yükle
      const appointmentsData = await apiRequest('GET', '/appointments', null, token);
      if (appointmentsData) {
        // MongoDB Extended JSON formatını düzelt
        const processedAppointments = Array.isArray(appointmentsData) ? 
          appointmentsData.map(processAppointmentData) : [];
          
        // Tarihe göre sırala
        processedAppointments.sort((a, b) => new Date(a.date) - new Date(b.date));
        setAppointments(processedAppointments);
      }
    } catch (err) {
      console.error('Veri yükleme hatası:', err);
      setError('Veriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // MongoDB Extended JSON verilerini işleme
  const processAppointmentData = (data) => {
    if (!data) return null;
    
    // Nesneyi klonla
    const processedData = {...data};
    
    // MongoDB ObjectId ve Date formatlarını dönüştür
    if (data._id && data._id.$oid) {
      processedData._id = data._id.$oid;
    }
    
    if (data.clientId && data.clientId.$oid) {
      processedData.clientId = data.clientId.$oid;
    }
    
    if (data.userId && data.userId.$oid) {
      processedData.userId = data.userId.$oid;
    }
    
    // Tarih alanlarını dönüştür
    ['date', 'createdAt', 'updatedAt'].forEach(field => {
      if (data[field] && data[field].$date) {
        if (data[field].$date.$numberLong) {
          processedData[field] = new Date(parseInt(data[field].$date.$numberLong));
        } else {
          processedData[field] = new Date(data[field].$date);
        }
      }
    });
    
    // Sayısal değerleri dönüştür
    if (data.duration && data.duration.$numberInt) {
      processedData.duration = parseInt(data.duration.$numberInt);
    }
    
    return processedData;
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c._id === clientId);
    return client ? client.name : 'İsimsiz Danışan';
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed': return 'Tamamlandı';
      case 'canceled': return 'İptal Edildi';
      default: return 'Planlandı';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#4caf50';
      case 'canceled': return '#f44336';
      default: return '#2196f3';
    }
  };
  
  // Modal animasyonları
  const showModal = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      })
    ]).start();
  };
  
  const hideModal = (callback) => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      })
    ]).start(() => {
      if (callback) callback();
      else setModalVisible(false);
    });
  };

  // Randevu oluştur/düzenle modal işlemleri
  const handleOpenCreateModal = () => {
    setFormData({
      date: new Date(),
      duration: '60',
      status: 'scheduled',
      type: 'in-person',
      notes: ''
    });
    setSelectedClient(null);
    setIsEditing(false);
    setModalVisible(true);
  };
  
  const handleOpenEditModal = (appointment) => {
    setMenuVisible(false);
    
    const client = clients.find(c => c._id === appointment.clientId);
    setSelectedClient(client || null);
    
    setFormData({
      date: new Date(appointment.date),
      duration: appointment.duration.toString(),
      status: appointment.status || 'scheduled',
      type: appointment.type || 'in-person',
      notes: appointment.notes || ''
    });
    
    setSelectedAppointment(appointment);
    setIsEditing(true);
    setModalVisible(true);
  };
  
  const handleCloseModal = () => {
    hideModal();
  };
  
  // Form işleyicileri
  const handleTextChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };
  
  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFormData({
        ...formData,
        date: selectedDate
      });
    }
  };
  
  // Form gönderimi
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      
      const appointmentData = {
        clientId: selectedClient._id,
        date: formData.date.toISOString(),
        duration: parseInt(formData.duration),
        status: formData.status,
        type: formData.type,
        notes: formData.notes
      };
      
      let response;
      
      if (isEditing && selectedAppointment) {
        response = await apiRequest(
          'PUT', 
          `/appointments/${selectedAppointment._id}`, 
          appointmentData, 
          token
        );
        
        if (response) {
          showSnackbar('Randevu başarıyla güncellendi');
        }
      } else {
        response = await apiRequest(
          'POST',
          '/appointments',
          appointmentData,
          token
        );
        
        if (response) {
          showSnackbar('Randevu başarıyla oluşturuldu');
        }
      }
      
      hideModal(() => {
        loadData();
      });
    } catch (error) {
      console.error('Randevu kaydetme hatası:', error);
      Alert.alert(
        'Hata', 
        'Randevu kaydedilirken bir sorun oluştu. Lütfen tekrar deneyin.',
        [{ text: 'Tamam' }]
      );
    } finally {
      setLoading(false);
    }
  };
  
  // Form doğrulama
  const validateForm = () => {
    if (!selectedClient) {
      Alert.alert('Hata', 'Lütfen bir danışan seçin');
      return false;
    }
    
    if (!formData.date) {
      Alert.alert('Hata', 'Lütfen bir tarih seçin');
      return false;
    }
    
    if (!formData.duration || parseInt(formData.duration) <= 0) {
      Alert.alert('Hata', 'Lütfen geçerli bir süre girin');
      return false;
    }
    
    return true;
  };

  // Randevu silme
  const handleDeleteAppointment = async () => {
    setMenuVisible(false);
    
    try {
      if (!activeAppointmentId) return;
      
      const confirmed = await new Promise((resolve) => {
        Alert.alert(
          'Onay',
          'Bu randevuyu silmek istediğinizden emin misiniz?',
          [
            {text: 'İptal', onPress: () => resolve(false)},
            {text: 'Sil', onPress: () => resolve(true), style: 'destructive'},
          ]
        );
      });
      
      if (!confirmed) return;
      
      setLoading(true);
      
      await apiRequest('DELETE', `/appointments/${activeAppointmentId}`, null, token);
      
      // Randevuları yeniden yüklemek yerine state'ten kaldır
      const updatedAppointments = appointments.filter(
        appointment => appointment._id !== activeAppointmentId
      );
      setAppointments(updatedAppointments);
      
      showSnackbar('Randevu başarıyla silindi');
    } catch (error) {
      console.error('Randevu silme hatası:', error);
      Alert.alert('Hata', 'Randevu silinirken bir sorun oluştu');
    } finally {
      setLoading(false);
    }
  };
  
  // Snackbar göster
  const showSnackbar = (message) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
    
    // 3 saniye sonra gizle
    setTimeout(() => {
      setSnackbarVisible(false);
    }, 3000);
  };

  // Randevu menüsünü aç
  const openAppointmentMenu = (id) => {
    setActiveAppointmentId(id);
    setMenuVisible(true);
  };

  // Form modalı
  const renderFormModal = () => (
    <Modal
      visible={modalVisible}
      onDismiss={handleCloseModal}
      contentContainerStyle={styles.modalContainer}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <Animated.View 
          style={[
            styles.modalContent,
            {
              transform: [{ translateY: slideAnim }],
              opacity: fadeAnim
            }
          ]}
        >
          <View style={styles.formHeader}>
            <Ionicons name={isEditing ? "calendar" : "calendar-outline"} size={24} color="#4caf50" style={styles.formHeaderIcon} />
            <Title style={styles.formTitle}>
              {isEditing ? 'Randevu Düzenle' : 'Yeni Randevu Ekle'}
            </Title>
            <TouchableOpacity onPress={handleCloseModal} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#757575" />
            </TouchableOpacity>
          </View>
          
          <Divider style={styles.divider} />
          
          <ScrollView contentContainerStyle={styles.modalForm}>
            {/* Danışan Bilgileri Bölümü */}
            <View style={styles.formSection}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="person" size={20} color="#4caf50" />
                <Text style={styles.sectionTitle}>Danışan Bilgileri</Text>
              </View>
              
              <View style={styles.formCard}>
                {/* Danışan Seçimi */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Danışan <Text style={styles.required}>*</Text></Text>
                  <TouchableOpacity 
                    style={styles.clientSelector}
                    onPress={() => setClientsMenuVisible(true)}
                  >
                    {selectedClient && selectedClient.profilePicture ? (
                      <Image 
                        source={{ uri: selectedClient.profilePicture }} 
                        style={styles.selectedClientAvatar} 
                        defaultSource={require('../../../assets/images/icon.png')}
                      />
                    ) : selectedClient ? (
                      <View style={styles.selectedClientAvatarPlaceholder}>
                        <Text style={styles.selectedClientInitial}>
                          {selectedClient.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    ) : (
                      <Ionicons name="person" size={24} color="#bdbdbd" style={styles.clientSelectorIcon} />
                    )}
                    
                    <Text style={selectedClient ? styles.selectedClientText : styles.placeholderText}>
                      {selectedClient ? selectedClient.name : 'Danışan Seçin'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#4caf50" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            
            {/* Danışan seçme modalı */}
            <Portal>
              <Modal
                visible={clientsMenuVisible}
                onDismiss={() => setClientsMenuVisible(false)}
                contentContainerStyle={styles.clientsModalContainer}
              >
                <View style={styles.clientsModalContent}>
                  <View style={styles.clientsModalHeader}>
                    <Text style={styles.clientsModalTitle}>Danışan Seçin</Text>
                    <IconButton 
                      icon="close" 
                      size={20} 
                      onPress={() => setClientsMenuVisible(false)} 
                    />
                  </View>
                  <Divider />
                  <FlatList
                    data={clients}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={styles.clientsList}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.clientItem}
                        onPress={() => {
                          setSelectedClient(item);
                          setClientsMenuVisible(false);
                        }}
                      >
                        {item.profilePicture ? (
                          <Image 
                            source={{ uri: item.profilePicture }} 
                            style={styles.clientItemAvatar}
                            defaultSource={require('../../../assets/images/icon.png')} 
                          />
                        ) : (
                          <View style={styles.clientItemAvatarPlaceholder}>
                            <Text style={styles.clientItemInitial}>
                              {item.name.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                        <View style={styles.clientItemInfo}>
                          <Text style={styles.clientItemName}>{item.name}</Text>
                          {item.email && <Text style={styles.clientItemEmail}>{item.email}</Text>}
                        </View>
                      </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                      <View style={styles.emptyClientsList}>
                        <Ionicons name="people" size={48} color="#e0e0e0" />
                        <Text style={styles.emptyClientsText}>Danışan bulunamadı</Text>
                      </View>
                    }
                  />
                </View>
              </Modal>
            </Portal>
            
            {/* Randevu Bilgileri Bölümü */}
            <View style={styles.formSection}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="calendar" size={20} color="#4caf50" />
                <Text style={styles.sectionTitle}>Randevu Bilgileri</Text>
              </View>
              
              <View style={styles.formCard}>
                {/* Tarih ve Saat */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Tarih ve Saat <Text style={styles.required}>*</Text></Text>
                  <TouchableOpacity
                    style={styles.dateSelector}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Ionicons name="calendar-outline" size={20} color="#4caf50" style={styles.dateIcon} />
                    <Text style={styles.dateText}>
                      {formData.date ? 
                        `${formatDate(formData.date)} ${formatTime(formData.date)}` : 
                        'Tarih Seçin'}
                    </Text>
                  </TouchableOpacity>
                  
                  {showDatePicker && (
                    <DateTimePicker
                      value={formData.date || new Date()}
                      mode="datetime"
                      display="default"
                      onChange={handleDateChange}
                      minimumDate={new Date()}
                    />
                  )}
                </View>
                
                {/* Süre */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Süre (Dakika) <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    value={formData.duration}
                    onChangeText={(text) => {
                      // Sadece sayısal değerlere izin ver
                      const numericValue = text.replace(/[^0-9]/g, '');
                      handleTextChange('duration', numericValue);
                    }}
                    keyboardType="numeric"
                    mode="outlined"
                    placeholder="60"
                    style={styles.input}
                    outlineColor="#4caf50"
                    activeOutlineColor="#2e7d32"
                    left={<TextInput.Icon icon="clock-outline" color="#4caf50" />}
                    right={<TextInput.Affix text="dk" />}
                  />
                </View>
              </View>
            </View>
            
            {/* Randevu Detayları Bölümü */}
            <View style={styles.formSection}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="options" size={20} color="#4caf50" />
                <Text style={styles.sectionTitle}>Randevu Detayları</Text>
              </View>
              
              <View style={styles.formCard}>
                {/* Randevu Türü */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Randevu Türü</Text>
                  <View style={styles.chipGroup}>
                    <Chip
                      selected={formData.type === 'in-person'}
                      onPress={() => handleTextChange('type', 'in-person')}
                      style={[styles.formChip, formData.type === 'in-person' && styles.selectedChip]}
                      textStyle={formData.type === 'in-person' ? {color: 'white'} : {}}
                      icon={() => <Ionicons name="person" size={16} color={formData.type === 'in-person' ? 'white' : '#2E7D32'} />}
                    >
                      Yüz Yüze
                    </Chip>
                    <Chip
                      selected={formData.type === 'online'}
                      onPress={() => handleTextChange('type', 'online')}
                      style={[styles.formChip, formData.type === 'online' && styles.selectedChipBlue]}
                      textStyle={formData.type === 'online' ? {color: 'white'} : {}}
                      icon={() => <Ionicons name="videocam" size={16} color={formData.type === 'online' ? 'white' : '#1565C0'} />}
                    >
                      Online
                    </Chip>
                  </View>
                </View>
                
                {/* Durum */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Randevu Durumu</Text>
                  <View style={styles.chipGroup}>
                    <Chip
                      selected={formData.status === 'scheduled'}
                      onPress={() => handleTextChange('status', 'scheduled')}
                      style={[styles.formChip, formData.status === 'scheduled' && styles.selectedChipBlue]}
                      textStyle={formData.status === 'scheduled' ? {color: 'white'} : {}}
                    >
                      Planlandı
                    </Chip>
                    <Chip
                      selected={formData.status === 'completed'}
                      onPress={() => handleTextChange('status', 'completed')}
                      style={[styles.formChip, formData.status === 'completed' && styles.selectedChip]}
                      textStyle={formData.status === 'completed' ? {color: 'white'} : {}}
                    >
                      Tamamlandı
                    </Chip>
                    <Chip
                      selected={formData.status === 'canceled'}
                      onPress={() => handleTextChange('status', 'canceled')}
                      style={[styles.formChip, formData.status === 'canceled' && styles.selectedChipRed]}
                      textStyle={formData.status === 'canceled' ? {color: 'white'} : {}}
                    >
                      İptal Edildi
                    </Chip>
                  </View>
                </View>
                
                {/* Notlar */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Notlar</Text>
                  <TextInput
                    value={formData.notes}
                    onChangeText={(text) => handleTextChange('notes', text)}
                    mode="outlined"
                    placeholder="Randevu hakkında notlar..."
                    multiline
                    numberOfLines={3}
                    style={styles.textArea}
                    outlineColor="#4caf50"
                    activeOutlineColor="#2e7d32"
                    left={<TextInput.Icon icon="note-text" color="#4caf50" />}
                  />
                </View>
              </View>
            </View>
            
            {/* Kaydet & İptal Butonları */}
            <View style={styles.buttonContainer}>
              <Button 
                mode="outlined" 
                onPress={handleCloseModal}
                style={styles.buttonCancel}
                labelStyle={{ color: '#757575' }}
                icon="close"
              >
                İptal
              </Button>
              
              <Button 
                mode="contained" 
                onPress={handleSubmit}
                loading={loading}
                disabled={loading}
                style={styles.buttonSave}
                buttonColor="#4caf50"
                icon="content-save"
              >
                {isEditing ? 'Güncelle' : 'Oluştur'}
              </Button>
            </View>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );

  // Randevuları listele
  const renderAppointmentItem = ({ item }) => {
    const isPast = new Date(item.date) < new Date();
    const isToday = new Date(item.date).toDateString() === new Date().toDateString();
    
    // Danışan bilgilerini al
    const client = clients.find(c => c._id === item.clientId) || {};
    const clientName = client.name || 'İsimsiz Danışan';
    
    return (
      <Card style={[styles.card, isPast && styles.pastCard]}>
        <Card.Content style={styles.cardContent}>
          {/* Üst bilgi alanı */}
          <View style={styles.cardHeader}>
            <View style={styles.clientSection}>
              {client.profilePicture ? (
                <Image 
                  source={{ uri: client.profilePicture }} 
                  style={styles.clientAvatar} 
                  defaultSource={require('../../../assets/images/icon.png')}
                />
              ) : (
                <View style={styles.clientAvatarPlaceholder}>
                  <Text style={styles.clientInitial}>
                    {clientName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.clientDetails}>
                <Text style={styles.clientName} numberOfLines={1}>{clientName}</Text>
                {isToday && (
                  <View style={styles.todayBadge}>
                    <Text style={styles.todayText}>Bugün</Text>
                  </View>
                )}
              </View>
            </View>
            
            <TouchableOpacity
              onPress={() => openAppointmentMenu(item._id)}
              style={styles.menuButton}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
            >
              <Ionicons name="ellipsis-vertical" size={20} color="#757575" />
            </TouchableOpacity>
          </View>
          
          {/* Randevu detayları */}
          <View style={styles.appointmentInfo}>
            {/* Tarih ve saat bilgisi */}
            <View style={styles.dateTimeRow}>
              <View style={styles.dateTimeInfo}>
                <View style={styles.dateContainer}>
                  <Ionicons name="calendar" size={16} color="#4caf50" style={styles.iconSmall} />
                  <Text style={styles.dateText}>{formatDate(item.date)}</Text>
                </View>
                <View style={styles.timeContainer}>
                  <Ionicons name="time-outline" size={16} color="#4caf50" style={styles.iconSmall} />
                  <Text style={styles.timeText}>{formatTime(item.date)}</Text>
                </View>
              </View>
              
              <View style={styles.durationBadge}>
                <Ionicons name="hourglass-outline" size={12} color="#555" />
                <Text style={styles.durationText}>{item.duration} dk</Text>
              </View>
            </View>
            
            {/* Randevu türü ve durum */}
            <View style={styles.chipsContainer}>
              <Chip
                style={[styles.cardChip, {backgroundColor: item.type === 'online' ? '#E3F2FD' : '#E8F5E9'}]}
                textStyle={{color: item.type === 'online' ? '#1565C0' : '#2E7D32', fontSize: 12}}
                icon={() => (
                  <Ionicons 
                    name={item.type === 'online' ? 'videocam' : 'person'} 
                    size={14} 
                    color={item.type === 'online' ? '#1565C0' : '#2E7D32'} 
                  />
                )}
              >
                {item.type === 'online' ? 'Online' : 'Yüz Yüze'}
              </Chip>
              
              <Chip
                style={[styles.cardChip, { 
                  backgroundColor: 
                    item.status === 'completed' ? '#E8F5E9' : 
                    item.status === 'canceled' ? '#FFEBEE' : 
                    '#E3F2FD'
                }]}
                textStyle={{ 
                  color: 
                    item.status === 'completed' ? '#2E7D32' : 
                    item.status === 'canceled' ? '#C62828' : 
                    '#1565C0',
                  fontSize: 12
                }}
              >
                {getStatusLabel(item.status)}
              </Chip>
            </View>
            
            {/* Notlar bölümü */}
            {item.notes && (
              <View style={styles.notesSection}>
                <Ionicons name="document-text-outline" size={14} color="#757575" style={{marginRight: 6}} />
                <Text style={styles.notesText} numberOfLines={2}>{item.notes}</Text>
              </View>
            )}
          </View>
          
          {/* Menü */}
          <Portal>
            <Menu
              visible={menuVisible && activeAppointmentId === item._id}
              onDismiss={() => setMenuVisible(false)}
              anchor={{ x: width - 40, y: 100 }}
              contentStyle={styles.menuContent}
            >
              <Menu.Item
                leadingIcon="pencil"
                onPress={() => handleOpenEditModal(item)}
                title="Düzenle"
                titleStyle={styles.menuItemText}
              />
              <Menu.Item
                leadingIcon="delete"
                onPress={handleDeleteAppointment}
                title="Sil"
                titleStyle={[styles.menuItemText, { color: '#f44336' }]}
              />
            </Menu>
          </Portal>
        </Card.Content>
      </Card>
    );
  };

  // Boş liste
  const renderEmptyList = () => (
    <View style={styles.centerContainer}>
      <Ionicons name="calendar-outline" size={60} color="#ccc" />
      <Text style={styles.emptyText}>Henüz randevu bulunmuyor</Text>
      <Button 
        mode="contained" 
        onPress={handleOpenCreateModal} 
        style={styles.emptyButton}
        icon="plus"
      >
        Randevu Ekle
      </Button>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4caf50" />
        <Text style={styles.loadingText}>Randevular yükleniyor...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={60} color="#f44336" />
        <Text style={styles.errorText}>{error}</Text>
        <Button 
          mode="contained" 
          onPress={loadData} 
          style={{ marginTop: 16 }}
          buttonColor="#4caf50"
        >
          Tekrar Dene
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={appointments}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4caf50']} />
        }
        renderItem={renderAppointmentItem}
        ListEmptyComponent={renderEmptyList}
      />
      
      {renderFormModal()}
      
      {/* Snackbar */}
      {snackbarVisible && (
        <View style={styles.snackbar}>
          <Text style={styles.snackbarText}>{snackbarMessage}</Text>
        </View>
      )}
      
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={handleOpenCreateModal}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#757575',
  },
  errorText: {
    color: '#f44336',
    textAlign: 'center',
    fontSize: 16,
    marginTop: 16
  },
  emptyText: {
    color: '#757575',
    textAlign: 'center',
    fontSize: 16,
    marginTop: 16,
    marginBottom: 16
  },
  emptyButton: {
    marginTop: 16,
    backgroundColor: '#4caf50'
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
    backgroundColor: '#fff',
    overflow: 'hidden',
    borderColor: '#f0f0f0',
    borderWidth: 1,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  cardContent: {
    padding: 16,
    paddingBottom: 12,
  },
  pastCard: {
    opacity: 0.8,
    borderLeftColor: '#9e9e9e',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  clientSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  clientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#f2f2f2',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  clientAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4caf50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#a5d6a7',
  },
  clientInitial: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  clientDetails: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  menuButton: {
    padding: 8,
    marginRight: -8,
  },
  appointmentInfo: {
    paddingVertical: 4,
  },
  iconSmall: {
    marginRight: 6,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dateTimeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  dateText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  durationText: {
    fontSize: 12,
    color: '#555',
    marginLeft: 4,
    fontWeight: '500',
  },
  todayBadge: {
    backgroundColor: '#e8f5e9',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#a5d6a7',
  },
  todayText: {
    fontSize: 10,
    color: '#2e7d32',
    fontWeight: '700',
  },
  statusSection: {
    marginBottom: 8,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    marginBottom: 8,
  },
  cardChip: {
    marginRight: 8,
    marginBottom: 8,
    height: 28,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minWidth: 80,
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  formChip: {
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minWidth: 90,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedChip: {
    backgroundColor: '#4caf50',
    borderColor: '#4caf50',
  },
  selectedChipBlue: {
    backgroundColor: '#2196f3',
    borderColor: '#2196f3',
  },
  selectedChipRed: {
    backgroundColor: '#f44336',
    borderColor: '#f44336',
  },
  notesSection: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f9f9f9',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  notesText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  menuContent: {
    backgroundColor: 'white',
    borderRadius: 8,
    elevation: 4,
  },
  menuItemText: {
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#4caf50',
  },
  modalContainer: {
    margin: 0,
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    height: '90%',
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 10,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 20,
  },
  formHeaderIcon: {
    marginRight: 12,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  closeButton: {
    padding: 8,
  },
  divider: {
    backgroundColor: '#e0e0e0',
    height: 1,
    marginBottom: 8,
  },
  modalForm: {
    padding: 16,
    paddingBottom: 40,
  },
  formSection: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4caf50',
    marginLeft: 8,
  },
  formCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
    fontWeight: '500',
  },
  required: {
    color: '#f44336',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  buttonCancel: {
    flex: 1,
    marginRight: 8,
    borderColor: '#757575',
    borderWidth: 1,
  },
  buttonSave: {
    flex: 1,
    marginLeft: 8,
  },
  clientSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  clientSelectorIcon: {
    marginRight: 8,
  },
  selectedClientAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  selectedClientAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4caf50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectedClientInitial: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectedClientText: {
    flex: 1,
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  placeholderText: {
    flex: 1,
    color: '#999',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  dateIcon: {
    marginRight: 12,
  },
  input: {
    backgroundColor: '#fff',
  },
  textArea: {
    backgroundColor: '#fff',
    minHeight: 100,
  },
  snackbar: {
    position: 'absolute',
    bottom: 70,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 10,
    borderRadius: 4,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  snackbarText: {
    color: 'white',
    textAlign: 'center',
  },
  clientsModalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    padding: 0,
    overflow: 'hidden',
    maxHeight: '80%',
  },
  clientsModalContent: {
    backgroundColor: 'white',
  },
  clientsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
  },
  clientsModalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  clientsList: {
    padding: 8,
  },
  clientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  clientItemAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#f2f2f2',
  },
  clientItemAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4caf50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  clientItemInitial: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  clientItemInfo: {
    flex: 1,
  },
  clientItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  clientItemEmail: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  emptyClientsList: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyClientsText: {
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default AppointmentsScreen; 