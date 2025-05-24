import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Platform,
  ImageBackground,
  Alert
} from 'react-native';
import { Card, Title, Paragraph, Avatar, Badge, FAB, ProgressBar, Divider, Button } from 'react-native-paper';
import { Ionicons, MaterialCommunityIcons, AntDesign, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../hooks/useAuth';
import { apiRequest } from '../../api/config';
import theme from '../../themes/theme';
import { PieChart, LineChart } from 'react-native-chart-kit';
import moment from 'moment';
import 'moment/locale/tr';  // Türkçe dil desteği

const { width, height } = Dimensions.get('window');

const DashboardScreen = ({ navigation }) => {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    clients: [],
    appointments: [],
    activities: [],
    measurements: [],
    statistics: {
      totalClients: 0,
      activeClients: 0,
      completedAppointments: 0,
      upcomingAppointments: 0,
      weightProgress: 0,
      waterConsumption: 0
    }
  });
  const [error, setError] = useState(null);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // API istekleri için Promise.all kullanarak paralel istekler yapıyoruz
      const [clientsResponse, appointmentsResponse] = await Promise.all([
        apiRequest('GET', '/clients', null, token).catch(e => {
          console.log('Danışan verileri yüklenemedi:', e);
          return [];
        }),
        apiRequest('GET', '/appointments', null, token).catch(e => {
          console.log('Randevu verileri yüklenemedi:', e);
          return [];
        })
      ]);
      
      // Aktiviteleri ayrı olarak çek (debug için)
      const activities = await fetchActivities();
      console.log(`loadDashboardData içinde ${activities.length} aktivite alındı`);

      // API yanıtlarını işle
      const clients = Array.isArray(clientsResponse) ? clientsResponse : [];
      const appointments = Array.isArray(appointmentsResponse) ? appointmentsResponse : [];
      
      // En son ölçümleri al (ilk danışan için)
      let measurements = [];
      if (clients.length > 0) {
        try {
          const clientId = clients[0]._id;
          const measurementsResponse = await apiRequest('GET', `/clients/${clientId}/measurements`, null, token);
          measurements = Array.isArray(measurementsResponse) ? measurementsResponse : [];
        } catch (e) {
          console.log('Ölçüm verileri yüklenemedi:', e);
        }
      }

      // Gerekli istatistikleri hesapla
      const activeClients = clients.filter(c => c.status === 'active').length;
      const completedAppointments = appointments.filter(a => a.status === 'completed').length;
      
      const upcomingApptsFiltered = filterUpcomingAppointments(appointments);
      
      // Ağırlık ilerleme hesaplaması
      let weightProgress = 0;
      if (measurements.length >= 2) {
        const firstMeasurement = measurements[0];
        const lastMeasurement = measurements[measurements.length - 1];
        const initialWeight = firstMeasurement.weight;
        const targetWeight = firstMeasurement.targetWeight || initialWeight * 0.9; // Hedef ağırlık yoksa %10 kayıp varsayalım
        const currentWeight = lastMeasurement.weight;
        
        if (initialWeight > targetWeight) {
          // Kilo vermesi gerekiyorsa
          const totalToLose = initialWeight - targetWeight;
          const currentLoss = initialWeight - currentWeight;
          weightProgress = Math.min(100, Math.round((currentLoss / totalToLose) * 100));
        } else if (initialWeight < targetWeight) {
          // Kilo alması gerekiyorsa
          const totalToGain = targetWeight - initialWeight;
          const currentGain = currentWeight - initialWeight;
          weightProgress = Math.min(100, Math.round((currentGain / totalToGain) * 100));
        } else {
          weightProgress = 100; // Zaten hedefte
        }
      }

      // Su tüketimi hesaplaması - son kaydedilen değerden alalım veya varsayılan
      let waterConsumption = 0;
      if (measurements.length > 0) {
        const lastMeasurement = measurements[measurements.length - 1];
        waterConsumption = lastMeasurement.waterIntake ? 
          Math.min(100, Math.round((lastMeasurement.waterIntake / 2500) * 100)) : // 2500ml'yi %100 kabul ediyoruz
          Math.floor(Math.random() * 40) + 60; // API veri dönmezse 60-100 arası rastgele
      }
      
      // Veriyi state'e kaydet
      setDashboardData({
        clients,
        appointments,
        activities,
        measurements,
        statistics: {
          totalClients: clients.length,
          activeClients,
          completedAppointments,
          upcomingAppointments: upcomingApptsFiltered.length,
          weightProgress,
          waterConsumption
        }
      });
    } catch (error) {
      console.error('Dashboard veri yükleme hatası:', error);
      setError('Veriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Tarih formatını düzenle
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
    });
  };

  // Saat formatını düzenle
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('tr-TR', { 
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

  // Bugünün randevularını filtrele
  const filterTodayAppointments = (appointments = []) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return appointments.filter(appointment => {
      const appointmentDate = new Date(appointment.date);
      appointmentDate.setHours(0, 0, 0, 0);
      return appointmentDate.getTime() === today.getTime();
    });
  };

  // Gelecekteki randevuları filtreleme
  const filterUpcomingAppointments = (appointments = []) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return appointments
      .filter(appointment => {
        const appointmentDate = new Date(appointment.date);
        appointmentDate.setHours(0, 0, 0, 0);
        return appointmentDate.getTime() >= today.getTime();
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5);
  };

  // Ağırlık takip verilerini hazırla
  const generateWeightData = () => {
    // Ölçümleri tarihe göre sıralayalım
    const sortedMeasurements = [...dashboardData.measurements]
      .sort((a, b) => new Date(a.date) - new Date(b.date));
      
    // Son 7 kayıt veya daha az
    const recentMeasurements = sortedMeasurements.slice(-7);
    
    // Eğer ölçüm yoksa veya yetersizse varsayılan değerler döndür
    if (recentMeasurements.length === 0) {
      return {
        labels: ["Hafta 1", "Hafta 2", "Hafta 3", "Hafta 4", "Hafta 5", "Hafta 6", "Hafta 7"],
        datasets: [
          {
            data: [70, 69.5, 69, 68.7, 68.2, 68, 67.5],
            color: (opacity = 1) => `rgba(46, 125, 50, ${opacity})`,
            strokeWidth: 2
          }
        ]
      };
    }
    
    // Ölçümleri data olarak hazırla
    const data = recentMeasurements.map(m => m.weight || 0);
    
    // Etiketleri hazırla
    const labels = recentMeasurements.map(m => {
      const date = new Date(m.date);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    });
    
    return {
      labels,
      datasets: [
        {
          data,
          color: (opacity = 1) => `rgba(46, 125, 50, ${opacity})`,
          strokeWidth: 2
        }
      ]
    };
  };

  // Aktivite verilerini çek
  const fetchActivities = async () => {
    try {
      console.log("Aktiviteler fetch ediliyor...");
      const response = await apiRequest('GET', '/activities?limit=10', null, token);
      console.log("Aktivite yanıtı:", JSON.stringify(response));
      
      // API yanıt formatını kontrol et ve uygun şekilde işle
      let activities = [];
      
      if (response && Array.isArray(response)) {
        // Direk dizi olarak döndüyse
        activities = response;
        console.log(`${activities.length} aktivite array olarak alındı`);
      } else if (response && Array.isArray(response.data)) {
        // {data: []} formatında döndüyse
        activities = response.data;
        console.log(`${activities.length} aktivite data array olarak alındı`);
      } else if (response && response.activities && Array.isArray(response.activities)) {
        // {activities: []} formatında döndüyse
        activities = response.activities;
        console.log(`${activities.length} aktivite activities array olarak alındı`);
      } else {
        // hiçbir format uyuşmadıysa boş dizi kullan
        console.log("Aktivite verisi bulunamadı veya format uyuşmadı");
        activities = [];
      }
      
      return activities;
    } catch (e) {
      console.log('Aktivite verileri yüklenemedi:', e);
      return [];
    }
  };

  useEffect(() => {
    loadDashboardData();
    
    // Dashboard güncellemesi için bir zamanlayıcı oluştur
    const interval = setInterval(() => {
      if (!refreshing) {
        loadDashboardData();
      }
    }, 300000); // 5 dakikada bir güncelle
    
    return () => clearInterval(interval); // Temizlik fonksiyonu
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
        <ActivityIndicator size="large" color={theme.palette.primary.main} />
        <Text style={styles.loadingText}>Veriler yükleniyor...</Text>
      </View>
    );
  }

  const todayAppointments = filterTodayAppointments(dashboardData.appointments);
  const upcomingAppointments = filterUpcomingAppointments(dashboardData.appointments);
  const pieChartData = [
    {
      name: "Aktif",
      population: dashboardData.statistics.activeClients,
      color: "#4CAF50",
      legendFontColor: "#7F7F7F",
      legendFontSize: 12
    },
    {
      name: "Pasif",
      population: dashboardData.statistics.totalClients - dashboardData.statistics.activeClients,
      color: "#FF9800",
      legendFontColor: "#7F7F7F",
      legendFontSize: 12
    }
  ];

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
      
      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.palette.primary.main]} />
        }
      >
        {/* Modern Header */}
        <View style={styles.modernHeader}>
          <View style={styles.dateSection}>
            <View style={styles.calendarIcon}>
              <MaterialCommunityIcons name="calendar-month" size={18} color={theme.palette.primary.main} />
            </View>
            <Text style={styles.modernDateText}>
              {moment().format('DD MMMM YYYY, dddd')}
            </Text>
          </View>
          
          <View style={styles.userSection}>
            <View style={styles.greetingContainer}>
              <Text style={styles.nameText}>{user?.name || 'Kullanıcı'}</Text>
              <MaterialCommunityIcons 
                name="hand-wave" 
                size={20} 
                color="#FFC107" 
                style={styles.waveIcon} 
              />
            </View>
            
            <Avatar.Image 
              size={42} 
              source={user?.profilePicture ? {uri: user.profilePicture} : require('../../../assets/images/icon.png')} 
              style={styles.modernUserAvatar}
            />
          </View>
        </View>

        {/* Özet İstatistikler */}
        <View style={styles.summaryContainer}>
          <View style={styles.statsRow}>
            <TouchableOpacity style={[styles.statBox, { backgroundColor: '#F5F7FA' }]} activeOpacity={0.8}>
              <View style={[styles.statIcon, {backgroundColor: '#E8F5E9'}]}>
                <MaterialCommunityIcons name="account-group" size={22} color="#4CAF50" />
              </View>
              <Text style={styles.statValue}>{dashboardData.statistics.activeClients}</Text>
              <Text style={styles.statLabel}>Aktif Danışan</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.statBox, { backgroundColor: '#F5F7FA' }]} activeOpacity={0.8}>
              <View style={[styles.statIcon, {backgroundColor: '#E3F2FD'}]}>
                <MaterialCommunityIcons name="calendar-check" size={22} color="#2196F3" />
              </View>
              <Text style={styles.statValue}>{todayAppointments.length}</Text>
              <Text style={styles.statLabel}>Bugünkü Randevular</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.statBox, { backgroundColor: '#F5F7FA' }]} activeOpacity={0.8}>
              <View style={[styles.statIcon, {backgroundColor: '#FFF3E0'}]}>
                <MaterialCommunityIcons name="clipboard-text-clock" size={22} color="#FF9800" />
              </View>
              <Text style={styles.statValue}>{upcomingAppointments.length}</Text>
              <Text style={styles.statLabel}>Yaklaşan Randevular</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Ana İçerik Kartları */}
        <View style={styles.cardsContainer}>
          {/* Danışan İstatistikleri Kartı */}
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <MaterialCommunityIcons name="account-group" size={22} color={theme.palette.primary.main} />
                <Title style={styles.cardTitle}>Danışan İstatistikleri</Title>
              </View>
              
              <View style={styles.cardChartContainer}>
                {dashboardData.statistics.totalClients > 0 ? (
                  <PieChart
                    data={pieChartData}
                    width={width - 80}
                    height={180}
                    chartConfig={{
                      color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    }}
                    accessor={"population"}
                    backgroundColor={"transparent"}
                    paddingLeft={"10"}
                    center={[0, 0]}
                    absolute
                  />
                ) : (
                  <View style={styles.emptyChartContainer}>
                    <MaterialCommunityIcons name="chart-pie" size={50} color="#BDBDBD" />
                    <Text style={styles.emptyStateText}>Henüz danışan kaydı yok</Text>
                  </View>
                )}
              </View>

              <View style={styles.statsSummaryContainer}>
                <View style={styles.statsSummaryItem}>
                  <Text style={styles.statsSummaryLabel}>Toplam Danışan</Text>
                  <Text style={styles.statsSummaryValue}>{dashboardData.statistics.totalClients}</Text>
                </View>

                <View style={styles.statsSummaryItem}>
                  <Text style={styles.statsSummaryLabel}>Tamamlanan Randevular</Text>
                  <Text style={styles.statsSummaryValue}>{dashboardData.statistics.completedAppointments}</Text>
                </View>

                <View style={styles.statsSummaryItem}>
                  <Text style={styles.statsSummaryLabel}>Aktif Diyet Planları</Text>
                  <Text style={styles.statsSummaryValue}>{dashboardData.statistics.activeClients}</Text>
                </View>
              </View>
            </Card.Content>
          </Card>

          {/* İlerleme Takibi Kartı */}
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <MaterialCommunityIcons name="chart-line" size={22} color={theme.palette.primary.main} />
                <Title style={styles.cardTitle}>İlerleme Takibi</Title>
              </View>
              
              <View style={styles.cardChartContainer}>
                {dashboardData.measurements.length > 0 ? (
                  <LineChart
                    data={generateWeightData()}
                    width={width - 80}
                    height={180}
                    yAxisSuffix=" kg"
                    chartConfig={{
                      backgroundColor: "#fff",
                      backgroundGradientFrom: "#fff",
                      backgroundGradientTo: "#fff",
                      decimalPlaces: 1,
                      color: (opacity = 1) => `rgba(46, 125, 50, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                      propsForDots: {
                        r: "5",
                        strokeWidth: "2",
                        stroke: "#4CAF50"
                      }
                    }}
                    bezier
                    style={{
                      marginVertical: 8,
                      borderRadius: 16
                    }}
                  />
                ) : (
                  <View style={styles.emptyChartContainer}>
                    <MaterialCommunityIcons name="chart-line" size={50} color="#BDBDBD" />
                    <Text style={styles.emptyStateText}>Henüz ölçüm verisi yok</Text>
                  </View>
                )}
              </View>

              <View style={styles.progressContainer}>
                <View style={styles.progressItem}>
                  <View style={styles.progressLabelContainer}>
                    <Text style={styles.progressLabel}>Hedef Ağırlık İlerleme</Text>
                    <Text style={styles.progressValue}>
                      %{dashboardData.statistics.weightProgress}
                    </Text>
                  </View>
                  <ProgressBar 
                    progress={dashboardData.statistics.weightProgress / 100}
                    color="#4CAF50"
                    style={styles.progressBar}
                  />
                </View>

                <View style={styles.progressItem}>
                  <View style={styles.progressLabelContainer}>
                    <Text style={styles.progressLabel}>Su Tüketimi</Text>
                    <Text style={styles.progressValue}>
                      %{dashboardData.statistics.waterConsumption}
                    </Text>
                  </View>
                  <ProgressBar 
                    progress={dashboardData.statistics.waterConsumption / 100}
                    color="#2196F3"
                    style={styles.progressBar}
                  />
                </View>
              </View>
            </Card.Content>
          </Card>

          {/* Yaklaşan Randevular Kartı */}
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <MaterialCommunityIcons name="calendar-clock" size={22} color={theme.palette.primary.main} />
                <Title style={styles.cardTitle}>Yaklaşan Randevular</Title>
              </View>
              
              {upcomingAppointments.length > 0 ? (
                upcomingAppointments.map((appointment, index) => {
                  const client = dashboardData.clients.find(c => c._id === appointment.clientId);
                  
                  return (
                    <View key={appointment._id || index}>
                      <View style={styles.appointmentItem}>
                        <View style={styles.appointmentTimeContainer}>
                          <Text style={styles.appointmentDate}>{formatDate(appointment.date)}</Text>
                          <Text style={styles.appointmentTime}>{formatTime(appointment.date)}</Text>
                        </View>
                        
                        <View style={styles.appointmentDivider} />
                        
                        <View style={styles.appointmentDetails}>
                          <Text style={styles.appointmentClient}>{client?.name || 'İsimsiz Danışan'}</Text>
                          <Text style={styles.appointmentNote}>{appointment.note || 'Not eklenmedi'}</Text>
                          
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
                      </View>
                      
                      {index < upcomingAppointments.length - 1 && (
                        <Divider style={styles.appointmentDividerLine} />
                      )}
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyStateContainer}>
                  <MaterialCommunityIcons name="calendar" size={40} color="#BDBDBD" />
                  <Text style={styles.emptyStateText}>Yaklaşan randevunuz bulunmamaktadır</Text>
                </View>
              )}
            </Card.Content>
          </Card>

          {/* Aktiviteler Kartı */}
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <MaterialCommunityIcons name="history" size={22} color={theme.palette.primary.main} />
                <Title style={styles.cardTitle}>
                  Son Aktiviteler {dashboardData.activities?.length > 0 ? `(${dashboardData.activities.length})` : ''}
                </Title>
                {__DEV__ && (
                  <TouchableOpacity 
                    style={styles.debugButton} 
                    onPress={() => {
                      Alert.alert(
                        'Aktivite Verileri', 
                        `Toplam Aktivite Sayısı: ${dashboardData.activities?.length || 0}`,
                        [
                          {
                            text: 'Yenile', 
                            onPress: () => {
                              fetchActivities().then(activities => {
                                if (activities?.length > 0) {
                                  Alert.alert('Başarılı', `${activities.length} aktivite yüklendi`);
                                  setDashboardData(prev => ({ ...prev, activities }));
                                } else {
                                  Alert.alert('Hata', 'Aktivite verisi alınamadı');
                                }
                              });
                            }
                          },
                          {text: 'Tamam'}
                        ]
                      );
                    }}
                  >
                    <Text style={{color: theme.palette.primary.main, fontSize: 12}}>(debug)</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              {dashboardData.activities && dashboardData.activities.length > 0 ? (
                <View style={styles.activitiesTable}>
                  {/* Tablo Başlık */}
                  <View style={styles.tableHeader}>
                    <View style={styles.tableHeaderDateCell}>
                      <Text style={styles.tableHeaderCell}>Tarih</Text>
                    </View>
                    <View style={styles.tableHeaderTypeCell}>
                      <Text style={styles.tableHeaderCell}>Tip</Text>
                    </View>
                    <View style={styles.tableHeaderDescCell}>
                      <Text style={styles.tableHeaderCell}>Açıklama</Text>
                    </View>
                  </View>
                  
                  <View style={styles.tableBody}>
                    {dashboardData.activities.slice(0, 5).map((activity, index) => {
                      try {
                        let iconName = 'bell';
                        let iconColor = theme.palette.primary.main;
                        let iconBg = '#E8F5E9';
                        let typeLabel = 'Aktivite';
                        
                        // Aktivite tipine göre ikon ve renk belirleme
                        if (activity.type?.includes('client')) {
                          iconName = 'account';
                          iconColor = theme.palette.primary.main;
                          iconBg = '#E8F5E9';
                          typeLabel = 'Danışan';
                        } else if (activity.type?.includes('diet_plan') || activity.type?.includes('diet')) {
                          iconName = 'food-apple';
                          iconColor = '#FF9800';
                          iconBg = '#FFF8E1';
                          typeLabel = 'Diyet Planı';
                        } else if (activity.type?.includes('appointment')) {
                          iconName = 'calendar';
                          iconColor = '#2196F3';
                          iconBg = '#E3F2FD';
                          typeLabel = 'Randevu';
                        } else if (activity.type?.includes('measurement')) {
                          iconName = 'tape-measure';
                          iconColor = '#9C27B0';
                          iconBg = '#F3E5F5';
                          typeLabel = 'Ölçüm';
                        } else if (activity.type?.includes('telegram')) {
                          iconName = 'telegram';
                          iconColor = '#0088cc';
                          iconBg = '#E3F2FD';
                          typeLabel = 'Telegram';
                        }
                        
                        // Tarih formatını güvenli bir şekilde kontrol et
                        const createdDate = activity.createdAt ? new Date(activity.createdAt) : new Date();
                        const isValidDate = !isNaN(createdDate.getTime());
                        const formattedDate = isValidDate 
                          ? moment(createdDate).format('DD/MM/YYYY')
                          : 'Geçersiz Tarih';
                        const formattedTime = isValidDate
                          ? moment(createdDate).format('HH:mm')
                          : '--:--';
                        
                        return (
                          <View key={activity._id || `activity-${index}`}>
                            <View style={styles.tableRow}>
                              {/* Tarih Sütunu */}
                              <View style={styles.tableDateCell}>
                                <Text style={styles.dateText} numberOfLines={1}>
                                  {formattedDate}
                                </Text>
                                <Text style={styles.timeText} numberOfLines={1}>
                                  {formattedTime}
                                </Text>
                              </View>
                              
                              {/* Tip Sütunu */}
                              <View style={styles.tableTypeCell}>
                                <View style={styles.typeContainer}>
                                  <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
                                    <MaterialCommunityIcons 
                                      name={iconName} 
                                      size={14} 
                                      color={iconColor} 
                                    />
                                  </View>
                                  <Text style={styles.typeText} numberOfLines={1} ellipsizeMode="tail">
                                    {typeLabel}
                                  </Text>
                                </View>
                              </View>
                              
                              {/* Açıklama Sütunu */}
                              <View style={styles.tableDescCell}>
                                <Text style={styles.descriptionText} numberOfLines={2} ellipsizeMode="tail">
                                  {activity.description || 'Açıklama yok'}
                                </Text>
                              </View>
                            </View>
                            
                            {index < dashboardData.activities.slice(0, 5).length - 1 && (
                              <Divider style={styles.activityDivider} />
                            )}
                          </View>
                        );
                      } catch (err) {
                        console.error(`Aktivite gösterme hatası: ${err.message}`);
                        return null; // Hata durumunda bu aktiviteyi atla
                      }
                    })}
                  </View>
                </View>
              ) : (
                <View style={styles.emptyStateContainer}>
                  <MaterialCommunityIcons name="bell-off" size={40} color="#BDBDBD" />
                  <Text style={styles.emptyStateText}>
                    {loading ? "Aktiviteler yükleniyor..." : "Henüz bir aktivite bulunmamaktadır"}
                  </Text>
                </View>
              )}
            </Card.Content>
          </Card>

          {/* Sağlık İpucu Kartı */}
          <Card style={[styles.card, styles.tipCard]}>
            <LinearGradient
              colors={['#AED581', '#8BC34A']}
              style={styles.tipGradient}
            >
              <Card.Content style={styles.tipContent}>
                <View style={styles.tipIconContainer}>
                  <MaterialCommunityIcons name="lightbulb-on" size={40} color="#fff" />
                </View>
                <View style={styles.tipTextContainer}>
                  <Title style={styles.tipTitle}>Günün Sağlık İpucu</Title>
                  <Paragraph style={styles.tipParagraph}>
                    Metabolizmanızı hızlandırmak için sabah kahvaltısından önce 1 bardak ılık su içmeyi unutmayın. Günlük su tüketiminizi takip edin.
                  </Paragraph>
                </View>
              </Card.Content>
            </LinearGradient>
          </Card>
        </View>

        {/* Alt Alan Boşluğu */}
        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 10,
    color: '#757575',
    fontSize: 16,
  },
  modernHeader: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 15 : 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 15,
  },
  dateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  calendarIcon: {
    marginRight: 8,
    backgroundColor: '#F5F7FA',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernDateText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greetingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  waveIcon: {
    marginLeft: 4,
  },
  modernUserAvatar: {
    backgroundColor: '#F5F7FA',
    borderWidth: 2,
    borderColor: '#FFF',
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.20,
    shadowRadius: 1.41,
  },
  summaryContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    width: '30%',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  cardsContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  card: {
    borderRadius: 15,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
    marginLeft: 10,
    flex: 1,
  },
  cardChartContainer: {
    alignItems: 'center',
    marginVertical: 15,
  },
  emptyChartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 180,
  },
  statsSummaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  statsSummaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  statsSummaryLabel: {
    fontSize: 12,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 4,
  },
  statsSummaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  progressContainer: {
    marginTop: 15,
  },
  progressItem: {
    marginBottom: 15,
  },
  progressLabelContainer: {
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
    borderRadius: 4,
  },
  appointmentItem: {
    flexDirection: 'row',
    paddingVertical: 10,
  },
  appointmentTimeContainer: {
    width: 80,
    alignItems: 'center',
  },
  appointmentDate: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
  },
  appointmentTime: {
    fontSize: 12,
    color: '#757575',
  },
  appointmentDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 10,
  },
  appointmentDetails: {
    flex: 1,
  },
  appointmentClient: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 5,
  },
  appointmentNote: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 8,
  },
  appointmentStatus: {
    alignSelf: 'flex-start',
    fontSize: 12,
    borderRadius: 12,
    paddingHorizontal: 8,
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
  appointmentDividerLine: {
    marginVertical: 5,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  emptyStateText: {
    marginTop: 10,
    color: '#757575',
    textAlign: 'center',
  },
  activityItem: {
    flexDirection: 'row',
    paddingVertical: 10,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
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
  activityDivider: {
    marginVertical: 2,
    backgroundColor: '#F0F0F0',
  },
  tipCard: {
    overflow: 'hidden',
  },
  tipGradient: {
    borderRadius: 15,
  },
  tipContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tipIconContainer: {
    marginRight: 15,
  },
  tipTextContainer: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  tipParagraph: {
    fontSize: 14,
    color: '#fff',
  },
  activitiesTable: {
    borderRadius: 8,
    marginTop: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#F8F8F8',
  },
  tableHeaderCell: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#555',
  },
  tableBody: {
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    minHeight: 65,
  },
  tableHeaderDateCell: {
    flex: 1.5,
    paddingRight: 5,
  },
  tableHeaderTypeCell: {
    flex: 1,
    paddingHorizontal: 5,
  },
  tableHeaderDescCell: {
    flex: 2.5,
    paddingLeft: 5,
  },
  tableDateCell: {
    flex: 1.5,
    paddingRight: 5,
    justifyContent: 'center',
  },
  tableTypeCell: {
    flex: 1,
    paddingHorizontal: 5,
    justifyContent: 'center',
  },
  tableDescCell: {
    flex: 2.5,
    paddingLeft: 5,
    justifyContent: 'center',
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.18,
    shadowRadius: 1.00,
    elevation: 1,
  },
  typeText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#555',
    flexShrink: 1,
  },
  descriptionText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 18,
    flexShrink: 1,
  },
  dateText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  timeText: {
    fontSize: 12,
    color: '#757575',
    marginTop: 3,
  },
  viewAllButton: {
    marginTop: 12,
    alignSelf: 'center',
    marginBottom: 5,
  },
  debugButton: {
    alignSelf: 'flex-end',
    padding: 5,
  },
});

export default DashboardScreen;
