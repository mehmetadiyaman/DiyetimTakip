import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Alert, 
  ActivityIndicator,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { 
  TextInput, 
  Button, 
  Switch, 
  Divider, 
  Card,
  Avatar,
  IconButton,
  Title,
  HelperText,
  Chip
} from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import { apiRequest } from '../../api/config';
import Ionicons from 'react-native-vector-icons/Ionicons';

const ClientDetailsScreen = ({ navigation, route }) => {
  const { token } = useAuth();
  const { clientId, isEditing, isCreating } = route.params || {};
  
  const [loading, setLoading] = useState(!isCreating);
  const [saving, setSaving] = useState(false);
  const [client, setClient] = useState({
    name: '',
    email: '',
    phone: '',
    gender: 'female',
    birthDate: '',
    height: '',
    startingWeight: '',
    targetWeight: '',
    activityLevel: 'moderate',
    medicalHistory: '',
    dietaryRestrictions: '',
    notes: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (clientId && !isCreating) {
      loadClientData();
    }
  }, [clientId]);

  const loadClientData = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('GET', `/clients/${clientId}`, null, token);
      
      if (data) {
        // Form için veriyi hazırla
        setClient({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          gender: data.gender || 'female',
          birthDate: data.birthDate ? data.birthDate.split('T')[0] : '',
          height: data.height ? data.height.toString() : '',
          startingWeight: data.startingWeight ? data.startingWeight.toString() : '',
          targetWeight: data.targetWeight ? data.targetWeight.toString() : '',
          activityLevel: data.activityLevel || 'moderate',
          medicalHistory: data.medicalHistory || '',
          dietaryRestrictions: data.dietaryRestrictions || '',
          notes: data.notes || '',
          profilePicture: data.profilePicture || ''
        });
      }
    } catch (error) {
      console.error('Danışan verisi yükleme hatası:', error);
      Alert.alert('Hata', 'Danışan bilgileri yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!client.name.trim()) {
      newErrors.name = 'Ad Soyad gereklidir';
    }
    
    if (!client.email.trim()) {
      newErrors.email = 'E-posta gereklidir';
    } else if (!/\S+@\S+\.\S+/.test(client.email)) {
      newErrors.email = 'Geçerli bir e-posta adresi giriniz';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      setSaving(true);
      
      // Sayısal alanları dönüştür
      const clientData = {
        ...client,
        height: client.height ? parseFloat(client.height) : undefined,
        startingWeight: client.startingWeight ? parseFloat(client.startingWeight) : undefined,
        targetWeight: client.targetWeight ? parseFloat(client.targetWeight) : undefined
      };
      
      let response;
      
      if (isCreating) {
        response = await apiRequest('POST', '/clients', clientData, token);
      } else {
        response = await apiRequest('PUT', `/clients/${clientId}`, clientData, token);
      }
      
      if (response) {
        Alert.alert(
          'Başarılı', 
          isCreating ? 'Danışan başarıyla oluşturuldu' : 'Danışan bilgileri güncellendi',
          [{ text: 'Tamam', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error('Danışan kaydetme hatası:', error);
      Alert.alert('Hata', 'Danışan kaydedilirken bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const navigateToMeasurements = () => {
    navigation.navigate('Measurements', { 
      clientId: clientId,
      clientName: client?.name
    });
  };

  const navigateToDietPlans = () => {
    navigation.navigate('DietPlans', { 
      clientId: clientId,
      clientName: client?.name
    });
  };

  const navigateToProgress = () => {
    navigation.navigate('ClientProgress', { 
      clientId: clientId,
      clientName: client?.name
    });
  };

  const navigateToMealCompliance = () => {
    navigation.navigate('MealCompliance', { 
      clientId: clientId,
      clientName: client?.name
    });
  };

  // Client actions buttons
  const renderClientActions = () => (
    <View style={styles.actionsContainer}>
      <Button 
        mode="contained" 
        icon="ruler" 
        onPress={navigateToMeasurements}
        style={styles.actionButton}
      >
        Ölçümler
      </Button>
      <Button 
        mode="contained" 
        icon="food-apple" 
        onPress={navigateToDietPlans}
        style={styles.actionButton}
      >
        Diyet Planları
      </Button>
      <Button 
        mode="contained" 
        icon="chart-line" 
        onPress={navigateToProgress}
        style={styles.actionButton}
      >
        İlerleme
      </Button>
      <Button 
        mode="contained" 
        icon="clipboard-check" 
        onPress={navigateToMealCompliance}
        style={styles.actionButton}
      >
        Beslenme Uyumu
      </Button>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4caf50" />
        <Text style={styles.loadingText}>Danışan bilgileri yükleniyor...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {isCreating || isEditing ? (
          // Form görünümü
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.title}>
                {isCreating ? 'Yeni Danışan Ekle' : 'Danışan Bilgilerini Düzenle'}
              </Title>
              
              <TextInput
                label="Ad Soyad *"
                value={client.name}
                onChangeText={(text) => setClient({...client, name: text})}
                mode="outlined"
                style={styles.input}
                error={!!errors.name}
                outlineColor="#4caf50"
                activeOutlineColor="#2e7d32"
              />
              {errors.name && <HelperText type="error">{errors.name}</HelperText>}
              
              <TextInput
                label="E-posta *"
                value={client.email}
                onChangeText={(text) => setClient({...client, email: text})}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
                error={!!errors.email}
                outlineColor="#4caf50"
                activeOutlineColor="#2e7d32"
              />
              {errors.email && <HelperText type="error">{errors.email}</HelperText>}
              
              <TextInput
                label="Telefon"
                value={client.phone}
                onChangeText={(text) => setClient({...client, phone: text})}
                mode="outlined"
                keyboardType="phone-pad"
                style={styles.input}
                outlineColor="#4caf50"
                activeOutlineColor="#2e7d32"
              />
              
              <View style={styles.row}>
                <Text style={styles.switchLabel}>Cinsiyet:</Text>
                <View style={styles.genderContainer}>
                  <Chip
                    selected={client.gender === 'female'}
                    onPress={() => setClient({...client, gender: 'female'})}
                    style={[styles.genderChip, client.gender === 'female' && styles.selectedChip]}
                    textStyle={client.gender === 'female' ? {color: 'white'} : {}}
                  >
                    Kadın
                  </Chip>
                  <Chip
                    selected={client.gender === 'male'}
                    onPress={() => setClient({...client, gender: 'male'})}
                    style={[styles.genderChip, client.gender === 'male' && styles.selectedChip]}
                    textStyle={client.gender === 'male' ? {color: 'white'} : {}}
                  >
                    Erkek
                  </Chip>
                </View>
              </View>
              
              <TextInput
                label="Doğum Tarihi (GG/AA/YYYY)"
                value={client.birthDate}
                onChangeText={(text) => setClient({...client, birthDate: text})}
                mode="outlined"
                style={styles.input}
                placeholder="01/01/1990"
                outlineColor="#4caf50"
                activeOutlineColor="#2e7d32"
              />
              
              <View style={styles.rowInputs}>
                <TextInput
                  label="Boy (cm)"
                  value={client.height}
                  onChangeText={(text) => setClient({...client, height: text})}
                  mode="outlined"
                  keyboardType="numeric"
                  style={[styles.input, {flex: 1, marginRight: 8}]}
                  outlineColor="#4caf50"
                  activeOutlineColor="#2e7d32"
                />
                
                <TextInput
                  label="Başlangıç Kilosu (kg)"
                  value={client.startingWeight}
                  onChangeText={(text) => setClient({...client, startingWeight: text})}
                  mode="outlined"
                  keyboardType="numeric"
                  style={[styles.input, {flex: 1, marginLeft: 8}]}
                  outlineColor="#4caf50"
                  activeOutlineColor="#2e7d32"
                />
              </View>
              
              <TextInput
                label="Hedef Kilo (kg)"
                value={client.targetWeight}
                onChangeText={(text) => setClient({...client, targetWeight: text})}
                mode="outlined"
                keyboardType="numeric"
                style={styles.input}
                outlineColor="#4caf50"
                activeOutlineColor="#2e7d32"
              />
              
              <TextInput
                label="Aktivite Seviyesi"
                value={client.activityLevel}
                onChangeText={(text) => setClient({...client, activityLevel: text})}
                mode="outlined"
                style={styles.input}
                outlineColor="#4caf50"
                activeOutlineColor="#2e7d32"
              />
              
              <TextInput
                label="Sağlık Geçmişi"
                value={client.medicalHistory}
                onChangeText={(text) => setClient({...client, medicalHistory: text})}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.textArea}
                outlineColor="#4caf50"
                activeOutlineColor="#2e7d32"
              />
              
              <TextInput
                label="Diyet Kısıtlamaları"
                value={client.dietaryRestrictions}
                onChangeText={(text) => setClient({...client, dietaryRestrictions: text})}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.textArea}
                outlineColor="#4caf50"
                activeOutlineColor="#2e7d32"
              />
              
              <TextInput
                label="Notlar"
                value={client.notes}
                onChangeText={(text) => setClient({...client, notes: text})}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.textArea}
                outlineColor="#4caf50"
                activeOutlineColor="#2e7d32"
              />
              
              <View style={styles.buttonContainer}>
                <Button 
                  mode="outlined" 
                  onPress={handleCancel}
                  style={styles.buttonCancel}
                  labelStyle={{ color: '#757575' }}
                >
                  İptal
                </Button>
                
                <Button 
                  mode="contained" 
                  onPress={handleSave}
                  style={styles.buttonSave}
                  loading={saving}
                  disabled={saving}
                  buttonColor="#4caf50"
                >
                  Kaydet
                </Button>
              </View>
            </Card.Content>
          </Card>
        ) : (
          // Detay görünümü
          <View>
            <Card style={styles.detailCard}>
              <Card.Content style={styles.profileHeader}>
                <Avatar.Image 
                  size={80} 
                  source={client.profilePicture ? { uri: client.profilePicture } : require('../../../assets/images/icon.png')} 
                />
                <View style={styles.profileInfo}>
                  <Title style={styles.clientName}>{client.name}</Title>
                  <Text style={styles.clientDetail}>{client.email}</Text>
                  {client.phone && <Text style={styles.clientDetail}>{client.phone}</Text>}
                </View>
              </Card.Content>
            </Card>

            <Card style={styles.detailCard}>
              <Card.Content>
                <Title style={styles.sectionTitle}>Kişisel Bilgiler</Title>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Cinsiyet:</Text>
                  <Text style={styles.detailValue}>{client.gender === 'male' ? 'Erkek' : 'Kadın'}</Text>
                </View>
                
                {client.birthDate && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Doğum Tarihi:</Text>
                    <Text style={styles.detailValue}>{client.birthDate}</Text>
                  </View>
                )}
                
                {client.height && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Boy:</Text>
                    <Text style={styles.detailValue}>{client.height} cm</Text>
                  </View>
                )}
                
                {client.startingWeight && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Başlangıç Kilo:</Text>
                    <Text style={styles.detailValue}>{client.startingWeight} kg</Text>
                  </View>
                )}
                
                {client.targetWeight && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Hedef Kilo:</Text>
                    <Text style={styles.detailValue}>{client.targetWeight} kg</Text>
                  </View>
                )}
                
                {client.activityLevel && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Aktivite Seviyesi:</Text>
                    <Text style={styles.detailValue}>{client.activityLevel}</Text>
                  </View>
                )}
              </Card.Content>
            </Card>

            {(client.medicalHistory || client.dietaryRestrictions || client.notes) && (
              <Card style={styles.detailCard}>
                <Card.Content>
                  <Title style={styles.sectionTitle}>Sağlık ve Diyet Bilgileri</Title>
                  
                  {client.medicalHistory && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Sağlık Geçmişi:</Text>
                      <Text style={styles.detailText}>{client.medicalHistory}</Text>
                    </View>
                  )}
                  
                  {client.dietaryRestrictions && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Diyet Kısıtlamaları:</Text>
                      <Text style={styles.detailText}>{client.dietaryRestrictions}</Text>
                    </View>
                  )}
                  
                  {client.notes && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Notlar:</Text>
                      <Text style={styles.detailText}>{client.notes}</Text>
                    </View>
                  )}
                </Card.Content>
              </Card>
            )}

            <View style={styles.buttonContainer}>
              <Button 
                mode="contained" 
                onPress={() => navigation.navigate('Measurements', { clientId })}
                style={styles.actionButton}
                buttonColor="#2196f3"
                icon="ruler"
              >
                Ölçümler
              </Button>
              
              <Button 
                mode="contained" 
                onPress={() => navigation.navigate('DietPlans', { clientId })}
                style={styles.actionButton}
                buttonColor="#ff9800"
                icon="food-apple"
              >
                Diyet Planları
              </Button>
            </View>
            
            <View style={styles.buttonContainer}>
              <Button 
                mode="outlined" 
                onPress={() => navigation.setParams({ isEditing: true })}
                style={styles.editButton}
                icon="pencil"
              >
                Düzenle
              </Button>
            </View>

            {/* İşlem Butonları */}
            <Card style={styles.card}>
              <Card.Content>
                <Title style={styles.title}>İşlemler</Title>
                <View style={styles.actionsContainer}>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('Measurements', { 
                      clientId: clientId, 
                      clientName: client.name 
                    })}
                  >
                    <View style={[styles.actionIcon, { backgroundColor: '#2196F3' }]}>
                      <Ionicons name="analytics" size={24} color="white" />
                    </View>
                    <Text style={styles.actionText}>Ölçümler</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('DietPlans', { 
                      clientId: clientId, 
                      clientName: client.name 
                    })}
                  >
                    <View style={[styles.actionIcon, { backgroundColor: '#4CAF50' }]}>
                      <Ionicons name="restaurant" size={24} color="white" />
                    </View>
                    <Text style={styles.actionText}>Diyet Planı</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('ClientMealPlanner', { 
                      clientId: clientId, 
                      clientName: client.name 
                    })}
                  >
                    <View style={[styles.actionIcon, { backgroundColor: '#FF9800' }]}>
                      <Ionicons name="nutrition" size={24} color="white" />
                    </View>
                    <Text style={styles.actionText}>Beslenme Takibi</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('ExerciseTracking', { 
                      clientId: clientId, 
                      clientName: client.name 
                    })}
                  >
                    <View style={[styles.actionIcon, { backgroundColor: '#9C27B0' }]}>
                      <Ionicons name="fitness" size={24} color="white" />
                    </View>
                    <Text style={styles.actionText}>Egzersiz Takibi</Text>
                  </TouchableOpacity>
                </View>
              </Card.Content>
            </Card>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    padding: 16,
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
  card: {
    marginBottom: 16,
    borderRadius: 10,
    elevation: 4,
  },
  title: {
    marginBottom: 16,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  input: {
    marginBottom: 12,
    backgroundColor: 'white',
  },
  textArea: {
    marginBottom: 12,
    backgroundColor: 'white',
    height: 80,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  switchLabel: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  genderContainer: {
    flexDirection: 'row',
    flex: 2,
  },
  genderChip: {
    marginRight: 8,
  },
  selectedChip: {
    backgroundColor: '#4caf50',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  buttonCancel: {
    flex: 1,
    marginRight: 8,
    borderColor: '#757575',
  },
  buttonSave: {
    flex: 1,
    marginLeft: 8,
  },
  detailCard: {
    marginBottom: 16,
    borderRadius: 10,
    elevation: 3,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  clientName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  clientDetail: {
    fontSize: 14,
    color: '#757575',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4caf50',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    width: 120,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  detailSection: {
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#333',
    marginTop: 4,
  },
  actionButton: {
    width: '48%',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
  },
  editButton: {
    flex: 1,
    borderColor: '#4caf50',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginTop: 16,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
});

export default ClientDetailsScreen; 