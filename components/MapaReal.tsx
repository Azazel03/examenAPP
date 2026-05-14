// components/MapaReal.tsx
import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

export default function MapaReal({ region, lugares }: any) {
  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={region}>
        {lugares.map((lugar: any) => (
          <Marker
            key={lugar.id}
            coordinate={lugar.coords}
            title={lugar.nombre}
            description={lugar.desc}
            onPress={() => console.log('Seleccionaste:', lugar.nombre)}
          />
        ))}
      </MapView>
    </View>  
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
});