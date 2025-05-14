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
import { Card, Title, Paragraph, Button, Divider, Avatar, Badge, FAB } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { apiRequest, API_URL } from '../../api/config';
import theme from '../../themes/theme';

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

  // Geçen süre hesaplama fonksiyonu
  const getTimeSince = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now - date) / 1000);
    
    let interval = Math.floor(seconds / 31536000);
    if (interval > 1) return `${interval} yıl önce`;
    
    interval = Math.floor(seconds / 2592000);
    if (interval > 1) return `${interval} ay önce`;
    
    interval = Math.floor(seconds / 86400);
    if (interval > 1) return `${interval} gün önce`;
    
    interval = Math.floor(seconds / 3600);
    if (interval > 1) return `${interval} saat önce`;
    
    interval = Math.floor(seconds / 60);
    if (interval > 1) return `${interval} dakika önce`;
    
    return `${Math.floor(seconds)} saniye önce`;
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

  // Gelecekteki randevuları filtreleme
  const filterUpcomingAppointments = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return dashboardData.appointments
      .filter(appointment => {
        const appointmentDate = new Date(appointment.date);
        appointmentDate.setHours(0, 0, 0, 0);
        
        return appointmentDate.getTime() > today.getTime();
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 3);
  };

  const upcomingAppointments = filterUpcomingAppointments();

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.palette.primary.main} />
        <Text style={styles.loadingText}>Veriler yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.palette.primary.main]} />
        }
      >
        {/* İstatistik Kartları */}
        <View style={styles.statsGrid}>
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => navigation.navigate('Clients')}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="people" size={20} color={theme.palette.primary.main} />
            </View>
            <Text style={styles.statTitle}>Aktif Danışanlar</Text>
            <Text style={styles.statValue}>{dashboardData.clients.filter(c => c.status !== 'inactive').length || 0}</Text>
            <View style={styles.statLink}>
              <Text style={styles.statLinkText}>Tümünü Görüntüle</Text>
              <Ionicons name="chevron-forward" size={14} color={theme.palette.primary.main} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => navigation.navigate('Appointments')}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="calendar" size={20} color="#2196F3" />
            </View>
            <Text style={styles.statTitle}>Bugünkü Randevular</Text>
            <Text style={styles.statValue}>{todayAppointments.length}</Text>
            <View style={styles.statLink}>
              <Text style={styles.statLinkText}>Takvimi Görüntüle</Text>
              <Ionicons name="chevron-forward" size={14} color={theme.palette.primary.main} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => navigation.navigate('DietPlans')}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#FFF8E1' }]}>
              <Ionicons name="restaurant" size={20} color="#FFC107" />
            </View>
            <Text style={styles.statTitle}>Aktif Diyet Planları</Text>
            <Text style={styles.statValue}>{dashboardData.clients.filter(c => c.status === 'active').length || 0}</Text>
            <View style={styles.statLink}>
              <Text style={styles.statLinkText}>Planları Görüntüle</Text>
              <Ionicons name="chevron-forward" size={14} color={theme.palette.primary.main} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => navigation.navigate('Measurements')}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#F3E5F5' }]}>
              <Ionicons name="analytics" size={20} color="#9C27B0" />
            </View>
            <Text style={styles.statTitle}>Ölçüm Takipleri</Text>
            <Text style={styles.statValue}>{dashboardData.clients.length > 0 ? Math.round(dashboardData.clients.length * 0.8) : 0}</Text>
            <View style={styles.statLink}>
              <Text style={styles.statLinkText}>Ölçümleri Görüntüle</Text>
              <Ionicons name="chevron-forward" size={14} color={theme.palette.primary.main} />
            </View>
          </TouchableOpacity>
        </View>
        
        <View style={styles.contentGrid}>
          {/* Sol Sütun */}
          <View style={styles.leftColumn}>
            {/* Yaklaşan Randevular */}
            <Card style={styles.sectionCard}>
              <Card.Content>
                <View style={styles.cardHeader}>
                  <Title style={styles.sectionTitle}>Yaklaşan Randevular</Title>
                  <Ionicons name="calendar" size={22} color={theme.palette.primary.main} />
                </View>
                
                {upcomingAppointments.length > 0 ? (
                  upcomingAppointments.map((appointment, index) => {
                    const client = dashboardData.clients.find(c => c._id === appointment.clientId);
                    return (
                      <View key={appointment._id || index}>
                        <View style={styles.appointmentItem}>
                          <Avatar.Text 
                            size={40} 
                            label={(client?.name?.substring(0, 2) || 'XX').toUpperCase()} 
                            backgroundColor="#E3F2FD"
                            color="#2196F3"
                            style={styles.appointmentAvatar}
                          />
                          <View style={styles.appointmentInfo}>
                            <Text style={styles.appointmentClient}>{client?.name || 'İsimsiz Danışan'}</Text>
                            <Text style={styles.appointmentTime}>
                              {new Date(appointment.date).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })}
                              {` • ${new Date(appointment.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
                            </Text>
                          </View>
                          <Badge style={[styles.appointmentStatus, 
                            appointment.status === 'completed' ? styles.statusCompleted : 
                            appointment.status === 'canceled' ? styles.statusCanceled : 
                            styles.statusScheduled
                          ]}>
                            {appointment.status === 'completed' ? 'Tamamlandı' : 
                             appointment.status === 'canceled' ? 'İptal' : 
                             'Planlandı'}
                          </Badge>
                        </View>
                        {index < upcomingAppointments.length - 1 && <Divider style={styles.divider} />}
                      </View>
                    );
                  })
                ) : (
                  <Text style={styles.emptyMessage}>Yaklaşan randevunuz bulunmamaktadır</Text>
                )}

                <Button 
                  mode="outlined" 
                  onPress={() => navigation.navigate('Appointments')}
                  style={styles.viewAllButton}
                  labelStyle={{ color: theme.palette.primary.main }}
                >
                  Tüm Randevuları Görüntüle
                </Button>
              </Card.Content>
            </Card>

            {/* Son Aktiviteler */}
            <Card style={styles.sectionCard}>
              <Card.Content>
                <View style={styles.cardHeader}>
                  <Title style={styles.sectionTitle}>Son Aktiviteler</Title>
                  <Ionicons name="time" size={22} color={theme.palette.primary.main} />
                </View>
                
                {dashboardData.activities.length > 0 ? (
                  dashboardData.activities.map((activity, index) => {
                    let iconName = 'notifications';
                    let iconColor = theme.palette.primary.main;
                    let iconBg = '#E8F5E9';
                    
                    if (activity.type.includes('client')) {
                      iconName = 'person-add';
                      iconColor = theme.palette.primary.main;
                      iconBg = '#E8F5E9';
                    } else if (activity.type.includes('diet')) {
                      iconName = 'restaurant';
                      iconColor = '#FFC107';
                      iconBg = '#FFF8E1';
                    } else if (activity.type.includes('appointment')) {
                      iconName = 'calendar';
                      iconColor = '#2196F3';
                      iconBg = '#E3F2FD';
                    } else if (activity.type.includes('measurement')) {
                      iconName = 'analytics';
                      iconColor = '#9C27B0';
                      iconBg = '#F3E5F5';
                    }
                    
                    return (
                      <View key={activity._id || index}>
                        <View style={styles.activityItem}>
                          <View style={[styles.activityIcon, { backgroundColor: iconBg }]}>
                            <Ionicons name={iconName} size={16} color={iconColor} />
                          </View>
                          <View style={styles.activityContent}>
                            <Text style={styles.activityDescription}>{activity.description}</Text>
                            <Text style={styles.activityTime}>{getTimeSince(activity.createdAt)}</Text>
                          </View>
                        </View>
                        {index < dashboardData.activities.length - 1 && <Divider style={styles.divider} />}
                      </View>
                    )
                  })
                ) : (
                  <Text style={styles.emptyMessage}>Henüz bir aktivite bulunmamaktadır</Text>
                )}
              </Card.Content>
            </Card>
          </View>

          {/* Sağ Sütun */}
          <View style={styles.rightColumn}>
            {/* İlerleme Özeti */}
            <Card style={styles.sectionCard}>
              <Card.Content>
                <View style={styles.cardHeader}>
                  <Title style={styles.sectionTitle}>İlerleme Özeti</Title>
                  <Ionicons name="trending-up" size={22} color={theme.palette.primary.main} />
                </View>
                
                <View style={styles.progressList}>
                  <View style={styles.progressItem}>
                    <View style={styles.progressHeader}>
                      <Text style={styles.progressLabel}>Hedef Ağırlığa Ulaşanlar</Text>
                      <Text style={styles.progressValue}>
                        {Math.round(dashboardData.clients.length * 0.3)}/{dashboardData.clients.length}
                      </Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { width: `${dashboardData.clients.length ? (Math.round(dashboardData.clients.length * 0.3) / dashboardData.clients.length) * 100 : 0}%`, 
                          backgroundColor: '#4CAF50' 
                        }]} 
                      />
                    </View>
                  </View>
                  
                  <View style={styles.progressItem}>
                    <View style={styles.progressHeader}>
                      <Text style={styles.progressLabel}>Diyet Uyumu</Text>
                      <Text style={styles.progressValue}>
                        {Math.round(dashboardData.clients.length * 0.6)}/{dashboardData.clients.length}
                      </Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { width: `${dashboardData.clients.length ? (Math.round(dashboardData.clients.length * 0.6) / dashboardData.clients.length) * 100 : 0}%`, 
                          backgroundColor: theme.palette.primary.main 
                        }]} 
                      />
                    </View>
                  </View>
                  
                  <View style={styles.progressItem}>
                    <View style={styles.progressHeader}>
                      <Text style={styles.progressLabel}>Egzersiz Uyumu</Text>
                      <Text style={styles.progressValue}>
                        {Math.round(dashboardData.clients.length * 0.4)}/{dashboardData.clients.length}
                      </Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { width: `${dashboardData.clients.length ? (Math.round(dashboardData.clients.length * 0.4) / dashboardData.clients.length) * 100 : 0}%`, 
                          backgroundColor: '#FFC107' 
                        }]} 
                      />
                    </View>
                  </View>
                  
                  <View style={styles.progressItem}>
                    <View style={styles.progressHeader}>
                      <Text style={styles.progressLabel}>Su Tüketimi Takibi</Text>
                      <Text style={styles.progressValue}>
                        {Math.round(dashboardData.clients.length * 0.7)}/{dashboardData.clients.length}
                      </Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { width: `${dashboardData.clients.length ? (Math.round(dashboardData.clients.length * 0.7) / dashboardData.clients.length) * 100 : 0}%`, 
                          backgroundColor: '#2196F3' 
                        }]} 
                      />
                    </View>
                  </View>
                </View>
              </Card.Content>
            </Card>
          </View>
        </View>

        {/* Alt Alan Boşluğu */}
        <View style={{ height: 80 }} />
      </ScrollView>
      
      {/* Yeni tasarımlı FAB butonu */}
      <FAB
        style={styles.fab}
        icon="account-plus"
        color="#fff"
        label="Yeni Danışan"
        onPress={() => navigation.navigate('ClientDetails', { isCreating: true })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flex: 1,
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    paddingTop: 16,
  },
  statCard: {
    width: '47%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    margin: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statTitle: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  statLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statLinkText: {
    fontSize: 12,
    color: theme.palette.primary.main,
    marginRight: 4,
  },
  contentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  leftColumn: {
    width: '100%',
  },
  rightColumn: {
    width: '100%',
  },
  sectionCard: {
    borderRadius: 12,
    elevation: 2,
    margin: 4,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  appointmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  appointmentAvatar: {
    marginRight: 12,
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentClient: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  appointmentTime: {
    fontSize: 14,
    color: '#757575',
    marginTop: 2,
  },
  appointmentStatus: {
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusScheduled: {
    backgroundColor: '#E3F2FD',
    color: '#2196F3',
  },
  statusCompleted: {
    backgroundColor: '#E8F5E9',
    color: '#4CAF50',
  },
  statusCanceled: {
    backgroundColor: '#FFEBEE',
    color: '#F44336',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  emptyMessage: {
    textAlign: 'center',
    color: '#757575',
    paddingVertical: 20,
    fontStyle: 'italic',
  },
  viewAllButton: {
    marginTop: 16,
    borderColor: theme.palette.primary.main,
    borderRadius: 8,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  progressList: {
    marginTop: 8,
  },
  progressItem: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: '#757575',
  },
  progressValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#EEEEEE',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 16,
    backgroundColor: theme.palette.primary.main,
  },
});

export default DashboardScreen; 