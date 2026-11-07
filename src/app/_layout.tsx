import React, { useEffect } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { ToastProvider } from '@/contexts/ToastContext';
import { ConfirmProvider } from '@/contexts/ConfirmContext';
import { loadDb } from '@/services/db';
import { colors } from '@/theme';

// Seed (first launch) or load persisted demo data before anything renders.
loadDb();

export default function RootLayout() {
  const [loaded, error] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'MediFly — Healthcare at Your Doorstep';
      document.documentElement.style.backgroundColor = colors.background;
      document.body.style.backgroundColor = colors.background;
    }
  }, []);

  if (!loaded && !error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.blue} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ToastProvider>
        <ConfirmProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: 'none' }} />
        </ConfirmProvider>
      </ToastProvider>
    </SafeAreaProvider>
  );
}
