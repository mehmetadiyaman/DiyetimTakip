import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Text, ActivityIndicator } from 'react-native';
import { Card, Title, Paragraph, Button, FAB, Dialog, Portal, TextInput, Divider, List, IconButton, Chip, SegmentedButtons } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { useAuth } from '../../hooks/useAuth';
import { post, get, put, del } from '../../api/config';
import { useFeedback } from '../../contexts/FeedbackContext';
import theme from '../../themes/theme';

const MealPlannerScreen = ({ navigation, route }) => {
  const { token, user } = useAuth();
  const { showSuccess, showError } = useFeedback();
  
  // Client info if in dietitian mode
  const clientId = route.params?.clientId;
  const clientName = route.params?.clientName;
  
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [markedDates, setMarkedDates] = useState({});
  const [mealPlan, setMealPlan] = useState(null);
  const [mealLogs, setMealLogs] = useState([]);
  const [waterLogs, setWaterLogs] = useState([]);
  
  // Dialog states
  const [addMealVisible, setAddMealVisible] = useState(false);
  const [editMealVisible, setEditMealVisible] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [selectedMealType, setSelectedMealType] = useState('breakfast');
  
  // Edit meal states
  const [editingMealLog, setEditingMealLog] = useState(null);
  const [mealName, setMealName] = useState('');
  const [mealFoods, setMealFoods] = useState([]);
  
  // Food selection states
  const [foodDialogVisible, setFoodDialogVisible] = useState(false);
  const [foods, setFoods] = useState([]);
  const [foodSearchQuery, setFoodSearchQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('g');
  const [editingFoodIndex, setEditingFoodIndex] = useState(-1);
  
  // Water tracking
  const [waterAmount, setWaterAmount] = useState(0);
  
  const mealTypes = [
    { value: 'breakfast', label: 'Kahvaltı' },
    { value: 'lunch', label: 'Öğle Yemeği' },
    { value: 'dinner', label: 'Akşam Yemeği' },
    { value: 'snack', label: 'Ara Öğün' }
  ];

  useEffect(() => {
    fetchMealPlanData();
  }, [selectedDate]);
  
  useEffect(() => {
    fetchFoods();
  }, []);
  
  const fetchFoods = async () => {
    try {
      const response = await get('/foods', token);
      setFoods(response);
    } catch (error) {
      showError('Besinleri yüklerken hata oluştu');
      console.error('Foods fetch error:', error);
    }
  };
  
  const fetchMealPlanData = async () => {
    try {
      setLoading(true);
      
      const endpoint = clientId 
        ? `/meal-plans/client/${clientId}/date/${selectedDate}`
        : `/meal-plans/user/date/${selectedDate}`;
      
      const [mealPlanResponse, mealLogsResponse, waterLogsResponse, markedDatesResponse] = await Promise.all([
        get(endpoint, token),
        get(`/meal-logs/date/${selectedDate}${clientId ? `?clientId=${clientId}` : ''}`, token),
        get(`/water-logs/date/${selectedDate}${clientId ? `?clientId=${clientId}` : ''}`, token),
        get(`/meal-logs/dates${clientId ? `?clientId=${clientId}` : ''}`, token)
      ]);
      
      setMealPlan(mealPlanResponse);
      setMealLogs(mealLogsResponse);
      setWaterLogs(waterLogsResponse);
      
      // Process water amount
      const totalWater = waterLogsResponse.reduce((sum, log) => sum + log.amount, 0);
      setWaterAmount(totalWater);
      
      // Process marked dates for calendar
      const marks = {};
      markedDatesResponse.forEach(date => {
        marks[date] = { marked: true, dotColor: theme.palette.primary.main };
      });
      
      // Mark selected date
      marks[selectedDate] = {
        ...(marks[selectedDate] || {}),
        selected: true,
        selectedColor: theme.palette.primary.main,
      };
      
      setMarkedDates(marks);
    } catch (error) {
      showError('Verileri yüklerken hata oluştu');
      console.error('Meal plan data fetch error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const showAddMealDialog = (mealType) => {
    setSelectedMealType(mealType);
    setMealName('');
    setMealFoods([]);
    setAddMealVisible(true);
  };
  
  const hideAddMealDialog = () => {
    setAddMealVisible(false);
  };
  
  const showEditMealDialog = (mealLog) => {
    setEditingMealLog(mealLog);
    setMealName(mealLog.name);
    setMealFoods(mealLog.foods || []);
    setEditMealVisible(true);
  };
  
  const hideEditMealDialog = () => {
    setEditMealVisible(false);
    setEditingMealLog(null);
  };
  
  const showFoodDialog = (index = -1) => {
    if (index >= 0) {
      const food = mealFoods[index];
      setSelectedFood(foods.find(f => f._id === food.foodId));
      setQuantity(food.quantity.toString());
      setUnit(food.unit);
      setEditingFoodIndex(index);
    } else {
      setSelectedFood(null);
      setQuantity('');
      setUnit('g');
      setEditingFoodIndex(-1);
    }
    setFoodDialogVisible(true);
  };
  
  const hideFoodDialog = () => {
    setFoodDialogVisible(false);
    setFoodSearchQuery('');
  };
  
  const handleSelectFood = (food) => {
    setSelectedFood(food);
  };
  
  const handleAddFood = () => {
    if (!selectedFood || !quantity) {
      showError('Lütfen bir besin ve miktar belirtin');
      return;
    }
    
    const newFood = {
      foodId: selectedFood._id,
      foodName: selectedFood.name,
      quantity: parseFloat(quantity),
      unit,
      calories: Math.round(selectedFood.calories * parseFloat(quantity) / 100),
      protein: Math.round(selectedFood.protein * parseFloat(quantity) / 100 * 10) / 10,
      carbs: Math.round(selectedFood.carbs * parseFloat(quantity) / 100 * 10) / 10,
      fat: Math.round(selectedFood.fat * parseFloat(quantity) / 100 * 10) / 10
    };
    
    if (editingFoodIndex >= 0) {
      const updatedFoods = [...mealFoods];
      updatedFoods[editingFoodIndex] = newFood;
      setMealFoods(updatedFoods);
    } else {
      setMealFoods([...mealFoods, newFood]);
    }
    
    hideFoodDialog();
  };
  
  const handleRemoveFood = (index) => {
    const updatedFoods = [...mealFoods];
    updatedFoods.splice(index, 1);
    setMealFoods(updatedFoods);
  };
  
  const handleSaveMeal = async () => {
    try {
      if (!mealName || mealFoods.length === 0) {
        showError('Lütfen öğün adı ve en az bir besin ekleyin');
        return;
      }
      
      const mealLogData = {
        name: mealName,
        type: selectedMealType,
        date: selectedDate,
        foods: mealFoods,
        totalCalories: mealFoods.reduce((sum, food) => sum + food.calories, 0),
        totalProtein: mealFoods.reduce((sum, food) => sum + food.protein, 0),
        totalCarbs: mealFoods.reduce((sum, food) => sum + food.carbs, 0),
        totalFat: mealFoods.reduce((sum, food) => sum + food.fat, 0),
      };
      
      if (clientId) {
        mealLogData.clientId = clientId;
      }
      
      await post('/meal-logs', mealLogData, token);
      showSuccess('Öğün başarıyla eklendi');
      hideAddMealDialog();
      fetchMealPlanData();
    } catch (error) {
      showError('Öğün eklenirken bir hata oluştu');
      console.error('Add meal error:', error);
    }
  };
  
  const handleUpdateMeal = async () => {
    try {
      if (!mealName || mealFoods.length === 0) {
        showError('Lütfen öğün adı ve en az bir besin ekleyin');
        return;
      }
      
      const mealLogData = {
        name: mealName,
        foods: mealFoods,
        totalCalories: mealFoods.reduce((sum, food) => sum + food.calories, 0),
        totalProtein: mealFoods.reduce((sum, food) => sum + food.protein, 0),
        totalCarbs: mealFoods.reduce((sum, food) => sum + food.carbs, 0),
        totalFat: mealFoods.reduce((sum, food) => sum + food.fat, 0),
      };
      
      await put(`/meal-logs/${editingMealLog._id}`, mealLogData, token);
      showSuccess('Öğün başarıyla güncellendi');
      hideEditMealDialog();
      fetchMealPlanData();
    } catch (error) {
      showError('Öğün güncellenirken bir hata oluştu');
      console.error('Update meal error:', error);
    }
  };
  
  const handleDeleteMeal = async (mealLogId) => {
    try {
      await del(`/meal-logs/${mealLogId}`, null, token);
      showSuccess('Öğün başarıyla silindi');
      fetchMealPlanData();
    } catch (error) {
      showError('Öğün silinirken bir hata oluştu');
      console.error('Delete meal error:', error);
    }
  };
  
  const handleUpdateWater = async (amount) => {
    try {
      // Ensure water amount is between 0 and 10000ml
      if (amount < 0) amount = 0;
      if (amount > 10000) amount = 10000;
      
      setWaterAmount(amount);
      
      const waterLogData = {
        date: selectedDate,
        amount,
      };
      
      if (clientId) {
        waterLogData.clientId = clientId;
      }
      
      if (waterLogs.length > 0) {
        await put(`/water-logs/${waterLogs[0]._id}`, waterLogData, token);
      } else {
        await post('/water-logs', waterLogData, token);
      }
      
      // No need to show a toast for every water update
    } catch (error) {
      showError('Su miktarı güncellenirken bir hata oluştu');
      console.error('Update water error:', error);
    }
  };
  
  // Group meal logs by type
  const mealsByType = {
    breakfast: mealLogs.filter(meal => meal.type === 'breakfast'),
    lunch: mealLogs.filter(meal => meal.type === 'lunch'),
    dinner: mealLogs.filter(meal => meal.type === 'dinner'),
    snack: mealLogs.filter(meal => meal.type === 'snack'),
  };
  
  // Calculate total nutrition for the day
  const dailyTotals = mealLogs.reduce(
    (totals, meal) => {
      totals.calories += meal.totalCalories || 0;
      totals.protein += meal.totalProtein || 0;
      totals.carbs += meal.totalCarbs || 0;
      totals.fat += meal.totalFat || 0;
      return totals;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
  
  // Filter foods for search
  const filteredFoods = foods
    .filter(food => food.name.toLowerCase().includes(foodSearchQuery.toLowerCase()))
    .slice(0, 20); // Limit to 20 results
  
  return (
    <View style={styles.container}>
      {clientName && (
        <View style={styles.clientHeader}>
          <Text style={styles.clientName}>{clientName}</Text>
        </View>
      )}
      
      <View style={styles.navButtons}>
        <Button 
          mode="contained" 
          icon="food-apple" 
          onPress={() => navigation.navigate('FoodItems')}
          style={styles.navButton}
        >
          Besin Havuzu
        </Button>
        <Button 
          mode="contained" 
          icon="book" 
          onPress={() => navigation.navigate('Recipes')}
          style={styles.navButton}
        >
          Tarifler
        </Button>
      </View>
      
      <Calendar
        current={selectedDate}
        onDayPress={day => setSelectedDate(day.dateString)}
        markedDates={markedDates}
        theme={{
          selectedDayBackgroundColor: theme.palette.primary.main,
          todayTextColor: theme.palette.primary.main,
          arrowColor: theme.palette.primary.main,
        }}
        style={styles.calendar}
      />
      
      {loading ? (
        <ActivityIndicator size="large" color={theme.palette.primary.main} style={styles.loader} />
      ) : (
        <ScrollView style={styles.content}>
          {/* Daily Summary */}
          <Card style={styles.card}>
            <Card.Content>
              <Title>Günlük Özet</Title>
              <Divider style={styles.divider} />
              
              <View style={styles.nutritionSummary}>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>{Math.round(dailyTotals.calories)}</Text>
                  <Text style={styles.nutritionLabel}>Kalori</Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>{dailyTotals.protein.toFixed(1)}g</Text>
                  <Text style={styles.nutritionLabel}>Protein</Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>{dailyTotals.carbs.toFixed(1)}g</Text>
                  <Text style={styles.nutritionLabel}>Karb</Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>{dailyTotals.fat.toFixed(1)}g</Text>
                  <Text style={styles.nutritionLabel}>Yağ</Text>
                </View>
              </View>
            </Card.Content>
          </Card>
          
          {/* Water Tracking */}
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <Title>Su Takibi</Title>
                <Ionicons name="water" size={24} color={theme.palette.primary.main} />
              </View>
              <Divider style={styles.divider} />
              
              <Text style={styles.waterLabel}>Günlük su tüketimi: {waterAmount} ml</Text>
              
              <View style={styles.waterContainer}>
                <View style={styles.waterProgress}>
                  <View 
                    style={[
                      styles.waterFill, 
                      { width: `${Math.min(100, (waterAmount / 2500) * 100)}%` }
                    ]} 
                  />
                </View>
                
                <View style={styles.waterControls}>
                  <Button 
                    mode="contained" 
                    onPress={() => handleUpdateWater(waterAmount - 250)}
                    style={styles.waterButton}
                  >
                    -250ml
                  </Button>
                  <Button 
                    mode="contained" 
                    onPress={() => handleUpdateWater(waterAmount + 250)}
                    style={styles.waterButton}
                  >
                    +250ml
                  </Button>
                </View>
              </View>
            </Card.Content>
          </Card>
          
          {/* Meal Plan */}
          {mealTypes.map(mealType => (
            <Card key={mealType.value} style={styles.card}>
              <Card.Content>
                <View style={styles.mealHeader}>
                  <Title>{mealType.label}</Title>
                  <Button 
                    mode="contained" 
                    onPress={() => showAddMealDialog(mealType.value)}
                    icon="plus"
                  >
                    Ekle
                  </Button>
                </View>
                <Divider style={styles.divider} />
                
                {mealsByType[mealType.value].length === 0 ? (
                  <Text style={styles.emptyText}>Henüz öğün eklenmedi</Text>
                ) : (
                  mealsByType[mealType.value].map(meal => (
                    <Card key={meal._id} style={styles.mealCard}>
                      <Card.Content>
                        <View style={styles.mealCardHeader}>
                          <Title style={styles.mealTitle}>{meal.name}</Title>
                          <View style={styles.mealActions}>
                            <IconButton
                              icon="pencil"
                              size={20}
                              onPress={() => showEditMealDialog(meal)}
                            />
                            <IconButton
                              icon="delete"
                              size={20}
                              color={theme.palette.error.main}
                              onPress={() => handleDeleteMeal(meal._id)}
                            />
                          </View>
                        </View>
                        
                        <View style={styles.mealNutrition}>
                          <Chip icon="fire" style={styles.mealChip}>{meal.totalCalories} kcal</Chip>
                          <Chip icon="protein" style={styles.mealChip}>{meal.totalProtein.toFixed(1)}g protein</Chip>
                        </View>
                        
                        {meal.foods && meal.foods.map((food, index) => (
                          <View key={index} style={styles.foodItem}>
                            <Text style={styles.foodName}>{food.foodName}</Text>
                            <Text style={styles.foodDetails}>
                              {food.quantity} {food.unit} - {food.calories} kcal
                            </Text>
                          </View>
                        ))}
                      </Card.Content>
                    </Card>
                  ))
                )}
              </Card.Content>
            </Card>
          ))}
        </ScrollView>
      )}
      
      {/* Add Meal Dialog */}
      <Portal>
        <Dialog visible={addMealVisible} onDismiss={hideAddMealDialog} style={styles.dialog}>
          <Dialog.Title>Yeni Öğün Ekle</Dialog.Title>
          <Dialog.ScrollArea style={styles.scrollArea}>
            <ScrollView>
              <View style={styles.dialogContent}>
                <TextInput
                  label="Öğün Adı"
                  value={mealName}
                  onChangeText={setMealName}
                  style={styles.input}
                />
                
                <View style={styles.sectionHeader}>
                  <Title style={styles.sectionTitle}>Besinler</Title>
                  <Button 
                    mode="contained" 
                    onPress={() => showFoodDialog()} 
                    style={styles.addButton}
                  >
                    Ekle
                  </Button>
                </View>
                
                {mealFoods.length === 0 ? (
                  <Text style={styles.emptyText}>Henüz besin eklenmedi</Text>
                ) : (
                  mealFoods.map((food, index) => (
                    <List.Item
                      key={`${food.foodId}-${index}`}
                      title={food.foodName}
                      description={`${food.quantity} ${food.unit} - ${food.calories} kcal`}
                      left={props => <List.Icon {...props} icon="food" />}
                      right={props => (
                        <View style={styles.rowActions}>
                          <IconButton
                            icon="pencil"
                            size={20}
                            onPress={() => showFoodDialog(index)}
                          />
                          <IconButton
                            icon="delete"
                            size={20}
                            color={theme.palette.error.main}
                            onPress={() => handleRemoveFood(index)}
                          />
                        </View>
                      )}
                      style={styles.ingredientItem}
                    />
                  ))
                )}
                
                {mealFoods.length > 0 && (
                  <View style={styles.nutritionSummary}>
                    <Text style={styles.nutritionSummaryTitle}>Toplam:</Text>
                    <Text>
                      {mealFoods.reduce((sum, food) => sum + food.calories, 0)} kcal | 
                      {mealFoods.reduce((sum, food) => sum + food.protein, 0).toFixed(1)}g protein | 
                      {mealFoods.reduce((sum, food) => sum + food.carbs, 0).toFixed(1)}g karb | 
                      {mealFoods.reduce((sum, food) => sum + food.fat, 0).toFixed(1)}g yağ
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={hideAddMealDialog}>İptal</Button>
            <Button 
              onPress={handleSaveMeal} 
              disabled={!mealName || mealFoods.length === 0}
            >
              Kaydet
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      {/* Edit Meal Dialog */}
      <Portal>
        <Dialog visible={editMealVisible} onDismiss={hideEditMealDialog} style={styles.dialog}>
          <Dialog.Title>Öğün Düzenle</Dialog.Title>
          <Dialog.ScrollArea style={styles.scrollArea}>
            <ScrollView>
              <View style={styles.dialogContent}>
                <TextInput
                  label="Öğün Adı"
                  value={mealName}
                  onChangeText={setMealName}
                  style={styles.input}
                />
                
                <View style={styles.sectionHeader}>
                  <Title style={styles.sectionTitle}>Besinler</Title>
                  <Button 
                    mode="contained" 
                    onPress={() => showFoodDialog()} 
                    style={styles.addButton}
                  >
                    Ekle
                  </Button>
                </View>
                
                {mealFoods.length === 0 ? (
                  <Text style={styles.emptyText}>Henüz besin eklenmedi</Text>
                ) : (
                  mealFoods.map((food, index) => (
                    <List.Item
                      key={`${food.foodId}-${index}`}
                      title={food.foodName}
                      description={`${food.quantity} ${food.unit} - ${food.calories} kcal`}
                      left={props => <List.Icon {...props} icon="food" />}
                      right={props => (
                        <View style={styles.rowActions}>
                          <IconButton
                            icon="pencil"
                            size={20}
                            onPress={() => showFoodDialog(index)}
                          />
                          <IconButton
                            icon="delete"
                            size={20}
                            color={theme.palette.error.main}
                            onPress={() => handleRemoveFood(index)}
                          />
                        </View>
                      )}
                      style={styles.ingredientItem}
                    />
                  ))
                )}
                
                {mealFoods.length > 0 && (
                  <View style={styles.nutritionSummary}>
                    <Text style={styles.nutritionSummaryTitle}>Toplam:</Text>
                    <Text>
                      {mealFoods.reduce((sum, food) => sum + food.calories, 0)} kcal | 
                      {mealFoods.reduce((sum, food) => sum + food.protein, 0).toFixed(1)}g protein | 
                      {mealFoods.reduce((sum, food) => sum + food.carbs, 0).toFixed(1)}g karb | 
                      {mealFoods.reduce((sum, food) => sum + food.fat, 0).toFixed(1)}g yağ
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={hideEditMealDialog}>İptal</Button>
            <Button 
              onPress={handleUpdateMeal} 
              disabled={!mealName || mealFoods.length === 0}
            >
              Güncelle
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      {/* Food Selection Dialog */}
      <Portal>
        <Dialog visible={foodDialogVisible} onDismiss={hideFoodDialog}>
          <Dialog.Title>Besin Ekle</Dialog.Title>
          <Dialog.Content>
            {selectedFood ? (
              <>
                <View style={styles.selectedFoodContainer}>
                  <Title>{selectedFood.name}</Title>
                  <Button onPress={() => setSelectedFood(null)}>Değiştir</Button>
                </View>
                
                <View style={styles.inputRow}>
                  <TextInput
                    label="Miktar"
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="numeric"
                    style={[styles.input, { flex: 2, marginRight: 8 }]}
                  />
                  
                  <TextInput
                    label="Birim"
                    value={unit}
                    onChangeText={setUnit}
                    style={[styles.input, { flex: 1 }]}
                  />
                </View>
                
                {quantity && parseFloat(quantity) > 0 && selectedFood && (
                  <View style={styles.nutritionPreview}>
                    <Text style={styles.nutritionPreviewTitle}>Besin Değerleri:</Text>
                    <View style={styles.nutritionPreviewItems}>
                      <Text>Kalori: {Math.round(selectedFood.calories * parseFloat(quantity) / 100)} kcal</Text>
                      <Text>Protein: {(selectedFood.protein * parseFloat(quantity) / 100).toFixed(1)}g</Text>
                      <Text>Karb: {(selectedFood.carbs * parseFloat(quantity) / 100).toFixed(1)}g</Text>
                      <Text>Yağ: {(selectedFood.fat * parseFloat(quantity) / 100).toFixed(1)}g</Text>
                    </View>
                  </View>
                )}
              </>
            ) : (
              <>
                <TextInput
                  label="Besin Ara"
                  value={foodSearchQuery}
                  onChangeText={setFoodSearchQuery}
                  style={styles.input}
                />
                
                <ScrollView style={styles.foodList}>
                  {filteredFoods.map((food) => (
                    <TouchableOpacity
                      key={food._id}
                      style={styles.foodSearchItem}
                      onPress={() => handleSelectFood(food)}
                    >
                      <Text style={styles.foodSearchName}>{food.name}</Text>
                      <Text style={styles.foodSearchCalories}>{food.calories} kcal/100g</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={hideFoodDialog}>İptal</Button>
            <Button 
              onPress={handleAddFood} 
              disabled={!selectedFood || !quantity || parseFloat(quantity) <= 0}
            >
              Ekle
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.palette.background.default,
  },
  clientHeader: {
    padding: 16,
    backgroundColor: theme.palette.primary.main,
  },
  clientName: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  calendar: {
    marginBottom: 10,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
    backgroundColor: theme.palette.background.paper,
    elevation: 2,
  },
  divider: {
    marginVertical: 12,
  },
  nutritionSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nutritionItem: {
    alignItems: 'center',
  },
  nutritionValue: {
    fontWeight: 'bold',
    fontSize: 20,
  },
  nutritionLabel: {
    fontSize: 12,
    color: theme.palette.text.secondary,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  waterLabel: {
    marginBottom: 8,
  },
  waterContainer: {
    marginTop: 8,
  },
  waterProgress: {
    height: 20,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    marginBottom: 16,
    overflow: 'hidden',
  },
  waterFill: {
    height: '100%',
    backgroundColor: theme.palette.primary.main,
  },
  waterControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  waterButton: {
    borderRadius: 20,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontStyle: 'italic',
    color: theme.palette.text.secondary,
    marginVertical: 12,
  },
  mealCard: {
    marginBottom: 8,
    elevation: 1,
  },
  mealCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealTitle: {
    fontSize: 16,
  },
  mealActions: {
    flexDirection: 'row',
  },
  mealNutrition: {
    flexDirection: 'row',
    marginTop: 4,
    marginBottom: 8,
  },
  mealChip: {
    marginRight: 8,
    backgroundColor: theme.palette.grey[100],
  },
  foodItem: {
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: theme.palette.grey[200],
  },
  foodName: {
    fontSize: 14,
    fontWeight: '500',
  },
  foodDetails: {
    fontSize: 12,
    color: theme.palette.text.secondary,
  },
  dialog: {
    maxHeight: '80%',
  },
  scrollArea: {
    maxHeight: 400,
  },
  dialogContent: {
    paddingVertical: 10,
  },
  input: {
    marginBottom: 16,
    backgroundColor: theme.palette.background.paper,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
  },
  addButton: {
    borderRadius: 20,
    height: 36,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nutritionSummary: {
    padding: 12,
    backgroundColor: theme.palette.grey[100],
    borderRadius: 8,
    marginTop: 16,
  },
  nutritionSummaryTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  selectedFoodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  foodList: {
    maxHeight: 250,
  },
  foodSearchItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.palette.grey[200],
  },
  foodSearchName: {
    fontSize: 16,
  },
  foodSearchCalories: {
    fontSize: 14,
    color: theme.palette.text.secondary,
  },
  nutritionPreview: {
    marginTop: 16,
    backgroundColor: theme.palette.grey[100],
    padding: 12,
    borderRadius: 8,
  },
  nutritionPreviewTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  nutritionPreviewItems: {
    flexDirection: 'column',
    gap: 4,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    backgroundColor: theme.palette.background.paper,
    borderBottomWidth: 1,
    borderBottomColor: theme.palette.grey[300],
  },
  navButton: {
    borderRadius: 20,
    flex: 1,
    marginHorizontal: 8,
  },
});

export default MealPlannerScreen; 