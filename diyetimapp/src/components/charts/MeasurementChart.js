import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import theme from '../../themes/theme';

const screenWidth = Dimensions.get('window').width;

/**
 * Ölçüm grafiği bileşeni
 * @param {object} props - Bileşen props'ları
 * @param {array} props.data - Grafik verileri [{ date: "2023-01-01", value: 70 }, ...]
 * @param {string} props.label - Grafik etiketi
 * @param {string} props.unit - Birim (kg, cm, vb.)
 * @param {string} props.color - Grafik çizgi rengi
 * @param {boolean} props.showDots - Noktaları göster/gizle
 * @param {string} props.type - Grafik tipi ('weight', 'bodyFat', 'measurement')
 */
const MeasurementChart = ({ 
  data = [], 
  label = 'Değer',
  unit = '',
  color = theme.palette.primary.main,
  showDots = true,
  type = 'weight'
}) => {
  if (!data || data.length < 2) {
    return (
      <View style={styles.noDataContainer}>
        <Text style={styles.noDataText}>Grafik gösterimi için en az 2 ölçüm gereklidir</Text>
      </View>
    );
  }

  // Veri formatını hazırla
  const chartData = {
    labels: data.map(item => {
      // Tarih formatını basitleştir (örn. 01/15 formatına)
      const date = new Date(item.date);
      return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    }),
    datasets: [
      {
        data: data.map(item => item.value),
        color: () => color,
        strokeWidth: 2
      }
    ],
    legend: [label]
  };

  // Grafik konfigürasyonu
  const chartConfig = {
    backgroundGradientFrom: theme.palette.background.paper,
    backgroundGradientTo: theme.palette.background.paper,
    color: () => theme.palette.text.secondary,
    labelColor: () => theme.palette.text.secondary,
    strokeWidth: 2,
    decimalPlaces: type === 'weight' ? 1 : type === 'bodyFat' ? 1 : 0,
    propsForDots: {
      r: showDots ? '5' : '0',
      strokeWidth: '2',
      stroke: color
    },
    useShadowColorFromDataset: false
  };

  // Grafik stili
  const chartStyle = {
    marginVertical: 8,
    borderRadius: theme.shape.borderRadius.md,
    ...theme.shadows.sm
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{label} Grafiği</Text>
      <LineChart
        data={chartData}
        width={screenWidth - 40}  // Ekran genişliğinden padding çıkarılmış
        height={220}
        chartConfig={chartConfig}
        style={chartStyle}
        bezier
        formatYLabel={(value) => `${value}${unit}`}
        yLabelsOffset={10}
        fromZero={type === 'bodyFat' || type === 'measurement'}
        segments={type === 'bodyFat' ? 4 : 5}
        verticalLabelRotation={30}
        withVerticalLines={false}
      />
      
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>İlk</Text>
          <Text style={styles.statValue}>{data[0].value}{unit}</Text>
          <Text style={styles.statDate}>{new Date(data[0].date).toLocaleDateString('tr-TR')}</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Son</Text>
          <Text style={styles.statValue}>{data[data.length - 1].value}{unit}</Text>
          <Text style={styles.statDate}>{new Date(data[data.length - 1].date).toLocaleDateString('tr-TR')}</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Fark</Text>
          <Text style={[
            styles.statValue,
            {
              color: data[data.length - 1].value > data[0].value
                ? (type === 'weight' ? theme.palette.error.main : theme.palette.success.main)
                : (type === 'weight' ? theme.palette.success.main : theme.palette.error.main)
            }
          ]}>
            {(data[data.length - 1].value - data[0].value).toFixed(1)}{unit}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: theme.spacing.md,
    padding: theme.spacing.sm,
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius.md,
    ...theme.shadows.sm,
  },
  title: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.palette.text.primary,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  noDataContainer: {
    padding: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius.md,
    ...theme.shadows.sm,
  },
  noDataText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.palette.text.secondary,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.palette.grey[200],
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.palette.text.secondary,
    marginBottom: 2,
  },
  statValue: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.palette.text.primary,
  },
  statDate: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.palette.text.secondary,
    marginTop: 2,
  },
});

export default MeasurementChart; 