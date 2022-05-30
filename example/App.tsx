import React from 'react';
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Home from './src';
// import { GestureTest } from './src/gesture-test';

export default function App() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Home />
        {/* <GestureTest /> */}
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
