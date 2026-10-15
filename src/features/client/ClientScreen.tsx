import { useCallback, useEffect, useMemo, useRef, useState, useContext } from 'react';
import {
  Platform, Pressable, StyleSheet, View,
} from 'react-native';
import { SafeAreaInsetsContext, initialWindowMetrics } from 'react-native-safe-area-context';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';
import { Hand, Hourglass, Info, RotateCw, Timer } from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { useColors, useResolvedTheme, type Palette } from '@/theme/useColors';
import { space, gutter } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { Button } from '@/components/Button';
import { haptics } from '@/lib/haptics';
import { useT, dict } from '@/i18n';
import { CLIENTS, buildScript, valveOpen, type ClientId } from './blockers';
import { HelpSheet } from '@/components/HelpSheet';
import { SwitchSheet } from './SwitchSheet';
import { uidOf, useSessions } from '@/store/sessions';
import { forget, looksLoggedIn, restore, snapshot } from '@/services/sessions';
import { LinkSheet } from './LinkSheet';
import { PostAsk, PostModeSheet } from './PostSheet';
import { startPostMode, usePostModeReconcile } from '@/services/postmode';
import { firstRunUrl, markFirstRunDone } from './firstrun';
import { ClientTutorial } from './ClientTutorial';
import { markTutorialSeen, tutorialSeen } from './tutorial';
import { ACCOUNT } from './accounts';
import { PASS_MINUTES, ReelsPass } from './ReelsPass';
import { APP_TOGGLES, useAppsStore } from '@/store/apps';
import { tintById } from '@/theme/tints';
import { NavBar, type NavAction } from './NavBar';
import { GlassSweep } from '@/components/GlassSweep';
import { ClientSettings } from './ClientSettings';
import { useSettings } from '@/store/settings';
import { record, today } from '@/services/usage';
import { countBlocked, markDay, markRaw, reportRules, stats } from '@/services/protect';
import { useProStore } from '@/store/pro';
import { PURCHASES_ENABLED } from '@/services/purchases';
import { ProGate } from '@/features/home/ProGate';
import { requestReviewOnce } from '@/services/review';

/* Lu a l'appel, pas a l'import : la langue peut changer entre les deux. */
const label = (id: ClientId): string => ({
  instagram: dict.ui.labelIg,
  tiktok: dict.ui.labelTt,
  twitter: dict.ui.labelX,
  youtube: dict.ui.labelYt,
})[id];

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

/** Le message d'iOS quand un filtre de contenu bloque la page, en toute langue. */
export function filtered(message: string): boolean {
  return /filtre de contenu|content filter|contentfilter/i.test(message);
}

