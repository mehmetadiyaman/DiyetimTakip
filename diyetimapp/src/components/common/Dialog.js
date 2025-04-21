import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  Animated, 
  Easing,
  BackHandler,
  Platform,
  Dimensions
} from 'react-native';
import { Portal } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../themes/theme';

const { width } = Dimensions.get('window');

const Dialog = ({
  visible = false,
  title,
  content,
  actions,
  dismissable = true,
  dismissableBackButton = true,
  onDismiss,
  icon,
  iconColor,
  type = 'info', // 'info', 'success', 'warning', 'error'
  centered = false,
  animationType = 'scale', // 'scale', 'slide'
}) => {
  const [animation] = useState(new Animated.Value(0));
  const [isVisible, setIsVisible] = useState(visible);

  // BackHandler'ı diyalog açıkken yapılandır
  useEffect(() => {
    const backAction = () => {
      if (visible && dismissableBackButton) {
        onDismiss && onDismiss();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, [visible, dismissableBackButton, onDismiss]);

  // Görünürlük değiştiğinde animasyonu başlat
  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      animateIn();
    } else {
      animateOut();
    }
  }, [visible]);

  // Giriş animasyonu
  const animateIn = () => {
    Animated.timing(animation, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
      easing: Easing.bezier(0.0, 0.0, 0.2, 1)
    }).start();
  };

  // Çıkış animasyonu
  const animateOut = () => {
    Animated.timing(animation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
      easing: Easing.bezier(0.4, 0.0, 1, 1)
    }).start(() => {
      setIsVisible(false);
    });
  };

  // Diyalog tipi simgesi
  const getTypeIcon = () => {
    switch (type) {
      case 'success':
        return 'checkmark-circle';
      case 'warning':
        return 'warning';
      case 'error':
        return 'alert-circle';
      case 'info':
      default:
        return 'information-circle';
    }
  };

  // Diyalog tipi rengi
  const getTypeColor = () => {
    switch (type) {
      case 'success':
        return theme.palette.success.main;
      case 'warning':
        return theme.palette.warning.main;
      case 'error':
        return theme.palette.error.main;
      case 'info':
      default:
        return theme.palette.info.main;
    }
  };

  // Animasyon stili
  const getAnimatedStyle = () => {
    if (animationType === 'slide') {
      return {
        opacity: animation,
        transform: [
          {
            translateY: animation.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0],
            }),
          },
        ],
      };
    }
    
    return {
      opacity: animation,
      transform: [
        {
          scale: animation.interpolate({
            inputRange: [0, 1],
            outputRange: [0.9, 1],
          }),
        },
      ],
    };
  };

  // Seçilen simge veya tip simgesi
  const dialogIcon = icon || getTypeIcon();
  const dialogIconColor = iconColor || getTypeColor();

  if (!isVisible) {
    return null;
  }

  return (
    <Portal>
      <Modal
        transparent
        visible={isVisible}
        onRequestClose={() => {
          if (dismissableBackButton) {
            onDismiss && onDismiss();
          }
        }}
      >
        <TouchableOpacity
          style={[
            styles.backdrop,
            centered && styles.backdropCentered
          ]}
          activeOpacity={1}
          onPress={() => {
            if (dismissable) {
              onDismiss && onDismiss();
            }
          }}
        >
          <Animated.View 
            style={[
              styles.dialogContainer,
              centered && styles.dialogCentered,
              getAnimatedStyle()
            ]}
          >
            <TouchableOpacity activeOpacity={1} style={styles.dialog}>
              {dialogIcon && (
                <View style={styles.iconContainer}>
                  <Ionicons name={dialogIcon} size={36} color={dialogIconColor} />
                </View>
              )}
              
              {title && <Text style={styles.title}>{title}</Text>}
              
              {content && (
                typeof content === 'string' ? (
                  <Text style={styles.content}>{content}</Text>
                ) : (
                  <View style={styles.contentContainer}>{content}</View>
                )
              )}
              
              {actions && (
                <View style={styles.actions}>
                  {actions}
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdropCentered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogContainer: {
    width: Math.min(width * 0.9, 380),
    alignSelf: 'center',
    marginBottom: 20,
  },
  dialogCentered: {
    marginBottom: 0,
  },
  dialog: {
    backgroundColor: 'white',
    borderRadius: theme.shape.borderRadius.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
    overflow: 'hidden',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 24,
    paddingBottom: 8,
  },
  title: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.palette.text.primary,
    textAlign: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  content: {
    fontSize: theme.typography.fontSize.md,
    color: theme.palette.text.secondary,
    textAlign: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  contentContainer: {
    padding: 24,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
});

export default Dialog; 