import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

// ESTA ES LA CLAVE: No hay import de react-native-maps aquí.
// El 'require' solo se ejecuta en móviles.
const MapaComponente = Platform.OS !== 'web' 
  ? require('../components/MapaReal').default 
  : null;

export default function Especialista() {
  const regionInicial = {
    latitude: -39.819588,
    longitude: -73.245209,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  const misLugares = [
    { id: 1, nombre: "Hospital Base", coords: { latitude: -39.830719, longitude: -73.240079 }, desc: "Hospital Base Valdivia" },
    { id: 2, nombre: "ACHS", coords: { latitude: -39.817978, longitude: -73.240816 }, desc: "Centro Valdivia Achs Salud" },
  ];

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webContainer}>
        <Text style={styles.webText}>📍 Mapa disponible en móvil</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <MapaComponente region={regionInicial} lugares={misLugares} />
    </View>
  );
}

const styles = StyleSheet.create({
  webContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  webText: { fontSize: 18, fontWeight: 'bold' }
});