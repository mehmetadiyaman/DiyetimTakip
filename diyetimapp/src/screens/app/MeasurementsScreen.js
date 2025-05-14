import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { 
  Card, 
  Title, 
  Button, 
  FAB,
  Dialog,
  TextInput,
  Divider,
  IconButton,
  HelperText,
  SegmentedButtons
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { useFeedback } from '../../contexts/FeedbackContext';
import { get, post } from '../../api/config';
import ProgressTracker from '../../components/common/ProgressTracker';
import MeasurementChart from '../../components/charts/MeasurementChart';
import theme from '../../themes/theme';
import { commonStyles } from '../../themes';

const MeasurementsScreen = ({ route, navigation }) => {
  const { clientId, clientName } = route.params;
  const { token } = useAuth();
  const { showToastSuccess, showToastError } = useToast();
  const { showLoading, hideLoading, showConfirmDialog } = useFeedback();

  const [measurements, setMeasurements] = useState([]);
  const [clientDetails, setClientDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [activeChart, setActiveChart] = useState('weight');
  const [newMeasurement, setNewMeasurement] = useState({
    date: new Date().toISOString().split('T')[0],
    weight: '',
    bodyFat: '',
    chest: '',
    waist: '',
    hips: '',
    arm: '',
    thigh: '',
    notes: ''
  });
  const [errors, setErrors] = useState({});

  // Veri yükleme fonksiyonu
  const loadData = async () => {
    try {
      setLoading(true);
      
      // Danışan detaylarını alma
      const clientData = await get(`/clients/${clientId}`, token);
      setClientDetails(clientData);
      
      // Ölçümleri alma
      const measurementsData = await get(`/clients/${clientId}/measurements`, token);
      setMeasurements(measurementsData || []);
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
      showToastError('Veriler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  useEffect(() => {
    loadData();
    // Ekran başlığını ayarla
    navigation.setOptions({
      title: `${clientName} - Ölçümler`
    });
  }, [clientId]);
  
  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };
  
  const handleAddMeasurement = () => {
    setDialogVisible(true);
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!newMeasurement.weight) {
      newErrors.weight = 'Kilo alanı gereklidir';
    } else if (isNaN(parseFloat(newMeasurement.weight))) {
      newErrors.weight = 'Geçerli bir sayı giriniz';
    }
    
    // Diğer alanlar opsiyonel ancak sayı olmalı
    ['bodyFat', 'chest', 'waist', 'hips', 'arm', 'thigh'].forEach(field => {
      if (newMeasurement[field] && isNaN(parseFloat(newMeasurement[field]))) {
        newErrors[field] = 'Geçerli bir sayı giriniz';
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const saveMeasurement = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      showLoading('Ölçüm kaydediliyor...');
      
      // Sayısal alanları dönüştür
      const measurementData = {
        ...newMeasurement,
        weight: parseFloat(newMeasurement.weight),
        bodyFat: newMeasurement.bodyFat ? parseFloat(newMeasurement.bodyFat) : undefined,
        chest: newMeasurement.chest ? parseFloat(newMeasurement.chest) : undefined,
        waist: newMeasurement.waist ? parseFloat(newMeasurement.waist) : undefined,
        hips: newMeasurement.hips ? parseFloat(newMeasurement.hips) : undefined,
        arm: newMeasurement.arm ? parseFloat(newMeasurement.arm) : undefined,
        thigh: newMeasurement.thigh ? parseFloat(newMeasurement.thigh) : undefined,
      };
      
      // API'ye gönder
      await post(`/clients/${clientId}/measurements`, measurementData, token);
      
      // State'i güncelle ve dialogu kapat
      setDialogVisible(false);
      showToastSuccess('Ölçüm başarıyla kaydedildi');
      
      // Formu temizle
      setNewMeasurement({
        date: new Date().toISOString().split('T')[0],
        weight: '',
        bodyFat: '',
        chest: '',
        waist: '',
        hips: '',
        arm: '',
        thigh: '',
        notes: ''
      });
      
      // Verileri yeniden yükle
      loadData();
    } catch (error) {
      console.error('Ölçüm kaydetme hatası:', error);
      showToastError('Ölçüm kaydedilirken bir hata oluştu');
    } finally {
      hideLoading();
    }
  };
  
  // Son ölçümü alma
  const getLatestMeasurement = () => {
    if (measurements.length === 0) return null;
    
    return measurements.reduce((latest, current) => {
      const latestDate = new Date(latest.date);
      const currentDate = new Date(current.date);
      return currentDate > latestDate ? current : latest;
    }, measurements[0]);
  };
  
  // Grafik verilerini hazırla
  const prepareChartData = (key) => {
    if (measurements.length === 0) return [];
    
    // Tarihe göre sırala
    const sortedMeasurements = [...measurements].sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );
    
    return sortedMeasurements
      .filter(m => m[key] !== undefined && m[key] !== null)
      .map(m => ({
        date: m.date,
        value: m[key]
      }));
  };
  
  // En son ölçüm
  const latestMeasurement = getLatestMeasurement();
  
  // Grafik verileri
  const weightChartData = prepareChartData('weight');
  const bodyFatChartData = prepareChartData('bodyFat');
  const chestChartData = prepareChartData('chest');
  const waistChartData = prepareChartData('waist');
  const hipsChartData = prepareChartData('hips');
  const armChartData = prepareChartData('arm');
  const thighChartData = prepareChartData('thigh');
  
  // Gösterilecek grafiği belirle
  const getActiveChartComponent = () => {
    switch (activeChart) {
      case 'weight':
        return (
          <MeasurementChart 
            data={weightChartData} 
            label="Kilo" 
            unit="kg" 
            color={theme.palette.primary.main}
            type="weight"
          />
        );
      case 'bodyFat':
        return (
          <MeasurementChart 
            data={bodyFatChartData} 
            label="Vücut Yağı" 
            unit="%" 
            color={theme.palette.info.main}
            type="bodyFat"
          />
        );
      case 'measurements':
        return (
          <>
            {chestChartData.length >= 2 && (
              <MeasurementChart 
                data={chestChartData} 
                label="Göğüs" 
                unit="cm" 
                color={theme.palette.secondary.main}
                type="measurement"
              />
            )}
            
            {waistChartData.length >= 2 && (
              <MeasurementChart 
                data={waistChartData} 
                label="Bel" 
                unit="cm" 
                color={theme.palette.error.main}
                type="measurement"
              />
            )}
            
            {hipsChartData.length >= 2 && (
              <MeasurementChart 
                data={hipsChartData} 
                label="Kalça" 
                unit="cm" 
                color={theme.palette.success.main}
                type="measurement"
              />
            )}
            
            {armChartData.length >= 2 && (
              <MeasurementChart 
                data={armChartData} 
                label="Kol" 
                unit="cm" 
                color={theme.palette.warning.main}
                type="measurement"
              />
            )}
            
            {thighChartData.length >= 2 && (
              <MeasurementChart 
                data={thighChartData} 
                label="Bacak" 
                unit="cm" 
                color="#9c27b0"
                type="measurement"
              />
            )}
            
            {chestChartData.length < 2 && waistChartData.length < 2 && 
             hipsChartData.length < 2 && armChartData.length < 2 && 
             thighChartData.length < 2 && (
              <View style={styles.noDataContainer}>
                <Text style={styles.emptyText}>
                  Ölçüm grafikleri için yeterli veri bulunmamaktadır.
                  En az 2 ölçüm kaydı gereklidir.
                </Text>
              </View>
            )}
          </>
        );
      default:
        return null;
    }
  };
  
  if (loading && !refreshing) {
    return (
      <View style={commonStyles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.palette.primary.main} />
        <Text style={commonStyles.loadingText}>Ölçümler yükleniyor...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.palette.primary.main]} />
        }
      >
        {/* İlerleme Kartı */}
        {clientDetails && latestMeasurement && (
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.cardTitle}>Kilo İlerlemesi</Title>
              <ProgressTracker
                startValue={clientDetails.startingWeight}
                currentValue={latestMeasurement.weight}
                targetValue={clientDetails.targetWeight}
                unit="kg"
                label="Kilo Hedefi"
                type="weight"
              />
              
              {latestMeasurement.bodyFat && clientDetails.targetBodyFat && (
                <ProgressTracker
                  startValue={measurements[measurements.length - 1].bodyFat}
                  currentValue={latestMeasurement.bodyFat}
                  targetValue={clientDetails.targetBodyFat}
                  unit="%"
                  label="Vücut Yağı"
                  type="diet"
                />
              )}
            </Card.Content>
          </Card>
        )}
        
        {/* Grafik Kartı */}
        {measurements.length >= 2 && (
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.cardTitle}>Ölçüm Grafikleri</Title>
              
              <SegmentedButtons
                value={activeChart}
                onValueChange={setActiveChart}
                buttons={[
                  {
                    value: 'weight',
                    label: 'Kilo',
                    icon: 'scale',
                    disabled: weightChartData.length < 2
                  },
                  {
                    value: 'bodyFat',
                    label: 'Yağ',
                    icon: 'body',
                    disabled: bodyFatChartData.length < 2
                  },
                  {
                    value: 'measurements',
                    label: 'Ölçümler',
                    icon: 'resize',
                  },
                ]}
                style={styles.segmentedButtons}
              />
              
              {getActiveChartComponent()}
            </Card.Content>
          </Card>
        )}
        
        {/* Ölçümler Listesi */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Ölçüm Geçmişi</Title>
            
            {measurements.length === 0 ? (
              <Text style={styles.emptyText}>Henüz ölçüm kaydı bulunmamaktadır</Text>
            ) : (
              measurements.map((measurement, index) => (
                <View key={measurement._id || index}>
                  <View style={styles.measurementItem}>
                    <View style={styles.measurementHeader}>
                      <Text style={styles.measurementDate}>
                        {new Date(measurement.date).toLocaleDateString('tr-TR')}
                      </Text>
                      <Text style={styles.measurementWeight}>
                        {measurement.weight} kg
                      </Text>
                    </View>
                    
                    <View style={styles.measurementDetails}>
                      {measurement.bodyFat && (
                        <View style={styles.detailItem}>
                          <Ionicons name="body" size={16} color={theme.palette.text.secondary} />
                          <Text style={styles.detailText}>Vücut Yağı: %{measurement.bodyFat}</Text>
                        </View>
                      )}
                      
                      <View style={styles.measurementsRow}>
                        {measurement.chest && (
                          <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>Göğüs:</Text>
                            <Text style={styles.detailValue}>{measurement.chest} cm</Text>
                          </View>
                        )}
                        
                        {measurement.waist && (
                          <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>Bel:</Text>
                            <Text style={styles.detailValue}>{measurement.waist} cm</Text>
                          </View>
                        )}
                        
                        {measurement.hips && (
                          <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>Kalça:</Text>
                            <Text style={styles.detailValue}>{measurement.hips} cm</Text>
                          </View>
                        )}
                      </View>
                      
                      <View style={styles.measurementsRow}>
                        {measurement.arm && (
                          <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>Kol:</Text>
                            <Text style={styles.detailValue}>{measurement.arm} cm</Text>
                          </View>
                        )}
                        
                        {measurement.thigh && (
                          <View style={styles.detailItem}>
                            <Text style={styles.detailLabel}>Bacak:</Text>
                            <Text style={styles.detailValue}>{measurement.thigh} cm</Text>
                          </View>
                        )}
                      </View>
                      
                      {measurement.notes && (
                        <Text style={styles.notes}>{measurement.notes}</Text>
                      )}
                    </View>
                  </View>
                  
                  {index < measurements.length - 1 && <Divider style={styles.divider} />}
                </View>
              ))
            )}
          </Card.Content>
        </Card>
      </ScrollView>
      
      {/* Yeni Ölçüm Ekleme FAB */}
      <FAB
        style={styles.fab}
        icon="plus"
        color={theme.palette.background.paper}
        onPress={handleAddMeasurement}
      />
      
      {/* Yeni Ölçüm Ekleme Dialog */}
      <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
        <Dialog.Title>Yeni Ölçüm Ekle</Dialog.Title>
        <Dialog.Content>
          <TextInput
            label="Tarih"
            value={newMeasurement.date}
            onChangeText={(text) => setNewMeasurement({...newMeasurement, date: text})}
            mode="outlined"
            style={styles.input}
            placeholder="YYYY-MM-DD"
          />
          
          <TextInput
            label="Kilo (kg) *"
            value={newMeasurement.weight}
            onChangeText={(text) => setNewMeasurement({...newMeasurement, weight: text})}
            mode="outlined"
            keyboardType="numeric"
            style={styles.input}
            error={!!errors.weight}
          />
          {errors.weight && <HelperText type="error">{errors.weight}</HelperText>}
          
          <TextInput
            label="Vücut Yağı (%)"
            value={newMeasurement.bodyFat}
            onChangeText={(text) => setNewMeasurement({...newMeasurement, bodyFat: text})}
            mode="outlined"
            keyboardType="numeric"
            style={styles.input}
            error={!!errors.bodyFat}
          />
          {errors.bodyFat && <HelperText type="error">{errors.bodyFat}</HelperText>}
          
          <View style={styles.rowInputs}>
            <TextInput
              label="Göğüs (cm)"
              value={newMeasurement.chest}
              onChangeText={(text) => setNewMeasurement({...newMeasurement, chest: text})}
              mode="outlined"
              keyboardType="numeric"
              style={[styles.input, styles.halfInput]}
              error={!!errors.chest}
            />
            
            <TextInput
              label="Bel (cm)"
              value={newMeasurement.waist}
              onChangeText={(text) => setNewMeasurement({...newMeasurement, waist: text})}
              mode="outlined"
              keyboardType="numeric"
              style={[styles.input, styles.halfInput]}
              error={!!errors.waist}
            />
          </View>
          
          <View style={styles.rowInputs}>
            <TextInput
              label="Kalça (cm)"
              value={newMeasurement.hips}
              onChangeText={(text) => setNewMeasurement({...newMeasurement, hips: text})}
              mode="outlined"
              keyboardType="numeric"
              style={[styles.input, styles.halfInput]}
              error={!!errors.hips}
            />
            
            <TextInput
              label="Kol (cm)"
              value={newMeasurement.arm}
              onChangeText={(text) => setNewMeasurement({...newMeasurement, arm: text})}
              mode="outlined"
              keyboardType="numeric"
              style={[styles.input, styles.halfInput]}
              error={!!errors.arm}
            />
          </View>
          
          <TextInput
            label="Bacak (cm)"
            value={newMeasurement.thigh}
            onChangeText={(text) => setNewMeasurement({...newMeasurement, thigh: text})}
            mode="outlined"
            keyboardType="numeric"
            style={styles.input}
            error={!!errors.thigh}
          />
          
          <TextInput
            label="Notlar"
            value={newMeasurement.notes}
            onChangeText={(text) => setNewMeasurement({...newMeasurement, notes: text})}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={[styles.input, styles.textArea]}
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setDialogVisible(false)}>İptal</Button>
          <Button onPress={saveMeasurement}>Kaydet</Button>
        </Dialog.Actions>
      </Dialog>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.palette.background.default,
  },
  scrollContent: {
    padding: theme.spacing.md,
  },
  card: {
    marginBottom: theme.spacing.md,
    borderRadius: theme.shape.borderRadius.md,
    ...theme.shadows.sm,
  },
  cardTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    marginBottom: theme.spacing.sm,
    color: theme.palette.text.primary,
  },
  emptyText: {
    textAlign: 'center',
    padding: theme.spacing.lg,
    color: theme.palette.text.secondary,
    fontStyle: 'italic',
  },
  noDataContainer: {
    padding: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius.md,
    marginVertical: theme.spacing.md,
  },
  segmentedButtons: {
    marginBottom: theme.spacing.md,
  },
  measurementItem: {
    paddingVertical: theme.spacing.sm,
  },
  measurementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  measurementDate: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.palette.text.primary,
  },
  measurementWeight: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.palette.primary.main,
  },
  measurementDetails: {
    marginLeft: theme.spacing.sm,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
    marginRight: theme.spacing.md,
  },
  detailText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.palette.text.secondary,
    marginLeft: theme.spacing.xs,
  },
  measurementsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.xs,
  },
  detailLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.palette.text.secondary,
    marginRight: theme.spacing.xs,
  },
  detailValue: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.palette.text.primary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  notes: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.palette.text.secondary,
    fontStyle: 'italic',
    marginTop: theme.spacing.xs,
    padding: theme.spacing.xs,
    backgroundColor: theme.palette.grey[100],
    borderRadius: theme.shape.borderRadius.sm,
  },
  divider: {
    marginVertical: theme.spacing.sm,
  },
  fab: {
    position: 'absolute',
    margin: theme.spacing.md,
    right: 0,
    bottom: 0,
    backgroundColor: theme.palette.primary.main,
  },
  input: {
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.palette.background.paper,
  },
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    flex: 1,
    marginHorizontal: theme.spacing.xs / 2,
  },
  textArea: {
    minHeight: 80,
  },
});

export default MeasurementsScreen; 