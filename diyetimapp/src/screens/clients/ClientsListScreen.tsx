import React, { useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Searchbar, FAB, Avatar, Text, List, Divider, Chip, IconButton, Menu } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ClientsStackParamList, Client } from '../../types';
import { clientsAPI } from '../../api/clientsAPI';
import LoadingIndicator from '../../components/LoadingIndicator';
import ErrorMessage from '../../components/ErrorMessage';

type ClientsListScreenNavigationProp = StackNavigationProp<ClientsStackParamList, 'ClientsList'>;

const ClientsListScreen = () => {
  const navigation = useNavigation<ClientsListScreenNavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<boolean | null>(null);

  // Danışanları çek
  const { 
    data: clients, 
    isLoading, 
    error,
    refetch
  } = useQuery({
    queryKey: ['clients'],
    queryFn: clientsAPI.getClients,
  });

  const handleRefresh = () => {
    refetch();
  };

  // Arama fonksiyonu
  const filteredClients = clients?.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          client.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Aktif/pasif filtresi
    const matchesActiveFilter = activeFilter === null ? true : client.active === activeFilter;
    
    return matchesSearch && matchesActiveFilter;
  });

  // Yeni danışan ekleme sayfasına git
  const handleAddClient = () => {
    navigation.navigate('AddClient');
  };

  // Danışan detay sayfasına git
  const handleClientPress = (clientId: string) => {
    navigation.navigate('ClientDetails', { clientId });
  };

  // Filtre değişikliği
  const handleFilterChange = (value: boolean | null) => {
    setActiveFilter(value);
  };

  if (isLoading && !clients) {
    return <LoadingIndicator fullScreen message="Danışanlar yükleniyor..." />;
  }

  if (error) {
    return <ErrorMessage error="Danışanlar yüklenirken bir hata oluştu" onRetry={handleRefresh} />;
  }

  const renderClientItem = ({ item }: { item: Client }) => (
    <TouchableOpacity onPress={() => handleClientPress(item._id)}>
      <List.Item
        title={item.name}
        description={item.email}
        left={props => 
          item.avatar ? (
            <Avatar.Image 
              {...props} 
              source={{ uri: item.avatar }} 
              size={50} 
            />
          ) : (
            <Avatar.Icon 
              {...props} 
              icon="account" 
              size={50}
              color="#fff"
              style={{ backgroundColor: item.active ? '#4CAF50' : '#9E9E9E' }}
            />
          )
        }
        right={props => (
          <View style={styles.rightContent}>
            <Chip 
              mode="outlined"
              style={[
                styles.statusChip, 
                { borderColor: item.active ? '#4CAF50' : '#9E9E9E' }
              ]}
            >
              <Text style={{ color: item.active ? '#4CAF50' : '#9E9E9E' }}>
                {item.active ? 'Aktif' : 'Pasif'}
              </Text>
            </Chip>
          </View>
        )}
      />
      <Divider />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Searchbar
          placeholder="Danışan ara..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
        <View style={styles.filterContainer}>
          <Chip 
            selected={activeFilter === null}
            onPress={() => handleFilterChange(null)}
            style={styles.filterChip}
          >
            Tümü
          </Chip>
          <Chip 
            selected={activeFilter === true}
            onPress={() => handleFilterChange(true)}
            style={styles.filterChip}
          >
            Aktif
          </Chip>
          <Chip 
            selected={activeFilter === false}
            onPress={() => handleFilterChange(false)}
            style={styles.filterChip}
          >
            Pasif
          </Chip>
        </View>
      </View>
      
      <FlatList
        data={filteredClients}
        renderItem={renderClientItem}
        keyExtractor={item => item._id}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery ? 'Aramanızla eşleşen danışan bulunamadı.' : 'Henüz danışan bulunmuyor.'}
            </Text>
          </View>
        }
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleAddClient}
        label="Danışan Ekle"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchBar: {
    elevation: 0,
    backgroundColor: '#F5F5F5',
  },
  filterContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  filterChip: {
    marginRight: 8,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusChip: {
    marginRight: 8,
  },
  emptyContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
  },
  emptyText: {
    color: '#757575',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2E7D32',
  },
});

export default ClientsListScreen; 