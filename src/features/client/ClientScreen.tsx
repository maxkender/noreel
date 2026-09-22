import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Platform, Pressable, StyleSheet, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';
import { RotateCw, X } from 'lucide-react-native';
import { colors } from '@/theme/colors';
import { space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { Button } from '@/components/Button';
import { haptics } from '@/lib/haptics';
import { CLIENTS, buildScript, type ClientId } from './blockers';
import { APP_TOGGLES, useAppsStore } from '@/store/apps';
import { ExitBubble } from './ExitBubble';
import { GlassSweep } from '@/components/GlassSweep';

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
  const router = useRouter();
  const client = CLIENTS[id];

  // Les reglages sont injectes dans le script : les changer et rouvrir suffit.
  const settingsMap = useAppsStore((st) => st.settings);
  const script = useMemo(() => {
    const active: Record<string, boolean> = {};
    for (const t of APP_TOGGLES[id]) {
      active[t.key] = t.locked ? true : !!settingsMap[`${id}.${t.key}`];
    }
    return buildScript(client.script, active);
  }, [id, client.script, settingsMap]);
  const web = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Chien de garde : si la page n'a rien rendu au bout de 12 s, on propose
  // de recharger plutot que de laisser l'utilisateur devant un ecran mort.
  const [stuck, setStuck] = useState(false);

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

  const guard = useCallback((req: { url: string }) => {
    try {
      const { hostname, pathname } = new URL(req.url);
      if (hostname.endsWith(client.host) && client.blocked(pathname)) {
        // On renvoie vers la page saine plutot que `history.back()` : sans
        // historique, revenir en arriere ne menait nulle part et laissait
        // un ecran blanc dont on ne pouvait plus sortir.
        web.current?.injectJavaScript(
          `location.replace(${JSON.stringify(client.url)}); true;`
        );
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
            <X size={19} strokeWidth={2.4} color={colors.mist} />
            <Text variant="label">Quitter</Text>
          </Pressable>
          <Text variant="label" tone="secondary" style={styles.host}>
            {LABELS[id]}
          </Text>
          <Pressable
            onPress={reload}
            hitSlop={20}
            style={styles.icon}
            accessibilityRole="button"
            accessibilityLabel="Recharger"
          >
            <RotateCw size={17} strokeWidth={2.2} color={colors.mist} />
          </Pressable>
        </View>
      </SafeAreaView>

      <WebView
        ref={web}
        source={{ uri: client.url }}
        userAgent={UA}
        injectedJavaScriptBeforeContentLoaded={script}
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
        pullToRefreshEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={Platform.OS === 'ios'}
        setSupportMultipleWindows={false}
        style={styles.web}
      />

      {/* Sortie de secours : elle flotte au-dessus de la WebView. */}
      <ExitBubble onExit={exit} />

      {/* La lame de verre marque l'ouverture de la page. */}
      <GlassSweep />

      {stuck && !error && (
        <Pressable style={styles.stuck} onPress={reload}>
          <RotateCw size={15} strokeWidth={2.2} color={colors.night} />
          <Text variant="label" color={colors.night}>Ça bloque ? Recharger</Text>
        </Pressable>
      )}

      {!ready && !error && (
        <View style={styles.overlay} pointerEvents="none">
          <ActivityIndicator size="large" color={colors.accent} />
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.night },
  bar: { backgroundColor: colors.night },
  barRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: space.lg, paddingVertical: space.md,
  },
  close: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    height: 38, borderRadius: 19, paddingHorizontal: 14,
    justifyContent: 'center',
    backgroundColor: colors.surfaceHi,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.lineStrong,
  },
  icon: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surfaceHi,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.lineStrong,
  },
  stuck: {
    position: 'absolute', bottom: 108, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999,
    backgroundColor: colors.accent,
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  host: { flex: 1, textAlign: 'center' },
  web: { flex: 1, backgroundColor: colors.night },
  overlay: {
    position: 'absolute', top: 60, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.night, paddingHorizontal: 40, gap: space.md,
  },
  errText: { textAlign: 'center' },
});
