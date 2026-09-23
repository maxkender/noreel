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
import { useColors } from '@/theme/useColors';
import { useProStore } from '@/store/pro';
import { useSettings } from '@/store/settings';
import { shield } from '@/services';

void SplashScreen.preventAutoHideAsync();
void SystemUI.setBackgroundColorAsync(colors.night);

export default function RootLayout() {
  const c = useColors();
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
      if (s?.blocking) void shield.setActive(true, s.selection);
    });
    const st = useSettings.getState();
    if (st.blocking) void shield.setActive(true, st.selection);
    return unsub;
  }, []);

  useEffect(() => {
    // On masque le splash aussi en cas d'échec : mieux vaut du texte système
    // qu'un splash bloqué pour toujours.
    if (loaded || error) void SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: c.night }}>
      <SafeAreaProvider>
        {/* Le texte de la barre d'etat suit le fond, sinon il disparait. */}
        <StatusBar style={c.night === colors.night ? 'light' : 'dark'} />
        {/*
          Les ecrans glissent, et le doigt peut ramener en arriere.
          `animation: 'none'` coupait net a chaque passage : l'app paraissait
          sauter d'une image a l'autre. Ces animations-la sont jouees par
          iOS, pas par JavaScript — elles tiennent les 60 images par seconde
          meme quand l'ecran d'arrivee a du travail a faire.
        */}
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: c.night },
            animation: 'slide_from_right',
            animationDuration: 320,
            gestureEnabled: true,
          }}
        >
          {/* Une redirection ne s'anime pas : elle n'a rien a montrer. */}
          <Stack.Screen name="index" options={{ animation: 'none' }} />
          {/* Entrer dans le parcours ou en sortir est un changement de lieu,
              pas un pas de plus : un fondu, et aucun retour au doigt. */}
          <Stack.Screen
            name="onboarding"
            options={{
              animation: 'fade',
              animationDuration: 420,
              gestureEnabled: false,
              // Le parcours est sombre en propre : sans ca, le fondu d'entree
              // se ferait depuis un fond creme.
              contentStyle: { backgroundColor: colors.night },
            }}
          />
          <Stack.Screen
            name="home"
            options={{ animation: 'fade', animationDuration: 420, gestureEnabled: false }}
          />
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
