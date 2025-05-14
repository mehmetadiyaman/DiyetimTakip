import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity
} from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  Button, 
  Divider, 
  FAB,
  Dialog,
  TextInput,
  HelperText,
  Chip,
  List,
  IconButton
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { useFeedback } from '../../contexts/FeedbackContext';
import { get, post, put, del } from '../../api/config';
import theme from '../../themes/theme';
import { commonStyles } from '../../themes';

const DietPlansScreen = ({ navigation, route }) => {
  const { clientId, clientName } = route.params || {};
  const { token } = useAuth();
  const { showToastSuccess, showToastError } = useToast();
  const { showLoading, hideLoading, showConfirmDialog } = useFeedback();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dietPlans, setDietPlans] = useState([]);
  const [client, setClient] = useState(null);
  
  const [dialogVisible, setDialogVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [newPlan, setNewPlan] = useState({
    title: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    mealCategories: [
      { name: 'Kahvaltı', meals: [] },
      { name: 'Öğle Yemeği', meals: [] },
      { name: 'Akşam Yemeği', meals: [] },
      { name: 'Ara Öğün', meals: [] }
    ],
    notes: ''
  });
  
  const [errors, setErrors] = useState({});
  const [mealDialogVisible, setMealDialogVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [newMeal, setNewMeal] = useState({
    name: '',
    portion: '',
    calories: '',
    notes: ''
  });
  
  useEffect(() => {
    if (clientId) {
      loadData();
      // Ekran başlığını ayarla
      navigation.setOptions({
        title: clientName ? `${clientName} - Diyet Planları` : 'Diyet Planları'
      });
    } else {
      setLoading(false);
    }
  }, [clientId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Danışan bilgilerini al
      const clientData = await get(`/clients/${clientId}`, token);
      setClient(clientData);
      
      // Diyet planlarını al
      const dietPlansData = await get(`/clients/${clientId}/diet-plans`, token);
      setDietPlans(dietPlansData || []);
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
      showToastError('Veriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const validatePlanForm = () => {
    const newErrors = {};
    
    if (!newPlan.title.trim()) {
      newErrors.title = 'Plan başlığı gereklidir';
    }
    
    if (!newPlan.startDate) {
      newErrors.startDate = 'Başlangıç tarihi gereklidir';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateMealForm = () => {
    const newErrors = {};
    
    if (!newMeal.name.trim()) {
      newErrors.name = 'Yemek adı gereklidir';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddPlan = () => {
    setNewPlan({
      title: '',
      description: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      mealCategories: [
        { name: 'Kahvaltı', meals: [] },
        { name: 'Öğle Yemeği', meals: [] },
        { name: 'Akşam Yemeği', meals: [] },
        { name: 'Ara Öğün', meals: [] }
      ],
      notes: ''
    });
    setSelectedPlan(null);
    setDialogVisible(true);
  };

  const handleEditPlan = (plan) => {
    setSelectedPlan(plan);
    setNewPlan({
      title: plan.title,
      description: plan.description || '',
      startDate: plan.startDate ? plan.startDate.split('T')[0] : '',
      endDate: plan.endDate ? plan.endDate.split('T')[0] : '',
      mealCategories: plan.mealCategories || [
        { name: 'Kahvaltı', meals: [] },
        { name: 'Öğle Yemeği', meals: [] },
        { name: 'Akşam Yemeği', meals: [] },
        { name: 'Ara Öğün', meals: [] }
      ],
      notes: plan.notes || ''
    });
    setDialogVisible(true);
  };

  const handleDeletePlan = (planId) => {
    showConfirmDialog(
      'Planı Sil',
      'Bu diyet planını silmek istediğinize emin misiniz?',
      async () => {
        try {
          showLoading('Diyet planı siliniyor...');
          
          await del(`/clients/${clientId}/diet-plans/${planId}`, token);
          
          showToastSuccess('Diyet planı başarıyla silindi');
          loadData();
        } catch (error) {
          console.error('Plan silme hatası:', error);
          showToastError('Diyet planı silinirken bir hata oluştu');
        } finally {
          hideLoading();
        }
      }
    );
  };

  const savePlan = async () => {
    if (!validatePlanForm()) {
      return;
    }
    
    try {
      showLoading('Diyet planı kaydediliyor...');
      
      // Sayısal alanları dönüştür
      const planData = {
        ...newPlan,
        clientId
      };
      
      let response;
      if (selectedPlan) {
        // Güncelleme
        response = await put(`/clients/${clientId}/diet-plans/${selectedPlan._id}`, planData, token);
      } else {
        // Yeni ekleme
        response = await post(`/clients/${clientId}/diet-plans`, planData, token);
      }
      
      setDialogVisible(false);
      showToastSuccess(`Diyet planı başarıyla ${selectedPlan ? 'güncellendi' : 'oluşturuldu'}`);
      
      loadData();
    } catch (error) {
      console.error('Plan kaydetme hatası:', error);
      showToastError('Diyet planı kaydedilirken bir hata oluştu');
    } finally {
      hideLoading();
    }
  };

  const handleAddMeal = (categoryIndex) => {
    setSelectedCategory(categoryIndex);
    setNewMeal({
      name: '',
      portion: '',
      calories: '',
      notes: ''
    });
    setMealDialogVisible(true);
  };

  const handleDeleteMeal = (categoryIndex, mealIndex) => {
    const updatedCategories = [...newPlan.mealCategories];
    updatedCategories[categoryIndex].meals.splice(mealIndex, 1);
    
    setNewPlan({
      ...newPlan,
      mealCategories: updatedCategories
    });
  };

  const saveMeal = () => {
    if (!validateMealForm()) {
      return;
    }
    
    const updatedCategories = [...newPlan.mealCategories];
    
    // Sayısal alanları işle
    const mealToAdd = {
      ...newMeal,
      calories: newMeal.calories ? parseInt(newMeal.calories) : undefined
    };
    
    updatedCategories[selectedCategory].meals.push(mealToAdd);
    
    setNewPlan({
      ...newPlan,
      mealCategories: updatedCategories
    });
    
    setMealDialogVisible(false);
  };

  if (loading && !refreshing) {
    return (
      <View style={commonStyles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.palette.primary.main} />
        <Text style={commonStyles.loadingText}>Diyet planları yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={[theme.palette.primary.main]} 
          />
        }
      >
        {/* Diyet Planları */}
        {dietPlans.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <Ionicons name="nutrition-outline" size={50} color={theme.palette.grey[400]} />
              <Text style={styles.emptyText}>Henüz diyet planı oluşturulmamış</Text>
              <Text style={styles.emptySubtext}>
                Yeni bir diyet planı oluşturmak için sağ alttaki + butonuna basabilirsiniz
              </Text>
            </Card.Content>
          </Card>
        ) : (
          dietPlans.map((plan, index) => (
            <Card key={plan._id || index} style={styles.planCard}>
              <Card.Content>
                <View style={styles.cardHeader}>
                  <View style={styles.titleContainer}>
                    <Title style={styles.planTitle}>{plan.title}</Title>
                    {plan.startDate && (
                      <Chip icon="calendar" style={styles.dateChip}>
                        {new Date(plan.startDate).toLocaleDateString('tr-TR')}
                        {plan.endDate && ` - ${new Date(plan.endDate).toLocaleDateString('tr-TR')}`}
                      </Chip>
                    )}
                  </View>
                  <View style={styles.actionButtons}>
                    <IconButton
                      icon="pencil"
                      size={20}
                      onPress={() => handleEditPlan(plan)}
                    />
                    <IconButton
                      icon="delete"
                      size={20}
                      onPress={() => handleDeletePlan(plan._id)}
                    />
                  </View>
                </View>
                
                {plan.description && (
                  <Paragraph style={styles.description}>{plan.description}</Paragraph>
                )}
                
                {plan.mealCategories && plan.mealCategories.map((category, categoryIndex) => (
                  <View key={categoryIndex} style={styles.mealCategory}>
                    <Text style={styles.categoryName}>{category.name}</Text>
                    
                    {category.meals && category.meals.length > 0 ? (
                      category.meals.map((meal, mealIndex) => (
                        <View key={mealIndex} style={styles.mealItem}>
                          <Text style={styles.mealName}>{meal.name}</Text>
                          {meal.portion && (
                            <Text style={styles.mealDetail}>Porsiyon: {meal.portion}</Text>
                          )}
                          {meal.calories && (
                            <Text style={styles.mealDetail}>Kalori: {meal.calories} kcal</Text>
                          )}
                          {meal.notes && (
                            <Text style={styles.mealNotes}>{meal.notes}</Text>
                          )}
                        </View>
                      ))
                    ) : (
                      <Text style={styles.emptyMealText}>Yemek eklenmemiş</Text>
                    )}
                  </View>
                ))}
                
                {plan.notes && (
                  <View style={styles.notesContainer}>
                    <Text style={styles.notesLabel}>Notlar:</Text>
                    <Text style={styles.notesText}>{plan.notes}</Text>
                  </View>
                )}
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>
      
      {/* Yeni Diyet Planı Ekleme FAB */}
      <FAB
        style={styles.fab}
        icon="plus"
        color={theme.palette.background.paper}
        onPress={handleAddPlan}
      />
      
      {/* Diyet Planı Dialog */}
      <Dialog 
        visible={dialogVisible} 
        onDismiss={() => setDialogVisible(false)}
        style={styles.dialog}
      >
        <Dialog.Title>{selectedPlan ? 'Diyet Planını Düzenle' : 'Yeni Diyet Planı'}</Dialog.Title>
        <Dialog.ScrollArea style={styles.dialogScrollArea}>
          <ScrollView contentContainerStyle={styles.dialogContent}>
            <TextInput
              label="Plan Başlığı *"
              value={newPlan.title}
              onChangeText={(text) => setNewPlan({...newPlan, title: text})}
              mode="outlined"
              style={styles.input}
              error={!!errors.title}
            />
            {errors.title && <HelperText type="error">{errors.title}</HelperText>}
            
            <TextInput
              label="Açıklama"
              value={newPlan.description}
              onChangeText={(text) => setNewPlan({...newPlan, description: text})}
              mode="outlined"
              style={styles.input}
            />
            
            <View style={styles.rowInputs}>
              <TextInput
                label="Başlangıç Tarihi *"
                value={newPlan.startDate}
                onChangeText={(text) => setNewPlan({...newPlan, startDate: text})}
                mode="outlined"
                style={[styles.input, styles.halfInput]}
                placeholder="YYYY-MM-DD"
                error={!!errors.startDate}
              />
              
              <TextInput
                label="Bitiş Tarihi"
                value={newPlan.endDate}
                onChangeText={(text) => setNewPlan({...newPlan, endDate: text})}
                mode="outlined"
                style={[styles.input, styles.halfInput]}
                placeholder="YYYY-MM-DD"
              />
            </View>
            {errors.startDate && <HelperText type="error">{errors.startDate}</HelperText>}
            
            <Text style={styles.sectionTitle}>Öğünler</Text>
            
            {newPlan.mealCategories.map((category, categoryIndex) => (
              <View key={categoryIndex} style={styles.mealCategoryContainer}>
                <View style={styles.mealCategoryHeader}>
                  <Text style={styles.mealCategoryTitle}>{category.name}</Text>
                  <Button 
                    mode="text" 
                    onPress={() => handleAddMeal(categoryIndex)}
                    icon="plus"
                  >
                    Yemek Ekle
                  </Button>
                </View>
                
                {category.meals && category.meals.length > 0 ? (
                  category.meals.map((meal, mealIndex) => (
                    <View key={mealIndex} style={styles.mealItemEdit}>
                      <View style={styles.mealItemContent}>
                        <Text style={styles.mealNameEdit}>{meal.name}</Text>
                        <View style={styles.mealDetails}>
                          {meal.portion && <Text style={styles.mealDetailEdit}>Porsiyon: {meal.portion}</Text>}
                          {meal.calories && <Text style={styles.mealDetailEdit}>Kalori: {meal.calories} kcal</Text>}
                        </View>
                      </View>
                      <IconButton
                        icon="delete"
                        size={16}
                        onPress={() => handleDeleteMeal(categoryIndex, mealIndex)}
                        style={styles.deleteMealButton}
                      />
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyMealEditText}>Bu öğünde henüz yemek bulunmuyor</Text>
                )}
              </View>
            ))}
            
            <TextInput
              label="Notlar"
              value={newPlan.notes}
              onChangeText={(text) => setNewPlan({...newPlan, notes: text})}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={[styles.input, styles.textArea]}
            />
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button onPress={() => setDialogVisible(false)}>İptal</Button>
          <Button onPress={savePlan}>Kaydet</Button>
        </Dialog.Actions>
      </Dialog>
      
      {/* Yemek Ekleme Dialog */}
      <Dialog 
        visible={mealDialogVisible} 
        onDismiss={() => setMealDialogVisible(false)}
      >
        <Dialog.Title>Yemek Ekle</Dialog.Title>
        <Dialog.Content>
          <TextInput
            label="Yemek Adı *"
            value={newMeal.name}
            onChangeText={(text) => setNewMeal({...newMeal, name: text})}
            mode="outlined"
            style={styles.input}
            error={!!errors.name}
          />
          {errors.name && <HelperText type="error">{errors.name}</HelperText>}
          
          <TextInput
            label="Porsiyon"
            value={newMeal.portion}
            onChangeText={(text) => setNewMeal({...newMeal, portion: text})}
            mode="outlined"
            style={styles.input}
            placeholder="Örn: 100g, 1 dilim, 1 porsiyon"
          />
          
          <TextInput
            label="Kalori (kcal)"
            value={newMeal.calories}
            onChangeText={(text) => setNewMeal({...newMeal, calories: text})}
            mode="outlined"
            keyboardType="numeric"
            style={styles.input}
          />
          
          <TextInput
            label="Notlar"
            value={newMeal.notes}
            onChangeText={(text) => setNewMeal({...newMeal, notes: text})}
            mode="outlined"
            multiline
            numberOfLines={2}
            style={[styles.input, { minHeight: 60 }]}
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setMealDialogVisible(false)}>İptal</Button>
          <Button onPress={saveMeal}>Ekle</Button>
        </Dialog.Actions>
      </Dialog>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.palette.background.default,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl * 2,
  },
  emptyCard: {
    borderRadius: theme.shape.borderRadius.md,
    ...theme.shadows.sm,
  },
  emptyContent: {
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  emptyText: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.palette.text.secondary,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: theme.typography.fontSize.md,
    color: theme.palette.text.secondary,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  planCard: {
    marginBottom: theme.spacing.md,
    borderRadius: theme.shape.borderRadius.md,
    ...theme.shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.xs,
  },
  titleContainer: {
    flex: 1,
  },
  planTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.palette.text.primary,
  },
  dateChip: {
    marginTop: theme.spacing.xs,
    height: 28,
    alignSelf: 'flex-start',
  },
  actionButtons: {
    flexDirection: 'row',
  },
  description: {
    fontSize: theme.typography.fontSize.md,
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing.md,
  },
  mealCategory: {
    marginBottom: theme.spacing.md,
  },
  categoryName: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.palette.primary.main,
    borderBottomWidth: 1,
    borderBottomColor: theme.palette.grey[300],
    paddingBottom: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  mealItem: {
    marginBottom: theme.spacing.sm,
    paddingLeft: theme.spacing.sm,
  },
  mealName: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.palette.text.primary,
  },
  mealDetail: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.palette.text.secondary,
  },
  mealNotes: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.palette.text.secondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  emptyMealText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.palette.text.disabled,
    fontStyle: 'italic',
    paddingLeft: theme.spacing.sm,
  },
  notesContainer: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: theme.palette.grey[100],
    borderRadius: theme.shape.borderRadius.sm,
  },
  notesLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.palette.text.primary,
    marginBottom: 2,
  },
  notesText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.palette.text.secondary,
  },
  fab: {
    position: 'absolute',
    margin: theme.spacing.md,
    right: 0,
    bottom: 0,
    backgroundColor: theme.palette.primary.main,
  },
  dialog: {
    maxHeight: '90%',
  },
  dialogScrollArea: {
    paddingHorizontal: 0,
  },
  dialogContent: {
    padding: theme.spacing.md,
  },
  input: {
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.palette.background.paper,
  },
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    flex: 1,
    marginHorizontal: theme.spacing.xs / 2,
  },
  textArea: {
    minHeight: 80,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.palette.text.primary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  mealCategoryContainer: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.sm,
    backgroundColor: theme.palette.grey[50],
    borderRadius: theme.shape.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.palette.grey[200],
  },
  mealCategoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  mealCategoryTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.palette.text.primary,
  },
  mealItemEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.palette.grey[200],
  },
  mealItemContent: {
    flex: 1,
  },
  mealNameEdit: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.palette.text.primary,
  },
  mealDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  mealDetailEdit: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.palette.text.secondary,
    marginRight: theme.spacing.md,
  },
  deleteMealButton: {
    margin: 0,
  },
  emptyMealEditText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.palette.text.disabled,
    fontStyle: 'italic',
    padding: theme.spacing.sm,
    textAlign: 'center',
  },
});

export default DietPlansScreen; 