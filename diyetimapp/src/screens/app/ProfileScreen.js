import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Dimensions,
  StatusBar,
  Linking,
  RefreshControl
} from 'react-native';
import { 
  Button, 
  TextInput, 
  Title, 
  Paragraph, 
  Avatar, 
  Divider,
  Card,
  IconButton,
  Menu,
  Surface,
  Portal,
  Modal
} from 'react-native-paper';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import theme from '../../themes/theme';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

// Tarih formatı yardımcı fonksiyonu
const formatDate = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('tr-TR', options);
};

// Kullanıcının gerçek verileri
const DEFAULT_USER_DATA = {
  _id: "6830897a5ad1372d82cff6ec",
  email: "mn.adymn23@gmail.com",
  name: "Mehmet Nuri ADIYAMAN",
  createdAt: new Date("2024-07-19").toISOString(), // Düzeltilmiş tarih formatı
  updatedAt: new Date("2024-07-15").toISOString(),
  profilePicture: "https://res.cloudinary.com/emmitech/image/upload/v1747266439/profiles/yyode12wq1xcsqzccs9q.jpg",
  telegramToken: "7141511611:AAHGmBhZnW8YiBKsV3cXA8cEFCsl3A0WNYk",
  bio: "Profesyonel diyetisyen olarak sağlıklı beslenme konusunda danışanlarıma hizmet vermekteyim.",
  phone: "+90 555 123 4567"
};

// LocalStorage anahtarları
const STORAGE_KEYS = {
  PROFILE_DATA: 'diyetim_profile_data'
};

