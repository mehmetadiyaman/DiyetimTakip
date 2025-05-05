import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl,
  TouchableOpacity,
  Image,
  ActivityIndicator
} from 'react-native';
import { Card, Title, Paragraph, Button, Divider, Avatar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { apiRequest, API_URL } from '../../api/config';

const DashboardScreen = ({ navigation }) => {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    clients: [],
    appointments: [],
    activities: []
  });
  const [error, setError] = useState(null);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Danışanları getir
      const clients = await apiRequest('GET', '/clients', null, token);
      
      // Randevuları getir
      const appointments = await apiRequest('GET', '/appointments', null, token);
      
      // Aktiviteleri getir
      const activities = await apiRequest('GET', '/activities?limit=5', null, token);

      setDashboardData({
        clients: clients || [],
        appointments: Array.isArray(appointments) ? appointments : [],
        activities: Array.isArray(activities) ? activities : (activities?.data || [])
      });
    } catch (error) {
      console.error('Dashboard veri yükleme hatası:', error);
      setError('Veriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  // Tarih formatını düzenle
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

  // Bugünün ve yaklaşan randevuları filtrele
  const filterTodayAppointments = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return dashboardData.appointments.filter(appointment => {
      const appointmentDate = new Date(appointment.date);
      appointmentDate.setHours(0, 0, 0, 0);
      
      return appointmentDate.getTime() === today.getTime();
    });
  };

  const todayAppointments = filterTodayAppointments();

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4caf50" />
        <Text style={styles.loadingText}>Veriler yükleniyor...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4caf50']} />
      }
    >
      {/* Karşılama Kartı */}
      <Card style={styles.welcomeCard}>
        <Card.Content>
          <View style={styles.welcomeHeader}>
            <View>
              <Title style={styles.welcomeTitle}>Merhaba, {user?.name}</Title>
              <Paragraph style={styles.welcomeSubtitle}>Dietçim uygulamasına hoş geldiniz</Paragraph>
            </View>
            <Avatar.Image 
              size={50} 
              source={user?.profilePicture ? { uri: user.profilePicture } : require('../../../assets/images/icon.png')} 
            />
          </View>
        </Card.Content>
      </Card>

      {/* Özet Kartları */}
      <View style={styles.statsContainer}>
        <TouchableOpacity 
          style={[styles.statCard, styles.clientsCard]}
          onPress={() => navigation.navigate('Clients')}
        >
          <Ionicons name="people" size={24} color="white" />
          <Text style={styles.statNumber}>{dashboardData.clients.length}</Text>
          <Text style={styles.statLabel}>Danışan</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.statCard, styles.appointmentsCard]}
          onPress={() => navigation.navigate('Appointments')}
        >
          <Ionicons name="calendar" size={24} color="white" />
          <Text style={styles.statNumber}>{todayAppointments.length}</Text>
          <Text style={styles.statLabel}>Bugün</Text>
        </TouchableOpacity>
      </View>
      
      {/* Hızlı Erişim Menüsü */}
      <Card style={styles.sectionCard}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Hızlı Erişim</Title>
          <View style={styles.quickAccessGrid}>
            <TouchableOpacity 
              style={styles.quickAccessItem}
              onPress={() => navigation.navigate('MealPlanner')}
            >
              <View style={[styles.quickAccessIcon, { backgroundColor: '#FF9800' }]}>
                <Ionicons name="restaurant" size={24} color="white" />
              </View>
              <Text style={styles.quickAccessLabel}>Beslenme Takibi</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickAccessItem}
              onPress={() => navigation.navigate('FoodItems')}
            >
              <View style={[styles.quickAccessIcon, { backgroundColor: '#4CAF50' }]}>
                <Ionicons name="nutrition" size={24} color="white" />
              </View>
              <Text style={styles.quickAccessLabel}>Besin Havuzu</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickAccessItem}
              onPress={() => navigation.navigate('Recipes')}
            >
              <View style={[styles.quickAccessIcon, { backgroundColor: '#F44336' }]}>
                <Ionicons name="book" size={24} color="white" />
              </View>
              <Text style={styles.quickAccessLabel}>Tarifler</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickAccessItem}
              onPress={() => navigation.navigate('ExerciseTracking')}
            >
              <View style={[styles.quickAccessIcon, { backgroundColor: '#9C27B0' }]}>
                <Ionicons name="fitness" size={24} color="white" />
              </View>
              <Text style={styles.quickAccessLabel}>Egzersiz</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickAccessItem}
              onPress={() => navigation.navigate('Appointments')}
            >
              <View style={[styles.quickAccessIcon, { backgroundColor: '#3F51B5' }]}>
                <Ionicons name="calendar" size={24} color="white" />
              </View>
              <Text style={styles.quickAccessLabel}>Randevular</Text>
            </TouchableOpacity>
          </View>
        </Card.Content>
      </Card>

      {/* Bugünkü Randevular */}
      <Card style={styles.sectionCard}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Bugünkü Randevular</Title>
          
          {todayAppointments.length > 0 ? (
            todayAppointments.map((appointment, index) => {
              const client = dashboardData.clients.find(c => c._id === appointment.clientId);
              return (
                <View key={appointment._id || index}>
                  <View style={styles.appointmentItem}>
                    <View style={styles.appointmentInfo}>
                      <Text style={styles.appointmentClient}>{client?.name || 'İsimsiz Danışan'}</Text>
                      <Text style={styles.appointmentTime}>
                        {new Date(appointment.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        {` • ${appointment.duration} dakika`}
                      </Text>
                    </View>
                    <View style={[styles.appointmentStatus, 
                      appointment.status === 'completed' ? styles.statusCompleted : 
                      appointment.status === 'canceled' ? styles.statusCanceled : 
                      styles.statusScheduled
                    ]}>
                      <Text style={styles.statusText}>
                        {appointment.status === 'completed' ? 'Tamamlandı' : 
                         appointment.status === 'canceled' ? 'İptal' : 
                         'Planlandı'}
                      </Text>
                    </View>
                  </View>
                  {index < todayAppointments.length - 1 && <Divider style={styles.divider} />}
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyMessage}>Bugün için randevunuz bulunmamaktadır</Text>
          )}

          <Button 
            mode="outlined" 
            onPress={() => navigation.navigate('Appointments')}
            style={styles.viewAllButton}
            labelStyle={{ color: '#4caf50' }}
          >
            Tüm Randevuları Görüntüle
          </Button>
        </Card.Content>
      </Card>

      {/* Son Aktiviteler */}
      <Card style={styles.sectionCard}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Son Aktiviteler</Title>
          
          {dashboardData.activities.length > 0 ? (
            dashboardData.activities.map((activity, index) => (
              <View key={activity._id || index}>
                <View style={styles.activityItem}>
                  <View style={styles.activityIconContainer}>
                    <Ionicons 
                      name={activity.type.includes('client') ? 'person-add' : 
                            activity.type.includes('diet') ? 'nutrition' : 
                            activity.type.includes('appointment') ? 'calendar' : 
                            'document-text'} 
                      size={20} 
                      color="white" 
                    />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityDescription}>{activity.description}</Text>
                    <Text style={styles.activityTime}>{formatDate(activity.createdAt)}</Text>
                  </View>
                </View>
                {index < dashboardData.activities.length - 1 && <Divider style={styles.divider} />}
              </View>
            ))
          ) : (
            <Text style={styles.emptyMessage}>Henüz bir aktivite bulunmamaktadır</Text>
          )}
        </Card.Content>
      </Card>

      {/* Boşluk bırak */}
      <View style={{ height: 20 }} />
    </ScrollView>
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
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    color: '#757575',
  },
  welcomeCard: {
    margin: 16,
    elevation: 4,
    borderRadius: 10,
  },
  welcomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  welcomeSubtitle: {
    color: '#757575',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  clientsCard: {
    backgroundColor: '#4caf50',
  },
  appointmentsCard: {
    backgroundColor: '#2196f3',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginVertical: 5,
  },
  statLabel: {
    color: 'white',
    fontSize: 14,
  },
  sectionCard: {
    margin: 16,
    marginTop: 0,
    elevation: 4,
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  appointmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentClient: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  appointmentTime: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  appointmentStatus: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusScheduled: {
    backgroundColor: '#e3f2fd',
  },
  statusCompleted: {
    backgroundColor: '#e8f5e9',
  },
  statusCanceled: {
    backgroundColor: '#ffebee',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  emptyMessage: {
    textAlign: 'center',
    color: '#757575',
    marginVertical: 20,
    fontStyle: 'italic',
  },
  viewAllButton: {
    marginTop: 16,
    borderColor: '#4caf50',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  activityIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4caf50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityDescription: {
    fontSize: 14,
    color: '#333',
  },
  activityTime: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
  },
  quickAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 16,
  },
  quickAccessItem: {
    width: '48%',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
  },
  quickAccessIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickAccessLabel: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
});

export default DashboardScreen; 