export function ClientScreen({ id, openUrl }: { id: ClientId; /** Un lien colle ailleurs, a ouvrir ici. */ openUrl?: string }) {
  const c = useColors();
  const theme = useResolvedTheme();
  const pro = useProStore((p) => p.pro);
  const { d, t } = useT();
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

  /*
    La teinte choisie pour cette app.
    Elle peint NOTRE bandeau et les accents du site — boutons, liens, ses
    propres bulles de message. Sans teinte, le bandeau reprend la couleur du
    site et la page garde ses couleurs d'origine.
  */
  // Les couleurs d'app ont ete retirees des reglages (15 octobre 2026) : une
  // teinte choisie avant ne s'applique plus, la page garde ses couleurs.
  const tintId: string | undefined = undefined;
  const tint = useMemo(() => tintById(tintId), [tintId]);
  const tinted = tintId && tintId !== 'default';
  const barColour = tinted ? tint.hex : chrome;
  const barInk = tinted ? tint.ink : c.mist;

  // La fenetre du samedi soir. Elle voyage avec le script : la page doit
  // pouvoir decider seule, a la minute, sans qu'on lui reparle.
  // La fenetre autorisee a ete retiree des reglages : on la tient fermee,
  // meme pour qui l'avait allumee avant.
  const savedValve = useSettings((x) => x.valve);
  const valve = useMemo(() => ({ ...savedValve, on: false }), [savedValve]);
  // Le laissez-passer : une echeance, que le temps perime tout seul.
  const openUntil = useSettings((x) => x.reelsUntil);
  const setSetting = useSettings((x) => x.set);
  const [pass, setPass] = useState(false);
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
  // Les minutes qu'il reste au laissez-passer. Zero quand il n'y en a pas, ou
  // quand il a expire : l'horloge le perime sans qu'on ait rien a eteindre.
  const passLeft = openUntil > now ? Math.ceil((openUntil - now) / 60_000) : 0;

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

  /*
    Le script SUIT les reglages.

    Il etait fige au premier rendu, sur l'idee qu'une fois la page chargee
    rien ne pouvait plus le remplacer. C'est faux : la WebView reenregistre
    le script a chaque changement de la propriete, et c'est lui qui part au
    prochain chargement. Fige, un rechargement repartait avec les reglages
    du premier jour — le fil bloque revenait, « messages uniquement » se
    perdait. Les reglages voyagent aussi en direct, par le canal plus bas,
    pour la page deja chargee.
  */
  const script = useMemo(
    () => buildScript(
      client.script, active, theme, valve, tinted ? tint.rgb : null, openUntil,
      { title: d.client.wallTitle, body: d.client.wallBody, hint: d.client.wallHint, explore: d.client.wallExplore }
    ),
    [client.script, active, theme, valve, tinted, tint.rgb, openUntil, d.client.wallTitle, d.client.wallBody, d.client.wallHint, d.client.wallExplore]
  );
  /*
    L'adresse d'arrivee. Nulle tant qu'on n'a pas interroge le disque : partir
    sur le fil puis sauter vers la connexion ferait charger deux pages, et on
    verrait le fil vide clignoter avant d'etre redirige.
  */
  const [entry, setEntry] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    // Un lien du meme site, colle depuis le compte : on l'ouvre directement.
    let wanted: string | null = null;
    try { if (openUrl && new URL(openUrl).hostname.endsWith(client.host)) wanted = openUrl; } catch { /* lien illisible */ }
    void firstRunUrl(id, 'login' in client ? client.login : undefined)
      .then((u) => { if (alive) setEntry(wanted ?? u ?? client.url); });
    return () => { alive = false; };
  }, [id, client, openUrl]);

  /*
    La story de bienvenue, une fois, avant que la page ne charge.

    Trois etats : on ne sait pas encore (le disque n'a pas repondu), on la
    montre, on ne la montre pas. Tant qu'on ne sait pas, rien — sinon la page
    se mettrait a charger derriere une story qu'on va peut-etre afficher, et
    on arriverait dessus a moitie chargee. Instagram seulement : c'est la
    seule dont les mots sont ecrits.
  */
  const [tuto, setTuto] = useState<'unknown' | 'show' | 'no'>(id === 'instagram' ? 'unknown' : 'no');
  useEffect(() => {
    if (id !== 'instagram') return;
    let alive = true;
    void tutorialSeen(id).then((seen) => { if (alive) setTuto(seen ? 'no' : 'show'); });
    return () => { alive = false; };
  }, [id]);

  /*
    Le temps passe ici, en minutes et secondes.

    Il repart de zero a chaque ouverture : c'est une SESSION qu'on mesure, pas
    un cumul. Le cumul de la journee vit sur l'accueil, ou on va le consulter ;
    ici on veut la reponse a « ca fait combien de temps que j'y suis ? », et
    seule la session y repond.
  */
  const [help, setHelp] = useState(false);
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const h = setInterval(() => setSecs((n) => n + 1), 1000);
    return () => clearInterval(h);
  }, []);
  const elapsed = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  // La marge de l'encoche : celle du moment, sinon celle connue au demarrage, jamais zero.
  // Le contexte, et non le hook qui exige un fournisseur : un ecran monte seul (un test) ne doit pas tomber.
  const insets = useContext(SafeAreaInsetsContext);
  const topInset = Math.max(insets?.top ?? 0, initialWindowMetrics?.insets.top ?? 0, 20);
  // Les notes passageres se posent SOUS la barre, jamais dessus.
  const noteTop = topInset + 44 + 6;

  const web = useRef<WebView>(null);
  const [history, setHistory] = useState({ back: false, forward: false });
  const seeHistory = (n: { canGoBack: boolean; canGoForward: boolean }) => {
    setHistory((h) => (h.back === n.canGoBack && h.forward === n.canGoForward ? h : { back: n.canGoBack, forward: n.canGoForward }));
  };
  const [ready, setReady] = useState(false);
  /*
    L'avancement du chargement, de zero a un.

    C'etait une roue qui tourne au milieu de l'ecran. Une roue ne dit rien :
    elle tourne pareil a dix pour cent et a quatre-vingt-dix, donc au bout de
    trois secondes on ne sait pas s'il faut attendre ou recharger — et sur une
    page tierce qu'on n'a pas choisie, le doute se resout en fermant. Un fil
    qui avance repond a la seule question posee : est-ce que ca progresse ?
  */
  const [load, setLoad] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // Chien de garde : si la page n'a rien rendu au bout de 12 s, on propose
  // de recharger plutot que de laisser l'utilisateur devant un ecran mort.
  const [stuck, setStuck] = useState(false);
  // Mode degrade : la page servie telle quelle, sans notre script. C'est la
  // sortie quand le filtre casse le site, et le test qui dit lequel des deux
  // est en cause.
  const [raw, setRaw] = useState(false);
  /** Monte une WebView neuve quand celle d'Android a perdu son moteur. */
  const [generation, setGeneration] = useState(0);
  const [pageError, setPageError] = useState<string | null>(null);
  const [panel, setPanel] = useState(false);
  /** Un reglage a bouge pendant que la feuille etait ouverte : on recharge a sa fermeture. */
  const touched = useRef(false);
  /** « Reglages appliques », deux secondes et demie apres OK : sinon on ne sait pas si ca a pris. */
  const [applied, setApplied] = useState(false);
  // Blocage strict : un reel touche affiche un mur au lieu de ne rien
  // faire. Sans retour visible, l'utilisateur croit a un bug et insiste.
  const strict = useSettings((x) => x.strictMode);
  const [wall, setWall] = useState(false);
  const raise = () => { setWall(true); };
  // Le numero du reel referme. Un compteur qui monte se lit comme un score ;
  // « Bloque » tout seul se lit comme un reproche.
  const [nth, setNth] = useState(0);
  // Les jours proteges, pour savoir a quel niveau dessiner Corti sur le mur.
  // Lus une fois a l'ouverture : ils ne changent pas en cours de seance.
  const [days, setDays] = useState(0);
  // Vrai le temps que le selecteur de comptes s'ouvre, pour dire quoi faire
  // s'il ne s'ouvre pas : le chemin est fait de libelles, donc il peut
  // changer sous nos pieds.
  const [switching, setSwitching] = useState(false);
  // Le lien colle, et le mode publication.
  const [linkOpen, setLinkOpen] = useState(false);
  const [postAsk, setPostAsk] = useState(false);
  const [postSettings, setPostSettings] = useState(false);
  const [postNote, setPostNote] = useState<string | null>(null);
  const selection = useSettings((x) => x.selection);
  const blocking = useSettings((x) => x.blocking);
  const postMinutes = useSettings((x) => x.postMinutes);
  const postLimit = useSettings((x) => x.postLimit);
  usePostModeReconcile(selection, blocking);
  const openToPost = async () => {
    setPostAsk(false);
    const r = await startPostMode(selection, blocking, postMinutes, postLimit);
    const line = r === 'unlocked' ? t(d.client.postUnlocked, { n: postMinutes })
      : r === 'limited' ? t(d.client.postLimitHit, { n: postLimit })
        : r === 'failed' ? d.client.postFailed : null;
    if (line) { setPostNote(line); setTimeout(() => setPostNote(null), 5000); }
  };
  const [switchFailed, setSwitchFailed] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
  /** Le pseudo connecte, lu sur la page. Nul tant qu'on ne l'a pas. */
  const [who, setWho] = useState<string | null>(null);
  /*
    Les comptes, tenus par NOUS.
    Des qu'on sait qui est connecte, on garde sa session (ses cookies) sous
    son pseudo, avec sa photo. Changer de compte remet ces cookies et
    recharge ; ajouter un compte retire les cookies du site et mene a sa
    page de connexion, sans toucher a la session gardee. Plus rien ne
    depend du selecteur d'Instagram.
  */
  const accounts = useSessions((x) => x.sessions[id] ?? []);
  const current = useSessions((x) => x.current[id] ?? null);
  const upsert = useSessions((x) => x.upsert);
  const setCurrent = useSessions((x) => x.setCurrent);
  const removeAccount = useSessions((x) => x.remove);
  const currentUid = current ?? accounts.find((a) => a.user === who)?.uid ?? null;
  /** Le compte qu'on vient de demander, a verifier au prochain chargement. */
  const wanted = useRef<string | null>(null);
  /*
    Le compte se range sous son IDENTIFIANT, lu dans la session : le pseudo
    lu sur la page n'est qu'une etiquette, et on ne la change que quand la
    lecture est sure (le lien de profil de la barre fixe). Une lecture qui
    se trompait rangeait la session en cours sous un autre nom — deux
    « comptes » pour une seule session, et changer de l'un a l'autre
    ramenait au meme.
  */
  const keep = useCallback(async (user: string, pic: string, sure: boolean) => {
    const cookies = await snapshot(id);
    if (!looksLoggedIn(id, cookies)) return;
    const uid = uidOf(cookies);
    if (!uid) return;
    const known = useSessions.getState().sessions[id]?.find((a) => a.uid === uid);
    const name = sure || !known ? user : known.user;
    upsert(id, { uid, user: name, avatar: pic || undefined, cookies, savedAt: Date.now() });
  }, [id, upsert]);
  /*
    Changer de compte : on remet sa session, on recharge, et on VERIFIE au
    chargement suivant que c'est bien lui. Si la page revient sur l'autre,
    on ne reste pas la : on vide la session du site et on mene a la
    connexion — on y entre dans le bon compte, et il est garde a nouveau.
  */
  const toLogin = useCallback(async () => {
    await forget(id);
    setCurrent(id, null);
    setWho(null);
    web.current?.injectJavaScript(`location.assign(${JSON.stringify(ACCOUNT[id].add)}); true;`);
  }, [id, setCurrent]);
  const pick = useCallback(async (uid: string) => {
    const acc = accounts.find((a) => a.uid === uid);
    if (!acc) return;
    setSwitchOpen(false);
    setPanel(false);
    setSwitching(true);
    const ok = await restore(id, acc.cookies);
    const now = uidOf(await snapshot(id));
    if (!ok || now !== uid) {
      setSwitching(false);
      setSwitchFailed(true);
      setTimeout(() => setSwitchFailed(false), 5000);
      await toLogin();
      return;
    }
    setCurrent(id, uid);
    wanted.current = uid;
    // La page part avec la session remise : on recharge l'accueil, on ne
    // reste pas sur une page qui appartenait a l'autre compte.
    web.current?.injectJavaScript(`location.replace(${JSON.stringify(client.url)}); true;`);
  }, [accounts, id, setCurrent, toLogin, client.url]);
  const addAccount = useCallback(async () => {
    setSwitchOpen(false);
    setPanel(false);
    await toLogin();
  }, [toLogin]);
  /** Au chargement qui suit un changement : est-on bien sur le compte demande ? */
  const verifySwitch = useCallback(async () => {
    const uid = wanted.current;
    if (!uid) return;
    wanted.current = null;
    const now = uidOf(await snapshot(id));
    setSwitching(false);
    if (now === uid) return;
    setSwitchFailed(true);
    setTimeout(() => setSwitchFailed(false), 5000);
    await toLogin();
  }, [id, toLogin]);
  useEffect(() => {
    let alive = true;
    void stats().then((x) => { if (alive) setDays(x.days); });
    return () => { alive = false; };
  }, []);
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
    /*
      On ne plafonne pas ce qu'on ne peut pas vendre.
      Sans boutique configuree il n'existe aucun moyen de lever le mur : le
      plafond deviendrait une impasse, et le bouton « debloquer » un bouton
      qui ne fait rien.
    */
    if (pro || !PURCHASES_ENABLED) return;
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
  const firstActive = useRef(true);
  useEffect(() => {
    web.current?.injectJavaScript(
      `window.__nrApply && window.__nrApply(${JSON.stringify(active)}); true;`
    );
    // Le premier passage est l'arrivee des reglages, pas un geste.
    if (firstActive.current) { firstActive.current = false; return; }
    touched.current = true;
  }, [active]);
  /*
    « Messages uniquement » qu'on eteint doit RENDRE l'accueil.
    Le reglage renvoyait tout vers la boite de reception ; une fois eteint,
    la page restait sur la boite et rien ne ramenait au fil — on croyait
    l'app cassee. Des qu'il passe a faux, on repart de l'accueil.
  */
  const dmsOnly = !!active.dmsOnly;
  const wasDmsOnly = useRef(dmsOnly);
  useEffect(() => {
    if (wasDmsOnly.current && !dmsOnly) {
      web.current?.injectJavaScript(`location.assign(${JSON.stringify(client.url)}); true;`);
    }
    wasDmsOnly.current = dmsOnly;
  }, [dmsOnly, client.url]);

  // La teinte voyage par le meme canal : on la change dans le panneau, sans
  // quitter la page ni la recharger.
  useEffect(() => {
    web.current?.injectJavaScript(
      `window.__nrApplyTint && window.__nrApplyTint(${JSON.stringify(tinted ? tint.rgb : null)}); true;`
    );
  }, [tinted, tint.rgb]);

  // L'echeance aussi : la page decide seule, en comparant a l'horloge.
  useEffect(() => {
    web.current?.injectJavaScript(
      `window.__nrApplyOpen && window.__nrApplyOpen(${JSON.stringify(openUntil)}); true;`
    );
  }, [openUntil]);

  // Le theme voyage comme les reglages : la page est deja chargee, on ne
  // peut plus remplacer le script, mais on peut lui parler.
  useEffect(() => {
    web.current?.injectJavaScript(
      `window.__nrApplyTheme && window.__nrApplyTheme(${JSON.stringify(theme)}); true;`
    );
  }, [theme]);

  useEffect(() => {
    if (ready) { setStuck(false); return; }
    // Huit secondes et non douze : au-dela, on a deja conclu que l'app est
    // cassee. Le secours doit arriver pendant qu'on attend encore.
    const id = setTimeout(() => setStuck(true), 8000);
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
    // La premiere fois qu'on ferme Instagram, la feuille de note d'Apple —
    // une fois revenu a l'accueil, pas par-dessus la fermeture.
    if (id === 'instagram') setTimeout(() => { void requestReviewOnce('first-close'); }, 900);
  }, [router, id]);

  const onNav = useCallback((a: NavAction) => {
    switch (a) {
      case 'back': web.current?.goBack(); break;
      case 'forward': web.current?.goForward(); break;
      case 'reload': reload(); break;
      /*
        Le selecteur de comptes est celui du SITE.
        Isoler deux sessions de notre cote demanderait un magasin de cookies
        par compte, et WKWebView n'en expose qu'un. Instagram, lui, garde deja
        ses sessions : sa page de connexion liste les comptes enregistres et
        bascule sans deconnecter le premier.
      */
      /*
        On ouvre le selecteur DANS la page, on ne navigue pas.
        Mener vers la page de connexion terminait souvent la session en
        cours : on croyait basculer, on se retrouvait deconnecte. Instagram
        tient deja ses comptes ; son selecteur est dans la page.
      */
      case 'account':
        if (id === 'instagram') {
          /*
            On OUVRE une feuille au lieu de tenter le selecteur en aveugle.
            L'entree du menu declenchait directement la bascule : quand le
            selecteur d'Instagram avait bouge, il ne se passait rien, sans un
            mot, et on ne savait meme pas sur quel compte on etait. La feuille
            repond d'abord a cette question-la, puis propose d'agir.
          */
          setSwitchOpen(true);
          setSwitchFailed(false);
        } else {
          web.current?.injectJavaScript(
            `location.assign(${JSON.stringify(ACCOUNT[id].add)}); true;`
          );
        }
        break;
      case 'link': setLinkOpen(true); break;
      case 'settings': touched.current = false; setPanel(true); break;
      case 'exit': exit(); break;
    }
  }, [exit, id, reload]);

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
        raise();
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

  if (tuto !== 'no') {
    return (
      <View style={styles.root}>
        {tuto === 'show' && (
          <ClientTutorial id={id} onDone={() => { void markTutorialSeen(id); setTuto('no'); }} />
        )}
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
      <SwitchSheet
        visible={switchOpen}
        onClose={() => setSwitchOpen(false)}
        accounts={accounts}
        current={currentUid}
        failed={switchFailed}
        onPick={(u) => { void pick(u); }}
        onAdd={() => { void addAccount(); }}
        onRemove={(u) => removeAccount(id, u)}
      />

      <LinkSheet
        id={id}
        app={label(id).split(' ·')[0]}
        visible={linkOpen}
        onClose={() => setLinkOpen(false)}
        onGo={(url) => web.current?.injectJavaScript(`location.assign(${JSON.stringify(url)}); true;`)}
      />
      <PostAsk
        visible={postAsk}
        onClose={() => setPostAsk(false)}
        onOpen={() => { void openToPost(); }}
        onSettings={() => { setPostAsk(false); setPostSettings(true); }}
      />
      <PostModeSheet
        visible={postSettings}
        onClose={() => setPostSettings(false)}
        armed={blocking && !!selection}
        onSetup={() => router.push('/picker')}
      />

      <HelpSheet
        visible={help}
        onClose={() => setHelp(false)}
        topics={[
          { t: d.help.loginT, h: d.help.loginH, b: d.help.loginB },
          { t: d.help.switchT, h: d.help.switchH, b: d.help.switchB },
          { t: d.help.whyT, h: d.help.whyH, b: d.help.whyB },
          { t: d.help.dataT, h: d.help.dataH, b: d.help.dataB },
        ]}
      />

      {/*
        L'EN-TETE NE BOUGE JAMAIS.

        Il etait une SafeAreaView native : sa marge haute arrivait apres le
        premier rendu, et le chrono se posait tantot sous l'encoche, tantot
        plus bas, selon l'image ou l'on regardait. La marge est lue d'avance
        — celle de l'ecran au demarrage, puis celle du moment — et la rangee
        fait quarante-quatre points, quoi qu'elle montre. Le chrono est
        TOUJOURS la ; « sans filtre » vient a cote, il ne le remplace pas.
      */}
      <View style={[styles.bar, { backgroundColor: barColour, paddingTop: topInset }]}>
        <View style={styles.barRow}>
          {/* A gauche, ce qui change l'etat du filtre : « sans filtre », ou les reels ouverts. */}
          <View style={styles.barLeft} pointerEvents="none">
            {raw && (
              <View style={[styles.rawPill, { borderColor: withAlpha(barInk, 0.35) }]}>
                <Text variant="label" color={withAlpha(barInk, 0.75)} style={{ fontSize: 10 }}>{d.client.noFilter}</Text>
              </View>
            )}
            {(inValve || passLeft > 0) && !capped && (
              <View style={[styles.rawPill, { borderColor: withAlpha(c.ember, 0.6), backgroundColor: withAlpha(c.ember, 0.14) }]}>
                <Text variant="label" color={c.ember} style={{ fontSize: 10 }} numberOfLines={1}>
                  {passLeft > 0 ? t(d.client.passLeft, { n: passLeft }) : t(d.client.valveOpen, { h: valve.to })}
                </Text>
              </View>
            )}
          </View>
          <Timer size={12} strokeWidth={2.2} color={withAlpha(barInk, 0.5)} />
          <Text variant="label" color={withAlpha(barInk, 0.65)} style={{ fontVariant: ['tabular-nums'] }}>{elapsed}</Text>
          {/*
            Le « i » se tient LA, au bord du doute.
            Les trois moments qui font fermer l'app sont ici : la page de
            connexion, qui n'est pas la notre et qui demande un mot de passe ;
            le changement de compte ; et la question muette « qu'est-ce que
            vous voyez de tout ca ? ». Une aide rangee dans les reglages
            n'aide personne — on n'y va qu'apres avoir renonce.
          */}
          <Pressable
            onPress={() => { haptics.tap(); setHelp(true); }}
            hitSlop={14}
            style={styles.info}
            accessibilityLabel={d.help.title}
            accessibilityRole="button"
          >
            <Info size={14} strokeWidth={2.2} color={withAlpha(barInk, 0.5)} />
          </Pressable>
        </View>
      </View>

      {/* Rien tant qu'on ne sait pas OU aller. Montee sur le fil puis
          redirigee vers la connexion, elle chargerait deux pages et on
          verrait le fil vide clignoter avant d'etre envoye ailleurs.
          Le disque repond en une image : personne ne voit l'attente. */}
      {entry && (
        <WebView
          key={`${raw ? 'raw' : 'filtered'}-${generation}`}
          ref={web}
          source={{ uri: entry }}
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
                raise();
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
              if (m && m.t === 'who') {
                const u = typeof m.u === 'string' && m.u ? m.u : null;
                setWho(u);
                if (u) void keep(u, typeof m.pic === 'string' ? m.pic : '', m.sure === true);
              }
              if (m && m.t === 'switch') {
                setSwitching(false);
                setSwitchFailed(!m.ok);
                if (!m.ok) setTimeout(() => setSwitchFailed(false), 4000);
              }
              // Le « + » : on propose la vraie app pour publier.
              // Le mode publication s'appuie sur Temps d'ecran : iOS seulement. Sur
              // Android, le « + » d'Instagram fait simplement son travail.
              if (m && m.t === 'post' && Platform.OS === 'ios') setPostAsk(true);
            } catch {
              /* message qui ne vient pas de nous */
            }
          }}
          onShouldStartLoadWithRequest={guard}
          onLoadProgress={(e) => { setLoad(e.nativeEvent.progress); seeHistory(e.nativeEvent); }}
          // Les fleches du menu : grisees quand il n'y a pas de page avant ou apres.
          onNavigationStateChange={seeHistory}
        onLoadEnd={(e) => {
            seeHistory(e.nativeEvent);
            setReady(true);
            // La connexion s'est affichee : les prochaines fois, on va au fil.
            if (entry && entry !== client.url) void markFirstRunDone(id);
            // Qui est connecte, a chaque page : la barre du bas met un instant a se dessiner.
            if (id === 'instagram') setTimeout(() => web.current?.injectJavaScript('window.__nrWho && window.__nrWho(); true;'), 1500);
            // Et, apres un changement de compte, si c'est bien lui.
            if (wanted.current) setTimeout(() => { void verifySwitch(); }, 600);
          }}
          onError={(e) => setError(e.nativeEvent.description || d.ui.noConnection)}
          // iOS tue la webview en arriere-plan : sans ca, on revient sur du blanc fige.
          onContentProcessDidTerminate={() => web.current?.reload()}
          // Android : le moteur de la page est mort, la vue avec lui. Lui
          // demander de recharger fermait l'app ; on en monte une neuve.
          onRenderProcessGone={() => setGeneration((n) => n + 1)}
          sharedCookiesEnabled
          // Le champ de recherche prend le clavier tout seul en arrivant sur
          // l'onglet recherche : iOS l'interdit sans cette permission.
          keyboardDisplayRequiresUserAction={false}
          thirdPartyCookiesEnabled
          domStorageEnabled
          javaScriptEnabled
          allowsBackForwardNavigationGestures
          // Sur iOS il entre en conflit avec le defilement des pages lourdes :
          // le bouton recharger de la barre fait le meme travail sans risque.
          pullToRefreshEnabled={Platform.OS !== 'ios'}
          allowsInlineMediaPlayback
          // Le frein natif d'iOS, explicitement : le meme que dans Safari.
          // iOS SEULEMENT : sur Android la prop part telle quelle au natif, qui
          // attend un nombre. « normal » y levait une ClassCastException qui
          // detruisait tout React : ecran noir, puis l'app se fermait.
          decelerationRate={Platform.OS === 'ios' ? 'normal' : undefined}
          mediaPlaybackRequiresUserAction={Platform.OS === 'ios'}
          setSupportMultipleWindows={false}
          // Sans cette liste, iOS remet les schemas inconnus au systeme,
          // qui ouvre l'app native.
          originWhitelist={['http://*', 'https://*']}
          style={[styles.web, { backgroundColor: chrome }]}
        />
      )}

      {/* La barre flotte au-dessus de la WebView : la page ne peut pas lui
          voler les touches. */}
      <NavBar onAction={onNav} accounts={id === 'instagram' ? accounts.length : 2} canBack={history.back} canForward={history.forward} />

      {/* La lame de verre marque l'ouverture de la page. */}
      <GlassSweep />

      {wall && (
        <View style={styles.wall} pointerEvents="none">
          <Hand size={44} strokeWidth={1.8} color={c.accent} />
          {/*
            Le mur porte un NUMERO.
            « Bloque. » tout seul est un reproche, et on finit par en vouloir a
            l'app qui le dit. Le meme evenement numerote devient un score : ce
            n'est plus une porte fermee mais un reel de moins, et c'est le seul
            chiffre qui justifie l'abonnement a la fin du mois.
          */}
          <Text variant="title" style={styles.wallText}>
            {nth > 0 ? t(d.client.blockedNth, { n: nth }) : d.client.blocked}
          </Text>
          <Text variant="body" tone="secondary" style={styles.wallText}>
            {days > 0
              ? t(d.client.holds, { n: days, s: days > 1 ? 's' : '' })
              : d.client.because}
          </Text>
        </View>
      )}

      {/* Le selecteur de comptes met un instant a s'ouvrir, et il peut ne pas
          s'ouvrir du tout : dans les deux cas on le dit. */}
      {applied && (
        <View style={[styles.valve, { top: noteTop }]} pointerEvents="none">
          {/* Sur une pastille : posee a nu, elle se perdait dans le texte de la page. */}
          <View style={{ backgroundColor: withAlpha(c.night, 0.92), borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 }}>
            <Text variant="label" color={c.accent}>{d.client.settingsApplied}</Text>
          </View>
        </View>
      )}

      {postNote && (
        <View style={[styles.valve, { top: noteTop }]} pointerEvents="none">
          <Text variant="label" color={c.accent}>{postNote}</Text>
        </View>
      )}

      {(switching || switchFailed) && (
        <View style={[styles.valve, { top: noteTop }]} pointerEvents="none">
          <Text variant="label" color={switchFailed ? c.danger : c.accent}>
            {switchFailed
              ? d.client.switchFailed
              : d.client.switchOpening}
          </Text>
        </View>
      )}

      {/*
        Le plafond du jour. Il explique AVANT de vendre : un paywall qui tombe
        sans un mot se lit comme une panne.
      */}
      {/*
        Le mur suit l'etat Pro, il ne se souvient pas d'avoir ete leve.
        Il ne tombait qu'en repassant par la fermeture du paywall : un achat
        arrive autrement — une restauration, un code promo, le renouvellement
        signale par RevenueCat — laissait le mur en place alors que
        l'abonnement etait actif.
      */}
      {capped && !pro && !gate && (
        <View style={styles.cap}>
          <View style={styles.wallRing}>
            <Hourglass size={28} strokeWidth={2} color={c.ember} />
          </View>
          <Text variant="displayM" style={styles.wallText}>
            {t(d.client.capTitle, { n: FREE_MINUTES })}
          </Text>
          <Text variant="body" tone="secondary" style={styles.wallText}>
            {d.client.capBody}
          </Text>
          <View style={styles.capBtns}>
            <Button
              label={d.client.capUnlock}
              onPress={() => { haptics.press(); setGate(true); }}
            />
            <Button
              label={t(d.client.capClose, { app: label(id).split(' ·')[0] })}
              onPress={exit}
              variant="ghost"
            />
          </View>
        </View>
      )}

      <ProGate visible={gate} onClose={() => setGate(false)} />

      <ReelsPass
        visible={pass}
        onCancel={() => setPass(false)}
        onPass={() => {
          setPass(false);
          haptics.success();
          setSetting('reelsUntil', Date.now() + PASS_MINUTES * 60_000);
        }}
      />

      <ClientSettings
        id={id}
        visible={panel}
        // Une fenetre ne s'ouvre pas par-dessus une autre : iOS refuse en
        // silence. On laisse la feuille finir de partir, puis on ouvre.
        onPass={() => setTimeout(() => setPass(true), 320)}
        onPost={() => setTimeout(() => setPostSettings(true), 320)}
        onClose={() => {
          setPanel(false);
          /*
            On REPART DE ZERO apres un reglage.
            Rendre en direct ce qu'on vient de cacher laisse des traces — un
            carrousel aux cases recalculees, une grille a moitie revenue. La
            page rechargee repart avec le script a jour, et rien de ce qui
            etait cache ne garde la trace de l'avoir ete.
          */
          if (touched.current) {
            touched.current = false;
            web.current?.reload();
            setApplied(true);
            setTimeout(() => setApplied(false), 2500);
          }
        }}
        accounts={accounts}
        current={currentUid}
        onPick={(u) => { void pick(u); }}
        onAdd={() => { void addAccount(); }}
        onRemove={(u) => removeAccount(id, u)}
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
              <Text variant="label" color={c.night}>{d.client.reload}</Text>
            </Pressable>
            <Pressable style={styles.plain} onPress={toggleRaw}>
              <Text variant="label" color={c.mist}>
                {raw ? d.client.rawBack : d.client.raw}
              </Text>
            </Pressable>
          </View>
          <Text variant="label" tone="tertiary" numberOfLines={2} style={styles.diag}>
            {pageError ?? d.client.stalling}
          </Text>
        </View>
      )}

      {!ready && !error && (
        <View style={styles.wire} pointerEvents="none">
          <Animated.View
            layout={LinearTransition.duration(260)}
            style={[
              styles.wireOn,
              // Jamais tout a fait zero : un fil invisible ne se distingue pas
              // d'une page qui ne charge pas du tout.
              { flex: Math.max(0.04, load), backgroundColor: c.accent },
            ]}
          />
          <View style={{ flex: Math.max(0.001, 1 - load) }} />
        </View>
      )}

      {error && (
        <View style={styles.overlay}>
          {/*
            « L'URL a ete bloquee par un filtre de contenu » n'est pas une
            panne reseau : c'est iOS qui applique le blocage d'une categorie
            ou d'un site web coche dans le selecteur — a toutes les vues web,
            la notre comprise. Recharger ne sert a rien ; revoir la
            selection, si.
          */}
          <Text variant="title">{filtered(error) ? d.client.filterTitle : d.ui.loadFail}</Text>
          <Text variant="body" tone="secondary" style={styles.errText}>
            {filtered(error) ? d.client.filterBody : error}
          </Text>
          <View style={{ width: 220, gap: space.sm }}>
            {filtered(error) && (
              <Button label={d.client.filterFix} onPress={() => { haptics.tap(); router.push('/picker'); }} />
            )}
            <Button label={d.client.retry} onPress={() => { setError(null); web.current?.reload(); }} />
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
    Cinquante-six points, FIXES.
    La hauteur de l'en-tete de la vraie app Instagram (« Pour vous », le
    coeur) fait cinquante-deux ; on en ajoute quatre parce que « Pour vous »
    arrivait encore un peu haut. Et la hauteur ne depend de rien : chrono ou
    « sans filtre », la page commence toujours au meme endroit.
  */
  barRow: {
    height: 44, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
  },
  barLeft: { position: 'absolute', left: gutter, flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '42%' },
  rawPill: {
    paddingHorizontal: 8, paddingVertical: 3, flexShrink: 1,
    borderRadius: 999, borderWidth: StyleSheet.hairlineWidth,
  },
  // Pose a DROITE sans deplacer le chrono : centre avec lui, l'ensemble
  // paraissait de travers des que la minute passait a deux chiffres.
  info: { position: 'absolute', right: 0, padding: 4 },
  // Colle sous le bandeau, a la place ou tous les navigateurs la mettent.
  wire: { flexDirection: 'row', height: 2, overflow: 'hidden' },
  wireOn: { borderRadius: 1 },
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
