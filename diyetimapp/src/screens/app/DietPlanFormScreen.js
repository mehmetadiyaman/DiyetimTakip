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
import { apiRequest, getCachedDietPlan } from '../../api/config';
import theme from '../../themes/theme';

const { height, width } = Dimensions.get('window');

const DietPlanFormModal = ({ 
  visible, 
  onDismiss, 
  onSubmit, 
  isEditing, 
  planId, 
  planData,
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
      
      console.log('Form modal açılıyor. Mod:', isEditing ? 'Düzenleme' : 'Yeni Oluşturma');
      console.log('Plan ID:', planId);
      console.log('Client ID:', clientId);
      
      // Danışanları yükle (eğer clientId yoksa)
      if (!clientId) {
        loadClients();
      } else {
        setSelectedClient({ _id: clientId, name: clientName || 'Seçili Danışan' });
      }
      
      // Eğer düzenleme modunda ise mevcut planı yükle
      if (isEditing && planId) {
        console.log(`Diyet planı düzenleme modu aktif, planId: ${planId}`);
        if (planData) {
          // Doğrudan verilen plan verilerini kullan
          console.log('Verilen plan verileri kullanılıyor:', planData.title);
          populateFormWithPlanData(planData);
        } else {
          // Yoksa API'den veya önbellekten yükle
          loadPlanDetails();
        }
      } else {
        console.log('Yeni plan oluşturma modu');
        // Yeni plan için varsayılan değerler
        resetForm();
      }
    }
  }, [visible, isEditing, planId, clientId, planData]);
  
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
      
      if (!planId) {
        console.error('Plan ID değeri eksik');
        Alert.alert('Hata', 'Plan bilgileri yüklenemedi (ID eksik)');
        setLoading(false);
        return;
      }
      
      console.log('Diyet planı verileri yükleniyor, ID:', planId);
      
      const data = getCachedDietPlan(planId);
      // Eğer önbellekte veri yoksa API'den yüklemeyi dene
      let apiData = null;
      if (!data) {
        console.log('Plan önbellekte bulunamadı, API\'den yükleniyor');
        try {
          apiData = await apiRequest('GET', `/diet-plans/${planId}`, null, token);
        } catch (err) {
          console.error('API\'den yükleme hatası:', err);
        }
      }
      
      const planData = data || apiData;
      console.log('Yüklenen diyet planı verileri:', JSON.stringify(planData));
      
      if (planData && typeof planData === 'object' && planData.success === false) {
        console.error('API başarısız yanıt döndü:', planData.message);
        Alert.alert(
          'Uyarı', 
          'Diyet planı verilerine erişilemedi. Boş bir form ile devam edilecek.',
          [{ text: 'Tamam' }]
        );
        
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
            { name: 'Kahvaltı', foods: [] },
            { name: 'Öğle Yemeği', foods: [] },
            { name: 'Akşam Yemeği', foods: [] },
            { name: 'Ara Öğün', foods: [] }
          ]
        });
        setLoading(false);
        return;
      }
      
      if (!planData) {
        console.error('API yanıtı boş: Diyet planı bulunamadı');
        Alert.alert('Hata', 'Diyet planı bulunamadı.');
        setLoading(false);
        return;
      }
      
      // Client bilgilerini ayarla (eğer clientName boşsa)
      if (planData.clientId && !clientName) {
        try {
          const clientData = await apiRequest('GET', `/clients/${planData.clientId}`, null, token);
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
      if (planData.meals && Array.isArray(planData.meals) && planData.meals.length > 0) {
        console.log('Meals dizisi bulundu, kullanılıyor:', planData.meals.length);
        
        // Foods içindeki calories değerlerini doğru şekilde işle
        meals = planData.meals.map(meal => ({
          name: meal.name,
          foods: (meal.foods || []).map(food => ({
            name: food.name || '',
            amount: food.amount || '',
            calories: typeof food.calories === 'number' ? 
                      food.calories : 
                      (food.calories && typeof food.calories === 'object' ? 
                        parseInt(food.calories.$numberInt || 0) : 0)
          }))
        }));
      } 
      // Eğer meals dizisi boşsa veya yoksa content'ten almaya çalış
      else if (planData.content) {
        console.log('Content field kullanılıyor');
        try {
          // String ise parse et
          if (typeof planData.content === 'string') {
            const parsedContent = JSON.parse(planData.content);
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
          else if (typeof planData.content === 'object' && Array.isArray(planData.content)) {
            meals = planData.content;
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
      
      // Sayısal değerler için tiplerini kontrol et ve dönüştür
      const dailyCalories = typeof planData.dailyCalories === 'number' ? 
        planData.dailyCalories : parseInt(planData.dailyCalories || '0');
        
      const macroProtein = typeof planData.macroProtein === 'number' ? 
        planData.macroProtein : parseInt(planData.macroProtein || '0');
        
      const macroCarbs = typeof planData.macroCarbs === 'number' ? 
        planData.macroCarbs : parseInt(planData.macroCarbs || '0');
        
      const macroFat = typeof planData.macroFat === 'number' ? 
        planData.macroFat : parseInt(planData.macroFat || '0');
      
      // Tarihler için kontroller
      let startDate = new Date();
      if (planData.startDate) {
        try {
          startDate = planData.startDate instanceof Date ? planData.startDate : new Date(planData.startDate);
        } catch (e) {
          console.error('Başlangıç tarihi dönüştürme hatası:', e);
        }
      }
      
      let endDate = new Date(new Date().setDate(new Date().getDate() + 30));
      if (planData.endDate) {
        try {
          endDate = planData.endDate instanceof Date ? planData.endDate : new Date(planData.endDate);
        } catch (e) {
          console.error('Bitiş tarihi dönüştürme hatası:', e);
        }
      }
      
      // Form state'ini güncelle
      const formState = {
        title: planData.title || '',
        dailyCalories: dailyCalories.toString(),
        startDate: startDate,
        endDate: endDate,
        description: planData.description || '',
        status: planData.status || 'active',
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
        meals: formData.meals.map(meal => ({
          name: meal.name,
          foods: meal.foods.map(food => ({
            name: food.name || '',
            amount: food.amount || '',
            calories: parseInt(food.calories) || 0
          }))
        }))
      };
      
      console.log('API\'ye gönderilecek diyet planı verileri:', planData);
      
      let response;
      if (isEditing && planId) {
        // Güncelleme isteği
        console.log(`${planId} ID'li diyet planı güncelleniyor...`);
        response = await apiRequest('PUT', `/diet-plans/${planId}`, planData, token);
      } else {
        // Yeni kayıt isteği
        console.log('Yeni diyet planı oluşturuluyor...');
        response = await apiRequest('POST', '/diet-plans', planData, token);
      }
      
      // Yanıt kontrolü
      if (!response) {
        console.error('API yanıtı boş');
        throw new Error('Sunucu yanıtı alınamadı');
      }
      
      if (response.success === false) {
        console.error('API başarısız yanıt döndü:', response.message);
        throw new Error(response.message || 'İşlem başarısız oldu');
      }
      
      console.log('API yanıtı:', response);
      
      if (isEditing && planId) {
        console.log('Diyet planı başarıyla güncellendi:', response);
        hideModal(() => {
          Alert.alert(
            'Başarılı',
            `"${planData.title}" diyet planı başarıyla güncellendi.`,
            [{ text: 'Tamam', onPress: () => onSubmit(true, 'update') }]
          );
        });
      } else {
        console.log('Diyet planı başarıyla oluşturuldu:', response);
        hideModal(() => {
          Alert.alert(
            'Başarılı',
            `"${planData.title}" diyet planı başarıyla oluşturuldu.`,
            [{ text: 'Tamam', onPress: () => onSubmit(true, 'create') }]
          );
        });
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
  
  // Plan verileriyle formu doldur
  const populateFormWithPlanData = (plan) => {
    try {
      setLoading(true);
      console.log('Diyet planı verileriyle form dolduruluyor');
      
      if (!plan) {
        console.error('Plan verileri geçersiz');
        resetForm();
        return;
      }
      
      // Verileri işle
      let meals = [];
      
      // Meals dizisi varsa ve geçerliyse direkt kullan
      if (plan.meals && Array.isArray(plan.meals) && plan.meals.length > 0) {
        console.log('Meals dizisi bulundu, kullanılıyor:', plan.meals.length);
        
        // Foods içindeki calories değerlerini doğru şekilde işle
        meals = plan.meals.map(meal => ({
          name: meal.name,
          foods: (meal.foods || []).map(food => ({
            name: food.name || '',
            amount: food.amount || '',
            calories: typeof food.calories === 'number' ? 
                      food.calories : 
                      (food.calories && typeof food.calories === 'object' ? 
                        parseInt(food.calories.$numberInt || 0) : 0)
          }))
        }));
      } 
      // Eğer meals dizisi boşsa veya yoksa content'ten almaya çalış
      else if (plan.content) {
        console.log('Content field kullanılıyor');
        try {
          // String ise parse et
          if (typeof plan.content === 'string') {
            const parsedContent = JSON.parse(plan.content);
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
          else if (typeof plan.content === 'object' && Array.isArray(plan.content)) {
            meals = plan.content;
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
      
      // Sayısal değerler için tiplerini kontrol et ve dönüştür
      const dailyCalories = typeof plan.dailyCalories === 'number' ? 
        plan.dailyCalories : parseInt(plan.dailyCalories || '0');
        
      const macroProtein = typeof plan.macroProtein === 'number' ? 
        plan.macroProtein : parseInt(plan.macroProtein || '0');
        
      const macroCarbs = typeof plan.macroCarbs === 'number' ? 
        plan.macroCarbs : parseInt(plan.macroCarbs || '0');
        
      const macroFat = typeof plan.macroFat === 'number' ? 
        plan.macroFat : parseInt(plan.macroFat || '0');
      
      // Tarihler için kontroller
      let startDate = new Date();
      if (plan.startDate) {
        try {
          startDate = plan.startDate instanceof Date ? plan.startDate : new Date(plan.startDate);
        } catch (e) {
          console.error('Başlangıç tarihi dönüştürme hatası:', e);
        }
      }
      
      let endDate = new Date(new Date().setDate(new Date().getDate() + 30));
      if (plan.endDate) {
        try {
          endDate = plan.endDate instanceof Date ? plan.endDate : new Date(plan.endDate);
        } catch (e) {
          console.error('Bitiş tarihi dönüştürme hatası:', e);
        }
      }
      
      // Form state'ini güncelle
      const formState = {
        title: plan.title || '',
        dailyCalories: dailyCalories.toString(),
        startDate: startDate,
        endDate: endDate,
        description: plan.description || '',
        status: plan.status || 'active',
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
    } catch (error) {
      console.error('Form doldurma hatası:', error);
      Alert.alert('Hata', 'Form verileri yüklenemedi.');
      resetForm();
    } finally {
      setLoading(false);
    }
  };
  
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
    backgroundColor: '#f5f7fa',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  formCard: {
    marginBottom: 16,
    borderRadius: 20,
    elevation: 2,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: {
      width: 0, 
      height: 2
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.palette.primary.main,
    marginLeft: 8,
    letterSpacing: 0.3,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#455a64',
    marginBottom: 6,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  required: {
    color: '#f44336',
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  textArea: {
    backgroundColor: '#fff',
    minHeight: 100,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    textAlignVertical: 'top',
    padding: 8,
  },
  clientSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.palette.primary.light,
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#fff',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
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
    borderRadius: 20,
    overflow: 'hidden',
  },
  clientsScrollView: {
    maxHeight: 300,
  },
  clientItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    borderRadius: 12,
    marginBottom: 4,
  },
  clientName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  clientEmail: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  noClientsText: {
    textAlign: 'center',
    padding: 20,
    color: '#666',
    fontStyle: 'italic',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
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
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  dateIcon: {
    marginRight: 8,
  },
  dateText: {
    color: '#333',
    fontSize: 15,
    fontWeight: '500',
  },
  statusSelector: {
    marginTop: 8,
  },
  segmentedButtons: {
    backgroundColor: '#fff',
    elevation: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  macroField: {
    flex: 1,
    marginHorizontal: 4,
  },
  macroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  macroHeaderText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
    letterSpacing: 0.3,
  },
  macroInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  macroTotalCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  macroProgressContainer: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#e0e0e0',
    marginBottom: 10,
  },
  macroProgress: {
    height: '100%',
  },
  macroTotalRow: {
    marginTop: 10,
  },
  macroTotalLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
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
    marginRight: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  macroPercentageText: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  mealSection: {
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  mealTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
    letterSpacing: 0.3,
  },
  addFoodButton: {
    borderRadius: 25,
    elevation: 0,
  },
  foodsList: {
    marginTop: 10,
  },
  foodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: 'white',
    borderRadius: 14,
    marginBottom: 8,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
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
    flexWrap: 'wrap',
  },
  foodAmount: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 4,
  },
  calorieTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  foodCalories: {
    fontSize: 12,
    color: '#4caf50',
    fontWeight: '500',
    marginLeft: 4,
  },
  deleteButton: {
    margin: 0,
    backgroundColor: '#ffebee',
    borderRadius: 20,
  },
  mealSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 10,
    paddingHorizontal: 8,
  },
  mealCalorieBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.palette.primary.main,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  mealTotalText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 6,
  },
  mealItemCount: {
    fontSize: 13,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    overflow: 'hidden',
    fontWeight: '500',
  },
  emptyMealContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
    borderStyle: 'dashed',
  },
  emptyMealText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 10,
    marginTop: 8,
  },
  addMealButton: {
    marginTop: 16,
    borderColor: theme.palette.primary.main,
    borderRadius: 20,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 30,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
    borderColor: '#ccc',
    borderRadius: 12,
    paddingVertical: 6,
    elevation: 1,
  },
  saveButton: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: theme.palette.primary.main,
    borderRadius: 12,
    paddingVertical: 6,
    shadowColor: theme.palette.primary.main,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  foodDialog: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  dialogInput: {
    backgroundColor: '#fff',
    marginBottom: 14,
    borderRadius: 12,
  },
});

export default DietPlanFormModal; 