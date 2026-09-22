import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Platform, Pressable, StyleSheet, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { colors, withAlpha } from '@/theme/colors';
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

  const guard = useCallback((req: { url: string }) => {
    try {
      const { hostname, pathname } = new URL(req.url);
      if (hostname.endsWith(client.host) && client.blocked(pathname)) {
        web.current?.injectJavaScript("history.back(); true;");
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
            onPress={() => { haptics.tap(); router.back(); }}
            hitSlop={16}
            style={styles.close}
            accessibilityRole="button"
            accessibilityLabel="Fermer"
          >
            <X size={20} strokeWidth={2} color={colors.mist} />
          </Pressable>
          <Text variant="label" tone="secondary" style={styles.host}>
            {LABELS[id]}
          </Text>
          <View style={styles.closeSpacer} />
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
      <ExitBubble onExit={() => router.back()} />

      {/* La lame de verre marque l'ouverture de la page. */}
      <GlassSweep />

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
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surfaceHi,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.lineStrong,
  },
  closeSpacer: { width: 38 },
  host: { flex: 1, textAlign: 'center' },
  web: { flex: 1, backgroundColor: colors.night },
  overlay: {
    position: 'absolute', top: 60, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.night, paddingHorizontal: 40, gap: space.md,
  },
  errText: { textAlign: 'center' },
});
