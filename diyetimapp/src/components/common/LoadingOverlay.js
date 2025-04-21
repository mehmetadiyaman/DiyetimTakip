import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  Animated, 
  Easing 
} from 'react-native';
import { Portal } from 'react-native-paper';
import theme from '../../themes/theme';

const LoadingOverlay = ({ 
  visible, 
  message = 'Yükleniyor...', 
  backdropOpacity = 0.6,
  indicatorColor = theme.palette.primary.main,
  textColor = theme.palette.text.primary,
  spinnerSize = 'large',
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
          easing: Easing.in(Easing.ease),
        }),
        Animated.timing(scale, {
          toValue: 0.9,
          duration: 150,
          useNativeDriver: true,
          easing: Easing.in(Easing.ease),
        }),
      ]).start();
    }
  }, [visible, opacity, scale]);

  if (!visible) {
    return null;
  }

  return (
    <Portal>
      <Animated.View
        style={[
          styles.container,
          { backgroundColor: `rgba(0, 0, 0, ${backdropOpacity})` },
          { opacity }
        ]}
      >
        <Animated.View
          style={[
            styles.loaderContainer,
            { transform: [{ scale }] }
          ]}
        >
          <ActivityIndicator size={spinnerSize} color={indicatorColor} />
          {message && <Text style={[styles.message, { color: textColor }]}>{message}</Text>}
        </Animated.View>
      </Animated.View>
    </Portal>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loaderContainer: {
    minWidth: 140,
    backgroundColor: 'white',
    borderRadius: theme.shape.borderRadius.lg,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.lg,
  },
  message: {
    marginTop: 10,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.regular,
    textAlign: 'center',
  },
});

export default LoadingOverlay; 