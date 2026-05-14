import { Drawer } from 'expo-router/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function Layout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer>
        {/* Aquí declaras qué archivos quieres que aparezcan en el menú */}
        <Drawer.Screen
          name="examen"
          options={{
            drawerLabel: 'Escanear Examen',
            title: 'Escanear Examen',
          }}
        />
        <Drawer.Screen
          name="especialista"
          options={{
            drawerLabel: 'Especialistas',
          }}
        />
        {/* 1. Ocultar la pantalla de error del menú lateral */}
        <Drawer.Screen
          name="+not-found"
          options={{
            drawerItemStyle: { display: 'none' }, // <-- Esto lo elimina visualmente del menú
            headerShown: false, // Opcional: para que no tenga barra superior si llegas ahí
          }}
        />
        </Drawer>
    </GestureHandlerRootView>
  );
}