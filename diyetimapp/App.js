import React from 'react';
import { View, Text, SafeAreaView, StyleSheet } from 'react-native';

// En basit uygulama yapısı
export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Dietçim</Text>
        <Text style={styles.subtitle}>Hoş Geldiniz</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4caf50',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#757575',
  }
});