const ProfileScreen = ({ navigation }) => {
  const { user, logout, updateUserInfo } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [userData, setUserData] = useState({});
  const [error, setError] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [isImageViewerVisible, setImageViewerVisible] = useState(false);
  
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [telegramToken, setTelegramToken] = useState('');
  
  useEffect(() => {
    loadUserData();
  }, []);
  
  // Verileri AsyncStorage'den yükle veya default değerleri kullan
  const loadUserData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let savedData;
      
      try {
        // AsyncStorage'dan kayıtlı veriyi al
        const storedData = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE_DATA);
        savedData = storedData ? JSON.parse(storedData) : null;
      } catch (storageError) {
        console.error('AsyncStorage okuma hatası:', storageError);
        savedData = null;
      }
      
      // Kayıtlı veri varsa kullan, yoksa default veriyi kullan
      const profileData = savedData || DEFAULT_USER_DATA;
      
      setUserData(profileData);
      setName(profileData.name || '');
      setEmail(profileData.email || '');
      setPhone(profileData.phone || '');
      setBio(profileData.bio || '');
      setTelegramToken(profileData.telegramToken || '');
    } catch (err) {
      console.error('Profil verisi yükleme hatası:', err);
      setError('Profil bilgileri yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadUserData();
  }, []);
  
  const handleEdit = () => {
    setEditing(true);
  };
  
  const handleCancel = () => {
    setEditing(false);
    // Form alanlarını sıfırla
    if (userData) {
      setName(userData.name || '');
      setEmail(userData.email || '');
      setPhone(userData.phone || '');
      setBio(userData.bio || '');
      setTelegramToken(userData.telegramToken || '');
    }
  };
  
  const handleSave = async () => {
    try {
      setSaving(true);
      
      const updatedData = {
        ...userData,
        name,
        email,
        phone,
        bio,
        telegramToken,
        updatedAt: new Date().toISOString()
      };
      
      // AsyncStorage'a kaydet
      await AsyncStorage.setItem(STORAGE_KEYS.PROFILE_DATA, JSON.stringify(updatedData));
      
      // Global state'i güncelle
      if (updateUserInfo) {
        updateUserInfo({
          ...user,
          name,
          email
        });
      }
      
      // Yerel state'i güncelle
      setUserData(updatedData);
      
      setEditing(false);
      Alert.alert('Başarılı', 'Profil bilgileriniz güncellendi');
    } catch (err) {
      console.error('Profil güncelleme hatası:', err);
      setError('Profil güncellenirken bir hata oluştu');
      Alert.alert('Hata', 'Profil bilgileriniz güncellenirken bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Galeriye erişim izni vererek profil fotoğrafı seçebilirsiniz.');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        uploadProfilePicture(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Fotoğraf seçme hatası:', err);
      Alert.alert('Hata', 'Fotoğraf seçilirken bir sorun oluştu.');
    }
  };

  const uploadProfilePicture = async (imageUri) => {
    try {
      setUploadingImage(true);
      
      // Normalde burası API'ye gönderilir, şimdi yerel olarak kaydediyoruz
      const updatedData = {
        ...userData,
        profilePicture: imageUri, // Local URI'yi kullan (gerçek bir API'de URL olacaktır)
        updatedAt: new Date().toISOString()
      };
      
      // AsyncStorage'a kaydet
      await AsyncStorage.setItem(STORAGE_KEYS.PROFILE_DATA, JSON.stringify(updatedData));
      
      // Global state'i güncelle
      if (updateUserInfo) {
        updateUserInfo({
          ...user,
          profilePicture: imageUri
        });
      }
      
      // Yerel state'i güncelle
      setUserData(updatedData);
      
      Alert.alert('Başarılı', 'Profil fotoğrafı güncellendi (yerel)');
    } catch (err) {
      console.error('Profil fotoğrafı yükleme hatası:', err);
      Alert.alert('Hata', 'Profil fotoğrafı yüklenirken bir sorun oluştu');
    } finally {
      setUploadingImage(false);
    }
  };
  
  const handleLogout = () => {
    Alert.alert(
      'Çıkış Yap',
      'Hesabınızdan çıkmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Çıkış Yap', onPress: () => logout && logout(), style: 'destructive' }
      ]
    );
  };
  
  const handleChangePassword = () => {
    Alert.alert('Bilgi', 'Bu özellik yakında gelecek');
  };

  const handleTelegramConnect = () => {
    if (telegramToken) {
      Linking.openURL(`https://t.me/DiyetimTakipBot?start=${telegramToken}`);
    } else {
      Alert.alert('Hata', 'Telegram bağlantı kodu bulunamadı.');
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.palette.primary.main} />
        <Text style={styles.loadingText}>Profil bilgileri yükleniyor...</Text>
      </View>
    );
  }
  
  if (error && !Object.keys(userData).length) {
    return (
      <View style={styles.centerContainer}>
        <MaterialCommunityIcons name="alert-circle-outline" size={60} color="#f44336" />
        <Text style={styles.errorText}>{error}</Text>
        <Button 
          mode="contained" 
          onPress={loadUserData}
          style={styles.retryButton}
          buttonColor={theme.palette.primary.main}
        >
          Tekrar Dene
        </Button>
      </View>
    );
  }

  const renderProfileImage = () => {
    if (uploadingImage) {
      return (
        <View style={styles.profileImageContainer}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      );
    }
    
    if (userData.profilePicture) {
      return (
        <TouchableOpacity
          onPress={() => setImageViewerVisible(true)}
          style={styles.profileImageContainer}
        >
          <Image 
            source={{ uri: userData.profilePicture }} 
            style={styles.profileImage} 
          />
          <View style={styles.editImageButtonContainer}>
            <TouchableOpacity 
              style={styles.editImageButton}
              onPress={pickImage}
            >
              <Ionicons name="camera" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      );
    }
    
    return (
      <TouchableOpacity
        onPress={pickImage}
        style={styles.profileImageContainer}
      >
        <Avatar.Text 
          size={110} 
          label={name ? name.substring(0, 2).toUpperCase() : "??"}
          color="#fff"
          style={styles.avatarText}
        />
        <View style={styles.editImageButtonContainer}>
          <TouchableOpacity 
            style={styles.editImageButton}
            onPress={pickImage}
          >
            <Ionicons name="camera" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };
  
  return (
    <>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="transparent" 
        translucent 
      />
      
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.palette.primary.main]} />
        }
      >
        {/* Başlık Alanı */}
        <LinearGradient
          colors={['#4caf50', '#2e7d32']}
          style={styles.headerGradient}
        >
          {renderProfileImage()}
          
          <View style={styles.headerTextContainer}>
            <Title style={styles.name}>{name || 'İsim Belirtilmemiş'}</Title>
            <Paragraph style={styles.role}>Diyetisyen</Paragraph>
            
            {!editing && (
              <View style={styles.headerButtons}>
                <Button 
                  mode="contained" 
                  onPress={handleEdit}
                  style={[styles.headerButton, styles.editProfileButton]}
                  labelStyle={styles.headerButtonLabel}
                  icon="account-edit"
                >
                  Profili Düzenle
                </Button>
                
                <IconButton
                  icon="dots-vertical"
                  iconColor="#fff"
                  size={24}
                  style={styles.menuButton}
                  onPress={() => setMenuVisible(true)}
                />
                
                <Menu
                  visible={menuVisible}
                  onDismiss={() => setMenuVisible(false)}
                  anchor={<View />}
                  style={styles.menu}
                >
                  <Menu.Item 
                    onPress={() => {
                      setMenuVisible(false);
                      handleChangePassword();
                    }} 
                    title="Şifre Değiştir"
                    leadingIcon="lock-reset"
                  />
                  <Menu.Item 
                    onPress={() => {
                      setMenuVisible(false);
                      handleTelegramConnect();
                    }} 
                    title="Telegram'a Bağlan"
                    leadingIcon="send"
                  />
                  <Divider />
                  <Menu.Item 
                    onPress={() => {
                      setMenuVisible(false);
                      handleLogout();
                    }} 
                    title="Çıkış Yap"
                    leadingIcon="logout"
                    titleStyle={{ color: '#f44336' }}
                  />
                </Menu>
              </View>
            )}
          </View>
        </LinearGradient>

        {/* İçerik Alanı */}
        <View style={styles.contentContainer}>
          {editing ? (
            <Card style={styles.card}>
              <Card.Content>
                <View style={styles.formHeaderWrapper}>
                  <Surface style={[styles.formHeaderSurface, {overflow: 'hidden'}]}>
                    <View style={{padding: 12}}>
                      <Title style={styles.formTitle}>Profil Bilgilerini Düzenle</Title>
                    </View>
                  </Surface>
                </View>
                
                <View style={styles.formContainer}>
                  <Text style={styles.fieldLabel}>Ad Soyad</Text>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    style={styles.input}
                    mode="outlined"
                    outlineColor="#d0d0d0"
                    activeOutlineColor={theme.palette.primary.main}
                    disabled={saving}
                    left={<TextInput.Icon icon="account" color="#757575" />}
                  />
                  
                  <Text style={styles.fieldLabel}>E-posta</Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    style={styles.input}
                    mode="outlined"
                    outlineColor="#d0d0d0"
                    activeOutlineColor={theme.palette.primary.main}
                    disabled={saving}
                    keyboardType="email-address"
                    left={<TextInput.Icon icon="email" color="#757575" />}
                  />
                  
                  <Text style={styles.fieldLabel}>Telefon</Text>
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    style={styles.input}
                    mode="outlined"
                    outlineColor="#d0d0d0"
                    activeOutlineColor={theme.palette.primary.main}
                    disabled={saving}
                    keyboardType="phone-pad"
                    left={<TextInput.Icon icon="phone" color="#757575" />}
                  />
                  
                  <Text style={styles.fieldLabel}>Biyografi</Text>
                  <TextInput
                    value={bio}
                    onChangeText={setBio}
                    style={styles.textArea}
                    mode="outlined"
                    outlineColor="#d0d0d0"
                    activeOutlineColor={theme.palette.primary.main}
                    disabled={saving}
                    multiline={true}
                    numberOfLines={3}
                    left={<TextInput.Icon icon="card-account-details" color="#757575" />}
                  />

                  <Text style={styles.fieldLabel}>Telegram Token</Text>
                  <TextInput
                    value={telegramToken}
                    onChangeText={setTelegramToken}
                    style={styles.input}
                    mode="outlined"
                    outlineColor="#d0d0d0"
                    activeOutlineColor={theme.palette.primary.main}
                    disabled={saving}
                    left={<TextInput.Icon icon="send" color="#757575" />}
                  />
                  
                  <View style={styles.formActions}>
                    <Button 
                      mode="outlined" 
                      onPress={handleCancel}
                      style={styles.cancelButton}
                      disabled={saving}
                    >
                      İptal
                    </Button>
                    <Button 
                      mode="contained" 
                      onPress={handleSave}
                      style={styles.saveButton}
                      buttonColor={theme.palette.primary.main}
                      loading={saving}
                      disabled={saving}
                    >
                      Kaydet
                    </Button>
                  </View>
                </View>
              </Card.Content>
            </Card>
          ) : (
            <>
              <Card style={styles.card}>
                <Card.Content>
                  <View style={styles.cardHeader}>
                    <Title style={styles.cardTitle}>Kişisel Bilgiler</Title>
                    <MaterialCommunityIcons name="account-details" size={24} color={theme.palette.primary.main} />
                  </View>
                  
                  <View style={styles.infoRow}>
                    <View style={styles.infoIconContainer}>
                      <Ionicons name="person" size={20} color={theme.palette.primary.main} />
                    </View>
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>Ad Soyad</Text>
                      <Text style={styles.infoValue}>{name || 'Belirtilmemiş'}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <View style={styles.infoIconContainer}>
                      <Ionicons name="mail" size={20} color={theme.palette.primary.main} />
                    </View>
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>E-posta</Text>
                      <Text style={styles.infoValue}>{email || 'Belirtilmemiş'}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <View style={styles.infoIconContainer}>
                      <Ionicons name="call" size={20} color={theme.palette.primary.main} />
                    </View>
                    <View style={styles.infoTextContainer}>
                      <Text style={styles.infoLabel}>Telefon</Text>
                      <Text style={styles.infoValue}>{phone || 'Belirtilmemiş'}</Text>
                    </View>
                  </View>
                  
                  {userData.createdAt && (
                    <View style={styles.infoRow}>
                      <View style={styles.infoIconContainer}>
                        <Ionicons name="calendar" size={20} color={theme.palette.primary.main} />
                      </View>
                      <View style={styles.infoTextContainer}>
                        <Text style={styles.infoLabel}>Üyelik Tarihi</Text>
                        <Text style={styles.infoValue}>
                          {formatDate(userData.createdAt)}
                        </Text>
                      </View>
                    </View>
                  )}
                </Card.Content>
              </Card>

              <Card style={styles.card}>
                <Card.Content>
                  <View style={styles.cardHeader}>
                    <Title style={styles.cardTitle}>Biyografi</Title>
                    <MaterialCommunityIcons name="card-text-outline" size={24} color={theme.palette.primary.main} />
                  </View>
                  
                  <Text style={styles.bioText}>
                    {bio || 'Henüz bir biyografi eklenmemiş.'}
                  </Text>
                </Card.Content>
              </Card>

              <Card style={styles.card}>
                <Card.Content>
                  <View style={styles.cardHeader}>
                    <Title style={styles.cardTitle}>Uygulama Entegrasyonu</Title>
                    <MaterialCommunityIcons name="connection" size={24} color={theme.palette.primary.main} />
                  </View>
                  
                  <View style={styles.integrationContainer}>
                    <View style={styles.integrationItem}>
                      <View style={styles.integrationIconContainer}>
                        <MaterialCommunityIcons name="send" size={28} color="#0088cc" />
                      </View>
                      <View style={styles.integrationTextContainer}>
                        <Text style={styles.integrationTitle}>Telegram Bot</Text>
                        <Text style={styles.integrationDescription}>
                          Telegram bot ile danışanlarınıza daha hızlı ulaşın!
                        </Text>
                        <Button 
                          mode="contained" 
                          onPress={handleTelegramConnect}
                          style={styles.telegramButton}
                          labelStyle={styles.telegramButtonLabel}
                          icon="link-variant"
                        >
                          {telegramToken ? 'Telegram\'a Bağlan' : 'Token Gerekli'}
                        </Button>
                      </View>
                    </View>
                  </View>
                </Card.Content>
              </Card>

              <View style={styles.footer}>
                <Button 
                  mode="outlined" 
                  onPress={handleLogout}
                  style={styles.logoutButton}
                  icon="logout"
                  textColor="#f44336"
                >
                  Çıkış Yap
                </Button>
                <Text style={styles.versionText}>DiyetimTakip v1.2.0</Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Profil Resmi Görüntüleme Modalı */}
      <Portal>
        <Modal 
          visible={isImageViewerVisible} 
          onDismiss={() => setImageViewerVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          {userData.profilePicture && (
            <>
              <Image 
                source={{ uri: userData.profilePicture }} 
                style={styles.modalImage} 
                resizeMode="contain"
              />
              <IconButton
                icon="close"
                size={28}
                iconColor="#fff"
                style={styles.closeModalButton}
                onPress={() => setImageViewerVisible(false)}
              />
              <IconButton
                icon="pencil"
                size={28}
                iconColor="#fff"
                style={styles.editModalButton}
                onPress={() => {
                  setImageViewerVisible(false);
                  setTimeout(() => pickImage(), 300);
                }}
              />
            </>
          )}
        </Modal>
      </Portal>
    </>
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
    fontSize: 16,
  },
  errorText: {
    color: '#f44336',
    textAlign: 'center',
    fontSize: 16,
    marginTop: 10,
    marginBottom: 10,
  },
  retryButton: {
    marginTop: 16,
    borderRadius: 8,
  },
  // Header styles
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 60 : StatusBar.currentHeight + 25,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  profileImageContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 3,
    borderColor: '#fff',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 55,
  },
  avatarText: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  editImageButtonContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  editImageButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.palette.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  headerTextContainer: {
    alignItems: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  role: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  headerButtons: {
    flexDirection: 'row',
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButton: {
    borderRadius: 20,
    height: 40,
  },
  headerButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 8,
  },
  editProfileButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  menuButton: {
    marginLeft: 10,
  },
  menu: {
    marginTop: -120,
    marginLeft: -20,
    width: 200,
  },
  // Content styles
  contentContainer: {
    marginTop: -20,
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  card: {
    marginBottom: 16,
    borderRadius: 10,
    elevation: 2,
    overflow: 'hidden',
    borderWidth: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  // Info row styles
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(76,175,80,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  // Bio card
  bioText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
  },
  // Integration section
  integrationContainer: {
    marginTop: 8,
  },
  integrationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  integrationIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,136,204,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  integrationTextContainer: {
    flex: 1,
  },
  integrationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  integrationDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  telegramButton: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    height: 36,
    backgroundColor: '#0088cc',
  },
  telegramButtonLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Form styles
  formHeaderWrapper: {
    marginBottom: 20,
  },
  formHeaderSurface: {
    backgroundColor: 'rgba(76,175,80,0.08)',
    borderRadius: 8,
    elevation: 0,
    padding: 0,
  },
  formTitle: {
    fontSize: 18,
    color: theme.palette.primary.main,
    fontWeight: '700',
    textAlign: 'center',
  },
  formContainer: {
    marginTop: 10,
  },
  fieldLabel: {
    fontSize: 14,
    color: '#555',
    marginBottom: 6,
    marginLeft: 4,
    fontWeight: '500',
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
    height: 50,
  },
  textArea: {
    marginBottom: 16,
    backgroundColor: '#fff',
    maxHeight: 100,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    marginRight: 10,
  },
  saveButton: {
    flex: 1, 
    marginLeft: 10,
  },
  // Footer
  footer: {
    marginTop: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  logoutButton: {
    marginBottom: 20,
    borderColor: '#f44336',
    borderWidth: 1,
    marginHorizontal: 20,
    width: '100%',
    alignSelf: 'center',
  },
  versionText: {
    color: '#9e9e9e',
    fontSize: 12,
  },
  // Image viewer modal
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    margin: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: width,
    height: width,
    borderRadius: 8,
  },
  closeModalButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },
  editModalButton: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  }
});

export default ProfileScreen; 