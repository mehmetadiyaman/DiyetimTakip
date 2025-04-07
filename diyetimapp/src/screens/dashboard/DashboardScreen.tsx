import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Card, Text, Button, Divider, List, Title, Surface, Avatar } from 'react-native-paper';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { DashboardStackParamList } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { clientsAPI } from '../../api/clientsAPI';
import { appointmentsAPI } from '../../api/appointmentsAPI';
import LoadingIndicator from '../../components/LoadingIndicator';
import ErrorMessage from '../../components/ErrorMessage';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

type DashboardScreenNavigationProp = StackNavigationProp<DashboardStackParamList, 'DashboardHome'>;

const DashboardScreen = () => {
  const navigation = useNavigation<DashboardScreenNavigationProp>();
  const { user } = useAuthStore();

  // Bugünkü randevuları çek
  const { 
    data: todayAppointments, 
    isLoading: isLoadingAppointments, 
    error: appointmentsError,
    refetch: refetchAppointments 
  } = useQuery({
    queryKey: ['todayAppointments'],
    queryFn: appointmentsAPI.getTodayAppointments,
  });

  // Aktif danışanları çek
  const { 
    data: activeClients, 
    isLoading: isLoadingClients, 
    error: clientsError,
    refetch: refetchClients 
  } = useQuery({
    queryKey: ['activeClients'],
    queryFn: clientsAPI.getActiveClients,
  });

  const isLoading = isLoadingAppointments || isLoadingClients;
  const error = appointmentsError || clientsError;

  const handleRefresh = () => {
    refetchAppointments();
    refetchClients();
  };

  // Tarih formatını düzenle
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'd MMMM yyyy', { locale: tr });
  };

  const formatTime = (timeString: string) => {
    return timeString;
  };

  // Farklı sekme veya stack'e navigasyon fonksiyonu
  const navigateToScreen = (routeName: string, params?: any) => {
    navigation.getParent()?.dispatch(
      CommonActions.navigate({
        name: routeName,
        params,
      })
    );
  };

  if (isLoading && !todayAppointments && !activeClients) {
    return <LoadingIndicator fullScreen message="Veriler yükleniyor..." />;
  }

  if (error) {
    return <ErrorMessage error="Veriler yüklenirken bir hata oluştu" onRetry={handleRefresh} />;
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
      }
    >
      <Surface style={styles.welcomeCard}>
        <Text style={styles.welcomeText}>Hoş Geldiniz, {user?.name}!</Text>
        <Text style={styles.todayText}>{formatDate(new Date().toISOString())}</Text>
      </Surface>

      <Card style={styles.card}>
        <Card.Title title="Bugünkü Randevular" />
        <Card.Content>
          {todayAppointments && todayAppointments.length > 0 ? (
            todayAppointments.map((appointment) => (
              <List.Item
                key={appointment._id}
                title={typeof appointment.client === 'object' ? appointment.client.name : 'Danışan'}
                description={`${formatTime(appointment.time)} - ${appointment.duration} dakika`}
                left={props => <List.Icon {...props} icon="calendar" />}
                right={props => (
                  <View style={styles.statusContainer}>
                    <Text style={{
                      color: appointment.status === 'scheduled' ? '#2196F3' : 
                             appointment.status === 'completed' ? '#4CAF50' : '#F44336',
                      fontSize: 12,
                    }}>
                      {appointment.status === 'scheduled' ? 'Planlandı' : 
                       appointment.status === 'completed' ? 'Tamamlandı' : 'İptal Edildi'}
                    </Text>
                  </View>
                )}
                onPress={() => {
                  navigateToScreen('Appointments', {
                    screen: 'AppointmentDetails',
                    params: { appointmentId: appointment._id }
                  });
                }}
              />
            ))
          ) : (
            <Text style={styles.emptyText}>Bugün için planlanmış randevu bulunmuyor.</Text>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Aktif Danışanlar" />
        <Card.Content>
          {activeClients && activeClients.length > 0 ? (
            activeClients.slice(0, 5).map((client) => (
              <List.Item
                key={client._id}
                title={client.name}
                description={`${client.gender === 'male' ? 'Erkek' : client.gender === 'female' ? 'Kadın' : 'Diğer'}, ${new Date().getFullYear() - new Date(client.birthdate).getFullYear()} yaş`}
                left={props => 
                  client.avatar ? (
                    <Avatar.Image 
                      {...props} 
                      source={{ uri: client.avatar }} 
                      size={48} 
                    />
                  ) : (
                    <Avatar.Icon 
                      {...props} 
                      icon="account" 
                      size={48} 
                    />
                  )
                }
                onPress={() => {
                  navigateToScreen('Clients', {
                    screen: 'ClientDetails',
                    params: { clientId: client._id }
                  });
                }}
              />
            ))
          ) : (
            <Text style={styles.emptyText}>Aktif danışan bulunmuyor.</Text>
          )}
          
          {activeClients && activeClients.length > 5 && (
            <Button 
              mode="text" 
              onPress={() => {
                navigateToScreen('Clients', { screen: 'ClientsList' });
              }}
              style={styles.viewAllButton}
            >
              Tümünü Görüntüle ({activeClients.length})
            </Button>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Hızlı İşlemler" />
        <Card.Content style={styles.quickActionsContainer}>
          <Button 
            icon="account-plus" 
            mode="contained" 
            onPress={() => {
              navigateToScreen('Clients', { screen: 'AddClient' });
            }}
            style={styles.actionButton}
          >
            Danışan Ekle
          </Button>
          
          <Button 
            icon="calendar-plus" 
            mode="contained" 
            onPress={() => {
              navigateToScreen('Appointments', { 
                screen: 'AddAppointment',
                params: {}
              });
            }}
            style={styles.actionButton}
          >
            Randevu Ekle
          </Button>
        </Card.Content>
      </Card>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  welcomeCard: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
    elevation: 4,
    backgroundColor: '#2E7D32',
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  todayText: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
    marginTop: 4,
  },
  card: {
    margin: 16,
    marginTop: 0,
    borderRadius: 8,
    elevation: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: '#757575',
    marginVertical: 16,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  actionButton: {
    marginVertical: 8,
    minWidth: '45%',
  },
  viewAllButton: {
    alignSelf: 'center',
    marginTop: 8,
  },
  statusContainer: {
    justifyContent: 'center',
  },
  bottomSpacer: {
    height: 80,
  },
});

export default DashboardScreen; 