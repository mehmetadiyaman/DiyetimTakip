import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Text } from 'react-native';
import { Searchbar, FAB, Card, Title, Paragraph, Button, Dialog, TextInput, Chip, Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { post, get, put, del } from '../../api/config';
import { useFeedback } from '../../contexts/FeedbackContext';
import theme from '../../themes/theme';

const FoodItemsScreen = ({ navigation }) => {
  const { token } = useAuth();
  const { showSuccess, showError } = useFeedback();
  
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [visible, setVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentFood, setCurrentFood] = useState(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [category, setCategory] = useState('');
  
  // Filter options
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  
  useEffect(() => {
    fetchFoods();
  }, []);
  
  const fetchFoods = async () => {
    try {
      setLoading(true);
      const response = await get('/foods', token);
      setFoods(response);
      
      // Extract unique categories
      const uniqueCategories = [...new Set(response.map(food => food.category))];
      setCategories(uniqueCategories);
    } catch (error) {
      showError('Besin ögelerini yüklerken hata oluştu');
      console.error('Foods fetch error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const showDialog = (food = null) => {
    if (food) {
      setEditMode(true);
      setCurrentFood(food);
      setName(food.name);
      setCalories(food.calories.toString());
      setProtein(food.protein.toString());
      setCarbs(food.carbs.toString());
      setFat(food.fat.toString());
      setCategory(food.category);
    } else {
      setEditMode(false);
      setCurrentFood(null);
      setName('');
      setCalories('');
      setProtein('');
      setCarbs('');
      setFat('');
      setCategory('');
    }
    setVisible(true);
  };
  
  const hideDialog = () => {
    setVisible(false);
  };
  
  const handleSave = async () => {
    try {
      const foodData = {
        name,
        calories: parseFloat(calories),
        protein: parseFloat(protein),
        carbs: parseFloat(carbs),
        fat: parseFloat(fat),
        category
      };
      
      if (editMode) {
        await put(`/foods/${currentFood._id}`, foodData, token);
        showSuccess('Besin başarıyla güncellendi');
      } else {
        await post('/foods', foodData, token);
        showSuccess('Besin başarıyla eklendi');
      }
      
      fetchFoods();
      hideDialog();
    } catch (error) {
      showError('İşlem sırasında bir hata oluştu');
      console.error('Food save error:', error);
    }
  };
  
  const handleDelete = async (foodId) => {
    try {
      await del(`/foods/${foodId}`, null, token);
      showSuccess('Besin başarıyla silindi');
      fetchFoods();
    } catch (error) {
      showError('Silme işlemi sırasında bir hata oluştu');
      console.error('Food delete error:', error);
    }
  };
  
  const filteredFoods = foods
    .filter(food => {
      // Apply search filter
      const matchesSearch = food.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Apply category filter if selected
      const matchesCategory = selectedCategory ? food.category === selectedCategory : true;
      
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  
  const renderFoodItem = ({ item }) => (
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
        <Chip style={styles.categoryChip}>{item.category}</Chip>
        <Divider style={styles.divider} />
        <View style={styles.nutritionInfo}>
          <View style={styles.nutritionItem}>
            <Paragraph style={styles.nutritionValue}>{item.calories}</Paragraph>
            <Paragraph style={styles.nutritionLabel}>Kalori</Paragraph>
          </View>
          <View style={styles.nutritionItem}>
            <Paragraph style={styles.nutritionValue}>{item.protein}g</Paragraph>
            <Paragraph style={styles.nutritionLabel}>Protein</Paragraph>
          </View>
          <View style={styles.nutritionItem}>
            <Paragraph style={styles.nutritionValue}>{item.carbs}g</Paragraph>
            <Paragraph style={styles.nutritionLabel}>Karbonhidrat</Paragraph>
          </View>
          <View style={styles.nutritionItem}>
            <Paragraph style={styles.nutritionValue}>{item.fat}g</Paragraph>
            <Paragraph style={styles.nutritionLabel}>Yağ</Paragraph>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
  
  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Besin ara..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />
      
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity 
            onPress={() => setSelectedCategory(null)}
            style={[styles.filterChip, !selectedCategory && styles.activeFilterChip]}
          >
            <Text style={[styles.filterChipText, !selectedCategory && styles.activeFilterChipText]}>
              Tümü
            </Text>
          </TouchableOpacity>
          
          {categories.map((category) => (
            <TouchableOpacity 
              key={category}
              onPress={() => setSelectedCategory(category)}
              style={[styles.filterChip, selectedCategory === category && styles.activeFilterChip]}
            >
              <Text style={[styles.filterChipText, selectedCategory === category && styles.activeFilterChipText]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color={theme.palette.primary.main} style={styles.loader} />
      ) : (
        <FlatList
          data={filteredFoods}
          keyExtractor={(item) => item._id}
          renderItem={renderFoodItem}
          contentContainerStyle={styles.listContainer}
        />
      )}
      
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => showDialog()}
      />
      
      <Dialog visible={visible} onDismiss={hideDialog}>
        <Dialog.Title>{editMode ? 'Besin Düzenle' : 'Yeni Besin Ekle'}</Dialog.Title>
        <Dialog.Content>
          <TextInput
            label="Besin Adı"
            value={name}
            onChangeText={setName}
            style={styles.input}
          />
          <TextInput
            label="Kalori"
            value={calories}
            onChangeText={setCalories}
            keyboardType="numeric"
            style={styles.input}
          />
          <TextInput
            label="Protein (g)"
            value={protein}
            onChangeText={setProtein}
            keyboardType="numeric"
            style={styles.input}
          />
          <TextInput
            label="Karbonhidrat (g)"
            value={carbs}
            onChangeText={setCarbs}
            keyboardType="numeric"
            style={styles.input}
          />
          <TextInput
            label="Yağ (g)"
            value={fat}
            onChangeText={setFat}
            keyboardType="numeric"
            style={styles.input}
          />
          <TextInput
            label="Kategori"
            value={category}
            onChangeText={setCategory}
            style={styles.input}
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={hideDialog}>İptal</Button>
          <Button onPress={handleSave}>Kaydet</Button>
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
  searchBar: {
    margin: 16,
    backgroundColor: theme.palette.background.paper,
  },
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: theme.palette.background.paper,
    borderWidth: 1,
    borderColor: theme.palette.grey[300],
  },
  activeFilterChip: {
    backgroundColor: theme.palette.primary.main,
  },
  filterChipText: {
    color: theme.palette.text.primary,
  },
  activeFilterChipText: {
    color: 'white',
  },
  listContainer: {
    padding: 16,
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
  input: {
    marginBottom: 16,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default FoodItemsScreen; 