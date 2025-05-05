import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Text, ActivityIndicator, ScrollView } from 'react-native';
import { Card, Title, Paragraph, Button, Dialog, Portal, TextInput, Divider, FAB, List, IconButton, SegmentedButtons, Chip } from 'react-native-paper';
import { Calendar } from 'react-native-calendars';
import { useAuth } from '../../hooks/useAuth';
import { post, get, put, del } from '../../api/config';
import { useFeedback } from '../../contexts/FeedbackContext';
import theme from '../../themes/theme';

const ExerciseTrackingScreen = ({ navigation, route }) => {
  const { token, user } = useAuth();
  const { showSuccess, showError } = useFeedback();
  
  // Client info if in dietitian mode
  const clientId = route.params?.clientId;
  const clientName = route.params?.clientName;
  
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [markedDates, setMarkedDates] = useState({});
  const [exercises, setExercises] = useState([]);
  const [exerciseTypes, setExerciseTypes] = useState([
    { id: 'cardio', name: 'Kardiyo', icon: 'run' },
    { id: 'strength', name: 'Kuvvet', icon: 'weight-lifter' },
    { id: 'flexibility', name: 'Esneklik', icon: 'yoga' },
    { id: 'sports', name: 'Spor', icon: 'basketball' },
    { id: 'other', name: 'Diğer', icon: 'dumbbell' }
  ]);
  
  // Dialog states
  const [exerciseDialogVisible, setExerciseDialogVisible] = useState(false);
  const [editingExercise, setEditingExercise] = useState(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [exerciseType, setExerciseType] = useState('cardio');
  const [duration, setDuration] = useState('');
  const [calories, setCalories] = useState('');
  const [notes, setNotes] = useState('');
  
  useEffect(() => {
    fetchExerciseData();
  }, [selectedDate]);
  
  const fetchExerciseData = async () => {
    try {
      setLoading(true);
      
      const endpoint = clientId 
        ? `/exercises/client/${clientId}/date/${selectedDate}`
        : `/exercises/user/date/${selectedDate}`;
      
      const [exercisesResponse, markedDatesResponse] = await Promise.all([
        get(endpoint, token),
        get(`/exercises/dates${clientId ? `?clientId=${clientId}` : ''}`, token)
      ]);
      
      setExercises(exercisesResponse || []);
      
      // Process marked dates for calendar
      const marks = {};
      markedDatesResponse.forEach(date => {
        marks[date] = { marked: true, dotColor: theme.palette.primary.main };
      });
      
      // Mark selected date
      marks[selectedDate] = {
        ...(marks[selectedDate] || {}),
        selected: true,
        selectedColor: theme.palette.primary.main,
      };
      
      setMarkedDates(marks);
    } catch (error) {
      showError('Verileri yüklerken hata oluştu');
      console.error('Exercise data fetch error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const showExerciseDialog = (exercise = null) => {
    if (exercise) {
      setEditingExercise(exercise);
      setName(exercise.name);
      setExerciseType(exercise.type);
      setDuration(exercise.duration.toString());
      setCalories(exercise.calories.toString());
      setNotes(exercise.notes || '');
    } else {
      setEditingExercise(null);
      setName('');
      setExerciseType('cardio');
      setDuration('');
      setCalories('');
      setNotes('');
    }
    setExerciseDialogVisible(true);
  };
  
  const hideExerciseDialog = () => {
    setExerciseDialogVisible(false);
  };
  
  const handleSaveExercise = async () => {
    try {
      if (!name || !duration) {
        showError('Lütfen egzersiz adı ve süresini belirtin');
        return;
      }
      
      const exerciseData = {
        name,
        type: exerciseType,
        duration: parseInt(duration),
        calories: parseInt(calories) || 0,
        notes,
        date: selectedDate,
      };
      
      if (clientId) {
        exerciseData.clientId = clientId;
      }
      
      if (editingExercise) {
        await put(`/exercises/${editingExercise._id}`, exerciseData, token);
        showSuccess('Egzersiz başarıyla güncellendi');
      } else {
        await post('/exercises', exerciseData, token);
        showSuccess('Egzersiz başarıyla eklendi');
      }
      
      hideExerciseDialog();
      fetchExerciseData();
    } catch (error) {
      showError('İşlem sırasında bir hata oluştu');
      console.error('Exercise save error:', error);
    }
  };
  
  const handleDeleteExercise = async (exerciseId) => {
    try {
      await del(`/exercises/${exerciseId}`, null, token);
      showSuccess('Egzersiz başarıyla silindi');
      fetchExerciseData();
    } catch (error) {
      showError('Silme işlemi sırasında bir hata oluştu');
      console.error('Exercise delete error:', error);
    }
  };
  
  // Calculate total calories and duration
  const totalCalories = exercises.reduce((sum, exercise) => sum + (exercise.calories || 0), 0);
  const totalDuration = exercises.reduce((sum, exercise) => sum + (exercise.duration || 0), 0);
  
  // Group exercises by type
  const exercisesByType = exerciseTypes.reduce((result, type) => {
    result[type.id] = exercises.filter(exercise => exercise.type === type.id);
    return result;
  }, {});
  
  return (
    <View style={styles.container}>
      {clientName && (
        <View style={styles.clientHeader}>
          <Text style={styles.clientName}>{clientName}</Text>
        </View>
      )}
      
      <Calendar
        current={selectedDate}
        onDayPress={day => setSelectedDate(day.dateString)}
        markedDates={markedDates}
        theme={{
          selectedDayBackgroundColor: theme.palette.primary.main,
          todayTextColor: theme.palette.primary.main,
          arrowColor: theme.palette.primary.main,
        }}
        style={styles.calendar}
      />
      
      {loading ? (
        <ActivityIndicator size="large" color={theme.palette.primary.main} style={styles.loader} />
      ) : (
        <ScrollView style={styles.content}>
          {/* Daily Summary */}
          <Card style={styles.card}>
            <Card.Content>
              <Title>Egzersiz Özeti</Title>
              <Divider style={styles.divider} />
              
              <View style={styles.exerciseSummary}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{exercises.length}</Text>
                  <Text style={styles.summaryLabel}>Aktivite</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{totalDuration}</Text>
                  <Text style={styles.summaryLabel}>Dakika</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{totalCalories}</Text>
                  <Text style={styles.summaryLabel}>Kalori</Text>
                </View>
              </View>
            </Card.Content>
          </Card>
          
          {/* Exercise List */}
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.sectionHeader}>
                <Title>Egzersizler</Title>
                <Button 
                  mode="contained" 
                  onPress={() => showExerciseDialog()} 
                  icon="plus"
                >
                  Ekle
                </Button>
              </View>
              <Divider style={styles.divider} />
              
              {exercises.length === 0 ? (
                <Text style={styles.emptyText}>Bu tarihte henüz egzersiz girilmemiş</Text>
              ) : (
                exerciseTypes.map(type => {
                  const typeExercises = exercisesByType[type.id] || [];
                  if (typeExercises.length === 0) return null;
                  
                  return (
                    <View key={type.id} style={styles.exerciseTypeSection}>
                      <Chip icon={type.icon} style={styles.typeChip}>{type.name}</Chip>
                      
                      {typeExercises.map(exercise => (
                        <Card key={exercise._id} style={styles.exerciseCard}>
                          <Card.Content>
                            <View style={styles.exerciseHeader}>
                              <Title style={styles.exerciseTitle}>{exercise.name}</Title>
                              <View style={styles.exerciseActions}>
                                <IconButton
                                  icon="pencil"
                                  size={20}
                                  onPress={() => showExerciseDialog(exercise)}
                                />
                                <IconButton
                                  icon="delete"
                                  size={20}
                                  color={theme.palette.error.main}
                                  onPress={() => handleDeleteExercise(exercise._id)}
                                />
                              </View>
                            </View>
                            
                            <View style={styles.exerciseDetails}>
                              <Chip icon="clock-outline" style={styles.detailChip}>{exercise.duration} dk</Chip>
                              {exercise.calories > 0 && (
                                <Chip icon="fire" style={styles.detailChip}>{exercise.calories} kcal</Chip>
                              )}
                            </View>
                            
                            {exercise.notes && (
                              <Paragraph style={styles.exerciseNotes}>{exercise.notes}</Paragraph>
                            )}
                          </Card.Content>
                        </Card>
                      ))}
                    </View>
                  );
                })
              )}
            </Card.Content>
          </Card>
        </ScrollView>
      )}
      
      {/* Exercise Dialog */}
      <Portal>
        <Dialog visible={exerciseDialogVisible} onDismiss={hideExerciseDialog}>
          <Dialog.Title>{editingExercise ? 'Egzersiz Düzenle' : 'Egzersiz Ekle'}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Egzersiz Adı"
              value={name}
              onChangeText={setName}
              style={styles.input}
            />
            
            <Title style={styles.formLabel}>Egzersiz Türü</Title>
            <SegmentedButtons
              value={exerciseType}
              onValueChange={setExerciseType}
              buttons={exerciseTypes.map(type => ({
                value: type.id,
                label: type.name,
                icon: type.icon
              }))}
              style={styles.segmentedButtons}
            />
            
            <View style={styles.formRow}>
              <TextInput
                label="Süre (dk)"
                value={duration}
                onChangeText={setDuration}
                keyboardType="numeric"
                style={[styles.input, { flex: 1, marginRight: 8 }]}
              />
              
              <TextInput
                label="Yakılan Kalori"
                value={calories}
                onChangeText={setCalories}
                keyboardType="numeric"
                style={[styles.input, { flex: 1 }]}
              />
            </View>
            
            <TextInput
              label="Notlar"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              style={styles.input}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={hideExerciseDialog}>İptal</Button>
            <Button onPress={handleSaveExercise} disabled={!name || !duration}>
              Kaydet
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => showExerciseDialog()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.palette.background.default,
  },
  clientHeader: {
    padding: 16,
    backgroundColor: theme.palette.primary.main,
  },
  clientName: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  calendar: {
    marginBottom: 10,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
    backgroundColor: theme.palette.background.paper,
    elevation: 2,
  },
  divider: {
    marginVertical: 12,
  },
  exerciseSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontWeight: 'bold',
    fontSize: 24,
  },
  summaryLabel: {
    color: theme.palette.text.secondary,
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontStyle: 'italic',
    color: theme.palette.text.secondary,
    marginVertical: 20,
  },
  exerciseTypeSection: {
    marginBottom: 16,
  },
  typeChip: {
    marginBottom: 8,
    backgroundColor: theme.palette.primary.light,
  },
  exerciseCard: {
    marginBottom: 8,
    elevation: 1,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseTitle: {
    fontSize: 16,
  },
  exerciseActions: {
    flexDirection: 'row',
  },
  exerciseDetails: {
    flexDirection: 'row',
    marginTop: 4,
    marginBottom: 8,
  },
  detailChip: {
    marginRight: 8,
    backgroundColor: theme.palette.grey[100],
  },
  exerciseNotes: {
    fontStyle: 'italic',
    color: theme.palette.text.secondary,
  },
  input: {
    marginBottom: 16,
    backgroundColor: theme.palette.background.paper,
  },
  formLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: theme.palette.primary.main,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ExerciseTrackingScreen; 