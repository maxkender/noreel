import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Platform, Pressable, StyleSheet, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';
import { Ban, RotateCw } from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { useColors, useResolvedTheme, type Palette } from '@/theme/useColors';
import { space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { Button } from '@/components/Button';
import { haptics } from '@/lib/haptics';
import { CLIENTS, buildScript, type ClientId } from './blockers';
import { APP_TOGGLES, useAppsStore } from '@/store/apps';
import { NavBar, type NavAction } from './NavBar';
import { GlassSweep } from '@/components/GlassSweep';
import { ClientSettings } from './ClientSettings';
import { useSettings } from '@/store/settings';
import { record } from '@/services/usage';
import { useProStore } from '@/store/pro';
import { ProGate } from '@/features/home/ProGate';

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
  const theme = useResolvedTheme();
  const pro = useProStore((p) => p.pro);
  /*
    Le verrou est ici AUSSI, pas seulement sur l'icone.
    On arrive dans cet ecran par la roue, mais aussi par un raccourci de
    l'ecran d'accueil ou un lien profond : un verrou pose uniquement sur
    l'icone se contournerait en gardant l'ancien raccourci.
  */
  const barred = !pro && id !== 'instagram';

  /*
    La seance est mesuree ici, et nulle part ailleurs.
    C'est le seul temps qu'on puisse observer honnetement : celui passe dans
    NOS ecrans. Le temps passe dans l'Instagram d'origine ne nous est pas
    accessible, et l'inventer serait mentir sur le chiffre meme que la
    personne vient verifier.
  */
  useEffect(() => {
    const t0 = Date.now();
    return () => { void record(id, Date.now() - t0); };
  }, [id]);
  const styles = useMemo(() => sheet(c), [c]);
  const router = useRouter();
  const client = CLIENTS[id];

  const settingsMap = useAppsStore((st) => st.settings);
  const active = useMemo(() => {
    const m: Record<string, boolean> = {};
    for (const t of APP_TOGGLES[id]) {
      // Meme regle que le magasin : verrouille, sinon le choix de
      // l'utilisateur, sinon la valeur par defaut du reglage.
      m[t.key] = t.locked ? true : (settingsMap[`${id}.${t.key}`] ?? !!t.on);
    }
    return m;
  }, [id, settingsMap]);

  // Le script lui-meme est fige au premier rendu : il est injecte AVANT le
  // chargement de la page, changer la propriete ensuite ne change rien.
  // Seuls ses REGLAGES bougent, et ils voyagent par le canal ci-dessous.
  const script = useMemo(
    () => buildScript(client.script, active, theme),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [client.script]
  );
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
  // Blocage strict : un reel touche affiche un mur au lieu de ne rien
  // faire. Sans retour visible, l'utilisateur croit a un bug et insiste.
  const strict = useSettings((x) => x.strictMode);
  const [wall, setWall] = useState(false);

  /**
   * Un interrupteur agit TOUT DE SUITE.
   *
   * Avant, le panneau disait « recharge la page » — ce que personne ne
   * faisait, si bien que bloquer les stories ou les posts suggeres semblait
   * ne rien faire du tout. On pousse maintenant la table de reglages dans
   * la page, qui repasse aussitot et rend ce qu'elle ne doit plus cacher.
   */
  useEffect(() => {
    web.current?.injectJavaScript(
      `window.__nrApply && window.__nrApply(${JSON.stringify(active)}); true;`
    );
  }, [active]);

  // Le theme voyage comme les reglages : la page est deja chargee, on ne
  // peut plus remplacer le script, mais on peut lui parler.
  useEffect(() => {
    web.current?.injectJavaScript(
      `window.__nrApplyTheme && window.__nrApplyTheme(${JSON.stringify(theme)}); true;`
    );
  }, [theme]);

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
    let u: URL;
    try {
      u = new URL(req.url);
    } catch {
      return false;   // URL illisible : on ne la suit pas
    }

    // TOUT ce qui n'est pas http(s) sort de la WebView et atterrit dans
    // l'app native — c'est ainsi qu'ouvrir X renvoyait vers X. On refuse en
    // bloc : instagram://, twitter://, itms-apps://, et le reste.
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;

    // Les pages qui ne servent qu'a pousser vers l'app native.
    if (/^\/(download|app|mobile\/?$|i\/flow\/login_error)/.test(u.pathname)) return false;

    if (u.hostname.endsWith(client.host) && client.blocked(u.pathname)) {
      if (strict) {
        setWall(true);
        setTimeout(() => setWall(false), 2600);
      }
      // On annule la navigation, point. Rien d'autre.
      //
      // La version precedente rechargeait la page saine : sur Instagram, ou
      // la moitie du fil mene a /reel/xxx, chaque appui renvoyait donc
      // l'utilisateur en haut d'un fil fraichement recharge.
      return false;
    }
    return true;
  }, [client, strict]);

  if (barred) {
    return (
      <View style={styles.root}>
        <ProGate visible onClose={exit} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/*
        Un bandeau plein, de la couleur de l'app.
        Sans lui la page demarrait sous l'encoche : l'heure et le reseau se
        posaient sur le contenu du site, et la premiere ligne etait illisible.
        Il suit le theme — un bandeau fige en sombre ferait une barre noire
        au-dessus d'une page claire.
      */}
      <SafeAreaView edges={['top']} style={styles.bar}>
        <View style={styles.barRow}>
          <Text variant="label" color={withAlpha(c.mist, 0.5)}>
            {raw ? 'SANS FILTRE' : LABELS[id]}
          </Text>
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
        // Sans cette liste, iOS remet les schemas inconnus au systeme,
        // qui ouvre l'app native.
        originWhitelist={['http://*', 'https://*']}
        style={styles.web}
      />

      {/* La barre flotte au-dessus de la WebView : la page ne peut pas lui
          voler les touches. */}
      <NavBar onAction={onNav} />

      {/* La lame de verre marque l'ouverture de la page. */}
      <GlassSweep />

      {wall && (
        <View style={styles.wall} pointerEvents="none">
          <View style={styles.wallRing}>
            <Ban size={30} strokeWidth={2} color={c.danger} />
          </View>
          <Text variant="title" style={styles.wallText}>Bloqué.</Text>
          <Text variant="body" tone="secondary" style={styles.wallText}>
            C’est exactement pour ça que tu es là.
          </Text>
        </View>
      )}

      <ClientSettings
        id={id}
        visible={panel}
        onClose={() => setPanel(false)}
        onGo={(url) => {
          setPanel(false);
          web.current?.injectJavaScript(
            'location.assign(' + JSON.stringify(url) + '); true;'
          );
        }}
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
  /*
    Une hauteur de barre de navigation, la meme partout.
    Le bandeau ne faisait que la hauteur de son texte : la page demarrait
    donc juste sous l'encoche, et l'en-tete du site — les coeurs d'Instagram,
    par exemple — se retrouvait a portee du pouce de personne, a demi sous
    l'ilot dynamique. 44 points, c'est la hauteur qu'iOS donne a ses propres
    barres, et elle ne depend pas du site affiche.
  */
  barRow: { height: 58, alignItems: 'center', justifyContent: 'center' },
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
  web: { flex: 1, backgroundColor: c.night === '#08090B' ? '#0B0D11' : '#FFFFFF' },
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: c.night, paddingHorizontal: 40, gap: space.md,
  },
  errText: { textAlign: 'center' },
  wall: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center', gap: space.md,
    paddingHorizontal: 40, backgroundColor: withAlpha(c.night, 0.94), zIndex: 120,
  },
  wallRing: {
    width: 74, height: 74, borderRadius: 37,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: withAlpha(c.danger, 0.5),
    backgroundColor: withAlpha(c.danger, 0.1),
  },
  wallText: { textAlign: 'center' },
});
