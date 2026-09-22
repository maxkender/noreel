import { useRef, useState, useCallback, useEffect } from 'react';
import {
  ActivityIndicator, Animated, BackHandler, Platform, StyleSheet,
  Text, TouchableOpacity, View, useColorScheme,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';
import { REELS_BLOCKER } from './reelsBlocker';
import { Store, KEYS } from './src/storage';
import Onboarding from './src/Onboarding';
import FloatingBubble from './src/FloatingBubble';
import NavSheet from './src/NavSheet';

const HOME = 'https://www.instagram.com/';

const UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) ' +
  'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

const isReelUrl = (url) => {
  try {
    const { hostname, pathname } = new URL(url);
    if (!hostname.endsWith('instagram.com')) return false;
    return pathname.startsWith('/reels') || pathname.startsWith('/reel/');
  } catch {
    return false;
  }
};

function Browser() {
  const webRef = useRef(null);
  const canGoBack = useRef(false);
  const fade = useRef(new Animated.Value(1)).current;

  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const [menu, setMenu] = useState(false);

  const dark = useColorScheme() === 'dark';
  const bg = dark ? '#000' : '#fff';
  const fg = dark ? '#fff' : '#111';

  useEffect(() => {
    if (!ready) return;
    Animated.timing(fade, { toValue: 0, duration: 260, useNativeDriver: true }).start();
  }, [ready, fade]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack.current) { webRef.current?.goBack(); return true; }
      return false;
    });
    return () => sub.remove();
  }, []);

  const retry = useCallback(() => { setError(null); webRef.current?.reload(); }, []);

  const navigate = useCallback((path) => {
    // Navigation SPA : on pousse l URL sans recharger, le blocker suit via pushState.
    webRef.current?.injectJavaScript(
      `window.location.href = ${JSON.stringify(HOME.replace(/\/$/, '') + path)}; true;`
    );
  }, []);

  const onShouldStart = useCallback((req) => {
    if (isReelUrl(req.url)) {
      webRef.current?.injectJavaScript("location.replace('/'); true;");
      return false;
    }
    return true;
  }, []);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: bg }]} edges={['top']}>
      <StatusBar style={dark ? 'light' : 'dark'} />

      <WebView
        ref={webRef}
        source={{ uri: HOME }}
        userAgent={UA}
        injectedJavaScriptBeforeContentLoaded={REELS_BLOCKER}
        onShouldStartLoadWithRequest={onShouldStart}
        onNavigationStateChange={(s) => { canGoBack.current = s.canGoBack; }}
        onLoadEnd={() => setReady(true)}
        onError={(e) => setError(e.nativeEvent.description || 'Connexion impossible')}
        onHttpError={(e) => {
          if (e.nativeEvent.statusCode >= 500) {
            setError(`Instagram a répondu ${e.nativeEvent.statusCode}`);
          }
        }}
        // iOS tue le process de la webview en arriere-plan : sans ca, ecran blanc fige.
        onContentProcessDidTerminate={() => webRef.current?.reload()}
        onRenderProcessGone={() => webRef.current?.reload()}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        domStorageEnabled
        javaScriptEnabled
        allowsBackForwardNavigationGestures
        pullToRefreshEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction
        setSupportMultipleWindows={false}
        style={{ flex: 1, backgroundColor: bg }}
      />

      {ready && !error && <FloatingBubble onPress={() => setMenu(true)} />}

      <NavSheet
        visible={menu}
        onClose={() => setMenu(false)}
        onNavigate={navigate}
        onReload={() => webRef.current?.reload()}
      />

      {!ready && !error && (
        <Animated.View
          style={[styles.overlay, { backgroundColor: bg, opacity: fade }]}
          pointerEvents="none"
        >
          <ActivityIndicator size="large" color="#38BDF8" />
        </Animated.View>
      )}

      {error && (
        <View style={[styles.overlay, { backgroundColor: bg }]}>
          <Text style={[styles.title, { color: fg }]}>Impossible de charger Instagram</Text>
          <Text style={styles.detail}>{error}</Text>
          <TouchableOpacity style={styles.button} onPress={retry}>
            <Text style={styles.buttonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

export default function App() {
  const [onboarded, setOnboarded] = useState(null);   // null = on ne sait pas encore

  useEffect(() => {
    Store.get(KEYS.onboarded, false).then(setOnboarded);
  }, []);

  const finish = useCallback(async () => {
    await Store.set(KEYS.onboarded, true);
    setOnboarded(true);
  }, []);

  return (
    <SafeAreaProvider>
      {onboarded === null
        ? <View style={{ flex: 1, backgroundColor: '#0B0E14' }} />
        : onboarded
          ? <Browser />
          : <Onboarding onFinish={finish} />}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32,
  },
  title: { fontSize: 17, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  detail: { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 20 },
  button: {
    backgroundColor: '#38BDF8',
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10,
  },
  buttonText: { color: '#00131F', fontWeight: '600', fontSize: 15 },
});
