import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { 
  Searchbar, 
  FAB,
  Avatar,
  Card,
  IconButton,
  Menu,
  Divider,
  Dialog,
  Button,
  Chip,
  SegmentedButtons,
  Portal,
  Modal,
  RadioButton,
  List
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { apiRequest } from '../../api/config';
import theme from '../../themes/theme';

const ClientsScreen = ({ navigation }) => {
  const { token } = useAuth();
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [error, setError] = useState(null);
  
  // Filtreleme ve sıralama için yeni state'ler
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [sortOption, setSortOption] = useState('nameAsc');

  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  const loadClients = async () => {
    try {
      setError(null);
      const data = await apiRequest('GET', '/clients', null, token);
      
      // API'den gelen verileri kontrol et
      console.log('Yüklenen danışan sayısı:', data ? data.length : 0);
      
      // Null kontrolü yapalım
      if (!data) {
        setClients([]);
        setFilteredClients([]);
        console.log('API verileri boş döndü');
        return;
      }
      
      setClients(data);
      filterAndSortClients(data, activeFilter, sortOption, searchQuery);
    } catch (err) {
      console.error('Danışanları yükleme hatası:', err);
      setError('Danışanları yüklerken bir hata oluştu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  // Filtreleme, sıralama ve arama işlemlerini birleştiren fonksiyon
  const filterAndSortClients = (clientList, filter, sort, search) => {
    // Filtreleme
    let result = [...clientList];
    
    // Durum filtreleme
    if (filter !== 'all') {
      if (filter === 'active' || filter === 'inactive') {
        result = result.filter(client => client.status === filter);
      } else if (filter.startsWith('activity_')) {
        // Aktivite seviyesine göre filtreleme
        const activityLevel = filter.replace('activity_', '');
        result = result.filter(client => client.activityLevel === activityLevel);
      }
    }
    
    // Arama - isim, email, telefon veya referans kodu
    if (search.trim()) {
      result = result.filter(client => 
        (client.name && client.name.toLowerCase().includes(search.toLowerCase())) ||
        (client.email && client.email.toLowerCase().includes(search.toLowerCase())) ||
        (client.phone && client.phone.includes(search)) ||
        (client.referenceCode && client.referenceCode.toLowerCase().includes(search.toLowerCase()))
      );
    }
    
    // Sıralama
    switch (sort) {
      case 'nameAsc':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'nameDesc':
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'dateAsc':
        result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case 'dateDesc':
        result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'weightLoss':
        result.sort((a, b) => {
          const aLoss = a.startingWeight && a.currentWeight ? a.startingWeight - a.currentWeight : 0;
          const bLoss = b.startingWeight && b.currentWeight ? b.startingWeight - b.currentWeight : 0;
          return bLoss - aLoss; // Yüksekten düşüğe
        });
        break;
      case 'targetCloseness':
        // Hedef kiloya yakınlığa göre sıralama
        result.sort((a, b) => {
          if (!a.currentWeight || !a.targetWeight) return 1;
          if (!b.currentWeight || !b.targetWeight) return -1;
          
          const aDistance = Math.abs(a.currentWeight - a.targetWeight);
          const bDistance = Math.abs(b.currentWeight - b.targetWeight);
          return aDistance - bDistance; // Küçükten büyüğe (daha yakın olanlar üstte)
        });
        break;
    }
    
    setFilteredClients(result);
  };

  const onRefresh = () => {
    console.log('Yenileniyor...');
    setRefreshing(true);
    setTimeout(() => {
      loadClients();
    }, 100);
  };

  // Arama değişikliğinde çağrılacak
  const handleSearch = (query) => {
    setSearchQuery(query);
    filterAndSortClients(clients, activeFilter, sortOption, query);
  };

  // Filtreleme değişikliğinde çağrılacak
  const handleFilterChange = (value) => {
    setActiveFilter(value);
    filterAndSortClients(clients, value, sortOption, searchQuery);
  };

  // Sıralama değişikliğinde çağrılacak
  const handleSortChange = (value) => {
    setSortOption(value);
    filterAndSortClients(clients, activeFilter, value, searchQuery);
    setSortModalVisible(false);
  };

  const handleClientPress = (client) => {
    navigation.navigate('ClientDetails', { 
      clientId: client._id,
      clientName: client.name
    });
  };

  const showMenu = (client, event) => {
    const { nativeEvent } = event;
    setMenuPosition({
      x: nativeEvent.pageX - 10,
      y: nativeEvent.pageY - 10
    });
    setSelectedClient(client);
    setMenuVisible(true);
  };

  const hideMenu = () => {
    setMenuVisible(false);
  };

  const handleEditClient = () => {
    hideMenu();
    navigation.navigate('ClientDetails', { 
      clientId: selectedClient._id,
      clientName: selectedClient.name,
      isEditing: true
    });
  };

  const handleViewMeasurements = () => {
    hideMenu();
    navigation.navigate('Measurements', { 
      clientId: selectedClient._id,
      clientName: selectedClient.name
    });
  };

  const handleViewDietPlans = () => {
    hideMenu();
    navigation.navigate('DietPlans', { 
      clientId: selectedClient._id,
      clientName: selectedClient.name
    });
  };

  const confirmDelete = () => {
    hideMenu();
    setDeleteDialogVisible(true);
  };

  const handleDeleteClient = async () => {
    try {
      setLoading(true);
      await apiRequest('DELETE', `/clients/${selectedClient._id}`, null, token);
      
      setDeleteDialogVisible(false);
      const updatedClients = clients.filter(c => c._id !== selectedClient._id);
      setClients(updatedClients);
      filterAndSortClients(updatedClients, activeFilter, sortOption, searchQuery);
      
      Alert.alert('Başarılı', 'Danışan başarıyla silindi');
    } catch (err) {
      console.error('Danışan silme hatası:', err);
      Alert.alert('Hata', 'Danışan silinirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Durum çipi rengi belirleme
  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return { bg: '#E8F5E9', text: '#4CAF50' };
      case 'inactive':
        return { bg: '#FFEBEE', text: '#F44336' };
      case 'pending':
        return { bg: '#FFF8E1', text: '#FFC107' };
      default:
        return { bg: '#E0E0E0', text: '#757575' };
    }
  };

  const renderItem = ({ item }) => (
    <Card style={styles.clientCard}>
      <TouchableOpacity onPress={() => handleClientPress(item)}>
        <Card.Content style={styles.cardContent}>
          <View style={styles.clientInfo}>
            <Avatar.Image 
              size={48} 
              source={item.profilePicture ? { uri: item.profilePicture } : require('../../../assets/images/icon.png')} 
              style={styles.clientAvatar}
            />
            <View style={styles.clientDetails}>
              <View style={styles.nameRow}>
                <Text style={styles.clientName}>{item.name}</Text>
                {item.status && (
                  <View style={[
                    styles.statusBadge, 
                    { 
                      backgroundColor: getStatusColor(item.status).bg,
                      borderWidth: 1,
                      borderColor: getStatusColor(item.status).border
                    }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      { color: getStatusColor(item.status).text }
                    ]}>
                      {item.status === 'active' ? 'Aktif' : 
                       item.status === 'inactive' ? 'Pasif' : 
                       item.status === 'pending' ? 'Bekliyor' : 'Bilinmiyor'}
                    </Text>
                  </View>
                )}
                {item.referenceCode && (
                  <View style={styles.referenceCodeBadge}>
                    <Text style={styles.referenceCodeText}>#{item.referenceCode}</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.contactRow}>
                <Text style={styles.clientEmail}>{item.email || 'E-posta yok'}</Text>
                {item.phone && (
                  <Text style={styles.clientPhone}>{item.phone}</Text>
                )}
              </View>
              
              <View style={styles.clientStats}>
                <Text style={styles.clientStatText}>
                  {item.gender === 'male' ? 'Erkek' : 'Kadın'}{item.height ? `, ${item.height} cm` : ''}
                  {item.birthDate ? `, ${new Date(item.birthDate).getFullYear()}` : ''}
                </Text>
                {item.startingWeight && (
                  <Text style={styles.clientStatText}>
                    {item.startingWeight} kg {item.targetWeight ? `(Hedef: ${item.targetWeight} kg)` : ''}
                  </Text>
                )}
                {item.currentWeight && item.startingWeight && (
                  <Text style={[
                    styles.clientStatText, 
                    item.currentWeight < item.startingWeight ? styles.positiveChange : styles.negativeChange
                  ]}>
                    {item.currentWeight < item.startingWeight ? '↓' : '↑'} {Math.abs(item.startingWeight - item.currentWeight).toFixed(1)} kg
                  </Text>
                )}
                {item.activityLevel && (
                  <Text style={[styles.clientStatText, styles.activityBadge]}>
                    {item.activityLevel === 'low' ? 'Az Aktif' : 
                     item.activityLevel === 'medium' ? 'Orta Aktif' : 
                     item.activityLevel === 'high' ? 'Çok Aktif' : 
                     item.activityLevel}
                  </Text>
                )}
              </View>
            </View>
          </View>
          <IconButton
            icon="dots-vertical"
            size={18}
            style={styles.menuButton}
            onPress={(e) => showMenu(item, e)}
          />
        </Card.Content>
      </TouchableOpacity>
    </Card>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4caf50" />
        <Text style={styles.loadingText}>Danışanlar yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Danışan Ara..."
          onChangeText={handleSearch}
          value={searchQuery}
          style={styles.searchBar}
          iconColor="#4caf50"
        />
      </View>
      
      <View style={styles.filterBarContainer}>
        <View style={styles.filterButtonsContainer}>
          <TouchableOpacity 
            style={[
              styles.filterButton, 
              activeFilter === 'all' && styles.activeFilterButton
            ]}
            onPress={() => handleFilterChange('all')}
          >
            <Ionicons 
              name="people" 
              size={16} 
              color={activeFilter === 'all' ? 'white' : '#757575'} 
              style={{ marginRight: 4 }}
            />
            <Text style={[
              styles.filterButtonText,
              activeFilter === 'all' && styles.activeFilterButtonText
            ]}>Tümü</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.filterButton, 
              activeFilter === 'active' && styles.activeFilterButton
            ]}
            onPress={() => handleFilterChange('active')}
          >
            <Ionicons 
              name="checkmark-circle" 
              size={16} 
              color={activeFilter === 'active' ? 'white' : '#4CAF50'} 
              style={{ marginRight: 4 }}
            />
            <Text style={[
              styles.filterButtonText,
              activeFilter === 'active' && styles.activeFilterButtonText
            ]}>Aktif</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.filterButton, 
              activeFilter === 'inactive' && styles.activeFilterButton
            ]}
            onPress={() => handleFilterChange('inactive')}
          >
            <Ionicons 
              name="close-circle" 
              size={16} 
              color={activeFilter === 'inactive' ? 'white' : '#F44336'} 
              style={{ marginRight: 4 }}
            />
            <Text style={[
              styles.filterButtonText,
              activeFilter === 'inactive' && styles.activeFilterButtonText
            ]}>Pasif</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={styles.sortButton} 
          onPress={() => setSortModalVisible(true)}
        >
          <Ionicons name="funnel-outline" size={16} color="#4caf50" />
          <Text style={styles.sortButtonText}>Sırala</Text>
        </TouchableOpacity>
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : filteredClients.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people" size={60} color="#e0e0e0" />
          <Text style={styles.emptyText}>
            {searchQuery || activeFilter !== 'all' ? 'Aramanızla eşleşen danışan bulunamadı' : 'Henüz danışan bulunmuyor'}
          </Text>
        </View>
      ) : (
        <FlatList
          style={styles.flatList}
          data={filteredClients}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              colors={['#4caf50']} 
              tintColor="#4caf50"
            />
          }
        />
      )}

      <FAB
        style={styles.fab}
        icon="plus"
        color="#fff"
        onPress={() => navigation.navigate('ClientDetails', { isCreating: true })}
      />

      <Menu
        visible={menuVisible}
        onDismiss={hideMenu}
        anchor={menuPosition}
        contentStyle={styles.menuContent}
      >
        <Menu.Item 
          onPress={handleEditClient} 
          title="Düzenle" 
          leadingIcon="pencil" 
        />
        <Menu.Item 
          onPress={handleViewMeasurements} 
          title="Ölçümleri Görüntüle" 
          leadingIcon="ruler" 
        />
        <Menu.Item 
          onPress={handleViewDietPlans} 
          title="Diyet Planları" 
          leadingIcon="nutrition" 
        />
        <Divider />
        <Menu.Item 
          onPress={confirmDelete} 
          title="Sil" 
          leadingIcon="delete" 
          titleStyle={{ color: '#f44336' }}
        />
      </Menu>

      <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
        <Dialog.Title>Danışanı Sil</Dialog.Title>
        <Dialog.Content>
          <Text>
            {selectedClient?.name} adlı danışanı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setDeleteDialogVisible(false)}>İptal</Button>
          <Button onPress={handleDeleteClient} textColor="#f44336">Sil</Button>
        </Dialog.Actions>
      </Dialog>
      
      <Portal>
        <Modal 
          visible={sortModalVisible} 
          onDismiss={() => setSortModalVisible(false)}
          contentContainerStyle={styles.modalContent}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sıralama Seçenekleri</Text>
            <IconButton 
              icon="close" 
              size={20} 
              onPress={() => setSortModalVisible(false)} 
            />
          </View>
          <Divider />
          <RadioButton.Group onValueChange={handleSortChange} value={sortOption}>
            <List.Item
              title="İsim (A-Z)"
              titleStyle={styles.modalListItem}
              left={() => <RadioButton value="nameAsc" color={theme.palette.primary.main} />}
              style={styles.modalListItemContainer}
            />
            <List.Item
              title="İsim (Z-A)"
              titleStyle={styles.modalListItem}
              left={() => <RadioButton value="nameDesc" color={theme.palette.primary.main} />}
              style={styles.modalListItemContainer}
            />
            <List.Item
              title="Tarih (Eskiden Yeniye)"
              titleStyle={styles.modalListItem}
              left={() => <RadioButton value="dateAsc" color={theme.palette.primary.main} />}
              style={styles.modalListItemContainer}
            />
            <List.Item
              title="Tarih (Yeniden Eskiye)"
              titleStyle={styles.modalListItem}
              left={() => <RadioButton value="dateDesc" color={theme.palette.primary.main} />}
              style={styles.modalListItemContainer}
            />
            <List.Item
              title="Kilo Kaybı (En Yüksek)"
              titleStyle={styles.modalListItem}
              left={() => <RadioButton value="weightLoss" color={theme.palette.primary.main} />}
              style={styles.modalListItemContainer}
            />
            <List.Item
              title="Hedefe Yakınlık"
              titleStyle={styles.modalListItem}
              left={() => <RadioButton value="targetCloseness" color={theme.palette.primary.main} />}
              style={styles.modalListItemContainer}
            />
          </RadioButton.Group>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  flatList: {
    flex: 1,
    width: '100%',
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
  errorText: {
    color: '#f44336',
    textAlign: 'center',
    margin: 20,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#81c784',
    paddingBottom: 16,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchBar: {
    elevation: 1,
    borderRadius: 10,
    height: 42,
    backgroundColor: 'white',
    shadowColor: 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  filterBarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 10,
    marginTop: 10,
    marginBottom: 5,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  filterButtonsContainer: {
    flexDirection: 'row',
    flex: 1,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 6,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
    minWidth: 80,
    justifyContent: 'center',
  },
  activeFilterButton: {
    backgroundColor: '#4caf50',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#757575',
  },
  activeFilterButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    elevation: 1,
  },
  sortButtonText: {
    color: '#4caf50',
    fontWeight: '500',
    fontSize: 14,
    marginLeft: 6,
  },
  listContainer: {
    paddingTop: 6,
    paddingBottom: 75,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#9e9e9e',
    marginTop: 10,
  },
  clientCard: {
    marginVertical: 6,
    marginHorizontal: 10,
    borderRadius: 10,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
    backgroundColor: 'white',
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    paddingRight: 4,
  },
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  clientAvatar: {
    backgroundColor: '#e8f5e9',
  },
  clientDetails: {
    marginLeft: 12,
    flex: 1,
    paddingRight: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  clientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  clientEmail: {
    fontSize: 13,
    color: '#757575',
    marginRight: 10,
  },
  clientPhone: {
    fontSize: 13,
    color: '#757575',
  },
  referenceCodeBadge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
    borderWidth: 1,
    borderColor: '#bbdefb',
  },
  referenceCodeText: {
    fontSize: 10,
    color: '#1976d2',
    fontWeight: '600',
  },
  activityBadge: {
    backgroundColor: '#e8f5e9',
    color: '#388e3c',
  },
  clientStats: {
    flexDirection: 'row',
    marginTop: 3,
    flexWrap: 'wrap',
  },
  clientStatText: {
    fontSize: 11,
    color: '#616161',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 4,
    marginTop: 2,
  },
  positiveChange: {
    backgroundColor: '#E8F5E9',
    color: '#2E7D32',
    fontWeight: 'bold',
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  negativeChange: {
    backgroundColor: '#FFEBEE',
    color: '#C62828',
    fontWeight: 'bold',
    borderWidth: 1,
    borderColor: '#EF9A9A',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#4caf50',
  },
  menuContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    elevation: 4,
  },
  menuButton: {
    margin: 0,
  },
  modalContent: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    padding: 0,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  modalListItemContainer: {
    paddingVertical: 2,
    marginVertical: 0,
  },
  modalListItem: {
    fontSize: 14,
  },
});

export default ClientsScreen;