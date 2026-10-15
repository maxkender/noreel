import { useEffect } from 'react';
import { AppState, Platform, View } from 'react-native';
import { Stack, router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { NavigationBar } from 'expo-navigation-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { useColors } from '@/theme/useColors';
import { useProStore } from '@/store/pro';
import { useSettings } from '@/store/settings';
import { useLang } from '@/store/lang';
import { watchReal } from '@/services/realtime';
import { configureShield, shield } from '@/services';
import { startNotifications } from '@/services/trial';
import { pullUpdate } from '@/services/refresh';
// Importe pour son effet : la tache des alertes Instagram doit exister avant tout ecran,
// iOS pouvant relancer l'app en arriere-plan rien que pour elle.
import { autoEnableAlerts, refreshWords } from '@/services/igAlerts';
import { dict } from '@/i18n';

void SplashScreen.preventAutoHideAsync();
void SystemUI.setBackgroundColorAsync(colors.night);

/*
  Android dessine l'app SOUS ses boutons systeme (bord a bord, impose depuis
  Android 15). Sur les telephones a trois boutons, nos boutons du bas et la
  barre d'onglets d'Instagram tombaient dessous et ne se touchaient plus.
  Une seule marge, ici, pour tous les ecrans : ils s'arretent au-dessus.
  Les SafeAreaView natives mesurent leur vrai recouvrement, donc elles ne
  doublent pas cette marge ; les modales, dessinees dans leur propre
  fenetre, gardent la leur. iOS n'est pas concerne.
*/
function AboveSystemButtons({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const c = useColors();
  if (Platform.OS !== 'android') return <>{children}</>;
  return (
    <View style={{ flex: 1, paddingBottom: insets.bottom, backgroundColor: c.night }}>
      {/* Les boutons systeme suivent le fond, comme le texte de la barre d'etat. */}
      <NavigationBar style={c.night === colors.night ? 'light' : 'dark'} />
      {children}
    </View>
  );
}

export default function RootLayout() {
  const c = useColors();

  // RevenueCat se configure au demarrage, une seule fois.
  useEffect(() => { void useProStore.getState().start(); }, []);

  // Le rappel de fin d'essai ne s'affiche que si ce gestionnaire existe :
  // sans lui, la notification qui arrive pendant que l'app est ouverte est
  // avalee — justement quand la personne se demande si elle garde l'abonnement.
  useEffect(() => { startNotifications(); }, []);

  /*
    Une alerte touchee ouvre ce qu'elle annonce : Instagram, dans UnSwipe.
    Aussi quand l'app etait fermee — la reponse est alors lue au demarrage.
  */
  useEffect(() => {
    const open = (r: Notifications.NotificationResponse | null) => {
      const url = r?.notification.request.content.data?.url;
      if (typeof url === 'string' && url.startsWith('/client/')) setTimeout(() => router.push(url as '/client/[id]'), 400);
    };
    void Notifications.getLastNotificationResponseAsync().then(open).catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, []);

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

  // Plus de police a charger (celle du systeme) : le splash part des que la langue est lue.
  const langLoaded = useLang((x) => x.hydrated);
  useEffect(() => {
    if (langLoaded) void SplashScreen.hideAsync();
  }, [langLoaded]);
  // Les mots des alertes suivent la langue choisie : la tache de fond n'a pas d'ecran pour les lire.
  const langNow = useLang((x) => x.lang);
  useEffect(() => {
    if (!langLoaded || Platform.OS !== 'ios') return;
    const words = { title: dict.alerts.notifTitle, dm: dict.alerts.notifDm, act: dict.alerts.notifAct };
    void refreshWords(words);
    // L'ecran de blocage parle la langue de l'app.
    void configureShield(dict.shield);
    // Allumees par defaut, au lancement et a chaque retour dans l'app (une
    // connexion a Instagram vient peut-etre d'avoir lieu).
    void autoEnableAlerts(words).catch(() => {});
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') void autoEnableAlerts(words).catch(() => {});
    });
    return () => sub.remove();
  }, [langLoaded, langNow]);

  // La langue vient du disque : dessiner avant, c'est dessiner dans la
  // mauvaise langue le temps d'une image, puis tout redessiner.
  const langReady = useLang((s) => s.hydrated);
  if (!langReady) return null;

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
        <AboveSystemButtons>
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
        </AboveSystemButtons>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
