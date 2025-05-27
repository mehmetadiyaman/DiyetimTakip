import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions
} from 'react-native';
import {
  Card,
  Text,
  FAB,
  Divider,
  Button,
  IconButton,
  Menu,
  Dialog,
  Portal,
  Badge,
  Chip,
  Avatar,
  ProgressBar,
  Snackbar,
  Modal
} from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import { apiRequest, updateDietPlansCache } from '../../api/config';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../themes/theme';
import { useFocusEffect } from '@react-navigation/native';
import DietPlanFormModal from './DietPlanFormScreen'; // Değiştirilecek modal component bağlantısı

const { width } = Dimensions.get('window');

const DietPlansScreen = ({ route, navigation }) => {
  const { clientId, clientName } = route.params || {};
  const { token } = useAuth();
  
  const [dietPlans, setDietPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  // Form modal için state'ler
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [editingPlanData, setEditingPlanData] = useState(null);
  
  // Header'daki back butonunu kaldırmak için
  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => null, // Bu satır geri tuşunu kaldırır
      title: clientName ? `${clientName} - Diyet Planları` : 'Diyet Planları'
    });
  }, [navigation, clientName]);
  
  const loadDietPlans = async () => {
    try {
      setLoading(true);
      let endpoint = '/diet-plans';
      
      if (clientId) {
        console.log(`Danışan ID'si için diyet planları yükleniyor: ${clientId}`);
        endpoint = `/diet-plans?clientId=${clientId}`;
      } else {
        console.log('Tüm diyet planları yükleniyor');
      }
      
      const data = await apiRequest('GET', endpoint, null, token);
      
      if (data) {
        console.log(`Yüklenen diyet planı sayısı: ${data.length}`);
        
        // Diyet planlarını önbelleğe al
        updateDietPlansCache(data);
        
        // ClientId varsa, sadece o danışana ait planları filtrele
        if (clientId) {
          const filteredPlans = data.filter(plan => plan.clientId === clientId);
          setDietPlans(filteredPlans);
        } else {
          setDietPlans(data);
        }
      } else {
        setDietPlans([]);
      }
    } catch (error) {
      console.error('Diyet planları yükleme hatası:', error);
      Alert.alert('Hata', 'Diyet planları yüklenirken bir sorun oluştu.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Ekran odaklandığında verileri yükle
  useFocusEffect(
    React.useCallback(() => {
      loadDietPlans();
      return () => {};
    }, [clientId])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadDietPlans();
  };

  const showSnackbar = (message) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const handleCreatePlan = () => {
    setIsEditing(false);
    setSelectedPlanId(null);
    setFormModalVisible(true);
  };

  const handleEditPlan = (plan) => {
    if (!plan || !plan._id) {
      console.error('Düzenlenecek plan bulunamadı:', plan);
      Alert.alert('Hata', 'Diyet planı detayları yüklenemedi. Lütfen tekrar deneyin.');
      return;
    }
    
    console.log('Plan düzenleme formu açılıyor, planID:', plan._id);
    console.log('Plan bilgileri:', plan.title);
    
    setIsEditing(true);
    setSelectedPlanId(plan._id);
    setSelectedPlan(plan); // Plan verilerini seçilen plan olarak ayarla
    setEditingPlanData(plan); // Düzenleme için plan verilerini kaydet
    setFormModalVisible(true);
  };

  const handleFormSubmit = (success, action) => {
    console.log(`Form işlemi ${success ? 'başarılı' : 'başarısız'}, işlem: ${action}`);
    
    if (success) {
      // Önce formları kapat ve state'leri sıfırla
      setFormModalVisible(false);
      setIsEditing(false);
      setSelectedPlan(null);
      setSelectedPlanId(null);
      
      // Küçük bir gecikme sonrası verileri yeniden yükle (arayüz için daha iyi)
      setTimeout(() => {
        loadDietPlans();
        showSnackbar(action === 'create' ? 'Diyet planı başarıyla oluşturuldu!' : 'Diyet planı başarıyla güncellendi!');
      }, 300);
    } else {
      // Başarısız olursa, sadece bildirim göster
      Alert.alert('Hata', 'İşlem başarısız oldu. Lütfen tekrar deneyin.');
    }
  };

  const confirmDelete = (plan) => {
    console.log('Silinmek üzere olan plan:', plan.title);
    setSelectedPlan(plan);
    setDeleteDialogVisible(true);
  };

  const handleDeletePlan = async () => {
    try {
      if (!selectedPlan || !selectedPlan._id) {
        console.error('Silinecek plan bulunamadı');
        setDeleteDialogVisible(false);
        return;
      }
      
      setLoading(true);
      console.log(`${selectedPlan._id} ID'li plan siliniyor...`);
      
      await apiRequest('DELETE', `/diet-plans/${selectedPlan._id}`, null, token);
      
      setDeleteDialogVisible(false);
      const updatedPlans = dietPlans.filter(plan => plan._id !== selectedPlan._id);
      setDietPlans(updatedPlans);
      
      showSnackbar('Diyet planı başarıyla silindi');
    } catch (error) {
      console.error('Diyet planı silme hatası:', error);
      Alert.alert('Hata', 'Diyet planı silinirken bir sorun oluştu.');
    } finally {
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  const formatDate = (dateString) => {
    try {
      if (!dateString) return 'Tarih belirtilmemiş';
      
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Geçersiz tarih';
      
      // Türkçe tarih için özel format
      const day = date.getDate().toString().padStart(2, '0');
      const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
      const month = monthNames[date.getMonth()];
      const year = date.getFullYear();
      
      return `${day} ${month} ${year}`;
    } catch (error) {
      return 'Geçersiz tarih';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return { bg: '#E8F5E9', text: '#4CAF50', border: '#A5D6A7', icon: 'checkmark-circle' };
      case 'completed':
        return { bg: '#E3F2FD', text: '#2196F3', border: '#90CAF9', icon: 'checkmark-done-circle' };
      case 'pending':
        return { bg: '#FFF8E1', text: '#FFC107', border: '#FFE082', icon: 'time' };
      case 'archived':
        return { bg: '#EFEBE9', text: '#795548', border: '#BCAAA4', icon: 'archive' };
      default:
        return { bg: '#E0E0E0', text: '#757575', border: '#BDBDBD', icon: 'help-circle' };
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'Aktif';
      case 'completed': return 'Tamamlandı';
      case 'pending': return 'Beklemede';
      case 'archived': return 'Arşivlendi';
      default: return status;
    }
  };

  const getRemainingDays = (endDate) => {
    if (!endDate) return null;
    
    const today = new Date();
    const end = new Date(endDate);
    
    if (isNaN(end.getTime())) return null;
    
    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const getProgressColor = (remainingDays) => {
    if (remainingDays <= 0) return '#d32f2f';
    if (remainingDays <= 3) return '#ff9800';
    if (remainingDays <= 7) return '#ffc107';
    return '#4caf50';
  };

  const parseMeals = (plan) => {
    try {
      // Content json string olarak saklanıyor olabilir
      if (typeof plan.content === 'string') {
        return JSON.parse(plan.content);
      }
      // Veya direkt meals dizisi olarak
      if (Array.isArray(plan.meals)) {
        return plan.meals;
      }
      return [];
    } catch (error) {
      return [];
    }
  };

  const getDurationText = (startDate, endDate) => {
    if (!startDate || !endDate) return '';
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';
    
    const diffTime = end - start;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return `${diffDays} gün`;
  };

  const renderDietPlanItem = ({ item }) => {
    const meals = parseMeals(item);
    const statusStyle = getStatusColor(item.status);
    const remainingDays = getRemainingDays(item.endDate);
    const progressColor = getProgressColor(remainingDays);
    const duration = getDurationText(item.startDate, item.endDate);
    
    // Toplam makro besinlerin yüzdesel dağılımı
    const totalMacros = (item.macroProtein || 0) + (item.macroCarbs || 0) + (item.macroFat || 0);
    const proteinPercent = totalMacros ? Math.round((item.macroProtein || 0) / totalMacros * 100) : 0;
    const carbsPercent = totalMacros ? Math.round((item.macroCarbs || 0) / totalMacros * 100) : 0;
    const fatPercent = totalMacros ? Math.round((item.macroFat || 0) / totalMacros * 100) : 0;

    // Toplam kalori hesabı (meal içindeki tüm besinlerden)
    const totalMealCalories = meals.reduce((total, meal) => {
      if (!meal.foods || !meal.foods.length) return total;
      
      const mealTotal = meal.foods.reduce((mealSum, food) => {
        // Calories değerinin farklı formatlarını kontrol et
        const calories = typeof food.calories === 'number' ? food.calories : 
                         (food.calories && food.calories.$numberInt ? 
                          parseInt(food.calories.$numberInt) : 0);
        return mealSum + (calories || 0);
      }, 0);
      
      return total + mealTotal;
    }, 0);

    // Edit ve sil için doğrudan fonksiyonlar
    const editThisPlan = (item) => {
      // Plan için gerekli kontroller
      if (!item || !item._id) {
        console.error('Düzenlenecek geçerli plan ID\'si yok:', item);
        Alert.alert('Hata', 'Diyet planı bulunamadı. Lütfen sayfayı yenileyin.');
        return;
      }
      
      console.log('Düzenlenecek plan ID:', item._id);
      console.log('Plan detayları:', item);
      
      try {
        // Plan verilerini direkt handleEditPlan fonksiyonuna geçir
        handleEditPlan(item);
      } catch (error) {
        console.error('Diyet planı düzenleme hatası:', error);
        Alert.alert('Hata', 'Diyet planı düzenlenirken bir sorun oluştu.');
      }
    };

    const deleteThisPlan = () => {
      console.log('Silinecek plan ID:', item._id);
      confirmDelete(item); // Doğrudan plan nesnesini geçir
    };

    return (
      <Card style={styles.planCard} elevation={3}>
        {/* Üst Bilgi Alanı */}
        <View style={styles.cardHeader}>
          <View style={styles.statusContainer}>
            <Ionicons name={statusStyle.icon} size={22} color={statusStyle.text} style={styles.statusIcon} />
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
              <Text style={[styles.statusText, { color: statusStyle.text }]}>
                {getStatusText(item.status)}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Plan Başlık ve Bilgileri - overflow sorunu için View ile sarmala */}
        <View style={{overflow: 'hidden'}}>
          <Card.Content style={styles.cardContent}>
            <Text style={styles.planTitle}>{item.title}</Text>
            
            {item.description && (
              <Text style={styles.description}>{item.description}</Text>
            )}
            
            <View style={styles.dateContainer}>
              <View style={styles.dateBox}>
                <Text style={styles.dateBoxLabel}>Başlangıç</Text>
                <Text style={styles.dateBoxValue}>{formatDate(item.startDate)}</Text>
              </View>
              
              <View style={styles.durationBox}>
                <Ionicons name="calendar-outline" size={16} color="#5c6bc0" />
                <Text style={styles.durationText}>{duration}</Text>
              </View>
              
              <View style={styles.dateBox}>
                <Text style={styles.dateBoxLabel}>Bitiş</Text>
                <Text style={styles.dateBoxValue}>{formatDate(item.endDate)}</Text>
              </View>
            </View>
            
            {remainingDays !== null && (
              <View style={styles.remainingContainer}>
                <View style={styles.remainingTextContainer}>
                  <Text style={styles.remainingLabel}>
                    {remainingDays > 0 ? 'Kalan Süre:' : 'Süresi Doldu:'}
                  </Text>
                  <Text style={[
                    styles.remainingValue, 
                    { color: remainingDays > 0 ? '#4caf50' : '#d32f2f' }
                  ]}>
                    {remainingDays > 0 ? `${remainingDays} gün` : `${Math.abs(remainingDays)} gün önce`}
                  </Text>
                </View>
                <ProgressBar 
                  progress={Math.max(0, Math.min(1, remainingDays / 30))} 
                  color={progressColor}
                  style={styles.progressBar}
                />
              </View>
            )}
            
            <Divider style={styles.divider} />
            
            {/* Kalori ve Makro Bilgileri */}
            <View style={styles.nutritionSection}>
              <View style={styles.calorieSection}>
                <Avatar.Icon 
                  icon="fire" 
                  size={40} 
                  style={styles.calorieIcon} 
                  color="#fff"
                />
                <View style={styles.calorieInfo}>
                  <Text style={styles.calorieValue}>{item.dailyCalories || 0}</Text>
                  <Text style={styles.calorieLabel}>kalori/gün</Text>
                </View>
                
                {totalMealCalories > 0 && totalMealCalories !== item.dailyCalories && (
                  <View style={styles.mealCalorieBadge}>
                    <Text style={styles.mealCalorieText}>
                      Öğün toplamı: {totalMealCalories} kcal
                    </Text>
                  </View>
                )}
              </View>
              
              <View style={styles.macroSection}>
                <View style={styles.macroHeader}>
                  <Text style={styles.macroTitle}>Makro Besinler</Text>
                  <Text style={styles.macroTotal}>{totalMacros}g</Text>
                </View>
                
                <View style={styles.macroBarContainer}>
                  {proteinPercent > 0 && (
                    <View 
                      style={[
                        styles.macroBarSegment, 
                        {backgroundColor: '#4caf50', flex: proteinPercent}
                      ]} 
                    />
                  )}
                  {carbsPercent > 0 && (
                    <View 
                      style={[
                        styles.macroBarSegment, 
                        {backgroundColor: '#2196f3', flex: carbsPercent}
                      ]} 
                    />
                  )}
                  {fatPercent > 0 && (
                    <View 
                      style={[
                        styles.macroBarSegment, 
                        {backgroundColor: '#ff9800', flex: fatPercent}
                      ]} 
                    />
                  )}
                </View>
                
                <View style={styles.macroLegend}>
                  <View style={styles.macroLegendItem}>
                    <View style={[styles.macroLegendColor, {backgroundColor: '#4caf50'}]} />
                    <Text style={styles.macroLegendText}>Protein: {item.macroProtein || 0}g ({proteinPercent}%)</Text>
                  </View>
                  <View style={styles.macroLegendItem}>
                    <View style={[styles.macroLegendColor, {backgroundColor: '#2196f3'}]} />
                    <Text style={styles.macroLegendText}>Karbonhidrat: {item.macroCarbs || 0}g ({carbsPercent}%)</Text>
                  </View>
                  <View style={styles.macroLegendItem}>
                    <View style={[styles.macroLegendColor, {backgroundColor: '#ff9800'}]} />
                    <Text style={styles.macroLegendText}>Yağ: {item.macroFat || 0}g ({fatPercent}%)</Text>
                  </View>
                </View>
              </View>
            </View>
            
            {/* Öğün Bilgileri */}
            {meals && meals.length > 0 && (
              <View style={styles.mealsContainer}>
                <Text style={styles.sectionTitle}>
                  <Ionicons name="restaurant-outline" size={18} color="#455a64" /> Öğünler
                </Text>
                <View style={styles.mealsList}>
                  {meals.slice(0, 4).map((meal, index) => (
                    <View key={index} style={styles.mealItem}>
                      <Text style={styles.mealName}>{meal.name}</Text>
                      {meal.foods && meal.foods.length > 0 ? (
                        <>
                          <Text style={styles.mealFoods}>
                            {meal.foods.slice(0, 2).map(food => food.name).filter(Boolean).join(', ')}
                            {meal.foods.length > 2 ? ` (+${meal.foods.length - 2})` : ''}
                          </Text>
                          <View style={styles.mealCalorieCounter}>
                            <Ionicons name="flame-outline" size={12} color="#ff6d00" />
                            <Text style={styles.mealCalorieText}>
                              {meal.foods.reduce((total, food) => {
                                const calories = typeof food.calories === 'number' ? food.calories : 
                                                 (food.calories && food.calories.$numberInt ? 
                                                  parseInt(food.calories.$numberInt) : 0);
                                return total + (calories || 0);
                              }, 0)} kcal
                            </Text>
                          </View>
                        </>
                      ) : (
                        <Text style={styles.emptyMealText}>Besin eklenmemiş</Text>
                      )}
                    </View>
                  ))}
                  {meals.length > 4 && (
                    <Text style={styles.moreMeals}>+{meals.length - 4} öğün daha</Text>
                  )}
                </View>
              </View>
            )}
            
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#E3F2FD' }]}
                onPress={() => editThisPlan(item)}
              >
                <Ionicons name="pencil" size={16} color="#1976D2" />
                <Text style={[styles.actionButtonText, { color: '#1976D2' }]}>Düzenle</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#FBE9E7' }]}
                onPress={() => deleteThisPlan()}
              >
                <Ionicons name="trash" size={16} color="#D32F2F" />
                <Text style={[styles.actionButtonText, { color: '#D32F2F' }]}>Sil</Text>
              </TouchableOpacity>
            </View>
          </Card.Content>
        </View>
      </Card>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="nutrition-outline" size={70} color="#e0e0e0" />
      <Text style={styles.emptyText}>
        {clientId 
          ? `${clientName || 'Bu danışan'} için henüz diyet planı bulunmuyor.` 
          : 'Henüz diyet planı bulunmuyor.'}
      </Text>
      <Button 
        mode="contained" 
        onPress={handleCreatePlan}
        style={styles.emptyButton}
        icon="plus"
      >
        Yeni Plan Oluştur
      </Button>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.palette.primary.main} />
        <Text style={styles.loadingText}>Diyet planları yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={dietPlans}
        renderItem={renderDietPlanItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.palette.primary.main]}
            tintColor={theme.palette.primary.main}
          />
        }
      />

      <FAB
        style={styles.fab}
        icon="plus"
        label="Yeni Plan"
        onPress={handleCreatePlan}
        color="#fff"
      />

      <Portal>
        <Dialog visible={deleteDialogVisible && selectedPlan !== null} onDismiss={() => setDeleteDialogVisible(false)}>
          <Dialog.Title>Diyet Planını Sil</Dialog.Title>
          <Dialog.Content>
            <Text>
              "{selectedPlan?.title}" adlı diyet planını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>İptal</Button>
            <Button onPress={handleDeletePlan} textColor="#f44336">Sil</Button>
          </Dialog.Actions>
        </Dialog>

        {/* Diyet Planı Form Modalı */}
        <DietPlanFormModal
          visible={formModalVisible}
          onDismiss={() => setFormModalVisible(false)}
          onSubmit={handleFormSubmit}
          isEditing={isEditing}
          planId={selectedPlanId}
          planData={editingPlanData}
          clientId={clientId}
          clientName={clientName}
          token={token}
        />

        {/* Bildirim çubuğu */}
        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={3000}
          action={{
            label: 'Tamam',
            onPress: () => setSnackbarVisible(false),
          }}
        >
          {snackbarMessage}
        </Snackbar>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    color: '#757575',
  },
  listContainer: {
    padding: 12,
    paddingBottom: 80,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 300,
  },
  emptyText: {
    fontSize: 16,
    color: '#757575',
    marginBottom: 20,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 10,
    backgroundColor: theme.palette.primary.main,
  },
  planCard: {
    marginBottom: 16,
    borderRadius: 16,
    elevation: 3,
    overflow: 'hidden',
    backgroundColor: 'white',
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    marginRight: 6,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardContent: {
    padding: 16,
  },
  planTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#263238',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: '#455a64',
    marginBottom: 12,
    lineHeight: 20,
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateBox: {
    alignItems: 'center',
  },
  dateBoxLabel: {
    fontSize: 12,
    color: '#546e7a',
    marginBottom: 2,
  },
  dateBoxValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#263238',
  },
  durationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e8eaf6',
    borderRadius: 15,
  },
  durationText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '500',
    color: '#3f51b5',
  },
  remainingContainer: {
    marginVertical: 12,
  },
  remainingTextContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  remainingLabel: {
    fontSize: 12,
    color: '#546e7a',
  },
  remainingValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  divider: {
    marginVertical: 12,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  nutritionSection: {
    marginBottom: 16,
  },
  calorieSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  calorieIcon: {
    backgroundColor: '#ff5722',
  },
  calorieInfo: {
    marginLeft: 12,
  },
  calorieValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#263238',
  },
  calorieLabel: {
    fontSize: 12,
    color: '#757575',
  },
  mealCalorieBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 'auto',
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  mealCalorieText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976D2',
  },
  macroSection: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  macroTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#455a64',
  },
  macroTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#455a64',
  },
  macroBarContainer: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 10,
    backgroundColor: '#e0e0e0',
  },
  macroBarSegment: {
    height: '100%',
  },
  macroLegend: {
    marginTop: 6,
  },
  macroLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  macroLegendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  macroLegendText: {
    fontSize: 12,
    color: '#455a64',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#455a64',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealsContainer: {
    marginTop: 8,
  },
  mealsList: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 10,
  },
  mealItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
    marginBottom: 4,
  },
  mealName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#263238',
    marginBottom: 2,
  },
  mealFoods: {
    fontSize: 12,
    color: '#607d8b',
  },
  mealCalorieCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  emptyMealText: {
    fontSize: 12,
    color: '#757575',
    fontStyle: 'italic',
  },
  moreMeals: {
    fontSize: 12,
    color: '#546e7a',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingTop: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  menuButton: {
    margin: 0,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: theme.palette.primary.main,
  }
});

export default DietPlansScreen; 