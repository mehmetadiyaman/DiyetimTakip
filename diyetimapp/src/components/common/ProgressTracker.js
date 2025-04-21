import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ProgressBar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../themes/theme';

/**
 * İlerleme takip bileşeni
 * @param {object} props - Component props
 * @param {number} props.startValue - Başlangıç değeri
 * @param {number} props.currentValue - Mevcut değer
 * @param {number} props.targetValue - Hedef değer
 * @param {string} props.unit - Birim (kg, cm, vb.)
 * @param {string} props.label - Etiket metni
 * @param {string} props.type - İlerleme tipi ('weight', 'workout', 'diet', 'water', 'custom')
 * @param {object} props.style - Custom style
 */
const ProgressTracker = ({ 
  startValue,
  currentValue,
  targetValue,
  unit = 'kg',
  label = 'İlerleme',
  type = 'weight',
  style
}) => {
  // Başlangıç ve hedef değerlerinin doğru olduğundan emin olun
  if (startValue === undefined || targetValue === undefined || currentValue === undefined) {
    return null;
  }

  // Yön kontrolü - kilo kaybı mı, kilo alma mı?
  const isIncreasing = targetValue > startValue;
  
  // İlerleme hesaplama
  const totalChange = Math.abs(targetValue - startValue);
  const currentChange = isIncreasing 
    ? Math.max(0, currentValue - startValue)
    : Math.max(0, startValue - currentValue);
  
  // İlerleme yüzdesi
  const progress = totalChange === 0 ? 0 : Math.min(1, currentChange / totalChange);
  
  // İkon ve renk belirleme
  const getIconAndColor = () => {
    switch (type) {
      case 'weight':
        return {
          icon: 'scale',
          color: theme.palette.primary.main,
        };
      case 'workout':
        return {
          icon: 'fitness',
          color: theme.palette.secondary.main,
        };
      case 'diet':
        return {
          icon: 'nutrition',
          color: theme.palette.success.main,
        };
      case 'water':
        return {
          icon: 'water',
          color: theme.palette.info.main,
        };
      default:
        return {
          icon: 'analytics',
          color: theme.palette.primary.main,
        };
    }
  };

  const { icon, color } = getIconAndColor();

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <View style={styles.labelContainer}>
          <Ionicons name={icon} size={20} color={color} style={styles.icon} />
          <Text style={styles.label}>{label}</Text>
        </View>
        <Text style={styles.percentage}>{Math.round(progress * 100)}%</Text>
      </View>
      
      <ProgressBar
        progress={progress}
        color={color}
        style={styles.progressBar}
      />
      
      <View style={styles.valuesContainer}>
        <Text style={styles.valueText}>
          Başlangıç: {startValue} {unit}
        </Text>
        <Text style={[styles.currentValueText, { color }]}>
          Mevcut: {currentValue} {unit}
        </Text>
        <Text style={styles.valueText}>
          Hedef: {targetValue} {unit}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: theme.shape.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: theme.spacing.xs,
  },
  label: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.palette.text.primary,
  },
  percentage: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.palette.text.primary,
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
    marginBottom: theme.spacing.sm,
  },
  valuesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.xs,
  },
  valueText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.palette.text.secondary,
  },
  currentValueText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
  },
});

export default ProgressTracker; 