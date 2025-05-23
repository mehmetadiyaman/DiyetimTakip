import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Animated
} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  Card,
  Switch,
  IconButton,
  Divider,
  RadioButton,
  Menu,
  Portal,
  Dialog,
  HelperText,
  Chip,
  SegmentedButtons,
  Modal,
  Appbar
} from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '../../api/config';
import theme from '../../themes/theme';

const { height, width } = Dimensions.get('window');

const DietPlanFormModal = ({ 
  visible, 
  onDismiss, 
  onSubmit, 
  isEditing, 
  planId, 
  clientId, 
  clientName,
  token  // token'ı prop olarak alacağız
}) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Client Selection
  const [selectedClient, setSelectedClient] = useState(clientId ? { _id: clientId, name: clientName || 'Seçili Danışan' } : null);
  const [clientsMenuVisible, setClientsMenuVisible] = useState(false);
  const [clients, setClients] = useState([]);
  
  // Modal için animation referansları
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Diyet Planı Form
  const [formData, setFormData] = useState({
    title: '',
    dailyCalories: '0',
    startDate: new Date(),
    endDate: new Date(new Date().setDate(new Date().getDate() + 30)), // Default 30 gün
    description: '',
    status: 'active',
    macroProtein: '0',
    macroCarbs: '0',
    macroFat: '0',
    meals: [
      {
        name: 'Kahvaltı',
        foods: []
      },
      {
        name: 'Öğle Yemeği',
        foods: []
      },
      {
        name: 'Akşam Yemeği',
        foods: []
      },
      {
        name: 'Ara Öğün',
        foods: []
      }
    ]
  });
  
  // Date Picker Devlet
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  
  // Food Dialog State
  const [foodDialogVisible, setFoodDialogVisible] = useState(false);
  const [selectedMealIndex, setSelectedMealIndex] = useState(0);
  const [newFood, setNewFood] = useState({
    name: '',
    amount: '',
    calories: '0'
  });
  
  useEffect(() => {
    // Modal açıldığında verileri yükle ve animasyonu başlat
    if (visible) {
      // Animasyonu başlat
      showModal();
      
      // Danışanları yükle (eğer clientId yoksa)
      if (!clientId) {
        loadClients();
      } else {
        setSelectedClient({ _id: clientId, name: clientName || 'Seçili Danışan' });
      }
      
      // Eğer düzenleme modunda ise mevcut planı yükle
      if (planId && isEditing) {
        loadPlanDetails();
      } else {
        // Yeni plan için varsayılan değerler
        resetForm();
      }
    }
  }, [visible, isEditing, planId]);
  
  // Modal gösterme ve gizleme animasyonları
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
    });
  };

  const handleDismiss = () => {
    hideModal(() => onDismiss());
  };
  
  const resetForm = () => {
    setFormData({
      title: '',
      dailyCalories: '0',
      startDate: new Date(),
      endDate: new Date(new Date().setDate(new Date().getDate() + 30)),
      description: '',
      status: 'active',
      macroProtein: '0',
      macroCarbs: '0',
      macroFat: '0',
      meals: [
        {
          name: 'Kahvaltı',
          foods: []
        },
        {
          name: 'Öğle Yemeği',
          foods: []
        },
        {
          name: 'Akşam Yemeği',
          foods: []
        },
        {
          name: 'Ara Öğün',
          foods: []
        }
      ]
    });
    setErrors({});
  };
  
  const loadClients = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('GET', '/clients', null, token);
      if (data) {
        setClients(data);
      }
    } catch (error) {
      Alert.alert('Hata', 'Danışanlar yüklenirken bir sorun oluştu.');
    } finally {
      setLoading(false);
    }
  };
  
  const loadPlanDetails = async () => {
    try {
      setLoading(true);
      console.log('Plan verileri yükleniyor, ID:', planId);
      
      const data = await apiRequest('GET', `/diet-plans/${planId}`, null, token);
      console.log('Yüklenen plan verileri:', JSON.stringify(data));
      
      if (data) {
        // Client bilgilerini ayarla (eğer clientName boşsa)
        if (data.clientId && !clientName) {
          try {
            const clientData = await apiRequest('GET', `/clients/${data.clientId}`, null, token);
            if (clientData) {
              setSelectedClient({
                _id: clientData._id,
                name: clientData.name
              });
            }
          } catch (error) {
            console.log('Danışan detayları yüklenemedi', error);
          }
        }
        
        // Verilerden öğün bilgilerini al
        let meals = [];
        
        // Meals dizisi varsa ve geçerliyse direkt kullan
        if (data.meals && Array.isArray(data.meals) && data.meals.length > 0) {
          console.log('Meals dizisi bulundu, kullanılıyor:', data.meals.length);
          
          // Foods içindeki calories değerlerini doğru şekilde işle
          meals = data.meals.map(meal => ({
            name: meal.name,
            foods: (meal.foods || []).map(food => ({
              name: food.name || '',
              amount: food.amount || '',
              calories: typeof food.calories === 'number' ? 
                        food.calories : 
                        (food.calories && food.calories.$numberInt ? 
                          parseInt(food.calories.$numberInt) : 0)
            }))
          }));
        } 
        // Eğer meals dizisi boşsa veya yoksa content'ten almaya çalış
        else if (data.content) {
          console.log('Content field kullanılıyor');
          try {
            // String ise parse et
            if (typeof data.content === 'string') {
              const parsedContent = JSON.parse(data.content);
              if (Array.isArray(parsedContent)) {
                meals = parsedContent.map(meal => ({
                  name: meal.name,
                  foods: (meal.foods || []).map(food => ({
                    name: food.name || '',
                    amount: food.amount || '',
                    calories: typeof food.calories === 'number' ? food.calories : 0
                  }))
                }));
              }
            } 
            // Zaten obje ise direkt kullan
            else if (typeof data.content === 'object' && Array.isArray(data.content)) {
              meals = data.content;
            }
          } catch (error) {
            console.error('Content parsing hatası:', error);
          }
        }
        
        // Eğer hiç meal yüklenmediyse varsayılan yapıyı kullan
        if (!meals.length) {
          console.log('Meal bulunamadı, varsayılanlar kullanılıyor');
          meals = [
            { name: 'Kahvaltı', foods: [] },
            { name: 'Öğle Yemeği', foods: [] },
            { name: 'Akşam Yemeği', foods: [] },
            { name: 'Ara Öğün', foods: [] }
          ];
        } else {
          console.log('Yüklenen öğün sayısı:', meals.length);
          console.log('İlk öğündeki besin sayısı:', meals[0].foods ? meals[0].foods.length : 0);
        }
        
        // Sayısal değerler için tiplerini kontrol et
        const dailyCalories = typeof data.dailyCalories === 'number' ? 
          data.dailyCalories : parseInt(data.dailyCalories && data.dailyCalories.$numberInt ? 
            data.dailyCalories.$numberInt : data.dailyCalories || '0');
          
        const macroProtein = typeof data.macroProtein === 'number' ? 
          data.macroProtein : parseInt(data.macroProtein && data.macroProtein.$numberInt ? 
            data.macroProtein.$numberInt : data.macroProtein || '0');
          
        const macroCarbs = typeof data.macroCarbs === 'number' ? 
          data.macroCarbs : parseInt(data.macroCarbs && data.macroCarbs.$numberInt ? 
            data.macroCarbs.$numberInt : data.macroCarbs || '0');
          
        const macroFat = typeof data.macroFat === 'number' ? 
          data.macroFat : parseInt(data.macroFat && data.macroFat.$numberInt ? 
            data.macroFat.$numberInt : data.macroFat || '0');
        
        // Tarihler için kontroller
        let startDate = new Date();
        if (data.startDate) {
          startDate = data.startDate instanceof Date ? 
            data.startDate : 
            (data.startDate.$date && data.startDate.$date.$numberLong ? 
              new Date(parseInt(data.startDate.$date.$numberLong)) : 
              new Date(data.startDate));
        }
        
        let endDate = new Date(new Date().setDate(new Date().getDate() + 30));
        if (data.endDate) {
          endDate = data.endDate instanceof Date ? 
            data.endDate : 
            (data.endDate.$date && data.endDate.$date.$numberLong ? 
              new Date(parseInt(data.endDate.$date.$numberLong)) : 
              new Date(data.endDate));
        }
        
        // Form state'ini güncelle
        const formState = {
          title: data.title || '',
          dailyCalories: dailyCalories.toString(),
          startDate: startDate,
          endDate: endDate,
          description: data.description || '',
          status: data.status || 'active',
          macroProtein: macroProtein.toString(),
          macroCarbs: macroCarbs.toString(),
          macroFat: macroFat.toString(),
          meals: meals
        };
        
        console.log('Form verileri güncellenecek:', {
          title: formState.title,
          dailyCalories: formState.dailyCalories,
          startDate: formState.startDate.toISOString(),
          endDate: formState.endDate.toISOString(),
          mealsCount: formState.meals.length,
          macros: `P:${formState.macroProtein} C:${formState.macroCarbs} F:${formState.macroFat}`
        });
        
        setFormData(formState);
        console.log('Form verileri güncellendi');
      }
    } catch (error) {
      console.error('Diyet planı yükleme hatası:', error);
      Alert.alert(
        'Hata', 
        'Diyet planı detayları yüklenemedi. Lütfen tekrar deneyin.',
        [{ text: 'Tamam' }]
      );
    } finally {
      setLoading(false);
    }
  };
  
  const handleTextChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value
    });
    
    // Hata mesajını temizle
    if (errors[field]) {
      setErrors({
        ...errors,
        [field]: null
      });
    }
  };
  
  const handleNumberChange = (field, value) => {
    // Sadece sayısal değerlere izin ver
    const numericValue = value.replace(/[^0-9]/g, '');
    handleTextChange(field, numericValue);
  };
  
  // Tarih seçici işleyicileri
  const onStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setFormData({
        ...formData,
        startDate: selectedDate
      });
    }
  };
  
  const onEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setFormData({
        ...formData,
        endDate: selectedDate
      });
    }
  };
  
  // Yeni yemek eklemek için
  const handleAddFood = (mealIndex) => {
    setSelectedMealIndex(mealIndex);
    setNewFood({
      name: '',
      amount: '',
      calories: '0'
    });
    setFoodDialogVisible(true);
  };
  
  const handleSaveFood = () => {
    // Form doğrulama
    const newErrors = {};
    
    if (!newFood.name.trim()) {
      newErrors.foodName = 'Besin adı gereklidir';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors({
        ...errors,
        ...newErrors
      });
      return;
    }
    
    // Yeni yemek ekle
    const updatedMeals = [...formData.meals];
    updatedMeals[selectedMealIndex].foods.push({
      name: newFood.name.trim(),
      amount: newFood.amount.trim(),
      calories: parseInt(newFood.calories) || 0
    });
    
    setFormData({
      ...formData,
      meals: updatedMeals
    });
    
    // Form alanlarını temizle ve dialogu kapat
    setNewFood({
      name: '',
      amount: '',
      calories: '0'
    });
    
    // Hataları temizle
    if (errors.foodName) {
      setErrors({
        ...errors,
        foodName: null
      });
    }
    
    setFoodDialogVisible(false);
    
    // Başarılı ekleme mesajı
    Alert.alert('Başarılı', `"${newFood.name}" başarıyla eklendi.`);
  };
  
  const handleDeleteFood = (mealIndex, foodIndex) => {
    const updatedMeals = [...formData.meals];
    updatedMeals[mealIndex].foods.splice(foodIndex, 1);
    
    setFormData({
      ...formData,
      meals: updatedMeals
    });
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!selectedClient && !clientId) {
      newErrors.client = 'Danışan seçimi zorunludur';
    }
    
    if (!formData.title.trim()) {
      newErrors.title = 'Plan adı zorunludur';
    }
    
    if (parseInt(formData.dailyCalories) <= 0) {
      newErrors.dailyCalories = 'Günlük kalori sıfırdan büyük olmalıdır';
    }
    
    // Başlangıç tarihi şimdiden önce olmalı
    if (formData.startDate > formData.endDate) {
      newErrors.endDate = 'Bitiş tarihi başlangıç tarihinden sonra olmalıdır';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Hata', 'Lütfen form hatalarını düzeltin.');
      return;
    }
    
    try {
      setLoading(true);
      
      // API'ye gönderilecek veriyi hazırla
      const planData = {
        title: formData.title,
        clientId: selectedClient?._id || clientId,
        dailyCalories: parseInt(formData.dailyCalories),
        startDate: formData.startDate.toISOString(),
        endDate: formData.endDate.toISOString(),
        description: formData.description,
        status: formData.status,
        macroProtein: parseInt(formData.macroProtein) || 0,
        macroCarbs: parseInt(formData.macroCarbs) || 0,
        macroFat: parseInt(formData.macroFat) || 0,
        content: JSON.stringify(formData.meals),
        meals: formData.meals
      };
      
      let response;
      if (isEditing && planId) {
        // Güncelleme isteği
        response = await apiRequest('PUT', `/diet-plans/${planId}`, planData, token);
        if (response) {
          hideModal(() => onSubmit(true, 'update'));
        }
      } else {
        // Yeni kayıt isteği
        response = await apiRequest('POST', '/diet-plans', planData, token);
        if (response) {
          hideModal(() => onSubmit(true, 'create'));
        }
      }
    } catch (error) {
      console.error('Diyet planı kaydetme hatası:', error);
      let errorMessage = 'Diyet planı kaydedilirken bir sorun oluştu.';
      if (error.message) {
        errorMessage += ' ' + error.message;
      }
      Alert.alert('Hata', errorMessage);
      onSubmit(false);
    } finally {
      setLoading(false);
    }
  };
  
  const formatDate = (date) => {
    if (!date) return '';
    return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`;
  };
  
  // Food Dialog içeriği
  const renderFoodDialog = () => (
    <Portal>
      <Dialog
        visible={foodDialogVisible}
        onDismiss={() => setFoodDialogVisible(false)}
        style={styles.foodDialog}
      >
        <Dialog.Title>Besin Ekle</Dialog.Title>
        <Dialog.Content>
          <TextInput
            label="Besin Adı *"
            value={newFood.name}
            onChangeText={(text) => {
              setNewFood({...newFood, name: text});
              if (errors.foodName) {
                setErrors({
                  ...errors,
                  foodName: null
                });
              }
            }}
            mode="outlined"
            style={styles.dialogInput}
            placeholder="Besin adı"
            error={!!errors.foodName}
            outlineColor="#ccc"
            autoFocus={true}
          />
          {errors.foodName && <HelperText type="error">{errors.foodName}</HelperText>}
          
          <TextInput
            label="Miktar"
            value={newFood.amount}
            onChangeText={(text) => setNewFood({...newFood, amount: text})}
            mode="outlined"
            style={styles.dialogInput}
            placeholder="100g, 1 porsiyon, 1 dilim..."
            outlineColor="#ccc"
          />
          
          <TextInput
            label="Kalori (kcal)"
            value={newFood.calories}
            onChangeText={(text) => {
              const numericValue = text.replace(/[^0-9]/g, '');
              setNewFood({...newFood, calories: numericValue});
            }}
            mode="outlined"
            style={styles.dialogInput}
            keyboardType="numeric"
            placeholder="0"
            outlineColor="#ccc"
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setFoodDialogVisible(false)}>İptal</Button>
          <Button onPress={handleSaveFood} mode="contained">Ekle</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
  
  // Render Form Content
  const renderFormContent = () => (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      {/* Genel Bilgiler Kartı */}
      <Card style={styles.formCard} mode="elevated">
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle-outline" size={24} color={theme.palette.primary.main} />
            <Text style={styles.sectionTitle}>Genel Bilgiler</Text>
          </View>
          
          {/* Danışan Seçimi */}
          {!clientId && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>Danışan <Text style={styles.required}>*</Text></Text>
              <TouchableOpacity 
                style={styles.clientSelector}
                onPress={() => setClientsMenuVisible(true)}
              >
                <Text style={selectedClient ? styles.selectedClientText : styles.placeholderText}>
                  {selectedClient ? selectedClient.name : 'Danışan Seçin'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={theme.palette.primary.main} />
              </TouchableOpacity>
              {errors.client && <HelperText type="error">{errors.client}</HelperText>}
              
              <Portal>
                <Dialog 
                  visible={clientsMenuVisible} 
                  onDismiss={() => setClientsMenuVisible(false)}
                  style={styles.clientsDialog}
                >
                  <Dialog.Title>Danışan Seçin</Dialog.Title>
                  <Dialog.Content>
                    <ScrollView style={styles.clientsScrollView}>
                      {clients.map(client => (
                        <TouchableOpacity
                          key={client._id}
                          style={styles.clientItem}
                          onPress={() => {
                            setSelectedClient(client);
                            setClientsMenuVisible(false);
                          }}
                        >
                          <Text style={styles.clientName}>{client.name}</Text>
                          {client.email && <Text style={styles.clientEmail}>{client.email}</Text>}
                        </TouchableOpacity>
                      ))}
                      {clients.length === 0 && (
                        <Text style={styles.noClientsText}>Danışan bulunamadı</Text>
                      )}
                    </ScrollView>
                  </Dialog.Content>
                  <Dialog.Actions>
                    <Button onPress={() => setClientsMenuVisible(false)}>İptal</Button>
                  </Dialog.Actions>
                </Dialog>
              </Portal>
            </View>
          )}
          
          {/* Plan Adı */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Plan Adı <Text style={styles.required}>*</Text></Text>
            <TextInput
              value={formData.title}
              onChangeText={(text) => handleTextChange('title', text)}
              placeholder="Örn: Kilo Verme Diyeti"
              mode="outlined"
              error={!!errors.title}
              style={styles.input}
              outlineColor={theme.palette.primary.light}
              activeOutlineColor={theme.palette.primary.main}
              left={<TextInput.Icon icon="format-title" color={theme.palette.primary.main} />}
            />
            {errors.title && <HelperText type="error">{errors.title}</HelperText>}
          </View>
          
          {/* Günlük Kalori */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Günlük Kalori <Text style={styles.required}>*</Text></Text>
            <TextInput
              value={formData.dailyCalories}
              onChangeText={(text) => handleNumberChange('dailyCalories', text)}
              placeholder="0"
              mode="outlined"
              error={!!errors.dailyCalories}
              style={styles.input}
              keyboardType="numeric"
              outlineColor={theme.palette.primary.light}
              activeOutlineColor={theme.palette.primary.main}
              left={<TextInput.Icon icon="fire" color={theme.palette.primary.main} />}
              right={<TextInput.Affix text="kcal" />}
            />
            {errors.dailyCalories && <HelperText type="error">{errors.dailyCalories}</HelperText>}
          </View>
          
          {/* Tarihler */}
          <View style={styles.dateRow}>
            <View style={styles.dateGroup}>
              <Text style={styles.label}>Başlangıç Tarihi <Text style={styles.required}>*</Text></Text>
              <TouchableOpacity 
                style={styles.dateSelector}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={theme.palette.primary.main} style={styles.dateIcon} />
                <Text style={styles.dateText}>{formatDate(formData.startDate)}</Text>
              </TouchableOpacity>
              {showStartDatePicker && (
                <DateTimePicker
                  value={formData.startDate}
                  mode="date"
                  display="default"
                  onChange={onStartDateChange}
                />
              )}
            </View>
            
            <View style={styles.dateGroup}>
              <Text style={styles.label}>Bitiş Tarihi</Text>
              <TouchableOpacity 
                style={styles.dateSelector}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={theme.palette.primary.main} style={styles.dateIcon} />
                <Text style={styles.dateText}>{formatDate(formData.endDate)}</Text>
              </TouchableOpacity>
              {showEndDatePicker && (
                <DateTimePicker
                  value={formData.endDate}
                  mode="date"
                  display="default"
                  onChange={onEndDateChange}
                />
              )}
              {errors.endDate && <HelperText type="error">{errors.endDate}</HelperText>}
            </View>
          </View>
          
          {/* Açıklama */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Açıklama</Text>
            <TextInput
              value={formData.description}
              onChangeText={(text) => handleTextChange('description', text)}
              placeholder="Diyet planı hakkında açıklama..."
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.textArea}
              outlineColor={theme.palette.primary.light}
              activeOutlineColor={theme.palette.primary.main}
              left={<TextInput.Icon icon="text" color={theme.palette.primary.main} />}
            />
          </View>
          
          {/* Durum */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Diyet Planı Durumu</Text>
            <View style={styles.statusSelector}>
              <SegmentedButtons
                value={formData.status}
                onValueChange={(value) => handleTextChange('status', value)}
                buttons={[
                  { value: 'active', label: 'Aktif', icon: 'check-circle', style: { borderColor: '#4CAF50', borderWidth: 1 } },
                  { value: 'pending', label: 'Beklemede', icon: 'clock-outline', style: { borderColor: '#FFC107', borderWidth: 1 } },
                  { value: 'completed', label: 'Tamamlandı', icon: 'check-all', style: { borderColor: '#2196F3', borderWidth: 1 } }
                ]}
                style={styles.segmentedButtons}
              />
            </View>
          </View>
        </Card.Content>
      </Card>
      
      {/* Makro Besinler Kartı */}
      <Card style={styles.formCard} mode="elevated">
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Ionicons name="nutrition-outline" size={24} color={theme.palette.primary.main} />
            <Text style={styles.sectionTitle}>Makro Besinler</Text>
          </View>
          
          <View style={styles.macroRow}>
            <View style={styles.macroField}>
              <View style={[styles.macroHeader, {backgroundColor: '#E8F5E9'}]}>
                <Ionicons name="egg-outline" size={22} color="#43A047" />
                <Text style={[styles.macroHeaderText, {color: '#2E7D32'}]}>Protein</Text>
              </View>
              <TextInput
                value={formData.macroProtein}
                onChangeText={(text) => handleNumberChange('macroProtein', text)}
                placeholder="0"
                mode="outlined"
                style={styles.macroInput}
                keyboardType="numeric"
                outlineColor={theme.palette.primary.light}
                activeOutlineColor={theme.palette.primary.main}
                dense
                right={<TextInput.Affix text="g" />}
              />
            </View>
            
            <View style={styles.macroField}>
              <View style={[styles.macroHeader, {backgroundColor: '#E3F2FD'}]}>
                <Ionicons name="fast-food-outline" size={22} color="#1E88E5" />
                <Text style={[styles.macroHeaderText, {color: '#1565C0'}]}>Karbonhidrat</Text>
              </View>
              <TextInput
                value={formData.macroCarbs}
                onChangeText={(text) => handleNumberChange('macroCarbs', text)}
                placeholder="0"
                mode="outlined"
                style={styles.macroInput}
                keyboardType="numeric"
                outlineColor={theme.palette.primary.light}
                activeOutlineColor={theme.palette.primary.main}
                dense
                right={<TextInput.Affix text="g" />}
              />
            </View>
            
            <View style={styles.macroField}>
              <View style={[styles.macroHeader, {backgroundColor: '#FFF3E0'}]}>
                <Ionicons name="water-outline" size={22} color="#F57C00" />
                <Text style={[styles.macroHeaderText, {color: '#E65100'}]}>Yağ</Text>
              </View>
              <TextInput
                value={formData.macroFat}
                onChangeText={(text) => handleNumberChange('macroFat', text)}
                placeholder="0"
                mode="outlined"
                style={styles.macroInput}
                keyboardType="numeric"
                outlineColor={theme.palette.primary.light}
                activeOutlineColor={theme.palette.primary.main}
                dense
                right={<TextInput.Affix text="g" />}
              />
            </View>
          </View>
          
          {/* Makrolar toplamı */}
          <View style={styles.macroTotalCard}>
            <View style={styles.macroProgressContainer}>
              {parseInt(formData.macroProtein) > 0 && (
                <View 
                  style={[styles.macroProgress, {
                    flex: parseInt(formData.macroProtein), 
                    backgroundColor: '#4CAF50'
                  }]} 
                />
              )}
              {parseInt(formData.macroCarbs) > 0 && (
                <View 
                  style={[styles.macroProgress, {
                    flex: parseInt(formData.macroCarbs), 
                    backgroundColor: '#2196F3'
                  }]} 
                />
              )}
              {parseInt(formData.macroFat) > 0 && (
                <View 
                  style={[styles.macroProgress, {
                    flex: parseInt(formData.macroFat), 
                    backgroundColor: '#FF9800'
                  }]} 
                />
              )}
            </View>
            <View style={styles.macroTotalRow}>
              <Text style={styles.macroTotalLabel}>
                Toplam: {(parseInt(formData.macroProtein) || 0) + (parseInt(formData.macroCarbs) || 0) + (parseInt(formData.macroFat) || 0)} g
              </Text>
              <View style={styles.macroPercentageRow}>
                <View style={styles.macroPercentageItem}>
                  <View style={[styles.macroColorIndicator, {backgroundColor: '#4CAF50'}]} />
                  <Text style={styles.macroPercentageText}>
                    P: {formData.macroProtein ? Math.round((parseInt(formData.macroProtein) / ((parseInt(formData.macroProtein) || 0) + (parseInt(formData.macroCarbs) || 0) + (parseInt(formData.macroFat) || 0))) * 100) : 0}%
                  </Text>
                </View>
                <View style={styles.macroPercentageItem}>
                  <View style={[styles.macroColorIndicator, {backgroundColor: '#2196F3'}]} />
                  <Text style={styles.macroPercentageText}>
                    K: {formData.macroCarbs ? Math.round((parseInt(formData.macroCarbs) / ((parseInt(formData.macroProtein) || 0) + (parseInt(formData.macroCarbs) || 0) + (parseInt(formData.macroFat) || 0))) * 100) : 0}%
                  </Text>
                </View>
                <View style={styles.macroPercentageItem}>
                  <View style={[styles.macroColorIndicator, {backgroundColor: '#FF9800'}]} />
                  <Text style={styles.macroPercentageText}>
                    Y: {formData.macroFat ? Math.round((parseInt(formData.macroFat) / ((parseInt(formData.macroProtein) || 0) + (parseInt(formData.macroCarbs) || 0) + (parseInt(formData.macroFat) || 0))) * 100) : 0}%
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Card.Content>
      </Card>
      
      {/* Öğünler Kartı */}
      <Card style={styles.formCard} mode="elevated">
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Ionicons name="restaurant-outline" size={24} color={theme.palette.primary.main} />
            <Text style={styles.sectionTitle}>Öğünler</Text>
          </View>
          
          {formData.meals.map((meal, mealIndex) => (
            <View key={mealIndex} style={styles.mealSection}>
              <View style={styles.mealHeader}>
                <Text style={styles.mealTitle}>{meal.name}</Text>
                <Button 
                  mode="contained-tonal" 
                  icon="plus" 
                  onPress={() => handleAddFood(mealIndex)}
                  style={styles.addFoodButton}
                  contentStyle={{ flexDirection: 'row-reverse' }}
                  labelStyle={{ marginRight: 8, color: theme.palette.primary.main }}
                  buttonColor="#E8F5E9"
                >
                  Besin Ekle
                </Button>
              </View>
              
              {meal.foods && meal.foods.length > 0 ? (
                <View style={styles.foodsList}>
                  {meal.foods.map((food, foodIndex) => (
                    <View key={foodIndex} style={styles.foodItem}>
                      <View style={styles.foodInfo}>
                        <View style={styles.foodNameRow}>
                          <Ionicons name="restaurant-outline" size={16} color={theme.palette.primary.main} style={styles.foodIcon} />
                          <Text style={styles.foodName}>{food.name}</Text>
                        </View>
                        <View style={styles.foodDetails}>
                          {food.amount && <Text style={styles.foodAmount}>{food.amount}</Text>}
                          {(food.calories > 0 || typeof food.calories === 'number') && (
                            <View style={styles.calorieTag}>
                              <Ionicons name="flame-outline" size={12} color="#ff6d00" />
                              <Text style={styles.foodCalories}>{food.calories} kcal</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <IconButton
                        icon="delete-outline"
                        iconColor="#f44336"
                        size={20}
                        onPress={() => handleDeleteFood(mealIndex, foodIndex)}
                        style={styles.deleteButton}
                      />
                    </View>
                  ))}
                  
                  <View style={styles.mealSummary}>
                    <View style={styles.mealCalorieBadge}>
                      <Ionicons name="flame" size={14} color="#fff" />
                      <Text style={styles.mealTotalText}>
                        {meal.foods.reduce((total, food) => {
                          const calories = typeof food.calories === 'number' ? food.calories : (parseInt(food.calories) || 0);
                          return total + calories;
                        }, 0)} kcal
                      </Text>
                    </View>
                    <Text style={styles.mealItemCount}>
                      {meal.foods.length} besin
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.emptyMealContainer}>
                  <Ionicons name="restaurant-outline" size={24} color="#ccc" />
                  <Text style={styles.emptyMealText}>Henüz bu öğüne besin eklenmemiş</Text>
                </View>
              )}
            </View>
          ))}
          
          <Button
            mode="outlined"
            icon="plus"
            onPress={() => {
              const updatedMeals = [...formData.meals];
              updatedMeals.push({
                name: `Ara Öğün ${formData.meals.filter(m => m.name.includes('Ara Öğün')).length + 1}`,
                foods: []
              });
              setFormData({
                ...formData,
                meals: updatedMeals
              });
            }}
            style={styles.addMealButton}
          >
            Yeni Öğün Ekle
          </Button>
        </Card.Content>
      </Card>
      
      <View style={styles.buttonGroup}>
        <Button 
          mode="outlined" 
          onPress={handleDismiss}
          style={styles.cancelButton}
          icon="close"
        >
          İptal
        </Button>
        <Button 
          mode="contained" 
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          style={styles.saveButton}
          icon={isEditing ? "content-save-edit" : "check"}
        >
          {isEditing ? 'Güncelle' : 'Oluştur'}
        </Button>
      </View>
    </ScrollView>
  );

  // Ana Modal
  return (
    <Modal
      visible={visible}
      onDismiss={handleDismiss}
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
          <Appbar.Header style={styles.modalHeader}>
            <Appbar.Action icon="close" onPress={handleDismiss} />
            <Appbar.Content title={isEditing ? 'Diyet Planı Düzenle' : 'Yeni Diyet Planı'} />
            <Appbar.Action 
              icon="check" 
              onPress={handleSubmit} 
              disabled={loading}
            />
          </Appbar.Header>
          
          {renderFormContent()}
          {renderFoodDialog()}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    margin: 0,
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    height: '100%',
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
  modalHeader: {
    elevation: 4,
    backgroundColor: theme.palette.primary.main,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  formCard: {
    marginBottom: 16,
    borderRadius: 16,
    elevation: 3,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.palette.primary.main,
    marginLeft: 8,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#555',
    marginBottom: 6,
    fontWeight: '500',
  },
  required: {
    color: '#f44336',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  textArea: {
    backgroundColor: '#fff',
    minHeight: 80,
    borderRadius: 8,
  },
  clientSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.palette.primary.light,
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  selectedClientText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  placeholderText: {
    color: '#999',
  },
  clientsDialog: {
    maxHeight: '80%',
    borderRadius: 12,
  },
  clientsScrollView: {
    maxHeight: 300,
  },
  clientItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    borderRadius: 8,
  },
  clientName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  clientEmail: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  noClientsText: {
    textAlign: 'center',
    padding: 16,
    color: '#666',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dateGroup: {
    flex: 1,
    marginHorizontal: 4,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.palette.primary.light,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  dateIcon: {
    marginRight: 8,
  },
  dateText: {
    color: '#333',
    fontSize: 15,
  },
  statusSelector: {
    marginTop: 6,
  },
  segmentedButtons: {
    backgroundColor: '#fff',
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  macroField: {
    flex: 1,
    marginHorizontal: 4,
  },
  macroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  macroHeaderText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  macroInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  macroTotalCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  macroProgressContainer: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: '#e0e0e0',
    marginBottom: 8,
  },
  macroProgress: {
    height: '100%',
  },
  macroTotalRow: {
    marginTop: 8,
  },
  macroTotalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  macroPercentageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroPercentageItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  macroColorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 4,
  },
  macroPercentageText: {
    fontSize: 12,
    color: '#666',
  },
  mealSection: {
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  mealTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  addFoodButton: {
    margin: 0,
    borderRadius: 20,
    elevation: 0,
  },
  foodsList: {
    marginTop: 8,
  },
  foodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 8,
    elevation: 1,
  },
  foodInfo: {
    flex: 1,
  },
  foodNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  foodIcon: {
    marginRight: 8,
  },
  foodName: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  foodDetails: {
    flexDirection: 'row',
    marginTop: 6,
    alignItems: 'center',
  },
  foodAmount: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  calorieTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  foodCalories: {
    fontSize: 12,
    color: '#4caf50',
    fontWeight: '500',
    marginLeft: 4,
  },
  deleteButton: {
    margin: 0,
  },
  mealSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 8,
    paddingHorizontal: 6,
  },
  mealCalorieBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.palette.primary.main,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  mealTotalText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 4,
  },
  mealItemCount: {
    fontSize: 13,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  emptyMealContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    borderStyle: 'dashed',
  },
  emptyMealText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 8,
    marginTop: 4,
  },
  addMealButton: {
    marginTop: 16,
    borderColor: theme.palette.primary.main,
    borderRadius: 20,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 20,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
    borderColor: '#ccc',
    borderRadius: 8,
  },
  saveButton: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: theme.palette.primary.main,
    borderRadius: 8,
  },
  foodDialog: {
    borderRadius: 16,
  },
  dialogInput: {
    backgroundColor: '#fff',
    marginBottom: 12,
    borderRadius: 8,
  },
});

export default DietPlanFormModal; 