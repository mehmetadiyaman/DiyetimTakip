import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  Image
} from 'react-native';
import { 
  Card, 
  Button, 
  TextInput, 
  Title, 
  Paragraph, 
  Avatar, 
  Divider,
  Switch
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { apiRequest } from '../../api/config';

const ProfileScreen = ({ navigation }) => {
  const { user, token, logout, updateUserInfo } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [userData, setUserData] = useState({});
  const [error, setError] = useState(null);
  
  // Bildirim ayarları
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  
  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);
  
  const loadUserData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Kullanıcı bilgilerini yükle
      const data = await apiRequest('GET', `/users/${user.id}`, null, token);
      if (data) {
        setUserData(data);
        setEmailNotifications(data.preferences?.emailNotifications ?? true);
        setPushNotifications(data.preferences?.pushNotifications ?? true);
      }
    } catch (err) {
      console.error('Profil verisi yükleme hatası:', err);
      setError('Profil bilgileri yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };
  
  const handleEdit = () => {
    setEditing(true);
  };
  
  const handleCancel = () => {
    setEditing(false);
    // Değişiklikleri geri al
    if (user) {
      loadUserData();
    }
  };
  
  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Sadece değiştirilmiş alanları içeren nesne oluştur
      const updatedData = {
        ...userData,
        preferences: {
          emailNotifications,
          pushNotifications
        }
      };
      
      const result = await apiRequest('PUT', `/users/${user.id}`, updatedData, token);
      
      if (result) {
        // Kullanıcı context'ini güncelle
        updateUserInfo({
          ...user,
          name: userData.name,
          email: userData.email
        });
        
        setEditing(false);
        Alert.alert('Başarılı', 'Profil bilgileriniz güncellendi');
      }
    } catch (err) {
      console.error('Profil güncelleme hatası:', err);
      setError('Profil güncellenirken bir hata oluştu');
      Alert.alert('Hata', 'Profil bilgileriniz güncellenirken bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };
  
  const handleLogout = () => {
    Alert.alert(
      'Çıkış Yap',
      'Hesabınızdan çıkmak istediğinize emin misiniz?',
      [
        {
          text: 'İptal',
          style: 'cancel'
        },
        {
          text: 'Çıkış Yap',
          onPress: () => logout(),
          style: 'destructive'
        }
      ]
    );
  };
  
  const handleChangePassword = () => {
    // Şifre değiştirme ekranına git veya modal göster
    Alert.alert('Bilgi', 'Bu özellik yakında gelecek');
  };
  
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4caf50" />
        <Text style={styles.loadingText}>Profil bilgileri yükleniyor...</Text>
      </View>
    );
  }
  
  if (error && !userData) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Button 
          mode="contained" 
          onPress={loadUserData}
          style={{ marginTop: 16 }}
          buttonColor="#4caf50"
        >
          Tekrar Dene
        </Button>
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Avatar.Icon 
          size={80} 
          icon="account" 
          style={styles.avatar}
          color="#fff"
          backgroundColor="#4caf50"
        />
        <View style={styles.headerInfo}>
          <Title style={styles.name}>{userData.name || user?.name || 'Kullanıcı'}</Title>
          <Paragraph style={styles.role}>{userData.role === 'admin' ? 'Yönetici' : 'Diyetisyen'}</Paragraph>
        </View>
      </View>
      
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Hesap Bilgileri</Title>
          
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Ad Soyad</Text>
            {editing ? (
              <TextInput
                value={userData.name}
                onChangeText={(text) => setUserData({...userData, name: text})}
                style={styles.input}
                disabled={saving}
              />
            ) : (
              <Text style={styles.fieldValue}>{userData.name || 'Belirtilmemiş'}</Text>
            )}
          </View>
          
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>E-posta</Text>
            {editing ? (
              <TextInput
                value={userData.email}
                onChangeText={(text) => setUserData({...userData, email: text})}
                style={styles.input}
                disabled={saving}
                keyboardType="email-address"
              />
            ) : (
              <Text style={styles.fieldValue}>{userData.email || 'Belirtilmemiş'}</Text>
            )}
          </View>
          
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Telefon</Text>
            {editing ? (
              <TextInput
                value={userData.phone}
                onChangeText={(text) => setUserData({...userData, phone: text})}
                style={styles.input}
                disabled={saving}
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.fieldValue}>{userData.phone || 'Belirtilmemiş'}</Text>
            )}
          </View>
          
          {editing ? (
            <View style={styles.actionButtons}>
              <Button 
                mode="outlined" 
                onPress={handleCancel}
                style={[styles.actionButton, { marginRight: 8 }]}
                disabled={saving}
              >
                İptal
              </Button>
              <Button 
                mode="contained" 
                onPress={handleSave}
                style={styles.actionButton}
                buttonColor="#4caf50"
                loading={saving}
                disabled={saving}
              >
                Kaydet
              </Button>
            </View>
          ) : (
            <Button 
              mode="contained" 
              onPress={handleEdit}
              style={styles.editButton}
              buttonColor="#2196f3"
              icon="pencil"
            >
              Düzenle
            </Button>
          )}
        </Card.Content>
      </Card>
      
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Title style={styles.sectionTitle}>Bildirim Ayarları</Title>
            <TouchableOpacity 
              onPress={() => navigation.navigate('NotificationSettings')}
              style={styles.linkButton}
            >
              <Ionicons name="notifications-outline" size={18} color="#4caf50" style={{marginRight: 4}} />
              <Text style={styles.linkText}>Tüm Ayarlar</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingText}>E-posta Bildirimleri</Text>
            <Switch
              value={emailNotifications}
              onValueChange={setEmailNotifications}
              disabled={!editing || saving}
              color="#4caf50"
            />
          </View>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingText}>Uygulama Bildirimleri</Text>
            <Switch
              value={pushNotifications}
              onValueChange={setPushNotifications}
              disabled={!editing || saving}
              color="#4caf50"
            />
          </View>
        </Card.Content>
      </Card>
      
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Güvenlik</Title>
          
          <Button 
            mode="outlined" 
            onPress={handleChangePassword}
            style={styles.securityButton}
            icon="lock-reset"
          >
            Şifre Değiştir
          </Button>
          
          <Button 
            mode="outlined" 
            onPress={handleLogout}
            style={[styles.securityButton, styles.logoutButton]}
            icon="logout"
            textColor="#f44336"
          >
            Çıkış Yap
          </Button>
        </Card.Content>
      </Card>
      
      <View style={styles.footer}>
        <Text style={styles.versionText}>Diet Tracker v1.0.0</Text>
      </View>
    </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatar: {
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  role: {
    fontSize: 14,
    color: '#757575',
  },
  card: {
    margin: 16,
    marginTop: 8,
    borderRadius: 10,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 16,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    fontSize: 16,
    height: 50,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
  },
  editButton: {
    marginTop: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  linkButton: {
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkText: {
    color: '#4caf50',
    fontSize: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  settingText: {
    fontSize: 16,
    color: '#333',
  },
  securityButton: {
    marginBottom: 12,
  },
  logoutButton: {
    borderColor: '#f44336',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  versionText: {
    color: '#9e9e9e',
    fontSize: 12,
  }
});

export default ProfileScreen; 