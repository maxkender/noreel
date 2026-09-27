import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Platform, Pressable, StyleSheet, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';
import { Ban, Hourglass, RotateCw } from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { useColors, useResolvedTheme, type Palette } from '@/theme/useColors';
import { space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { Button } from '@/components/Button';
import { haptics } from '@/lib/haptics';
import { CLIENTS, buildScript, valveOpen, type ClientId } from './blockers';
import { APP_TOGGLES, useAppsStore } from '@/store/apps';
import { NavBar, type NavAction } from './NavBar';
import { GlassSweep } from '@/components/GlassSweep';
import { ClientSettings } from './ClientSettings';
import { useSettings } from '@/store/settings';
import { record, today } from '@/services/usage';
import { countBlocked, markDay, markRaw, reportRules } from '@/services/protect';
import { useProStore } from '@/store/pro';
import { ProGate } from '@/features/home/ProGate';

const LABELS: Record<ClientId, string> = {
  instagram: 'Instagram · sans reels',
  tiktok: 'TikTok · abonnements',
  twitter: 'X · abonnements',
  youtube: 'YouTube · sans shorts',
};

/*
 * Quinze minutes par jour en gratuit.
 *
 * Assez pour repondre a ses messages et voir ce qu'on voulait voir, trop peu
 * pour s'y perdre. C'est aussi la demonstration la plus honnete de ce que
 * vend l'abonnement : on ne cache pas la fonctionnalite, on rend son temps
 * fini — exactement ce que l'app promet de faire du temps d'ecran.
 */
const FREE_MINUTES = 15;

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
    // Aujourd'hui compte comme un jour protege des qu'un ecran filtre sert.
    void markDay();
    return () => { void record(id, Date.now() - t0); };
  }, [id]);
  const styles = useMemo(() => sheet(c), [c]);
  const router = useRouter();
  const client = CLIENTS[id];
  /*
    La couleur du bandeau est celle DU SITE, relevee dans le navigateur.
    Trois couleurs se suivaient sous l'encoche : notre bandeau, le fond de la
    WebView, et le fond du site. Trois noirs presque identiques font deux
    coutures, et une couture sous l'encoche se voit tout de suite — c'est la
    difference entre « une app qui ouvre Instagram » et « Instagram ».
  */
  const chrome = client.chrome[theme === 'dark' ? 'dark' : 'light'];

  // La fenetre du samedi soir. Elle voyage avec le script : la page doit
  // pouvoir decider seule, a la minute, sans qu'on lui reparle.
  const valve = useSettings((x) => x.valve);
  /*
    La fenetre s'ouvre a une heure, pas a un geste.
    Le bandeau doit s'allumer a vingt heures meme si personne ne touche
    l'ecran, et s'eteindre a vingt et une : on relit l'horloge toutes les
    trente secondes, comme la page injectee le fait de son cote.
  */
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(iv);
  }, []);
  // L'etat garde l'HEURE, et l'ouverture s'en deduit. Poser l'ouverture dans
  // un effet demandait un setState synchrone a chaque changement de reglage —
  // un rendu de plus pour une valeur qu'un calcul donne tout de suite.
  const inValve = useMemo(() => valveOpen(valve, new Date(now)), [valve, now]);

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
    () => buildScript(client.script, active, theme, valve),
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
  // Le numero du reel referme. Un compteur qui monte se lit comme un score ;
  // « Bloque » tout seul se lit comme un reproche.
  const [nth, setNth] = useState(0);
  // Le plafond du jour, en gratuit. Et le paywall qu'il propose.
  const [capped, setCapped] = useState(false);
  const [gate, setGate] = useState(false);

  /*
    Le plafond se surveille pendant la seance, pas seulement a son ouverture.
    Le temps du jour n'est ecrit sur le disque qu'a la sortie de l'ecran : en
    ne lisant que le disque, une premiere seance du jour n'aurait jamais de
    fin. On ajoute donc le temps ecoule depuis l'entree.
  */
  useEffect(() => {
    if (pro) return;
    let alive = true;
    const t0 = Date.now();
    const check = async () => {
      const t = await today();
      const used = t.perApp[id] + (Date.now() - t0) / 60_000;
      if (alive && used >= FREE_MINUTES) setCapped(true);
    };
    void check();
    const iv = setInterval(() => { void check(); }, 15_000);
    return () => { alive = false; clearInterval(iv); };
  }, [pro, id]);

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
    setRaw((v) => {
      // Le mode brut est le seul recul qu'on puisse observer : l'indice de
      // recuperation le compte, et il n'a rien d'autre a se mettre sous la dent.
      if (!v) void markRaw();
      return !v;
    });
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
      <SafeAreaView edges={['top']} style={[styles.bar, { backgroundColor: chrome }]}>
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
            // Un format court reconnu a sa forme : la page est deja repartie
            // en arriere. Sans un mot, ce demi-tour passe pour un plantage.
            if (m && m.t === 'short') {
              setWall(true);
              void countBlocked().then(setNth);
              setTimeout(() => setWall(false), 2000);
            }
            /*
              Le filtre se surveille lui-meme.
              Une regle qui ne trouve plus rien est une regle morte, et un
              utilisateur qui revoit un reel ne nous ecrit pas : il annule. La
              page rend donc compte de ses prises, et l'app decide — jamais
              sur un seul chargement, et jamais quand tous les reglages sont
              eteints, ou zero prise est la reponse juste.
            */
            if (m && m.t === 'rules' && typeof m.n === 'number' && m.on > 0) {
              void reportRules(id, m.n);
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
        style={[styles.web, { backgroundColor: chrome }]}
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
          {/*
            Le mur porte un NUMERO.
            « Bloque. » tout seul est un reproche, et on finit par en vouloir a
            l'app qui le dit. Le meme evenement numerote devient un score : ce
            n'est plus une porte fermee mais un reel de moins, et c'est le seul
            chiffre qui justifie l'abonnement a la fin du mois.
          */}
          <Text variant="title" style={styles.wallText}>
            {nth > 0 ? `Reel nº ${nth} évité` : 'Bloqué.'}
          </Text>
          <Text variant="body" tone="secondary" style={styles.wallText}>
            C’est exactement pour ça que tu es là.
          </Text>
        </View>
      )}

      {/* La fenetre ouverte se dit. Une permission qu'on ne voit pas ne
          rassure personne, et on croit le filtre casse. */}
      {inValve && !capped && (
        <View style={styles.valve} pointerEvents="none">
          <Text variant="label" color={c.ember}>
            Fenêtre ouverte jusqu’à {valve.to} h
          </Text>
        </View>
      )}

      {/*
        Le plafond du jour. Il explique AVANT de vendre : un paywall qui tombe
        sans un mot se lit comme une panne.
      */}
      {capped && !gate && (
        <View style={styles.cap}>
          <View style={styles.wallRing}>
            <Hourglass size={28} strokeWidth={2} color={c.ember} />
          </View>
          <Text variant="displayM" style={styles.wallText}>
            Tes {FREE_MINUTES} minutes du jour sont passées.
          </Text>
          <Text variant="body" tone="secondary" style={styles.wallText}>
            C’est le principe : ton temps est fini. Passe en illimité pour
            choisir toi-même combien tu t’accordes.
          </Text>
          <View style={styles.capBtns}>
            <Button
              label="Débloquer mes 3 jours gratuits"
              onPress={() => { haptics.press(); setGate(true); }}
            />
            <Button label="Fermer Instagram" onPress={exit} variant="ghost" />
          </View>
        </View>
      )}

      <ProGate
        visible={gate}
        onClose={() => {
          setGate(false);
          // Achete : le plafond tombe. Refuse : il reste, et la sortie est la.
          if (useProStore.getState().pro) setCapped(false);
        }}
      />

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
  // Le fond de la WebView est pose a l'usage, avec la couleur du site : une
  // valeur figee ici ne peut pas savoir quel site on affiche.
  web: { flex: 1 },
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
  valve: {
    position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center',
    paddingTop: 2, zIndex: 110,
  },
  cap: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center', gap: space.md,
    paddingHorizontal: 32, backgroundColor: withAlpha(c.night, 0.97), zIndex: 130,
  },
  capBtns: { alignSelf: 'stretch', marginTop: space.md, gap: space.xs },
});
