import React, { useState, useEffect, useRef } from 'react';
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
  Alert,
  Animated
} from 'react-native';
import { Card, Title, Paragraph, Avatar, Badge, FAB, ProgressBar, Divider, Button } from 'react-native-paper';
import { Ionicons, MaterialCommunityIcons, AntDesign, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../hooks/useAuth';
import { apiRequest } from '../../api/config';
import theme from '../../themes/theme';
import moment from 'moment';
import 'moment/locale/tr';  // Türkçe dil desteği

const { width, height } = Dimensions.get('window');

// Motivasyon sözleri dizisi
const HEALTH_QUOTES = [
  {
    quote: "Sağlığınız en değerli servetinizdir. Onu yönetmek için zaman ayırmak, en iyi yatırımdır.",
    author: "Anonim"
  },
  {
    quote: "Bedeniniz bir tapınak gibidir. Onu temiz tutun, besleyin ve saygı gösterin.",
    author: "B.K.S. Iyengar"
  },
  {
    quote: "Her gün yaptığınız küçük seçimler bir araya geldiğinde büyük bir yaşam değişikliği olur.",
    author: "Robert Collier"
  },
  {
    quote: "İlaç yiyeceğiniz olsun, yiyecekleriniz de ilacınız.",
    author: "Hipokrat"
  },
  {
    quote: "Mutluluğun ilk şartı sağlıklı bir bedendir.",
    author: "Thomas Jefferson"
  },
  {
    quote: "Sağlığı korumak, hastalığı tedavi etmekten daha kolaydır.",
    author: "Dr. Michael Greger"
  },
  {
    quote: "Hareketsizlik bedeni yavaş yavaş çürütür, hareket ise hayat verir.",
    author: "Aristo"
  }
];

// Sağlık ipuçları dizisi
const HEALTH_TIPS = [
  {
    tip: "Günde en az 5 porsiyon sebze ve meyve tüketin",
    icon: "food-apple",
    color: "#43B692"
  },
  {
    tip: "Günlük D vitamini için 15-20 dk güneşlenin",
    icon: "white-balance-sunny",
    color: "#FF9800"
  },
  {
    tip: "Günde en az 8 bardak su için",
    icon: "water",
    color: "#2196F3"
  },
  {
    tip: "Haftada en az 150 dakika orta şiddetli egzersiz yapın",
    icon: "run",
    color: "#F44336"
  },
  {
    tip: "Uyku kalitenizi artırmak için düzenli uyku saatleri belirleyin",
    icon: "sleep",
    color: "#673AB7"
  },
  {
    tip: "İşlenmiş şekeri azaltarak metabolizmanızı koruyun",
    icon: "cube-outline",
    color: "#795548"
  }
];

// Günlük egzersiz önerileri
const DAILY_EXERCISES = [
  {
    name: "Sabah Yürüyüşü",
    duration: "20 dk",
    description: "Güne enerjik başlamak için sabah yürüyüşü",
    icon: "walk",
  },
  {
    name: "Masa Başı Egzersizleri",
    duration: "5 dk",
    description: "Ofiste veya evde çalışırken yapabileceğiniz kısa esnemeler",
    icon: "desk-chair",
  },
  {
    name: "Akşam Yoga",
    duration: "15 dk",
    description: "Günün stresini atmak için rahatlatıcı yoga hareketleri",
    icon: "meditation",
  },
  {
    name: "HIIT Antrenman",
    duration: "10 dk",
    description: "Metabolizmayı hızlandıran yüksek yoğunluklu interval egzersizler",
    icon: "lightning-bolt",
  },
  {
    name: "Temel Güçlendirme",
    duration: "10 dk",
    description: "Karın, sırt ve kalça kaslarını güçlendiren temel hareketler",
    icon: "human-handsup",
  }
];

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
  
  // Rastgele motivasyon sözü ve ipuçları için state
  const [randomQuote, setRandomQuote] = useState(HEALTH_QUOTES[0]);
  const [healthTips, setHealthTips] = useState(HEALTH_TIPS.slice(0, 3));
  const quoteAnimation = useRef(new Animated.Value(1)).current; // Başlangıçta görünür (1)
  const [dailyExercise, setDailyExercise] = useState(DAILY_EXERCISES[0]); // Artık kullanılmıyor

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

  // Rastgele motivasyon sözü seçme fonksiyonu
  const selectRandomQuote = () => {
    const randomIndex = Math.floor(Math.random() * HEALTH_QUOTES.length);
    // Önce quote'u set et, animasyon problemi olmasın
    setRandomQuote(HEALTH_QUOTES[randomIndex]);
    
    // Daha güvenilir animasyon sekansı
    Animated.timing(quoteAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true
    }).start(() => {
      setTimeout(() => {
        Animated.timing(quoteAnimation, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true
        }).start();
      }, 100);
    });
  };
  
  // Rastgele ipuçları seçme
  const selectRandomTips = () => {
    const shuffled = [...HEALTH_TIPS].sort(() => 0.5 - Math.random());
    setHealthTips(shuffled.slice(0, 3));
  };
  
  // Günlük egzersiz önerisi seçme fonksiyonu
  const selectDailyExercise = () => {
    const randomIndex = Math.floor(Math.random() * DAILY_EXERCISES.length);
    setDailyExercise(DAILY_EXERCISES[randomIndex]);
  };
  
  // Komponentin ilk yüklenmesinde rastgele bir söz seç
  useEffect(() => {
    selectRandomQuote();
    selectRandomTips();
    // selectDailyExercise(); // Artık kullanılmıyor
  }, []);

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
        {/* Minimalist Header */}
        <View style={styles.minimalistHeader}>
          <View style={styles.minimalistUserInfo}>
            {user?.profilePicture ? (
              <Image 
                source={{uri: user.profilePicture}} 
                style={styles.minimalistAvatar} 
                defaultSource={require('../../../assets/images/icon.png')}
              />
            ) : (
              <View style={styles.minimalistAvatarPlaceholder}>
                <Text style={styles.minimalistAvatarText}>
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'D'}
                </Text>
              </View>
            )}
            <Text style={styles.minimalistUserName}>
              {user?.name || 'Kullanıcı'}
            </Text>
          </View>
          
          <Text style={styles.minimalistDate}>
            {moment().format('DD MMM, ddd')}
          </Text>
        </View>
        
        {/* Ana İçerik Kartları */}
        <View style={styles.cardsContainer}>
          {/* Sağlıklı Yaşam Rehberi Kartı */}
          <Card style={[styles.card, styles.healthCard]}>
            <View style={styles.patternOverlay} />
            <Card.Content style={{position: 'relative', zIndex: 1}}>
              <View style={styles.cardHeader}>
                <MaterialCommunityIcons name="heart-pulse" size={22} color="#E91E63" />
                <Title style={[styles.cardTitle, {color: '#E91E63'}]}>Sağlıklı Yaşam Rehberi</Title>
              </View>
              
              <TouchableOpacity 
                activeOpacity={0.9} 
                onPress={selectRandomQuote}
                style={{overflow: 'hidden'}}
              >
                <LinearGradient
                  colors={['#E91E63', '#FF5722']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.healthCardGradient}
                >
                  <Image 
                    source={require('../../../assets/images/icon.png')} 
                    style={styles.healthCardBackgroundImage} 
                    blurRadius={10}
                  />
                  <View style={styles.healthCardContent}>
                    <View style={styles.healthCardIconContainer}>
                      <MaterialCommunityIcons name="meditation" size={60} color="#fff" />
                    </View>
                    <View style={styles.healthCardTextContent}>
                      <Text style={styles.healthCardTitle}>Günün Sözü</Text>
                      <Animated.Text 
                        style={[
                          styles.healthCardQuote, 
                          {opacity: quoteAnimation}
                        ]}
                      >
                        "{randomQuote?.quote || "Sağlığınız en değerli servetinizdir. Onu yönetmek için zaman ayırmak, en iyi yatırımdır."}"
                      </Animated.Text>
                      <Text style={styles.healthCardAuthor}>— {randomQuote?.author || "Anonim"}</Text>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.healthTipsContainer}>
                <View style={styles.tipsHeader}>
                  <MaterialCommunityIcons name="lightbulb-outline" size={18} color="#E91E63" />
                  <Text style={styles.tipsHeaderTitle}>Sağlık İpuçları</Text>
                </View>
                {healthTips.map((tip, index) => (
                  <View key={index} style={styles.healthTipItem}>
                    <View style={[styles.healthTipIconContainer, {shadowColor: tip.color}]}>
                      <MaterialCommunityIcons name={tip.icon} size={24} color={tip.color} />
                    </View>
                    <Text style={styles.healthTipText}>{tip.tip}</Text>
                  </View>
                ))}
              </View>
              
              <TouchableOpacity 
                style={styles.healthCardButton}
                onPress={selectRandomTips}
              >
                <Text style={styles.healthCardButtonText}>Yeni İpuçları Göster</Text>
                <MaterialCommunityIcons name="refresh" size={18} color="#E91E63" />
              </TouchableOpacity>
            </Card.Content>
          </Card>

          {/* Yaklaşan Randevular Kartı - Geliştirilmiş Tasarım */}
          <Card style={[styles.card, styles.appointmentsCard]}>
            <LinearGradient
              colors={['#2196F3', '#03A9F4']}
              start={{x: 0, y: 0}}
              end={{x: 0, y: 0.1}}
              style={styles.appointmentsCardHeader}
            >
              <View style={styles.appointmentsHeaderContent}>
                <MaterialCommunityIcons name="calendar-clock" size={26} color="#fff" />
                <Title style={styles.appointmentsHeaderTitle}>Yaklaşan Randevular</Title>
              </View>
            </LinearGradient>
            
            <Card.Content style={styles.appointmentsCardContent}>
              {upcomingAppointments.length > 0 ? (
                upcomingAppointments.map((appointment, index) => {
                  const client = dashboardData.clients.find(c => c._id === appointment.clientId);
                  const appointmentDate = new Date(appointment.date);
                  const isToday = new Date(appointmentDate).setHours(0,0,0,0) === new Date().setHours(0,0,0,0);
                  const isTomorrow = new Date(appointmentDate).setHours(0,0,0,0) === new Date(new Date().setDate(new Date().getDate() + 1)).setHours(0,0,0,0);
                  
                  // Randevu notları için kontrol
                  const hasNotes = appointment.notes && appointment.notes.trim().length > 0;
                  
                  return (
                    <View key={appointment._id || index}>
                      <View style={styles.modernAppointmentItem}>
                        <View style={styles.modernAppDateSection}>
                          <View style={[styles.modernAppDateBox, isToday ? styles.todayDateBox : isTomorrow ? styles.tomorrowDateBox : null]}>
                            <Text style={styles.modernAppDateDay}>{appointmentDate.getDate()}</Text>
                            <Text style={styles.modernAppDateMonth}>
                              {appointmentDate.toLocaleString('tr-TR', {month: 'short'})}
                            </Text>
                          </View>
                          <Text style={styles.modernAppTime}>
                            {appointmentDate.toLocaleString('tr-TR', {hour: '2-digit', minute: '2-digit'})}
                          </Text>
                        </View>
                        
                        <View style={styles.modernAppContent}>
                          <View style={styles.modernAppClientRow}>
                            {client?.profilePicture ? (
                              <Image 
                                source={{uri: client.profilePicture}} 
                                style={styles.modernAppClientAvatar} 
                                defaultSource={require('../../../assets/images/icon.png')} 
                              />
                            ) : (
                              <View style={styles.modernAppClientAvatarDefault}>
                                <Text style={styles.modernAppClientInitial}>
                                  {(client?.name || 'A')[0].toUpperCase()}
                                </Text>
                              </View>
                            )}
                            <View style={styles.modernAppClientInfo}>
                              <Text style={styles.modernAppClientName}>
                                {client?.name || 'İsimsiz Danışan'}
                              </Text>
                              <View style={styles.modernAppTypeRow}>
                                <MaterialCommunityIcons 
                                  name={appointment.type === 'online' ? 'video' : 'account'}
                                  size={14}
                                  color={appointment.type === 'online' ? '#1976D2' : '#43A047'} 
                                />
                                <Text style={[
                                  styles.modernAppType,
                                  {color: appointment.type === 'online' ? '#1976D2' : '#43A047'}
                                ]}>
                                  {appointment.type === 'online' ? 'Online' : 'Yüz Yüze'}
                                </Text>
                                <View style={[
                                  styles.modernAppDuration,
                                  {backgroundColor: appointment.type === 'online' ? '#E3F2FD' : '#E8F5E9'}
                                ]}>
                                  <MaterialCommunityIcons name="clock-outline" size={12} color="#757575" />
                                  <Text style={styles.modernAppDurationText}>{appointment.duration} dk</Text>
                                </View>
                              </View>
                            </View>
                            
                            <View style={[
                              styles.modernAppStatusBadge,
                              appointment.status === 'completed' ? styles.modernStatusCompleted : 
                              appointment.status === 'canceled' ? styles.modernStatusCanceled : 
                              styles.modernStatusScheduled
                            ]}>
                              <Text style={styles.modernAppStatusText}>
                                {appointment.status === 'completed' ? 'Tamamlandı' : 
                                appointment.status === 'canceled' ? 'İptal' : 
                                'Planlandı'}
                              </Text>
                            </View>
                          </View>
                          
                          {hasNotes && (
                            <View style={styles.modernAppNotesContainer}>
                              <MaterialCommunityIcons name="text-box-outline" size={16} color="#757575" style={styles.modernAppNotesIcon} />
                              <Text style={styles.modernAppNotesText}>
                                {appointment.notes}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                      
                      {index < upcomingAppointments.length - 1 && (
                        <Divider style={styles.modernAppDivider} />
                      )}
                    </View>
                  );
                })
              ) : (
                <View style={styles.modernEmptyAppointments}>
                  <MaterialCommunityIcons name="calendar-blank" size={60} color="#E1F5FE" />
                  <Text style={styles.modernEmptyAppText}>Yaklaşan randevunuz bulunmamaktadır</Text>
                  <TouchableOpacity 
                    style={styles.modernAddAppointmentButton}
                    onPress={() => navigation.navigate('Appointments')}
                  >
                    <MaterialCommunityIcons name="calendar-plus" size={16} color="#fff" />
                    <Text style={styles.modernAddAppointmentText}>Randevu Ekle</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              {upcomingAppointments.length > 0 && (
                <TouchableOpacity 
                  style={styles.modernViewAllButton}
                  onPress={() => navigation.navigate('Appointments')}
                >
                  <Text style={styles.modernViewAllText}>Tüm Randevuları Görüntüle</Text>
                  <MaterialCommunityIcons name="arrow-right" size={16} color="#2196F3" />
                </TouchableOpacity>
              )}
            </Card.Content>
          </Card>

          {/* Son Aktiviteler Kartı - Modernize edilmiş */}
          <Card style={[styles.card, styles.activitiesCard]}>
            <LinearGradient
              colors={['#7E57C2', '#673AB7']}
              start={{x: 0, y: 0}}
              end={{x: 0, y: 0.1}}
              style={styles.activitiesCardHeader}
            >
              <View style={styles.activitiesHeaderContent}>
                <MaterialCommunityIcons name="history" size={24} color="#fff" />
                <Title style={styles.activitiesHeaderTitle}>Son Aktiviteler</Title>
                {dashboardData.activities?.length > 0 && (
                  <View style={styles.activitiesBadge}>
                    <Text style={styles.activitiesBadgeText}>{dashboardData.activities.length}</Text>
                  </View>
                )}
                {__DEV__ && (
                  <TouchableOpacity 
                    style={[styles.debugButton, {marginLeft: 8}]} 
                    onPress={() => {
                      fetchActivities().then(activities => {
                        if (activities?.length > 0) {
                          Alert.alert('Başarılı', `${activities.length} aktivite yüklendi`);
                          setDashboardData(prev => ({ ...prev, activities }));
                        } else {
                          Alert.alert('Hata', 'Aktivite verisi alınamadı');
                        }
                      });
                    }}
                  >
                    <MaterialCommunityIcons name="refresh" size={16} color="rgba(255,255,255,0.7)" />
                  </TouchableOpacity>
                )}
              </View>
            </LinearGradient>
            
            <Card.Content style={styles.activitiesCardContent}>
              {dashboardData.activities && dashboardData.activities.length > 0 ? (
                <View style={styles.modernActivitiesList}>
                  {dashboardData.activities.slice(0, 5).map((activity, index) => {
                    try {
                      // Aktivite tipi belirleme
                      let iconName = 'bell-outline';
                      let iconColor = '#673AB7';
                      let typeLabel = 'Aktivite';
                      
                      if (activity.type?.includes('client')) {
                        iconName = 'account';
                        iconColor = '#43A047';
                        typeLabel = 'Danışan';
                      } else if (activity.type?.includes('diet_plan') || activity.type?.includes('diet')) {
                        iconName = 'food-apple';
                        iconColor = '#FF9800';
                        typeLabel = 'Diyet Planı';
                      } else if (activity.type?.includes('appointment')) {
                        iconName = 'calendar-check';
                        iconColor = '#2196F3';
                        typeLabel = 'Randevu';
                      } else if (activity.type?.includes('measurement')) {
                        iconName = 'tape-measure';
                        iconColor = '#9C27B0';
                        typeLabel = 'Ölçüm';
                      } else if (activity.type?.includes('telegram')) {
                        iconName = 'telegram';
                        iconColor = '#0088cc';
                        typeLabel = 'Telegram';
                      }
                      
                      // Tarih formatlama
                      const createdDate = activity.createdAt ? new Date(activity.createdAt) : new Date();
                      const isToday = moment(createdDate).isSame(moment(), 'day');
                      const isYesterday = moment(createdDate).isSame(moment().subtract(1, 'days'), 'day');
                      
                      let timeText = '';
                      if (isToday) {
                        timeText = `Bugün ${moment(createdDate).format('HH:mm')}`;
                      } else if (isYesterday) {
                        timeText = `Dün ${moment(createdDate).format('HH:mm')}`;
                      } else {
                        timeText = moment(createdDate).format('DD/MM/YYYY HH:mm');
                      }
                      
                      return (
                        <View key={activity._id || `activity-${index}`}>
                          <View style={styles.modernActivityItem}>
                            <View style={[styles.modernActivityIconContainer, {backgroundColor: `${iconColor}20`}]}>
                              <MaterialCommunityIcons name={iconName} size={20} color={iconColor} />
                            </View>
                            
                            <View style={styles.modernActivityContent}>
                              <View style={styles.modernActivityHeader}>
                                <View style={[styles.modernActivityTypeBadge, {backgroundColor: `${iconColor}20`, borderColor: `${iconColor}50`}]}>
                                  <Text style={[styles.modernActivityTypeText, {color: iconColor}]}>{typeLabel}</Text>
                                </View>
                                <Text style={styles.modernActivityTime}>{timeText}</Text>
                              </View>
                              
                              <Text style={styles.modernActivityDesc}>
                                {activity.description || 'Açıklama yok'}
                              </Text>
                            </View>
                          </View>
                          
                          {index < dashboardData.activities.slice(0, 5).length - 1 && (
                            <Divider style={styles.modernActivityDivider} />
                          )}
                        </View>
                      );
                    } catch (err) {
                      console.error(`Aktivite gösterme hatası: ${err.message}`);
                      return null;
                    }
                  })}
                </View>
              ) : (
                <View style={styles.modernEmptyActivities}>
                  <MaterialCommunityIcons name="bell-sleep-outline" size={48} color="#E1E1FB" />
                  <Text style={styles.modernEmptyText}>
                    {loading ? "Aktiviteler yükleniyor..." : "Henüz bir aktivite bulunmamaktadır"}
                  </Text>
                </View>
              )}
              
              {dashboardData.activities?.length > 5 && (
                <TouchableOpacity style={styles.modernActivityViewAll}>
                  <Text style={styles.modernActivityViewAllText}>Tüm Aktiviteleri Görüntüle</Text>
                  <MaterialCommunityIcons name="arrow-right" size={16} color="#673AB7" />
                </TouchableOpacity>
              )}
            </Card.Content>
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
  minimalistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 30,
    paddingBottom: 10,
    backgroundColor: '#fff',
  },
  minimalistUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  minimalistAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  minimalistAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  minimalistAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  minimalistUserName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  minimalistDate: {
    fontSize: 13,
    color: '#757575',
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
  debugButton: {
    alignSelf: 'flex-end',
    padding: 5,
  },
  
  // Sağlıklı yaşam kartı stilleri
  patternOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fdfdfd',
    opacity: 0.5,
    zIndex: 0,
  },
  healthCard: {
    borderLeftColor: '#E91E63',
    position: 'relative',
  },
  healthCardGradient: {
    borderRadius: 16,
    marginVertical: 10,
    elevation: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  healthCardBackgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.1,
  },
  healthCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  healthCardIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  healthCardTextContent: {
    flex: 1,
  },
  healthCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
  },
  healthCardQuote: {
    fontSize: 13,
    color: '#fff',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  healthCardAuthor: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  healthTipsContainer: {
    marginTop: 12,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  tipsHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 6,
  },
  healthTipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#E91E63',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 2,
  },
  healthTipIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginRight: 10,
    shadowColor: "#E91E63",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3.0,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  healthTipText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    fontWeight: '500',
  },
  healthCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    paddingVertical: 12,
    backgroundColor: 'rgba(233, 30, 99, 0.05)',
    borderRadius: 25,
  },
  healthCardButtonText: {
    fontSize: 14,
    color: '#E91E63',
    fontWeight: 'bold',
    marginRight: 8,
  },
  dailyExerciseContainer: {
    marginTop: 15,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 2,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#E91E63',
  },
  dailyExerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dailyExerciseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 6,
  },
  dailyExerciseContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  exerciseIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(233, 30, 99, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  exerciseDetails: {
    flex: 1,
  },
  exerciseNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  exerciseDurationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(233, 30, 99, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  exerciseDuration: {
    fontSize: 12,
    color: '#E91E63',
    marginLeft: 4,
    fontWeight: '500',
  },
  exerciseDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  exerciseButton: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  exerciseButtonText: {
    fontSize: 13,
    color: '#E91E63',
    fontWeight: '500',
  },
  appointmentsCard: {
    borderLeftColor: '#2196F3',
    overflow: 'hidden',
    paddingBottom: 0,
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  appointmentsCardHeader: {
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  appointmentsHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appointmentsHeaderTitle: {
    color: '#fff',
    marginLeft: 10,
    fontWeight: 'bold',
  },
  appointmentsCardContent: {
    padding: 0,
    paddingTop: 8,
  },
  modernAppointmentItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  modernAppDateSection: {
    alignItems: 'center',
    marginRight: 14,
  },
  modernAppDateBox: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  todayDateBox: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  tomorrowDateBox: {
    backgroundColor: '#FFF8E1',
    borderColor: '#FFC107',
  },
  modernAppDateDay: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modernAppDateMonth: {
    fontSize: 12,
    color: '#757575',
    textTransform: 'uppercase',
  },
  modernAppTime: {
    fontSize: 13,
    color: '#757575',
    fontWeight: '500',
  },
  modernAppContent: {
    flex: 1,
  },
  modernAppClientRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modernAppClientAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
  },
  modernAppClientAvatarDefault: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  modernAppClientInitial: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modernAppClientInfo: {
    flex: 1,
  },
  modernAppClientName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  modernAppTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modernAppType: {
    fontSize: 13,
    marginLeft: 4,
    marginRight: 8,
  },
  modernAppDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  modernAppDurationText: {
    fontSize: 12,
    color: '#757575',
    marginLeft: 2,
  },
  modernAppStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  },
  modernStatusScheduled: {
    backgroundColor: '#E3F2FD',
  },
  modernStatusCompleted: {
    backgroundColor: '#E8F5E9',
  },
  modernStatusCanceled: {
    backgroundColor: '#FFEBEE',
  },
  modernAppStatusText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#333',
  },
  modernAppNotesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    backgroundColor: '#F9F9F9',
    padding: 10,
    borderRadius: 6,
    borderLeftWidth: 2,
    borderLeftColor: '#BBDEFB',
  },
  modernAppNotesIcon: {
    marginRight: 6,
    marginTop: 1,
  },
  modernAppNotesText: {
    fontSize: 13,
    color: '#616161',
    flex: 1,
  },
  modernAppDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 2,
  },
  modernEmptyAppointments: {
    padding: 30,
    alignItems: 'center',
  },
  modernEmptyAppText: {
    fontSize: 14,
    color: '#757575',
    marginVertical: 10,
    textAlign: 'center',
  },
  modernAddAppointmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 25,
    marginTop: 10,
  },
  modernAddAppointmentText: {
    color: '#fff',
    fontWeight: '500',
    marginLeft: 6,
  },
  modernViewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    marginTop: 8,
  },
  modernViewAllText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 6,
  },
  activitiesCard: {
    borderLeftColor: '#673AB7',
    overflow: 'hidden',
    paddingBottom: 0,
    paddingHorizontal: 0,
    paddingTop: 0,
    marginBottom: 0,
  },
  activitiesCardHeader: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  activitiesHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activitiesHeaderTitle: {
    color: '#fff',
    marginLeft: 10,
    fontWeight: 'bold',
    flex: 1,
  },
  activitiesBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  activitiesBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  activitiesCardContent: {
    padding: 0,
  },
  modernActivitiesList: {
    paddingTop: 5,
  },
  modernActivityItem: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  modernActivityIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modernActivityContent: {
    flex: 1,
  },
  modernActivityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  modernActivityTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  modernActivityTypeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  modernActivityTime: {
    fontSize: 12,
    color: '#757575',
  },
  modernActivityDesc: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
  modernActivityDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
  },
  modernEmptyActivities: {
    padding: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernEmptyText: {
    fontSize: 14,
    color: '#757575',
    marginTop: 8,
    textAlign: 'center',
  },
  modernActivityViewAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  modernActivityViewAllText: {
    fontSize: 14,
    color: '#673AB7',
    fontWeight: '500',
    marginRight: 4,
  },
});

export default DashboardScreen;
