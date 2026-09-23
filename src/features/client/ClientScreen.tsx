import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Platform, Pressable, StyleSheet, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';
import { RotateCw, X } from 'lucide-react-native';
import { useColors, type Palette } from '@/theme/useColors';
import { space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { Button } from '@/components/Button';
import { haptics } from '@/lib/haptics';
import { CLIENTS, buildScript, type ClientId } from './blockers';
import { APP_TOGGLES, useAppsStore } from '@/store/apps';
import { NavBubble, type NavAction } from './NavBubble';
import { GlassSweep } from '@/components/GlassSweep';
import { Coach } from '@/components/Coach';
import { CLIENT_TOUR } from './tour';
import { ClientSettings } from './ClientSettings';
import { useSettings } from '@/store/settings';

const LABELS: Record<ClientId, string> = {
  instagram: 'Instagram · sans reels',
  tiktok: 'TikTok · abonnements',
  twitter: 'X · abonnements',
  youtube: 'YouTube · sans shorts',
};

// Sans un UA de vrai Safari mobile, les deux sites servent une page degradee
// avec un bandeau « ouvrir dans l'app » permanent.
const UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) ' +
  'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

export function ClientScreen({ id }: { id: ClientId }) {
  const c = useColors();
  const styles = useMemo(() => sheet(c), [c]);
  const router = useRouter();
  const client = CLIENTS[id];

  // Les reglages sont injectes dans le script : les changer et rouvrir suffit.
  const settingsMap = useAppsStore((st) => st.settings);
  const script = useMemo(() => {
    const active: Record<string, boolean> = {};
    for (const t of APP_TOGGLES[id]) {
      // Meme regle que le magasin : verrouille, sinon le choix de
      // l'utilisateur, sinon la valeur par defaut du reglage.
      active[t.key] = t.locked ? true : (settingsMap[`${id}.${t.key}`] ?? !!t.on);
    }
    return buildScript(client.script, active);
  }, [id, client.script, settingsMap]);
  const web = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Chien de garde : si la page n'a rien rendu au bout de 12 s, on propose
  // de recharger plutot que de laisser l'utilisateur devant un ecran mort.
  const [stuck, setStuck] = useState(false);
  // Mode degrade : la page servie telle quelle, sans notre script. C'est la
  // sortie quand le filtre casse le site, et le test qui dit lequel des deux
  // est en cause.
  const [raw, setRaw] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [panel, setPanel] = useState(false);
  const toured = useSettings((x) => x.toured);
  const setSetting = useSettings((x) => x.set);

  useEffect(() => {
    if (ready) { setStuck(false); return; }
    const id = setTimeout(() => setStuck(true), 12000);
    return () => clearTimeout(id);
  }, [ready]);

  const reload = useCallback(() => {
    haptics.tap();
    setError(null);
    setReady(false);
    setStuck(false);
    web.current?.reload();
  }, []);

  const toggleRaw = useCallback(() => {
    haptics.press();
    setPageError(null);
    setReady(false);
    setStuck(false);
    setRaw((v) => !v);
  }, []);

  /**
   * Sortie unique. `router.back()` seul ne fait RIEN quand la pile n'a pas
   * d'ecran precedent — au retour d'arriere-plan ou sur un lien profond,
   * par exemple. C'est la que la croix semblait morte.
   */
  const exit = useCallback(() => {
    haptics.tap();
    if (router.canGoBack()) router.back();
    else router.replace('/home');
  }, [router]);

  const onNav = useCallback((a: NavAction) => {
    switch (a) {
      case 'back': web.current?.goBack(); break;
      case 'forward': web.current?.goForward(); break;
      case 'reload': reload(); break;
      // « Accueil » est celui du SITE : on revient a la page saine, pas a
      // l'app. C'est la croix et « Quitter » qui ramenent a UnSwipe.
      case 'home':
        web.current?.injectJavaScript(
          `location.assign(${JSON.stringify(client.url)}); true;`
        );
        break;
      case 'settings': setPanel(true); break;
      case 'exit': exit(); break;
    }
  }, [client.url, exit, reload]);

  const guard = useCallback((req: { url: string }) => {
    try {
      const { hostname, pathname } = new URL(req.url);
      if (hostname.endsWith(client.host) && client.blocked(pathname)) {
        // On annule la navigation, point. Rien d'autre.
        //
        // La version precedente rechargeait la page saine : sur Instagram,
        // ou la moitie du fil mene a /reel/xxx, chaque appui renvoyait donc
        // l'utilisateur en haut d'un fil fraichement recharge. L'app avait
        // l'air cassee. Un reel qu'on n'ouvre pas doit simplement ne pas
        // s'ouvrir.
        return false;
      }
    } catch {
      /* URL exotique (about:blank, intent://) : on laisse passer */
    }
    return true;
  }, [client]);

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.bar} edges={['top']}>
        {/* Rangee en flux : un bouton en position absolue depassait du parent
            et ne recevait plus les touches sur iOS. */}
        <View style={styles.barRow}>
          <Pressable
            onPress={exit}
            hitSlop={20}
            style={styles.close}
            accessibilityRole="button"
            accessibilityLabel="Quitter"
          >
            <X size={19} strokeWidth={2.4} color={c.mist} />
            <Text variant="label">Quitter</Text>
          </Pressable>
          <Text variant="label" tone="secondary" style={styles.host}>
            {raw ? 'Sans filtre' : LABELS[id]}
          </Text>
          <Pressable
            onPress={reload}
            hitSlop={20}
            style={styles.icon}
            accessibilityRole="button"
            accessibilityLabel="Recharger"
          >
            <RotateCw size={17} strokeWidth={2.2} color={c.mist} />
          </Pressable>
        </View>
      </SafeAreaView>

      <WebView
        key={raw ? 'raw' : 'filtered'}
        ref={web}
        source={{ uri: client.url }}
        userAgent={UA}
        injectedJavaScriptBeforeContentLoaded={raw ? 'true;' : script}
        onMessage={(e) => {
          try {
            const m = JSON.parse(e.nativeEvent.data);
            if (m && (m.t === 'err' || m.t === 'rej') && m.m) {
              setPageError(`${m.m}${m.l ? ` (l. ${m.l})` : ''}`);
            }
          } catch {
            /* message qui ne vient pas de nous */
          }
        }}
        onShouldStartLoadWithRequest={guard}
        onLoadEnd={() => setReady(true)}
        onError={(e) => setError(e.nativeEvent.description || 'Connexion impossible')}
        // iOS tue la webview en arriere-plan : sans ca, on revient sur du blanc fige.
        onContentProcessDidTerminate={() => web.current?.reload()}
        onRenderProcessGone={() => web.current?.reload()}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        domStorageEnabled
        javaScriptEnabled
        allowsBackForwardNavigationGestures
        // Sur iOS il entre en conflit avec le defilement des pages lourdes :
        // le bouton recharger de la barre fait le meme travail sans risque.
        pullToRefreshEnabled={Platform.OS !== 'ios'}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={Platform.OS === 'ios'}
        setSupportMultipleWindows={false}
        style={styles.web}
      />

      {/* La barre flotte au-dessus de la WebView : la page ne peut pas lui
          voler les touches. */}
      <NavBubble onAction={onNav} />

      {/* La lame de verre marque l'ouverture de la page. */}
      <GlassSweep />

      <ClientSettings id={id} visible={panel} onClose={() => setPanel(false)} />

      <Coach
        steps={CLIENT_TOUR}
        visible={ready && !toured.client}
        onDone={() => setSetting('toured', { ...toured, client: true })}
      />

      {(stuck || raw) && !error && (
        <View style={styles.rescue} pointerEvents="box-none">
          <View style={styles.rescueRow}>
            <Pressable style={styles.stuck} onPress={reload}>
              <RotateCw size={15} strokeWidth={2.2} color={c.night} />
              <Text variant="label" color={c.night}>Recharger</Text>
            </Pressable>
            <Pressable style={styles.plain} onPress={toggleRaw}>
              <Text variant="label" color={c.mist}>
                {raw ? 'Remettre le filtre' : 'Sans filtre'}
              </Text>
            </Pressable>
          </View>
          {pageError && (
            <Text variant="label" tone="tertiary" numberOfLines={2} style={styles.diag}>
              {pageError}
            </Text>
          )}
        </View>
      )}

      {!ready && !error && (
        <View style={styles.overlay} pointerEvents="none">
          <ActivityIndicator size="large" color={c.accent} />
        </View>
      )}

      {error && (
        <View style={styles.overlay}>
          <Text variant="title">Impossible de charger</Text>
          <Text variant="body" tone="secondary" style={styles.errText}>{error}</Text>
          <View style={{ width: 220 }}>
            <Button label="Réessayer" onPress={() => { setError(null); web.current?.reload(); }} />
          </View>
        </View>
      )}
    </View>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.night },
  bar: { backgroundColor: c.night },
  barRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: space.lg, paddingVertical: space.md,
  },
  close: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    height: 38, borderRadius: 19, paddingHorizontal: 14,
    justifyContent: 'center',
    backgroundColor: c.surfaceHi,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.lineStrong,
  },
  icon: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: c.surfaceHi,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.lineStrong,
  },
  rescue: { position: 'absolute', bottom: 104, left: 0, right: 0, alignItems: 'center', gap: 8 },
  rescueRow: { flexDirection: 'row', gap: 8 },
  stuck: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999,
    backgroundColor: c.accent,
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  plain: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999,
    backgroundColor: c.surfaceHi,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.lineStrong,
  },
  diag: {
    maxWidth: '86%', textAlign: 'center',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
    backgroundColor: c.surface,
  },
  host: { flex: 1, textAlign: 'center' },
  web: { flex: 1, backgroundColor: c.night },
  overlay: {
    position: 'absolute', top: 60, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: c.night, paddingHorizontal: 40, gap: space.md,
  },
  errText: { textAlign: 'center' },
});
