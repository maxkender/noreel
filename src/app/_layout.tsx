import { useEffect } from 'react';
import { AppState } from 'react-native';
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
import { watchReal } from '@/services/realtime';
import { shield } from '@/services';
import { startNotifications } from '@/services/trial';
import { pullUpdate } from '@/services/refresh';

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

  // Le rappel de fin d'essai ne s'affiche que si ce gestionnaire existe :
  // sans lui, la notification qui arrive pendant que l'app est ouverte est
  // avalee — justement quand la personne se demande si elle garde l'abonnement.
  useEffect(() => { startNotifications(); }, []);

  /*
    On cherche un correctif a chaque retour au premier plan.
    Nos regles de filtrage vivent dans le paquet JavaScript : quand Instagram
    remanie sa structure, le correctif part par expo-updates et arrive en
    quelques minutes, sans revue de l'App Store. Sans cette verification il
    n'arriverait qu'au prochain lancement a froid — c'est-a-dire des jours plus
    tard sur un telephone qu'on ne redemarre jamais.
  */
  useEffect(() => {
    void pullUpdate();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') void pullUpdate();
    });
    return () => sub.remove();
  }, []);

  // Le blocage se rearme seul : iOS le lache au redemarrage, et le
  // retrouver eteint apres chaque lancement le rendait inutile.
  useEffect(() => {
    const unsub = useSettings.persist?.onFinishHydration?.((s) => {
      if (s?.blocking) { void shield.setActive(true, s.selection); void watchReal(s.selection); }
    });
    const st = useSettings.getState();
    if (st.blocking) { void shield.setActive(true, st.selection); void watchReal(st.selection); }
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
          {/*
            L'app filtree prend tout l'ecran et ne se balaie pas.
            Presentee en `modal` avec un geste vertical, elle se refermait
            d'un doigt vers le bas — or c'est precisement le geste qu'on
            fait sans y penser dans Instagram. On sortait de l'app filtree
            en croyant faire defiler. La sortie passe par la croix de la
            barre, qui est un choix, pas un reflexe.
          */}
          <Stack.Screen
            name="client/[id]"
            options={{
              presentation: 'fullScreenModal',
              animation: 'slide_from_bottom',
              gestureEnabled: false,
            }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
