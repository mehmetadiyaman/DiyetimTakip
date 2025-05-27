import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Alert, 
  ActivityIndicator,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  Animated,
  Dimensions
} from 'react-native';
import { 
  TextInput, 
  Button, 
  Divider, 
  Card,
  Avatar,
  Title,
  HelperText,
  Chip,
  Badge,
  SegmentedButtons,
  Menu,
  Portal,
  Modal
} from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import { apiRequest, API_URL } from '../../api/config';
import Ionicons from 'react-native-vector-icons/Ionicons';
import theme from '../../themes/theme';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { FAB } from 'react-native-paper';

const { width, height } = Dimensions.get('window');

const ClientDetailsScreen = ({ navigation, route }) => {
  const { token } = useAuth();
  const { clientId, isEditing, isCreating } = route.params || {};
  
  const [loading, setLoading] = useState(!isCreating);
  const [saving, setSaving] = useState(false);
  const [client, setClient] = useState({
    name: '',
    email: '',
    phone: '',
    gender: 'female',
    birthDate: '',
    height: '',
    startingWeight: '',
    targetWeight: '',
    activityLevel: 'moderate',
    medicalHistory: '',
    dietaryRestrictions: '',
    notes: '',
    referenceCode: '',
    profilePicture: ''
    // telegramChatId web sürümünde yönetilecek
  });
  const [errors, setErrors] = useState({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activityMenuVisible, setActivityMenuVisible] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  
  // Modal için yeni state'ler
  const [editModalVisible, setEditModalVisible] = useState(isEditing || isCreating);
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Tarih seçici modalı için yeni state
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Aktivite seviyeleri
  const activityLevels = [
    { label: 'Hareketsiz', value: 'sedentary' },
    { label: 'Az Aktif', value: 'lightly_active' },
    { label: 'Orta Aktif', value: 'moderate' },
    { label: 'Aktif', value: 'active' },
    { label: 'Çok Aktif', value: 'very_active' }
  ];

  const getActivityLevelLabel = (value) => {
    const level = activityLevels.find(level => level.value === value);
    return level ? level.label : 'Bilinmiyor';
  };

  useEffect(() => {
    if (clientId && !isCreating) {
      loadClientData();
    }
    
    // Modal animasyonu
    if (isEditing || isCreating) {
      showEditModal();
    }
  }, [clientId, isEditing, isCreating]);
  
  // Modal gösterme ve gizleme animasyonları
  const showEditModal = () => {
    setEditModalVisible(true);
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
  
  const hideEditModal = (callback) => {
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
      setEditModalVisible(false);
      if (callback) callback();
    });
  };

  const loadClientData = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('GET', `/clients/${clientId}`, null, token);
      
      if (data) {
        // Form için veriyi hazırla
        setClient({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          gender: data.gender || 'female',
          birthDate: data.birthDate ? data.birthDate.split('T')[0] : '',
          height: data.height ? data.height.toString() : '',
          startingWeight: data.startingWeight ? data.startingWeight.toString() : '',
          targetWeight: data.targetWeight ? data.targetWeight.toString() : '',
          activityLevel: data.activityLevel || 'moderate',
          medicalHistory: data.medicalHistory || '',
          dietaryRestrictions: data.dietaryRestrictions || '',
          notes: data.notes || '',
          profilePicture: data.profilePicture || '',
          referenceCode: data.referenceCode || ''
          // telegramChatId web sürümünde yönetilecek
        });
      }
    } catch (error) {
      console.error('Danışan verisi yükleme hatası:', error);
      Alert.alert('Hata', 'Danışan bilgileri yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!client.name.trim()) {
      newErrors.name = 'Ad Soyad gereklidir';
    }
    
    if (!client.email.trim()) {
      newErrors.email = 'E-posta gereklidir';
    } else if (!/\S+@\S+\.\S+/.test(client.email)) {
      newErrors.email = 'Geçerli bir e-posta adresi giriniz';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageUpload = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Hata', 'Galeriye erişim izni verilmedi');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType ? ImagePicker.MediaType.Images : ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5, // Düşük kalite ile yükleme daha hızlı olur
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        setImageUploading(true);
        
        try {
          // Dosya bilgilerini çıkar
          const fileUri = Platform.OS === 'ios' ? selectedAsset.uri.replace('file://', '') : selectedAsset.uri;
          const fileName = fileUri.split('/').pop() || 'profile.jpg';
          
          console.log(`Dosya URI: ${fileUri}`);
          console.log(`Dosya adı: ${fileName}`);
          
          // Cloudinary'ye yükleme için formData oluştur
          const formData = new FormData();
          formData.append('file', {
            uri: fileUri,
            type: 'image/jpeg',
            name: fileName,
          });
          
          // API endpoint ve headers oluştur
          const apiUrl = `${API_URL}/upload/profile`;
          console.log(`API URL: ${apiUrl}`);
          
          const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
            'Accept': 'application/json',
          };
          
          // YÖNTEM 1: Fetch API ile doğrudan istek
          try {
            console.log('Fetch API ile yükleme deneniyor...');
            const response = await fetch(apiUrl, {
              method: 'POST',
              headers: headers,
              body: formData,
            });
            
            console.log(`Fetch yanıt durumu: ${response.status}`);
            
            if (!response.ok) {
              console.error(`HTTP hata: ${response.status}`);
              throw new Error(`HTTP Error: ${response.status}`);
            }
            
            const responseText = await response.text();
            console.log(`Yanıt metni: ${responseText}`);
            
            let imageData;
            try {
              imageData = JSON.parse(responseText);
            } catch (parseError) {
              console.error('JSON ayrıştırma hatası:', parseError);
              console.log('Yanıt içeriği:', responseText);
              throw new Error('Geçersiz JSON yanıtı');
            }
            
            if (imageData && imageData.url) {
              setClient({...client, profilePicture: imageData.url});
              Alert.alert('Başarılı', 'Profil resmi yüklendi');
            } else {
              console.error('Beklenen URL alanı bulunamadı:', imageData);
              throw new Error('Resim URL alınamadı');
            }
          } catch (fetchError) {
            console.error('Fetch hatası:', fetchError);
            
            // YÖNTEM 2: XMLHttpRequest ile yükleme dene (alternatif)
            console.log('XMLHttpRequest ile yükleme deneniyor...');
            return new Promise((resolve, reject) => {
              const xhr = new XMLHttpRequest();
              xhr.open('POST', apiUrl);
              
              // Headers ekle
              Object.keys(headers).forEach(key => {
                xhr.setRequestHeader(key, headers[key]);
              });
              
              xhr.onload = function() {
                if (xhr.status >= 200 && xhr.status < 300) {
                  console.log('XHR başarılı:', xhr.responseText);
                  try {
                    const data = JSON.parse(xhr.responseText);
                    if (data && data.url) {
                      setClient({...client, profilePicture: data.url});
                      Alert.alert('Başarılı', 'Profil resmi yüklendi');
                      resolve();
                    } else {
                      const error = new Error('URL bulunamadı');
                      console.error('XHR yanıt hatası:', error);
                      Alert.alert('Hata', 'Resim URL alınamadı');
                      reject(error);
                    }
                  } catch (e) {
                    console.error('XHR JSON ayrıştırma hatası:', e);
                    Alert.alert('Hata', 'Sunucu yanıtı işlenemedi');
                    reject(e);
                  }
                } else {
                  const error = new Error(`XHR Hatası: ${xhr.status}`);
                  console.error('XHR hata kodları:', xhr.status, xhr.statusText);
                  console.error('XHR yanıt:', xhr.responseText);
                  Alert.alert('Hata', `Resim yüklenirken bir hata oluştu (${xhr.status})`);
                  reject(error);
                }
              };
              
              xhr.onerror = function() {
                console.error('XHR ağ hatası');
                Alert.alert('Hata', 'Ağ bağlantı hatası. İnternet bağlantınızı kontrol edin.');
                reject(new Error('Ağ hatası'));
              };
              
              xhr.ontimeout = function() {
                console.error('XHR zaman aşımı');
                Alert.alert('Hata', 'İstek zaman aşımına uğradı. Lütfen daha sonra tekrar deneyin.');
                reject(new Error('Zaman aşımı'));
              };
              
              // Görüntü yükleme ilerleme
              xhr.upload.onprogress = function(event) {
                if (event.lengthComputable) {
                  const progress = (event.loaded / event.total) * 100;
                  console.log(`Yükleme ilerleme: ${progress.toFixed(2)}%`);
                }
              };
              
              xhr.timeout = 60000; // 60 saniye
              xhr.send(formData);
            });
          }
        } catch (uploadError) {
          console.error('Ana yükleme hatası:', uploadError);
          Alert.alert(
            'Resim Yükleme Hatası', 
            'Resim yüklenirken bir sorun oluştu. İnternet bağlantınızı kontrol edip tekrar deneyin.'
          );
        }
      }
    } catch (error) {
      console.error('Resim seçme hatası:', error);
      Alert.alert('Hata', 'Resim seçilirken bir hata oluştu');
    } finally {
      setImageUploading(false);
    }
  };

  const openDatePicker = () => {
    if (client.birthDate) {
      setSelectedDate(new Date(client.birthDate));
    } else {
      setSelectedDate(new Date());
    }
    setDatePickerVisible(true);
  };

  const hideDatePicker = () => {
    setDatePickerVisible(false);
  };

  const handleDateConfirm = (date) => {
    const dateString = date.toISOString().split('T')[0];
    setClient({...client, birthDate: dateString});
    hideDatePicker();
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const dateString = selectedDate.toISOString().split('T')[0];
      setClient({...client, birthDate: dateString});
    }
  };

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    
    const [year, month, day] = dateString.split('-');
    return `${day}.${month}.${year}`;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      setSaving(true);
      
      // Sayısal alanları dönüştür
      const clientData = {
        ...client,
        height: client.height ? parseFloat(client.height) : undefined,
        startingWeight: client.startingWeight ? parseFloat(client.startingWeight) : undefined,
        targetWeight: client.targetWeight ? parseFloat(client.targetWeight) : undefined
      };
      
      let response;
      
      if (isCreating) {
        response = await apiRequest('POST', '/clients', clientData, token);
      } else {
        response = await apiRequest('PUT', `/clients/${clientId}`, clientData, token);
      }
      
      if (response) {
        Alert.alert(
          'Başarılı', 
          isCreating ? 'Danışan başarıyla oluşturuldu' : 'Danışan bilgileri güncellendi',
          [{ text: 'Tamam', onPress: () => {
            hideEditModal(() => {
              if (isCreating) {
                navigation.goBack();
              } else {
                // Danışan verisini güncelle
                loadClientData();
                // Paramı reset et
                navigation.setParams({ isEditing: false });
              }
            });
          }}]
        );
      }
    } catch (error) {
      console.error('Danışan kaydetme hatası:', error);
      Alert.alert('Hata', 'Danışan kaydedilirken bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    hideEditModal(() => {
      if (isCreating) {
        navigation.goBack();
      } else {
        // Paramı reset et
        navigation.setParams({ isEditing: false });
      }
    });
  };

  const computeBMI = () => {
    if (client.height && client.startingWeight) {
      const heightInMeters = parseFloat(client.height) / 100;
      const weight = parseFloat(client.startingWeight);
      const bmi = weight / (heightInMeters * heightInMeters);
      return bmi.toFixed(1);
    }
    return null;
  };

  const getBMICategory = (bmi) => {
    if (!bmi) return null;
    
    const numBMI = parseFloat(bmi);
    if (numBMI < 18.5) return { text: 'Zayıf', color: '#2196F3' };
    if (numBMI < 25) return { text: 'Normal', color: '#4CAF50' };
    if (numBMI < 30) return { text: 'Fazla Kilolu', color: '#FF9800' };
    return { text: 'Obez', color: '#F44336' };
  };

  const bmi = computeBMI();
  const bmiCategory = getBMICategory(bmi);

  if (loading && !isEditing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4caf50" />
        <Text style={styles.loadingText}>Danışan bilgileri yükleniyor...</Text>
      </View>
    );
  }

  const renderEditForm = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : null}
      style={styles.modalContainer}
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
        <ScrollView contentContainerStyle={styles.formScrollContainer}>
          <View style={styles.formHeader}>
            <Ionicons name={isCreating ? "person-add" : "person"} size={24} color="#4caf50" style={styles.formHeaderIcon} />
            <Title style={styles.formTitle}>
              {isCreating ? 'Yeni Danışan Ekle' : 'Danışan Bilgilerini Düzenle'}
            </Title>
            <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#757575" />
            </TouchableOpacity>
          </View>
          
          <Divider style={styles.divider} />
          
          {/* Profil Resmi */}
          <View style={styles.profileImageContainer}>
            <Avatar.Image 
              size={100} 
              source={client.profilePicture ? { uri: client.profilePicture } : require('../../../assets/images/icon.png')} 
              style={styles.profileImage}
            />
            <TouchableOpacity 
              style={styles.changeImageButton} 
              onPress={handleImageUpload}
              disabled={imageUploading}
            >
              <Text style={styles.changeImageText}>
                {imageUploading ? 'Yükleniyor...' : 'Resmi Değiştir'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Kişisel Bilgiler Bölümü */}
          <View style={styles.formSection}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="person-circle" size={20} color="#4caf50" />
              <Text style={styles.sectionTitle}>Kişisel Bilgiler</Text>
            </View>
            
            <View style={styles.formCard}>
              <TextInput
                label="Ad Soyad *"
                value={client.name}
                onChangeText={(text) => setClient({...client, name: text})}
                mode="outlined"
                style={styles.input}
                error={!!errors.name}
                outlineColor="#4caf50"
                activeOutlineColor="#2e7d32"
                left={<TextInput.Icon icon="account" color="#4caf50" />}
              />
              {errors.name && <HelperText type="error">{errors.name}</HelperText>}
              
              <TextInput
                label="E-posta *"
                value={client.email}
                onChangeText={(text) => setClient({...client, email: text})}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
                error={!!errors.email}
                outlineColor="#4caf50"
                activeOutlineColor="#2e7d32"
                left={<TextInput.Icon icon="email" color="#4caf50" />}
              />
              {errors.email && <HelperText type="error">{errors.email}</HelperText>}
              
              <TextInput
                label="Telefon"
                value={client.phone}
                onChangeText={(text) => setClient({...client, phone: text})}
                mode="outlined"
                keyboardType="phone-pad"
                style={styles.input}
                outlineColor="#4caf50"
                activeOutlineColor="#2e7d32"
                left={<TextInput.Icon icon="phone" color="#4caf50" />}
              />
              
              <View style={styles.row}>
                <Text style={styles.switchLabel}>Cinsiyet:</Text>
                <View style={styles.genderContainer}>
                  <Chip
                    selected={client.gender === 'female'}
                    onPress={() => setClient({...client, gender: 'female'})}
                    style={[styles.genderChip, client.gender === 'female' && styles.selectedChip]}
                    textStyle={client.gender === 'female' ? {color: 'white'} : {}}
                    icon={client.gender === 'female' ? "check" : null}
                  >
                    Kadın
                  </Chip>
                  <Chip
                    selected={client.gender === 'male'}
                    onPress={() => setClient({...client, gender: 'male'})}
                    style={[styles.genderChip, client.gender === 'male' && styles.selectedChip]}
                    textStyle={client.gender === 'male' ? {color: 'white'} : {}}
                    icon={client.gender === 'male' ? "check" : null}
                  >
                    Erkek
                  </Chip>
                </View>
              </View>
              
              <TouchableOpacity 
                onPress={openDatePicker}
                style={styles.datePickerButton}
              >
                <TextInput
                  label="Doğum Tarihi"
                  value={client.birthDate ? formatDateForDisplay(client.birthDate) : ''}
                  mode="outlined"
                  style={styles.input}
                  outlineColor="#4caf50"
                  activeOutlineColor="#2e7d32"
                  left={<TextInput.Icon icon="calendar" color="#4caf50" />}
                  editable={false}
                  pointerEvents="none"
                />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Fiziksel Ölçümler Bölümü */}
          <View style={styles.formSection}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="fitness" size={20} color="#4caf50" />
              <Text style={styles.sectionTitle}>Fiziksel Bilgiler</Text>
            </View>
            
            <View style={styles.formCard}>
              <View style={styles.rowInputs}>
                <TextInput
                  label="Boy (cm)"
                  value={client.height}
                  onChangeText={(text) => setClient({...client, height: text})}
                  mode="outlined"
                  keyboardType="numeric"
                  style={[styles.input, {flex: 1, marginRight: 8}]}
                  outlineColor="#4caf50"
                  activeOutlineColor="#2e7d32"
                  left={<TextInput.Icon icon="human-male-height" color="#4caf50" />}
                />
                
                <TextInput
                  label="Başlangıç Kilosu (kg)"
                  value={client.startingWeight}
                  onChangeText={(text) => setClient({...client, startingWeight: text})}
                  mode="outlined"
                  keyboardType="numeric"
                  style={[styles.input, {flex: 1, marginLeft: 8}]}
                  outlineColor="#4caf50"
                  activeOutlineColor="#2e7d32"
                  left={<TextInput.Icon icon="weight" color="#4caf50" />}
                />
              </View>
              
              <TextInput
                label="Hedef Kilo (kg)"
                value={client.targetWeight}
                onChangeText={(text) => setClient({...client, targetWeight: text})}
                mode="outlined"
                keyboardType="numeric"
                style={styles.input}
                outlineColor="#4caf50"
                activeOutlineColor="#2e7d32"
                left={<TextInput.Icon icon="weight-lifter" color="#4caf50" />}
              />
              
              <TouchableOpacity
                onPress={() => setActivityMenuVisible(true)}
                style={styles.dropdownButton}
              >
                <TextInput
                  label="Aktivite Seviyesi"
                  value={getActivityLevelLabel(client.activityLevel)}
                  mode="outlined"
                  style={styles.input}
                  outlineColor="#4caf50"
                  activeOutlineColor="#2e7d32"
                  left={<TextInput.Icon icon="run" color="#4caf50" />}
                  right={<TextInput.Icon icon="menu-down" color="#4caf50" />}
                  editable={false}
                  pointerEvents="none"
                />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Sağlık ve Beslenme Bölümü */}
          <View style={styles.formSection}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="medical" size={20} color="#4caf50" />
              <Text style={styles.sectionTitle}>Sağlık Bilgileri</Text>
            </View>
            
            <View style={styles.formCard}>
              <TextInput
                label="Tıbbi Geçmiş"
                value={client.medicalHistory}
                onChangeText={(text) => setClient({...client, medicalHistory: text})}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.textArea}
                outlineColor="#4caf50"
                activeOutlineColor="#2e7d32"
                left={<TextInput.Icon icon="hospital-box" color="#4caf50" />}
              />
              
              <TextInput
                label="Diyet Kısıtlamaları"
                value={client.dietaryRestrictions}
                onChangeText={(text) => setClient({...client, dietaryRestrictions: text})}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.textArea}
                outlineColor="#4caf50"
                activeOutlineColor="#2e7d32"
                left={<TextInput.Icon icon="food-off" color="#4caf50" />}
              />
              
              <TextInput
                label="Notlar"
                value={client.notes}
                onChangeText={(text) => setClient({...client, notes: text})}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.textArea}
                outlineColor="#4caf50"
                activeOutlineColor="#2e7d32"
                left={<TextInput.Icon icon="note-text" color="#4caf50" />}
              />
            </View>
          </View>
          
          {/* İletişim ve Notlar Bölümü */}
          <View style={styles.formSection}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="chatbubbles" size={20} color="#4caf50" />
              <Text style={styles.sectionTitle}>İletişim Bilgileri</Text>
            </View>
            
            <View style={styles.formCard}>
              <TextInput
                label="Referans Kodu"
                value={client.referenceCode}
                onChangeText={(text) => setClient({...client, referenceCode: text})}
                mode="outlined"
                style={styles.input}
                outlineColor="#4caf50"
                activeOutlineColor="#2e7d32"
                left={<TextInput.Icon icon="barcode" color="#4caf50" />}
              />
            </View>
          </View>
          
          <View style={styles.buttonContainer}>
            <Button 
              mode="outlined" 
              onPress={handleCancel}
              style={styles.buttonCancel}
              labelStyle={{ color: '#757575' }}
              icon="close"
            >
              İptal
            </Button>
            
            <Button 
              mode="contained" 
              onPress={handleSave}
              style={styles.buttonSave}
              loading={saving}
              disabled={saving}
              buttonColor="#4caf50"
              icon="content-save"
            >
              {isCreating ? 'Danışan Ekle' : 'Danışanı Güncelle'}
            </Button>
          </View>
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {isCreating || isEditing ? (
          // Form görünümü
          <View style={{ flex: 1 }}></View>
        ) : (
          // Detay görünümü
          <View>
            <Card style={styles.detailCard}>
              <Card.Content style={styles.profileHeader}>
                <Avatar.Image 
                  size={80} 
                  source={client.profilePicture ? { uri: client.profilePicture } : require('../../../assets/images/icon.png')} 
                  style={styles.avatar}
                />
                <View style={styles.profileInfo}>
                  <View style={styles.nameStatusRow}>
                    <Title style={styles.clientName}>{client.name}</Title>
                  </View>
                  <Text style={styles.clientDetail}>{client.email}</Text>
                  {client.phone && <Text style={styles.clientDetail}>{client.phone}</Text>}

                  <View style={styles.actionButtonsSmall}>
                    <TouchableOpacity 
                      style={styles.smallButton}
                      onPress={() => navigation.navigate('Measurements', { 
                        clientId: clientId, 
                        clientName: client.name 
                      })}
                    >
                      <Ionicons name="analytics" size={16} color="#4caf50" />
                      <Text style={styles.smallButtonText}>Ölçümler</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.smallButton}
                      onPress={() => navigation.navigate('DietPlans', { 
                        clientId: clientId, 
                        clientName: client.name 
                      })}
                    >
                      <Ionicons name="nutrition" size={16} color="#4caf50" />
                      <Text style={styles.smallButtonText}>Diyet Planı</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Card.Content>
            </Card>

            {(client.height && client.startingWeight) && (
              <Card style={styles.detailCard}>
                <Card.Content>
                  <Title style={styles.sectionTitle}>Vücut Ölçüleri ve BMI</Title>
                  
                  <View style={styles.bmiContainer}>
                    <View style={styles.bmiCircle}>
                      <Text style={styles.bmiValue}>{bmi}</Text>
                      <Text style={styles.bmiLabel}>BMI</Text>
                    </View>
                    <View style={styles.bmiInfo}>
                      <Text style={styles.bmiCategory}>
                        <Text style={{fontWeight: 'bold'}}>Kategori: </Text>
                        <Text style={{color: bmiCategory?.color}}>{bmiCategory?.text}</Text>
                      </Text>
                      <View style={styles.heightWeightInfo}>
                        <Text style={styles.detailText}>Boy: {client.height} cm</Text>
                        <Text style={styles.detailText}>Kilo: {client.startingWeight} kg</Text>
                        {client.targetWeight && (
                          <Text style={styles.detailText}>Hedef Kilo: {client.targetWeight} kg</Text>
                        )}
                      </View>
                    </View>
                  </View>
                </Card.Content>
              </Card>
            )}

            <Card style={styles.detailCard}>
              <Card.Content>
                <Title style={styles.sectionTitle}>Kişisel Bilgiler</Title>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Cinsiyet:</Text>
                  <Text style={styles.detailValue}>{client.gender === 'male' ? 'Erkek' : 'Kadın'}</Text>
                </View>
                
                {client.birthDate && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Doğum Tarihi:</Text>
                    <Text style={styles.detailValue}>{formatDateForDisplay(client.birthDate)}</Text>
                  </View>
                )}
                
                {client.activityLevel && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Aktivite Seviyesi:</Text>
                    <Text style={styles.detailValue}>{getActivityLevelLabel(client.activityLevel)}</Text>
                  </View>
                )}
                
                {client.referenceCode && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Referans Kodu:</Text>
                    <Text style={styles.detailValue}>{client.referenceCode}</Text>
                  </View>
                )}
              </Card.Content>
            </Card>

            {(client.medicalHistory || client.dietaryRestrictions || client.notes) && (
              <Card style={styles.detailCard}>
                <Card.Content>
                  <Title style={styles.sectionTitle}>Sağlık ve Diyet Bilgileri</Title>
                  
                  {client.medicalHistory && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Sağlık Geçmişi:</Text>
                      <Text style={styles.detailText}>{client.medicalHistory}</Text>
                    </View>
                  )}
                  
                  {client.dietaryRestrictions && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Diyet Kısıtlamaları:</Text>
                      <Text style={styles.detailText}>{client.dietaryRestrictions}</Text>
                    </View>
                  )}
                  
                  {client.notes && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Notlar:</Text>
                      <Text style={styles.detailText}>{client.notes}</Text>
                    </View>
                  )}
                </Card.Content>
              </Card>
            )}
          </View>
        )}
      </ScrollView>

      {/* Düzenleme Floating Action Button */}
      {!isEditing && !isCreating && (
        <FAB
          style={styles.fab}
          icon="pencil"
          color="#fff"
          onPress={() => showEditModal()}
        />
      )}

      {/* Düzenleme Modal */}
      <Portal>
        {editModalVisible && renderEditForm()}
      </Portal>

      {/* Tarih Seçici Modal */}
      <Portal>
        <Modal
          visible={datePickerVisible}
          onDismiss={hideDatePicker}
          contentContainerStyle={styles.datePickerModal}
        >
          <View style={styles.datePickerContainer}>
            <Text style={styles.datePickerTitle}>Doğum Tarihi Seçiniz</Text>
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="spinner"
              onChange={(event, date) => date && setSelectedDate(date)}
              style={styles.datePicker}
            />
            <View style={styles.datePickerButtons}>
              <Button 
                mode="outlined" 
                onPress={hideDatePicker}
                style={styles.datePickerButtonCancel}
              >
                İptal
              </Button>
              <Button 
                mode="contained" 
                onPress={() => handleDateConfirm(selectedDate)}
                style={styles.datePickerButtonConfirm}
              >
                Seç
              </Button>
            </View>
          </View>
        </Modal>
      </Portal>

      {/* Aktivite Seviyesi Modal */}
      <Portal>
        <Modal
          visible={activityMenuVisible}
          onDismiss={() => setActivityMenuVisible(false)}
          contentContainerStyle={styles.activityModalContent}
        >
          <View style={styles.activityModalContainer}>
            <Text style={styles.activityModalTitle}>Aktivite Seviyesi Seçin</Text>
            <Divider style={{marginVertical: 8}} />
            {activityLevels.map((level) => (
              <TouchableOpacity
                key={level.value}
                style={[
                  styles.activityOption,
                  client.activityLevel === level.value && styles.activityOptionSelected
                ]}
                onPress={() => {
                  setClient({...client, activityLevel: level.value});
                  setActivityMenuVisible(false);
                }}
              >
                <Text style={[
                  styles.activityOptionText,
                  client.activityLevel === level.value && styles.activityOptionTextSelected
                ]}>
                  {level.label}
                </Text>
                {client.activityLevel === level.value && (
                  <Ionicons name="checkmark" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#757575',
  },
  card: {
    marginBottom: 16,
    borderRadius: 10,
    elevation: 3,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cardContent: {
    padding: 16,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  formHeaderIcon: {
    marginRight: 12,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  divider: {
    backgroundColor: '#e0e0e0',
    height: 1,
    marginBottom: 16,
  },
  formSection: {
    marginTop: 8,
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
  input: {
    marginBottom: 12,
    backgroundColor: 'white',
  },
  textArea: {
    marginBottom: 12,
    backgroundColor: 'white',
    height: 80,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  switchLabel: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  genderContainer: {
    flexDirection: 'row',
    flex: 2,
  },
  genderChip: {
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedChip: {
    backgroundColor: '#4caf50',
  },
  statusButtons: {
    flex: 2,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 8,
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
  detailCard: {
    marginBottom: 16,
    borderRadius: 10,
    elevation: 3,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatar: {
    backgroundColor: '#E8F5E9',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  nameStatusRow: {
    marginBottom: 4,
  },
  clientName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  clientDetail: {
    fontSize: 14,
    color: '#757575',
    marginTop: 2,
  },
  actionButtonsSmall: {
    flexDirection: 'row',
    marginTop: 12,
  },
  smallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  smallButtonText: {
    color: '#333',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  bmiContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  bmiCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 3,
    borderColor: '#4CAF50',
  },
  bmiValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  bmiLabel: {
    fontSize: 12,
    color: '#4CAF50',
  },
  bmiInfo: {
    flex: 1,
  },
  bmiCategory: {
    fontSize: 16,
    marginBottom: 8,
  },
  heightWeightInfo: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 8,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    width: 120,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  detailSection: {
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#333',
    marginTop: 4,
  },
  editButton: {
    flex: 1,
    borderColor: '#4caf50',
  },
  profileImageContainer: {
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  profileImage: {
    backgroundColor: '#E8F5E9',
    margin: 8,
  },
  changeImageButton: {
    marginTop: 8,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4caf50',
  },
  changeImageText: {
    color: '#4caf50',
    fontWeight: '600',
    fontSize: 14,
  },
  datePickerButton: {
    marginBottom: 12,
  },
  dropdownButton: {
    marginBottom: 12,
  },
  activityMenu: {
    width: '90%',
    marginLeft: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingVertical: 20,
    maxHeight: height * 0.9,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 10,
  },
  formScrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    padding: 8,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#4caf50',
    elevation: 6,
  },
  datePickerModal: {
    backgroundColor: 'white',
    margin: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  datePickerContainer: {
    padding: 16,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  datePicker: {
    height: 200,
  },
  datePickerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  datePickerButtonCancel: {
    flex: 1,
    marginRight: 8,
    borderColor: '#757575',
  },
  datePickerButtonConfirm: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: '#4caf50',
  },
  activityModalContent: {
    backgroundColor: 'white',
    margin: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  activityModalContainer: {
    padding: 16,
  },
  activityModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  activityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  activityOptionSelected: {
    backgroundColor: '#4caf50',
  },
  activityOptionText: {
    fontSize: 16,
    color: '#333',
  },
  activityOptionTextSelected: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default ClientDetailsScreen; 