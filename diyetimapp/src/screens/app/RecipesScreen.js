import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Text } from 'react-native';
import { Searchbar, FAB, Card, Title, Paragraph, Button, Dialog, Portal, TextInput, Chip, Divider, List, IconButton, HelperText } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { post, get, put, del } from '../../api/config';
import { useFeedback } from '../../contexts/FeedbackContext';
import theme from '../../themes/theme';

const RecipesScreen = ({ navigation }) => {
  const { token } = useAuth();
  const { showSuccess, showError } = useFeedback();
  
  const [recipes, setRecipes] = useState([]);
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [visible, setVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentRecipe, setCurrentRecipe] = useState(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [ingredients, setIngredients] = useState([]);
  const [instructions, setInstructions] = useState('');
  const [servings, setServings] = useState('');
  const [preparationTime, setPreparationTime] = useState('');
  
  // Ingredient dialog state
  const [foodDialogVisible, setFoodDialogVisible] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('g');
  const [foodSearchQuery, setFoodSearchQuery] = useState('');
  const [editingIngredientIndex, setEditingIngredientIndex] = useState(-1);
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      const [recipesResponse, foodsResponse] = await Promise.all([
        get('/recipes', token),
        get('/foods', token)
      ]);
      
      setRecipes(recipesResponse);
      setFoods(foodsResponse);
    } catch (error) {
      showError('Verileri yüklerken hata oluştu');
      console.error('Data fetch error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const showDialog = (recipe = null) => {
    if (recipe) {
      setEditMode(true);
      setCurrentRecipe(recipe);
      setName(recipe.name);
      setDescription(recipe.description || '');
      setCategory(recipe.category || '');
      setIngredients(recipe.ingredients || []);
      setInstructions(recipe.instructions || '');
      setServings(recipe.servings?.toString() || '');
      setPreparationTime(recipe.preparationTime?.toString() || '');
    } else {
      setEditMode(false);
      setCurrentRecipe(null);
      setName('');
      setDescription('');
      setCategory('');
      setIngredients([]);
      setInstructions('');
      setServings('');
      setPreparationTime('');
    }
    setVisible(true);
  };
  
  const hideDialog = () => {
    setVisible(false);
  };
  
  const handleSave = async () => {
    try {
      const recipeData = {
        name,
        description,
        category,
        ingredients,
        instructions,
        servings: parseInt(servings) || 1,
        preparationTime: parseInt(preparationTime) || 0
      };
      
      if (editMode) {
        await put(`/recipes/${currentRecipe._id}`, recipeData, token);
        showSuccess('Tarif başarıyla güncellendi');
      } else {
        await post('/recipes', recipeData, token);
        showSuccess('Tarif başarıyla eklendi');
      }
      
      fetchData();
      hideDialog();
    } catch (error) {
      showError('İşlem sırasında bir hata oluştu');
      console.error('Recipe save error:', error);
    }
  };
  
  const handleDelete = async (recipeId) => {
    try {
      await del(`/recipes/${recipeId}`, null, token);
      showSuccess('Tarif başarıyla silindi');
      fetchData();
    } catch (error) {
      showError('Silme işlemi sırasında bir hata oluştu');
      console.error('Recipe delete error:', error);
    }
  };
  
  const showFoodDialog = (index = -1) => {
    if (index >= 0) {
      const ingredient = ingredients[index];
      setSelectedFood(foods.find(f => f._id === ingredient.foodId));
      setQuantity(ingredient.quantity.toString());
      setUnit(ingredient.unit);
      setEditingIngredientIndex(index);
    } else {
      setSelectedFood(null);
      setQuantity('');
      setUnit('g');
      setEditingIngredientIndex(-1);
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
  
  const handleAddIngredient = () => {
    if (!selectedFood || !quantity) {
      showError('Lütfen bir besin ve miktar belirtin');
      return;
    }
    
    const newIngredient = {
      foodId: selectedFood._id,
      foodName: selectedFood.name,
      quantity: parseFloat(quantity),
      unit,
      calories: Math.round(selectedFood.calories * parseFloat(quantity) / 100),
      protein: Math.round(selectedFood.protein * parseFloat(quantity) / 100 * 10) / 10,
      carbs: Math.round(selectedFood.carbs * parseFloat(quantity) / 100 * 10) / 10,
      fat: Math.round(selectedFood.fat * parseFloat(quantity) / 100 * 10) / 10
    };
    
    if (editingIngredientIndex >= 0) {
      const updatedIngredients = [...ingredients];
      updatedIngredients[editingIngredientIndex] = newIngredient;
      setIngredients(updatedIngredients);
    } else {
      setIngredients([...ingredients, newIngredient]);
    }
    
    hideFoodDialog();
  };
  
  const handleRemoveIngredient = (index) => {
    const updatedIngredients = [...ingredients];
    updatedIngredients.splice(index, 1);
    setIngredients(updatedIngredients);
  };
  
  const filteredRecipes = recipes
    .filter(recipe => recipe.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));
  
  const filteredFoods = foods
    .filter(food => food.name.toLowerCase().includes(foodSearchQuery.toLowerCase()))
    .slice(0, 20); // Limit the list to 20 items
  
  // Calculate total nutrition facts
  const calculateTotalNutrition = (ingredients) => {
    return ingredients.reduce(
      (total, ing) => {
        total.calories += ing.calories || 0;
        total.protein += ing.protein || 0;
        total.carbs += ing.carbs || 0;
        total.fat += ing.fat || 0;
        return total;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  };
  
  const renderRecipeItem = ({ item }) => {
    const totalNutrition = calculateTotalNutrition(item.ingredients || []);
    
    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Title>{item.name}</Title>
            <View style={styles.actionButtons}>
              <TouchableOpacity onPress={() => showDialog(item)} style={styles.iconButton}>
                <Ionicons name="pencil" size={20} color={theme.palette.primary.main} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.iconButton}>
                <Ionicons name="trash" size={20} color={theme.palette.error.main} />
              </TouchableOpacity>
            </View>
          </View>
          
          {item.category && <Chip style={styles.categoryChip}>{item.category}</Chip>}
          
          {item.description && (
            <Paragraph style={styles.description}>{item.description}</Paragraph>
          )}
          
          <View style={styles.infoRow}>
            {item.preparationTime > 0 && (
              <Chip icon="clock-outline" style={styles.infoChip}>{item.preparationTime} dk</Chip>
            )}
            {item.servings > 0 && (
              <Chip icon="account-outline" style={styles.infoChip}>{item.servings} kişilik</Chip>
            )}
            <Chip icon="food-variant" style={styles.infoChip}>{item.ingredients?.length || 0} malzeme</Chip>
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.nutritionInfo}>
            <View style={styles.nutritionItem}>
              <Paragraph style={styles.nutritionValue}>{Math.round(totalNutrition.calories)}</Paragraph>
              <Paragraph style={styles.nutritionLabel}>Kalori</Paragraph>
            </View>
            <View style={styles.nutritionItem}>
              <Paragraph style={styles.nutritionValue}>{totalNutrition.protein.toFixed(1)}g</Paragraph>
              <Paragraph style={styles.nutritionLabel}>Protein</Paragraph>
            </View>
            <View style={styles.nutritionItem}>
              <Paragraph style={styles.nutritionValue}>{totalNutrition.carbs.toFixed(1)}g</Paragraph>
              <Paragraph style={styles.nutritionLabel}>Karb</Paragraph>
            </View>
            <View style={styles.nutritionItem}>
              <Paragraph style={styles.nutritionValue}>{totalNutrition.fat.toFixed(1)}g</Paragraph>
              <Paragraph style={styles.nutritionLabel}>Yağ</Paragraph>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };
  
  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Tarif ara..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />
      
      {loading ? (
        <ActivityIndicator size="large" color={theme.palette.primary.main} style={styles.loader} />
      ) : (
        <FlatList
          data={filteredRecipes}
          keyExtractor={(item) => item._id}
          renderItem={renderRecipeItem}
          contentContainerStyle={styles.listContainer}
        />
      )}
      
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => showDialog()}
      />
      
      {/* Recipe Edit Dialog */}
      <Portal>
        <Dialog visible={visible} onDismiss={hideDialog} style={styles.dialog}>
          <Dialog.Title>{editMode ? 'Tarif Düzenle' : 'Yeni Tarif Ekle'}</Dialog.Title>
          <Dialog.ScrollArea style={styles.scrollArea}>
            <ScrollView>
              <View style={styles.dialogContent}>
                <TextInput
                  label="Tarif Adı"
                  value={name}
                  onChangeText={setName}
                  style={styles.input}
                />
                
                <TextInput
                  label="Açıklama"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={2}
                  style={styles.input}
                />
                
                <TextInput
                  label="Kategori"
                  value={category}
                  onChangeText={setCategory}
                  style={styles.input}
                />
                
                <View style={styles.inputRow}>
                  <TextInput
                    label="Hazırlama Süresi (dk)"
                    value={preparationTime}
                    onChangeText={setPreparationTime}
                    keyboardType="numeric"
                    style={[styles.input, { flex: 1, marginRight: 8 }]}
                  />
                  
                  <TextInput
                    label="Porsiyon Sayısı"
                    value={servings}
                    onChangeText={setServings}
                    keyboardType="numeric"
                    style={[styles.input, { flex: 1 }]}
                  />
                </View>
                
                <View style={styles.sectionHeader}>
                  <Title style={styles.sectionTitle}>Malzemeler</Title>
                  <Button 
                    mode="contained" 
                    onPress={() => showFoodDialog()} 
                    style={styles.addButton}
                  >
                    Ekle
                  </Button>
                </View>
                
                {ingredients.length === 0 ? (
                  <Text style={styles.emptyText}>Henüz malzeme eklenmedi</Text>
                ) : (
                  ingredients.map((ingredient, index) => (
                    <List.Item
                      key={`${ingredient.foodId}-${index}`}
                      title={ingredient.foodName}
                      description={`${ingredient.quantity} ${ingredient.unit} - ${ingredient.calories} kcal`}
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
                            onPress={() => handleRemoveIngredient(index)}
                          />
                        </View>
                      )}
                      style={styles.ingredientItem}
                    />
                  ))
                )}
                
                <TextInput
                  label="Hazırlanışı"
                  value={instructions}
                  onChangeText={setInstructions}
                  multiline
                  numberOfLines={4}
                  style={styles.input}
                />
              </View>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={hideDialog}>İptal</Button>
            <Button onPress={handleSave} disabled={!name || ingredients.length === 0}>Kaydet</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      {/* Food Selection Dialog */}
      <Portal>
        <Dialog visible={foodDialogVisible} onDismiss={hideFoodDialog}>
          <Dialog.Title>Malzeme Ekle</Dialog.Title>
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
                <Searchbar
                  placeholder="Besin ara..."
                  onChangeText={setFoodSearchQuery}
                  value={foodSearchQuery}
                  style={styles.foodSearchBar}
                />
                
                <ScrollView style={styles.foodList}>
                  {filteredFoods.map((food) => (
                    <TouchableOpacity
                      key={food._id}
                      style={styles.foodItem}
                      onPress={() => handleSelectFood(food)}
                    >
                      <Text style={styles.foodName}>{food.name}</Text>
                      <Text style={styles.foodCalories}>{food.calories} kcal/100g</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={hideFoodDialog}>İptal</Button>
            <Button 
              onPress={handleAddIngredient} 
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
  searchBar: {
    margin: 16,
    backgroundColor: theme.palette.background.paper,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100, // Extra padding at the bottom for FAB
  },
  card: {
    marginBottom: 16,
    backgroundColor: theme.palette.background.paper,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
  },
  iconButton: {
    padding: 8,
  },
  categoryChip: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: theme.palette.grey[200],
  },
  description: {
    marginTop: 12,
    color: theme.palette.text.secondary,
  },
  infoRow: {
    flexDirection: 'row',
    marginTop: 12,
    flexWrap: 'wrap',
  },
  infoChip: {
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: theme.palette.grey[100],
  },
  divider: {
    marginVertical: 12,
  },
  nutritionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  nutritionItem: {
    alignItems: 'center',
  },
  nutritionValue: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  nutritionLabel: {
    fontSize: 12,
    color: theme.palette.text.secondary,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: theme.palette.primary.main,
  },
  dialog: {
    maxHeight: '80%',
  },
  scrollArea: {
    maxHeight: 500,
  },
  dialogContent: {
    paddingVertical: 10,
  },
  input: {
    marginBottom: 16,
    backgroundColor: theme.palette.background.paper,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
  },
  addButton: {
    borderRadius: 20,
    height: 36,
  },
  emptyText: {
    textAlign: 'center',
    color: theme.palette.text.secondary,
    fontStyle: 'italic',
    marginVertical: 12,
  },
  ingredientItem: {
    padding: 0,
    paddingVertical: 4,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedFoodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  foodSearchBar: {
    marginBottom: 12,
    backgroundColor: theme.palette.background.paper,
  },
  foodList: {
    maxHeight: 250,
  },
  foodItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.palette.grey[200],
  },
  foodName: {
    fontSize: 16,
  },
  foodCalories: {
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
});

export default RecipesScreen; 