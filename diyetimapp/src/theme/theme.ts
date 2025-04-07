import { MD3LightTheme as DefaultTheme, configureFonts } from 'react-native-paper';

const fontConfig = {
  fontFamily: 'System',
};

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#2E7D32', // Koyu yeşil
    secondary: '#4CAF50', // Yeşil
    accent: '#8BC34A', // Açık yeşil
    background: '#F5F5F5',
    surface: '#FFFFFF',
    text: '#212121',
    disabled: '#BDBDBD',
    placeholder: '#9E9E9E',
    backdrop: 'rgba(0, 0, 0, 0.5)',
    notification: '#F44336',
    error: '#D32F2F',
  },
  fonts: configureFonts({ config: fontConfig }),
};

export default theme; 