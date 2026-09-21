import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Newsreader_400Regular } from '@expo-google-fonts/newsreader/400Regular';
import { Newsreader_400Regular_Italic } from '@expo-google-fonts/newsreader/400Regular_Italic';
import { Newsreader_500Medium } from '@expo-google-fonts/newsreader/500Medium';
import { Geist_400Regular } from '@expo-google-fonts/geist/400Regular';
import { Geist_500Medium } from '@expo-google-fonts/geist/500Medium';
import { Geist_600SemiBold } from '@expo-google-fonts/geist/600SemiBold';
import { colors } from '@/theme/colors';

void SplashScreen.preventAutoHideAsync();
void SystemUI.setBackgroundColorAsync(colors.night);

export default function RootLayout() {
  // Les alias sans suffixe de graisse sont ceux qu'attend `typography.ts`.
  const [loaded, error] = useFonts({
    Newsreader: Newsreader_500Medium,
    NewsreaderRegular: Newsreader_400Regular,
    NewsreaderItalic: Newsreader_400Regular_Italic,
    Geist: Geist_400Regular,
    GeistMedium: Geist_500Medium,
    GeistSemiBold: Geist_600SemiBold,
  });

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
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
