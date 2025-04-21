import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  FlatList, 
  RefreshControl,
  Alert
} from 'react-native';
import { Card, FAB, Chip, Title, Button } from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import { apiRequest } from '../../api/config';

const AppointmentsScreen = ({ navigation }) => {
  const { token } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Danışanları yükle
      const clientsData = await apiRequest('GET', '/clients', null, token);
      if (clientsData) {
        setClients(clientsData);
      }

      // Randevuları yükle
      const appointmentsData = await apiRequest('GET', '/appointments', null, token);
      if (appointmentsData) {
        setAppointments(appointmentsData);
      }
    } catch (err) {
      console.error('Veri yükleme hatası:', err);
      setError('Veriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c._id === clientId);
    return client ? client.name : 'İsimsiz Danışan';
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed': return 'Tamamlandı';
      case 'canceled': return 'İptal Edildi';
      default: return 'Planlandı';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#4caf50';
      case 'canceled': return '#f44336';
      default: return '#2196f3';
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4caf50" />
        <Text style={styles.loadingText}>Randevular yükleniyor...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Button 
          mode="contained" 
          onPress={loadData} 
          style={{ marginTop: 16 }}
          buttonColor="#4caf50"
        >
          Tekrar Dene
        </Button>
      </View>
    );
  }

  if (appointments.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>Henüz randevu bulunmuyor</Text>
          <Button 
            mode="contained" 
            onPress={() => {}} // Randevu ekleme ekranı henüz yok
            style={{ marginTop: 16 }}
            buttonColor="#4caf50"
            icon="plus"
          >
            Randevu Ekle
          </Button>
        </View>
        <FAB
          style={styles.fab}
          icon="plus"
          onPress={() => {}} // Randevu ekleme ekranı henüz yok
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={appointments.sort((a, b) => new Date(a.date) - new Date(b.date))}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4caf50']} />
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <Title style={styles.clientName}>{getClientName(item.clientId)}</Title>
                <Chip
                  style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) }]}
                  textStyle={{ color: 'white' }}
                >
                  {getStatusLabel(item.status)}
                </Chip>
              </View>
              <View style={styles.appointmentDetails}>
                <Text style={styles.dateTime}>{formatDate(item.date)}</Text>
                <Text style={styles.duration}>Süre: {item.duration} dakika</Text>
                {item.type && <Text style={styles.type}>Tür: {item.type === 'online' ? 'Online' : 'Yüzyüze'}</Text>}
              </View>
              {item.notes && <Text style={styles.notes}>Not: {item.notes}</Text>}
            </Card.Content>
          </Card>
        )}
      />
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => {}} // Randevu ekleme ekranı henüz yok
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#757575',
  },
  errorText: {
    color: '#f44336',
    textAlign: 'center',
    fontSize: 16,
  },
  emptyText: {
    color: '#757575',
    textAlign: 'center',
    fontSize: 16,
  },
  listContainer: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
    borderRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  clientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusChip: {
    height: 28,
  },
  appointmentDetails: {
    marginBottom: 8,
  },
  dateTime: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  duration: {
    fontSize: 14,
    color: '#757575',
  },
  type: {
    fontSize: 14,
    color: '#757575',
  },
  notes: {
    fontSize: 14,
    color: '#757575',
    fontStyle: 'italic',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#4caf50',
  },
});

export default AppointmentsScreen; 