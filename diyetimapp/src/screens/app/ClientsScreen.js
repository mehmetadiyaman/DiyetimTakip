import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  Image,
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
  Portal,
  Button,
  TextInput
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { apiRequest } from '../../api/config';

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

  const loadClients = async () => {
    try {
      setError(null);
      const data = await apiRequest('GET', '/clients', null, token);
      setClients(data || []);
      setFilteredClients(data || []);
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

  const onRefresh = () => {
    setRefreshing(true);
    loadClients();
  };

  const filterClients = (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredClients(clients);
      return;
    }
    
    const filtered = clients.filter(client => 
      client.name.toLowerCase().includes(query.toLowerCase()) ||
      (client.email && client.email.toLowerCase().includes(query.toLowerCase()))
    );
    setFilteredClients(filtered);
  };

  const handleClientPress = (client) => {
    navigation.navigate('ClientDetails', { 
      clientId: client._id,
      clientName: client.name
    });
  };

  const showMenu = (client) => {
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
      setClients(clients.filter(c => c._id !== selectedClient._id));
      setFilteredClients(filteredClients.filter(c => c._id !== selectedClient._id));
      
      Alert.alert('Başarılı', 'Danışan başarıyla silindi');
    } catch (err) {
      console.error('Danışan silme hatası:', err);
      Alert.alert('Hata', 'Danışan silinirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <Card style={styles.clientCard}>
      <TouchableOpacity onPress={() => handleClientPress(item)}>
        <Card.Content style={styles.cardContent}>
          <View style={styles.clientInfo}>
            <Avatar.Image 
              size={50} 
              source={item.profilePicture ? { uri: item.profilePicture } : require('../../../assets/images/icon.png')} 
            />
            <View style={styles.clientDetails}>
              <Text style={styles.clientName}>{item.name}</Text>
              <Text style={styles.clientEmail}>{item.email || 'E-posta yok'}</Text>
              <View style={styles.clientStats}>
                <Text style={styles.clientStatText}>
                  {item.gender === 'male' ? 'Erkek' : 'Kadın'}{item.height ? `, ${item.height} cm` : ''}
                </Text>
                {item.startingWeight && (
                  <Text style={styles.clientStatText}>
                    {item.startingWeight} kg → {item.targetWeight || '?'} kg
                  </Text>
                )}
              </View>
            </View>
          </View>
          <IconButton
            icon="dots-vertical"
            size={20}
            onPress={() => showMenu(item)}
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
      <Searchbar
        placeholder="Danışan Ara..."
        onChangeText={filterClients}
        value={searchQuery}
        style={styles.searchBar}
        iconColor="#4caf50"
      />

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : filteredClients.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people" size={60} color="#e0e0e0" />
          <Text style={styles.emptyText}>
            {searchQuery ? 'Aramanızla eşleşen danışan bulunamadı' : 'Henüz danışan bulunmuyor'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredClients}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              colors={['#4caf50']} 
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

      <Portal>
        <Menu
          visible={menuVisible}
          onDismiss={hideMenu}
          anchor={{ x: 0, y: 0 }}
          style={styles.menu}
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
            leadingIcon="food-apple" 
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
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  searchBar: {
    margin: 16,
    elevation: 4,
    borderRadius: 10,
    backgroundColor: 'white',
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
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
    marginBottom: 10,
    borderRadius: 10,
    elevation: 3,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  clientDetails: {
    marginLeft: 10,
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  clientEmail: {
    fontSize: 14,
    color: '#757575',
    marginTop: 2,
  },
  clientStats: {
    flexDirection: 'row',
    marginTop: 4,
    flexWrap: 'wrap',
  },
  clientStatText: {
    fontSize: 12,
    color: '#616161',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 5,
    marginTop: 2,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#4caf50',
  },
  menu: {
    position: 'absolute',
    right: 20,
    top: 20,
  },
});

export default ClientsScreen; 