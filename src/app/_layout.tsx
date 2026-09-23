import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Poppins_400Regular } from '@expo-google-fonts/poppins/400Regular';
import { Poppins_500Medium } from '@expo-google-fonts/poppins/500Medium';
import { Poppins_600SemiBold } from '@expo-google-fonts/poppins/600SemiBold';
import { Poppins_700Bold } from '@expo-google-fonts/poppins/700Bold';
import { colors } from '@/theme/colors';
import { useProStore } from '@/store/pro';
import { useSettings } from '@/store/settings';
import { shield } from '@/services';

void SplashScreen.preventAutoHideAsync();
void SystemUI.setBackgroundColorAsync(colors.night);

export default function RootLayout() {
  // Les alias sans suffixe de graisse sont ceux qu'attend `typography.ts`.
  const [loaded, error] = useFonts({
    Sans: Poppins_400Regular,
    SansMedium: Poppins_500Medium,
    SansSemi: Poppins_600SemiBold,
    SansBold: Poppins_700Bold,
  });

  // RevenueCat se configure au demarrage, une seule fois.
  useEffect(() => { void useProStore.getState().start(); }, []);

  // Le blocage se rearme seul : iOS le lache au redemarrage, et le
  // retrouver eteint apres chaque lancement le rendait inutile.
  useEffect(() => {
    const unsub = useSettings.persist?.onFinishHydration?.((s) => {
      if (s?.blocking) void shield.setActive(true);
    });
    if (useSettings.getState().blocking) void shield.setActive(true);
    return unsub;
  }, []);

  useEffect(() => {
    // On masque le splash aussi en cas d'échec : mieux vaut du texte système
    // qu'un splash bloqué pour toujours.
    if (loaded || error) void SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.night }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.night },
            animation: 'none',
          }}
        >
          <Stack.Screen
            name="client/[id]"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
              gestureEnabled: true,
              gestureDirection: 'vertical',
            }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
