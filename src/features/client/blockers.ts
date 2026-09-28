/**
 * Scripts injectes AVANT l'execution de la page : aucun flash de contenu.
 * On ne cible QUE des attributs semantiques — les classes d'Instagram et de
 * YouTube sont obfusquees et changent en permanence.
 */

/**
 * La fenetre ou le format court est autorise.
 *
 * Le jour suit la numerotation de Date.getDay : 0 pour dimanche, 6 pour
 * samedi. Les bornes sont des heures locales.
 */
export type Valve = { on: boolean; day: number; from: number; to: number };

/**
 * La fenetre est-elle ouverte, maintenant ?
 *
 * La page injectee porte la meme regle, ecrite dans son propre langage :
 * elle vit dans un litteral de gabarit et ne peut rien importer. Celle-ci
 * sert a l'interface — le bandeau qui annonce la fenetre, et le reglage qui
 * la decrit. Les deux sont tenues par le meme test.
 */
export function valveOpen(v: Valve | undefined, now = new Date()): boolean {
  if (!v || !v.on) return false;
  if (now.getDay() !== v.day) return false;
  const h = now.getHours() + now.getMinutes() / 60;
  return h >= v.from && h < v.to;
}

/** Construit le script final en y injectant les reglages actifs. */
export function buildScript(
  base: string,
  settings: Record<string, boolean>,
  theme: 'light' | 'dark' = 'dark',
  valve?: Valve,
  /** Triplet RGB nu, ou null pour laisser au site ses propres couleurs. */
  tint: string | null = null,
  /** Horodatage de fin du laissez-passer, ou 0 : les reels passent jusque-la. */
  openUntil = 0
): string {
  return `window.__NR = ${JSON.stringify(settings)};\n`
    + `window.__nrTheme = ${JSON.stringify(theme)};\n`
    + `window.__nrValve = ${JSON.stringify(valve ?? { on: false, day: 6, from: 20, to: 21 })};\n`
    + `window.__nrTint = ${JSON.stringify(tint)};\n`
    + `window.__nrOpenUntil = ${JSON.stringify(openUntil)};\n`
    + base;
}

const COMMON = `
  const __post = (o) => {
    try { window.ReactNativeWebView.postMessage(JSON.stringify(o)); } catch (e) {}
  };
  addEventListener('error', (e) => __post({
    t: 'err',
    m: String((e && e.message) || e),
    src: String((e && e.filename) || ''),
    l: (e && e.lineno) || 0,
  }));
  addEventListener('unhandledrejection', (e) => __post({
    t: 'rej', m: String((e && e.reason && e.reason.message) || (e && e.reason) || ''),
  }));

  /**
   * Instagram remanie son DOM en permanence. Avec un requestAnimationFrame,
   * le nettoyage repassait SOIXANTE fois par seconde sur toute la page :
   * le fil devenait injouable, plus rien ne repondait au doigt. On attend
   * desormais 300 ms de calme avant de repasser, et une erreur dans le
   * nettoyage n'arrete plus le reste.
   */
  let __t = null;

  /*
    On ne nettoie PAS pendant qu'un doigt fait defiler.

    Le fil d'Instagram est virtualise : il ajoute et retire des noeuds sans
    arret pendant qu'on descend, donc l'observateur declenchait une passe
    toutes les 300 ms — en plein geste. Chaque passe parcourt la page et
    change des styles, exactement quand le navigateur a besoin de tout son
    temps pour composer l'image suivante. C'est ca qui faisait sauter le
    defilement et clignoter les photos.

    On attend donc 250 ms de doigt immobile. Rien n'est perdu : ce qu'on
    aurait masque pendant le geste est masque juste apres, et la seule
    difference visible est que le defilement redevient lisse.
  */
  let __scrolled = 0;
  addEventListener(
    'scroll',
    () => { __scrolled = Date.now(); },
    { passive: true, capture: true }
  );

  const __schedule = (fn) => {
    if (__t) return;
    __t = setTimeout(function run() {
      // Toujours en train de defiler : on repousse au lieu de travailler.
      if (Date.now() - __scrolled < 250) { __t = setTimeout(run, 150); return; }
      __t = null;
      try { fn(); } catch (e) { /* une passe ratee n'est pas grave */ }
    }, 300);
  };
  const __watch = (fn) => {
    // La teinte se pose UNE fois : elle vit sur l'element racine, que les
    // navigations internes ne remplacent jamais. La reposer a chaque passe
    // ferait quatorze ecritures de style par mouvement de doigt.
    try { __tint(); } catch (e) { /* le site n'a pas ces variables */ }
    // La soupape est relue A CHAQUE passe, avant les regles : c'est elle qui
    // decide si la feuille toujours-active s'applique ou dort.
    const pass = () => {
      if (__sheet) __sheet.disabled = __open();
      fn();
    };
    window.__nrPass = pass;
    new MutationObserver(() => __schedule(pass))
      .observe(document.body || document.documentElement, { childList: true, subtree: true });
    for (const m of ['pushState', 'replaceState']) {
      const o = history[m];
      history[m] = function (...a) { const r = o.apply(this, a); __schedule(pass); return r; };
    }
    addEventListener('popstate', () => __schedule(pass));
    /*
      Une passe toutes les trente secondes, meme sans rien qui bouge.
      La fenetre s'ouvre a une heure precise : si on attendait une mutation du
      DOM pour la relire, elle s'ouvrirait au prochain geste et se refermerait
      au suivant, pas a vingt et une heures.
    */
    setInterval(() => { try { pass(); } catch (e) { /* la suivante repassera */ } }, 30000);
    /*
      Le compte des prises part vers l'app une fois la page posee.
      Six secondes : assez pour que le fil ait rendu et que plusieurs passes
      soient deja passees. Zero prise ne veut rien dire tout seul — c'est
      l'app qui decide, apres plusieurs chargements muets d'affilee.
    */
    setTimeout(() => {
      const on = window.__NR ? Object.keys(window.__NR).filter((k) => window.__NR[k]).length : 0;
      __post({ t: 'rules', n: __hits, on: on });
    }, 6000);
    // La premiere passe est immediate : pas de flash de contenu.
    try { pass(); } catch (e) { /* idem */ }
  };
  // Un reglage qu'on eteint doit RENDRE ce qu'il avait cache. Chaque
  // masquage porte donc le nom de la regle qui l'a decide, et ceux dont la
  // regle ne demande plus rien reviennent des la passe suivante. Sans ca,
  // decocher un interrupteur ne faisait rien tant qu'on ne rechargeait pas.
  /*
    On compte les prises.
    C'est le seul moyen de savoir qu'Instagram a change de structure sans
    attendre qu'un utilisateur nous ecrive : une regle qui ne trouve plus rien
    est une regle morte. On ne compte que les NOUVEAUX masquages — un element
    deja cache est deja compte, et chaque passe repasse dessus.
  */
  let __hits = 0;
  /*
    Ce qu'une regle n'a JAMAIS le droit de masquer.

    Les regles trouvent une etiquette — « Suggestions pour vous », « Ad » —
    puis remontent jusqu'a un ancetre assez grand pour etre la publication.
    Or Instagram affiche ces memes etiquettes DANS ses fenetres : la liste des
    likes, celle des abonnes, le panneau de commentaires. La remontee y trouve
    la fenetre elle-meme, et display:none sur une fenetre laisse un ecran
    noir dont on ne sort pas. C'est exactement ce qu'on voyait en ouvrant ses
    likes pour la premiere fois.

    Un conteneur qui porte un dialogue, ou plus d'une publication, n'est pas
    une publication.
  */
  /*
    Un noeud deja examine PAR CETTE REGLE.

    Reparcourir tous les spans du fil a chaque passe, plusieurs fois par
    seconde pendant qu'on fait defiler, est ce qui coutait le plus cher — et
    ce qui rendait le defilement saccade.

    Le cache est tenu par regle et non globalement : YouTube passe quatre
    motifs differents sur les memes noeuds dans une seule passe, et un
    marqueur commun aurait laisse le premier motif consommer tous les noeuds
    avant que les trois autres ne les voient.

    Un noeud sans texte n'est jamais marque : React pose parfois le texte un
    instant apres le noeud, et le marquer vide reviendrait a ne plus jamais
    le regarder.
  */
  const __scanned = new Map();
  const __fresh = (re, n, t) => {
    if (!t) return false;
    let set = __scanned.get(re);
    if (!set) { set = new WeakSet(); __scanned.set(re, set); }
    if (set.has(n)) return false;
    set.add(n);
    return true;
  };

  /*
    La teinte.

    Instagram publie sa palette en proprietes CSS personnalisees, sous forme
    de triplets RGB nus qu'il consomme en rgb(var(--...)). On remplace donc
    la valeur des variables d'ACCENT, et rien d'autre ne bouge : les photos
    gardent leurs couleurs et les textes leur contraste. C'est tout l'interet
    par rapport a un hue-rotate sur la page, qui repeindrait aussi les photos.

    On ne touche pas aux variables de FOND. Un fil sur fond vert sature ne se
    lit plus, et ce n'est pas ce qu'on demande quand on demande un Instagram
    vert : ce sont les boutons, les liens et ses propres bulles de message.

    Les noms sont ceux d'Instagram. Les poser sur un autre site ne fait rien —
    une propriete personnalisee que personne ne lit ne coute rien — donc la
    fonction reste commune aux quatre.
  */
  const __TINTED = [
    '--ig-primary-button',
    '--ig-primary-button-hover',
    '--ig-colors-button-primary-background',
    '--ig-colors-button-primary-background--hover',
    '--ig-colors-button-primary-background--pressed',
    '--ig-colors-link-text',
    '--ig-colors-button-borderless-text',
    '--ig-colors-button-borderless-text--hover',
    '--ig-colors-button-borderless-text--pressed',
    '--ig-colors-button-primary-link-text',
    '--ig-colors-button-primary-link-text--hover',
    '--ig-colors-button-primary-link-text--pressed',
    '--ig-outgoing-message-bubble',
    '--ig-temporary-highlight',
  ];
  const __tint = () => {
    const t = window.__nrTint;
    const root = document.documentElement;
    if (!root || !root.style) return;
    for (const v of __TINTED) {
      // Sans teinte on RETIRE la surcharge au lieu d'ecrire la couleur du
      // site : ainsi le jour ou Instagram change son bleu, on le suit.
      if (t) root.style.setProperty(v, t);
      else root.style.removeProperty(v);
    }
  };
  window.__nrApplyTint = (t) => {
    window.__nrTint = t;
    try { __tint(); } catch (e) { /* le site n'a pas ces variables */ }
  };

  const __safe = (el) => {
    if (!el) return null;
    if (el === document.body || el === document.documentElement) return null;
    const tag = el.tagName;
    if (tag === 'BODY' || tag === 'HTML' || tag === 'MAIN' || tag === 'SECTION') return null;
    if (el.getAttribute && el.getAttribute('role') === 'dialog') return null;
    if (el.querySelector && el.querySelector('[role="dialog"]')) return null;
    if (el.querySelectorAll && el.querySelectorAll('article').length > 1) return null;
    return el;
  };

  const __hide = (el, key) => {
    if (!el) return;
    if (key) el.setAttribute('data-nr', key);
    if (el.style.display !== 'none') __hits += 1;
    el.style.setProperty('display', 'none', 'important');
  };
  const __on = (k) => !!(window.__NR && window.__NR[k]);

  /*
    La soupape : une fenetre ou le format court est autorise.
    Ca sonne faux dans une app qui bloque les reels, et c'est pourtant ce qui
    fait tenir le blocage : une interdiction totale se contourne en
    desinstallant, tandis qu'une heure annoncee d'avance se respecte. Mieux
    vaut un blocage garde six mois avec une fenetre le samedi soir qu'un
    blocage parfait garde neuf jours.
  */
  const __valve = () => {
    const v = window.__nrValve;
    if (!v || !v.on) return false;
    const d = new Date();
    if (d.getDay() !== v.day) return false;
    const h = d.getHours() + d.getMinutes() / 60;
    return h >= v.from && h < v.to;
  };
  /*
    Les regles de format court, elles, ne sont jamais debrayables par un
    reglage — seulement par la soupape. Elles portent donc leur propre nom de
    regle plutot que rien du tout : sans nom, un masquage ne peut pas etre
    defait, et la fenetre du samedi soir n'aurait rien ouvert.
  */
  /*
    La deuxieme facon d'ouvrir : un laissez-passer minute, gagne.

    La soupape est une fenetre PREVUE, inscrite au calendrier. Celui-ci est
    ponctuel et se merite — on ne l'obtient qu'en traversant une attente, des
    calculs et une suite a retenir. Les deux ouvrent la meme porte, donc tout
    ce que la soupape sait deja faire s'applique : la feuille toujours-active
    s'eteint, les reels du fil reviennent, et la sortie automatique se tait.

    L'echeance est comparee a l'horloge a chaque passe : rien a eteindre, le
    temps s'en charge.
  */
  const __open = () => {
    const until = window.__nrOpenUntil;
    if (until && Date.now() < until) return true;
    return __valve();
  };
  window.__nrApplyOpen = (until) => {
    window.__nrOpenUntil = until;
    try { if (window.__nrPass) window.__nrPass(); } catch (e) { /* idem */ }
  };

  const __short = () => !__open();

  // La feuille des regles toujours actives, gardee sous la main : la soupape
  // l'eteint a l'heure dite et la rallume apres, sans recharger la page.
  let __sheet = null;
  const __css = (text) => {
    __sheet = document.createElement('style');
    __sheet.textContent = text;
    (document.head || document.documentElement).appendChild(__sheet);
  };

  const __restore = () => {
    document.querySelectorAll('[data-nr]').forEach((el) => {
      const k = el.getAttribute('data-nr');
      if (k === 'short' ? __short() : __on(k)) return;
      el.style.removeProperty('display');
      el.removeAttribute('data-nr');
    });
  };

  // L'app pousse la nouvelle table de reglages et redemande une passe : le
  // script est injecte AVANT le chargement, il ne peut pas etre remplace en
  // vol, mais ses donnees si.
  window.__nrApply = (next) => {
    window.__NR = next;
    try { if (window.__nrPass) window.__nrPass(); } catch (e) { /* idem */ }
  };

  // Banniere de cookies : on refuse l'optionnel, jamais on n'accepte.
  // Le MutationObserver seul ne suffisait pas : le dialogue arrive parfois
  // avant lui, ou son bouton n'est pas un <button>. On insiste 12 s.
  const DECLINE = /refuser|refuse|decline|reject|essentiels? uniquement|only allow essential|necessary only/i;
  const ACCEPT  = /autoriser tous|allow all|accept all|tout accepter/i;
  const COOKIE  = /cookie|temoins de connexion/i;

  let __tries = 0;
  let __fallback = false;
  // Un meme bouton n'est jamais clique deux fois : sans ca, un « Refuser »
  // present ailleurs dans la page serait martele pendant 12 s.
  const __seen = new WeakSet();

  const __clickDecline = () => {
    const sel = 'button, [role="button"], div[tabindex], span[role="link"], a[role="button"]';
    const nodes = Array.from(document.querySelectorAll(sel));
    // 1. Un libelle explicite de refus.
    for (const n of nodes) {
      const t = (n.textContent || '').trim();
      if (t && t.length < 70 && DECLINE.test(t) && !__seen.has(n)) {
        __seen.add(n); __fallback = true; n.click(); return true;
      }
    }
    // 2. Repli, une seule fois, et seulement dans un dialogue qui parle
    //    vraiment de cookies : sans ce garde-fou on cliquait au hasard dans
    //    la premiere boite venue — « Se connecter », par exemple.
    if (__tries > 8 && !__fallback) {
      const dialog = document.querySelector('[role="dialog"]');
      if (dialog && COOKIE.test(dialog.textContent || '')) {
        const btns = Array.from(dialog.querySelectorAll(sel))
          .filter((b) => (b.textContent || '').trim().length > 0);
        const refuse = btns.find((b) => !ACCEPT.test(b.textContent || '') && !__seen.has(b));
        if (refuse) { __fallback = true; __seen.add(refuse); refuse.click(); return true; }
      }
    }
    return false;
  };

  // On insiste 12 s : le dialogue arrive parfois apres le premier rendu.
  // Passe ce delai l'intervalle est COUPE — le laisser tourner pour ne rien
  // faire, c'est du travail inutile soixante fois par minute.
  let __ci = 0;
  const __cookies = () => {
    if (__tries >= 40) { if (__ci) { clearInterval(__ci); __ci = 0; } return; }
    __tries += 1;
    try { __clickDecline(); } catch (e) { /* on reessaiera */ }
  };
  __ci = setInterval(__cookies, 300);

  // On ne redirige JAMAIS pendant un parcours de connexion : le faire
  // casse le formulaire, et l'utilisateur ne reste jamais connecte.
  // Classes [/] plutot que des slashs echappes : dans un litteral de
  // gabarit, \/ devient / et cassait la regex a l'execution.
  const AUTH = /(accounts[/](login|signup|emailsignup|password|onetap)|challenge|checkpoint|oauth|[/]login|[/]signup|[/]register|two[-_]step|i[/]flow)/i;
  const __auth = () => AUTH.test(location.pathname + location.search);

  // Une meme redirection n'est tentee qu'une fois par page : sans ce
  // garde-fou, une page qui renvoie vers elle-meme boucle sans fin et
  // l'app parait figee — plus moyen d'en sortir.
  const __went = {};
  const __go = (to) => {
    // La cle inclut la REQUETE : deux fils d'Instagram partagent le meme
    // chemin et ne different que par ?variant=, et comparer les seuls
    // chemins empechait la bascule.
    const from = location.pathname + location.search;
    if (__auth() || from === to || __went[from] === to) return;
    __went[from] = to;
    location.replace(to);
  };

  // Les sites poussent leur app native par des liens profonds et des
  // bannieres. On les retire : un appui dessus fait sortir l'utilisateur de
  // la version filtree, ce qu'il est venu eviter.
  const __native = () => {
    document.querySelectorAll(
      'a[href^="instagram:"], a[href^="twitter:"], a[href^="x:"],'
      + ' a[href^="tiktok:"], a[href^="youtube:"], a[href^="vnd.youtube:"],'
      + ' a[href^="itms-apps:"], a[href^="fb:"]'
    ).forEach((el) => __hide(el));
    // La banniere d'App Store des sites mobiles.
    document.querySelectorAll('meta[name="apple-itunes-app"]').forEach((m) => m.remove());

    // Le bandeau « Utiliser l'application », qui revient par le texte meme
    // quand ses liens ont saute. On remonte jusqu'au bloc qui le porte.
    const OPEN = /utiliser l.application|use the app|ouvrir dans l.application|open in app|continuer dans l.application/i;
    document.querySelectorAll('div, section, aside').forEach((el) => {
      const t = (el.textContent || '').trim();
      if (t.length < 60 && OPEN.test(t) && el.children.length < 6) __hide(el);
    });
  };

  /**
   * Le site suit le theme de l'app.
   *
   * WKWebView se regle sur l'apparence du SYSTEME, pas sur la notre : passer
   * UnSwipe en clair laissait les quatre sites en sombre, et on basculait
   * d'un fond creme a un fond noir en ouvrant Instagram.
   *
   * La propriete color-scheme suffit pour ce que le navigateur dessine
   * lui-meme : champs, barres de defilement, fond par defaut. Pour le
   * reste, chaque site garde sa propre marque, qu'il faut poser a la main.
   */
  const __scheme = () => {
    const dark = window.__nrTheme !== 'light';
    const html = document.documentElement;
    html.style.setProperty('color-scheme', dark ? 'dark' : 'light');

    // YouTube : un attribut sur <html>, rien de plus.
    if (location.hostname.indexOf('youtube') >= 0) {
      if (dark) html.setAttribute('dark', '');
      else html.removeAttribute('dark');
    }
    // Meta : les classes que Facebook et Instagram partagent.
    if (location.hostname.indexOf('instagram') >= 0) {
      html.classList.toggle('__fb-dark-mode', dark);
      html.classList.toggle('__fb-light-mode', !dark);
    }
  };

  // L'app pousse un theme sans recharger la page.
  window.__nrApplyTheme = (t) => {
    window.__nrTheme = t;
    try { __scheme(); } catch (e) { /* le site n'a pas de theme a nous */ }
  };

  // Noir et blanc : un filtre sur la racine, applique et retire a la volee.
  const __gray = () => {
    const v = __on('grayscale') ? 'grayscale(1)' : '';
    document.documentElement.style.setProperty('filter', v, 'important');
  };

  /**
   * Le format court ne s'annonce pas toujours par son adresse.
   *
   * Un reel recu en message s'ouvre PAR-DESSUS la conversation : l'adresse
   * ne bouge pas d'un caractere, aucun lien /reel/ n'est visible, et un
   * doigt vers le haut enchaine sur le suivant — le fil infini, par la
   * porte de derriere. Reste sa seule signature fiable : sa FORME. Un reel
   * est en 9:16, soit 0,56 de largeur pour une hauteur ; une photo
   * verticale du fil s'arrete a 4:5, soit 0,80. Entre les deux, 0,65.
   */
  const SHORT = 0.65;
  let __left = 0;
  let __exits = 0;
  const __escape = () => {
    if (__auth()) return;
    // Pendant une ouverture, on ne sort pas : c'est le moment qu'elle autorise.
    if (__open()) return;
    /*
      Trois sorties au plus, puis plus jamais.
      Le frein d'une seconde et demie ne bornait que la CADENCE, pas le
      nombre : une detection qui se trompe repartait indefiniment, et comme
      chaque retour interrompt le chargement en cours, la page tournait sans
      jamais finir. Un plafond garantit qu'aucune heuristique, meme fausse,
      ne peut rendre l'app inutilisable.
    */
    if (__exits >= 3) return;
    const now = Date.now();
    if (now - __left < 1500) return;
    __left = now;
    __exits += 1;
    __post({ t: 'short' });
    if (history.length > 1) history.back();
    else location.replace('/');
  };
  const __tall = (v) => {
    const w = v.videoWidth;
    const h = v.videoHeight;
    return !!w && !!h && w / h <= SHORT;
  };
  const __stop = (v) => {
    try { v.pause(); v.muted = true; v.removeAttribute('autoplay'); } catch (e) { /* tant pis */ }
  };

  /**
   * On ne sort que devant un LECTEUR PLEIN ECRAN, jamais depuis le fil.
   *
   * La barre etait placee trop bas : « une video verticale occupant plus de
   * la moitie de la hauteur ». Or un reel du fil remplit facilement la
   * moitie de l'ecran, et le fil en contient plusieurs. Faire defiler
   * Instagram declenchait donc un history.back() toutes les secondes et
   * demie — la page se rechargeait sans fin et le mur « Bloque » clignotait.
   *
   * Un lecteur plein ecran, lui, couvre 85 % de la hauteur ET commence tout
   * en haut. Une publication du fil ne peut pas : son en-tete et sa barre
   * d'actions prennent la place. Les reels du fil, eux, sont deja retires
   * par les regles du DOM — cette sortie-ci ne sert qu'au lecteur qui
   * s'ouvre PAR-DESSUS une conversation.
   */
  const __shorts = () => {
    if (__open()) return;
    const tall = Array.from(document.querySelectorAll('video')).filter(__tall);
    if (tall.length < 2) return;
    const big = tall.filter((v) => {
      const r = v.getBoundingClientRect();
      return r.height > innerHeight * 0.85 && r.top < innerHeight * 0.15;
    });
    if (!big.length) return;
    tall.forEach(__stop);
    __escape();
  };
  // La passe de 300 ms arrive trop tard : la video a deja commence. On
  // ecoute donc la lecture elle-meme, en capture, avant la page.
  for (const ev of ['loadedmetadata', 'play', 'playing']) {
    addEventListener(ev, (e) => {
      const v = e.target;
      if (!v || v.tagName !== 'VIDEO' || !window.__nrShorts) return;
      try { __shorts(); } catch (err) { /* la passe repassera */ }
    }, true);
  }
`;

export const INSTAGRAM_BLOCKER = `
(() => {
  'use strict';
  ${COMMON}

  // L'onglet Reels disparait. Explorer est redirige plus bas plutot que
  // masque : lui couper l'icone emportait aussi la recherche.
  const css = \`
    a[href^="/reels"], a[href$="/reels/"], a[href*="/reel/"],
    svg[aria-label="Reels" i],
    [aria-label="Reels" i], [aria-label*="Reels" i],
    section[aria-labelledby*="reel" i] { display: none !important; }
  \`;
  __css(css);

  // On reconnait un bloc a son TEXTE, jamais a ses classes : Instagram les
  // regenere a chaque deploiement, un selecteur de classe ne tient pas une
  // semaine.
  const SUGGEST = /suggestions? pour vous|suggested for you|publications sugg|suggested posts?|suggestions? pour toi/i;
  /*
    « Ad », en deux lettres.
    Vu dans le navigateur sur un fil reel : Instagram etiquette ses
    publications sponsorisees « Ad » en anglais, pas « Sponsored ». La regex
    ne reconnaissait que le mot long, et laissait donc passer les publicites
    de tout un compte en anglais. Les deux formes courtes sont ANCREES aux
    deux bouts : sans le $, « Ad » attraperait « Adrien » et « Adidas ».
  */
  const AD = /^sponsoris|^sponsored|^publicit|^ad$|^annonce$|paid partnership|partenariat r|en savoir plus sur cette/i;
  // La signature d'un reel dans le fil : le format court ne s'annonce pas
  // autrement une fois les classes obfusquees.
  const REEL = /\\breels?\\b|son original|original audio|audio original/i;

  const posts = () => document.querySelectorAll('article');

  /**
   * Le bloc qu'une etiquette coiffe.
   *
   * On remonte au <article> quand il y en a un ; le fil n'en a pas toujours,
   * et il faut alors remonter jusqu'au premier ancetre assez haut pour etre
   * une carte plutot que sa ligne de titre.
   */
  const __block = (n) => {
    const art = n.closest('article');
    if (art) return art;
    let el = n;
    for (let i = 0; i < 10 && el && el.parentElement; i += 1) {
      // On ne franchit pas le bord d'une fenetre en remontant : au-dela, le
      // premier ancetre « assez grand » est la fenetre entiere.
      if (el.getAttribute && el.getAttribute('role') === 'dialog') return n;
      if (el.offsetHeight > 220) return el;
      el = el.parentElement;
    }
    return n;
  };

  /**
   * Chercher l'etiquette, puis remonter — et non lire le debut du post.
   *
   * La version precedente testait les 240 premiers caracteres de
   * l'<article> : elle ratait toute mention placee apres l'en-tete, et ne
   * voyait rien du tout quand le fil n'utilisait pas d'<article>. C'est
   * pour ca que « masquer les posts suggeres » ne faisait rien.
   */
  const __byLabel = (re, key) => {
    document.querySelectorAll('span, h2, h3, div[role="heading"]').forEach((n) => {
      if (n.children.length) return;
      /*
        Les publicites et les suggestions se masquent DANS LE FIL, pas dans
        une fenetre. Instagram ecrit « Suggestions pour vous » au bas de la
        liste des likes et de celle des abonnes : la regle y remontait
        jusqu'a la fenetre et la faisait disparaitre entiere.
      */
      if (n.closest('[role="dialog"]')) return;
      const t = (n.textContent || '').trim();
      if (!__fresh(re, n, t)) return;
      if (t.length < 64 && re.test(t)) __hide(__safe(__block(n)), key);
    });
  };

  /**
   * Le carrousel de stories, trouve dans le navigateur et non devine.
   *
   * On le cherchait depuis un lien /stories/ : il n'y en a AUCUN. Instagram
   * dessine l'anneau colore dans un <canvas> et pose le clic sur un div sans
   * lien. Cinq tentatives ont echoue sur ce seul point, sans qu'on le sache.
   *
   * La bande est le <ul> qui porte au moins trois canvas et reste haute
   * d'une vignette. Aucun nom de classe, aucune langue : ce qui a ete
   * verifie tient tant qu'Instagram dessine ses anneaux ainsi.
   */
  const __tray = () => {
    for (const u of document.querySelectorAll('ul')) {
      if (u.querySelectorAll('canvas').length < 3) continue;
      if (u.offsetHeight > 0 && u.offsetHeight < 220) return u;
    }
    return null;
  };

  /*
    Ouvrir une story ne passe pas par un lien : le clic est pose sur un
    div[role="button"] dont le libelle commence par « Story by » ou
    « Histoire de ». On l'intercepte EN CAPTURE, avant la page.
  */
  const STORY = /\\bstor(y|ies)\\b|\\bhistoire/i;
  const __isStory = (t) => {
    let n = t;
    for (let i = 0; i < 8 && n; i += 1) {
      const lab = n.getAttribute && n.getAttribute('aria-label');
      if (lab && STORY.test(lab)) return true;
      n = n.parentElement;
    }
    return false;
  };
  for (const ev of ['pointerdown', 'mousedown', 'click', 'touchstart']) {
    addEventListener(ev, (e) => {
      if (!__on('stories')) return;
      if (!e.target || !__isStory(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    }, true);
  }

  /*
   * Changer de compte SANS quitter la page.
   *
   * On menait vers /accounts/login/ : c'est la page d'ajout d'un compte, et
   * Instagram y termine souvent la session en cours — on croyait basculer, on
   * se retrouvait deconnecte. Or Instagram sait deja tenir plusieurs comptes ;
   * son selecteur est dans la page, il suffit de l'ouvrir.
   *
   * On le cherche par son LIBELLE, jamais par une classe, et on remonte le
   * chemin que ferait un doigt : le selecteur s'il est deja la, sinon le menu,
   * sinon l'onglet profil. Chaque etape rend la main et la suivante retente —
   * l'interface met un instant a s'ouvrir.
   *
   * C'est du texte, donc c'est fragile : si Instagram renomme son option, le
   * commutateur ne trouve plus rien et le dit, au lieu de deconnecter.
   */
  const SWITCH = /changer de compte|switch accounts?|changer de profil/i;
  const MENU = /plus d.options|more options|param.tres|settings|menu/i;
  const PROFILE = /profil|profile/i;

  const __clickBy = (re) => {
    const sel = 'button, [role="button"], a, div[tabindex], span[role="link"]';
    for (const n of document.querySelectorAll(sel)) {
      const label = n.getAttribute('aria-label') || '';
      const text = (n.textContent || '').trim();
      if (re.test(label) || (text && text.length < 40 && re.test(text))) {
        n.click();
        return true;
      }
    }
    return false;
  };

  window.__nrSwitch = () => {
    // 1. Le selecteur est deja ouvert, ou son entree est visible.
    if (__clickBy(SWITCH)) { __post({ t: 'switch', ok: true }); return; }

    // 2. Sinon on ouvre le menu, et on retente.
    if (__clickBy(MENU)) {
      setTimeout(() => {
        if (__clickBy(SWITCH)) __post({ t: 'switch', ok: true });
        else __post({ t: 'switch', ok: false });
      }, 700);
      return;
    }

    // 3. Sinon on passe par le profil, ou vit l'entree sur mobile.
    if (__clickBy(PROFILE)) {
      setTimeout(() => {
        if (__clickBy(SWITCH) || __clickBy(MENU)) {
          setTimeout(() => {
            if (__clickBy(SWITCH)) __post({ t: 'switch', ok: true });
            else __post({ t: 'switch', ok: false });
          }, 700);
        } else __post({ t: 'switch', ok: false });
      }, 900);
      return;
    }

    __post({ t: 'switch', ok: false });
  };

  __watch(() => {
    __restore();
    __scheme();
    __gray();
    __cookies();
    __native();

    /*
      Ni sur les stories, ni sur le fil.
      Les stories sont du 9:16 elles aussi. Et le fil contient des reels que
      les regles du DOM retirent deja : y laisser cette sortie-la revenait a
      faire reculer la page pendant qu'on faisait simplement defiler.
    */
    window.__nrShorts = !location.pathname.startsWith('/stories/')
      && location.pathname !== '/';
    if (window.__nrShorts) __shorts();

    // Un reel du fil est un <article> contenant un lien /reel/xxx ; dans
    // l'explore c'est une tuile. Les deux partent, et le post entier avec.
    document.querySelectorAll('a[href*="/reel/"]').forEach((a) => {
      __hide(__safe(a.closest('article')) || a, 'short');
    });

    // Filet de securite : un post qui porte la mention d'un son original
    // ou le mot Reel est un reel, meme sans lien /reel/ visible.
    posts().forEach((art) => {
      if (REEL.test((art.textContent || '').slice(0, 200))) __hide(__safe(art), 'short');
    });

    if (__on('ads')) __byLabel(AD, 'ads');
    if (__on('suggested')) __byLabel(SUGGEST, 'suggested');

    /*
      Une story sponsorisee ne se cache pas : elle OCCUPE l'ecran entier.
      La masquer laisserait un trou noir dont on ne sort qu'en devinant ou
      appuyer. On fait donc ce que ferait le doigt — un appui dans la zone
      « suivante », a droite du lecteur. Un saut par seconde au plus : la
      story suivante met un instant a s'annoncer, et sans ce frein on
      traverserait tout le carrousel d'une traite.
    */
    if (__on('storyAds') && location.pathname.startsWith('/stories/')) {
      const view = document.querySelector('section, [role="dialog"]') || document.body;
      const txt = (view.textContent || '').slice(0, 300);
      if (AD.test(txt) || /sponsoris|sponsored/i.test(txt)) {
        const now = Date.now();
        if (now - __lastSkip > 1000) {
          __lastSkip = now;
          const r = view.getBoundingClientRect();
          const x = r.left + r.width * 0.9;
          const y = r.top + r.height * 0.5;
          const el = document.elementFromPoint(x, y);
          if (el) {
            for (const type of ['pointerdown', 'mousedown', 'mouseup', 'click']) {
              el.dispatchEvent(new MouseEvent(type, {
                bubbles: true, cancelable: true, clientX: x, clientY: y,
              }));
            }
          }
        }
      }
    }

    // Les publications enregistrees sont une reserve a rescroller : c'est le
    // meme fil, en differe.
    if (__on('saved')) {
      document.querySelectorAll('a[href*="/saved/"]').forEach((a) => __hide(a, 'saved'));
      if (/[/]saved([/]|$)/.test(location.pathname)) { __go('/'); return; }
    }

    if (__on('stories')) __hide(__tray(), 'stories');
    else if (__on('feed')) __hide(__tray(), 'feed');
    if (__on('feed')) posts().forEach((el) => __hide(el, 'feed'));

    if (__on('dmsOnly') && !location.pathname.startsWith('/direct')) {
      __go('/direct/inbox/');
      return;
    }
    if (/^\\/reels?(\\/|$)/.test(location.pathname)) __go('/');
    /*
      Chercher un compte passe par /explore.
      Ce chemin etait bloque en dur, verrouille : impossible de chercher qui
      que ce soit, et rien ne disait pourquoi. Le reglage existe toujours —
      il est simplement debrayable, et eteint par defaut.
    */
    if (__on('explore') && location.pathname.startsWith('/explore')) __go('/');
  });
})();
true;
`;

export const YOUTUBE_BLOCKER = `
(() => {
  'use strict';
  ${COMMON}

  /*
    On vise m.youtube.com, donc des elements « ytm- ».
    La moitie des selecteurs d'avant etaient ceux du YouTube DE BUREAU —
    ytd-*, #comments, #related — qui ne correspondent a rien ici. Ils
    n'echouaient pas : ils ne trouvaient rien, en silence. D'ou des reglages
    qui semblaient morts sans l'etre.

    Plutot que de courir apres des noms qui changent a chaque deploiement,
    on remonte a l'UNITE qui porte l'element : chez YouTube, tout bloc est
    un composant sur mesure, donc une balise a trait d'union. On garde ce
    qu'on trouve par le texte, qui, lui, survit aux renommages.
  */
  const css = \`
    ytm-reel-shelf-renderer,
    ytm-shorts-lockup-view-model, shorts-lockup-view-model,
    ytm-pivot-bar-item-renderer[tab-identifier="FEshorts"],
    a[href^="/shorts"], a[href*="/shorts/"] { display: none !important; }
  \`;
  __css(css);

  /**
   * Le composant qui porte ce noeud, sans jamais avaler la page entiere.
   *
   * La hauteur doit etre REELLE. Sans cette condition, la remontee
   * s'arretait au premier composant venu, y compris ceux de hauteur zero —
   * et YouTube en empile plusieurs autour de chaque titre. « Bloquer les
   * commentaires » masquait donc un titre invisible pendant que le bloc
   * restait a l'ecran. Verifie sur une vraie page de lecture.
   */
  const __unit = (n) => {
    let el = n;
    for (let i = 0; i < 10 && el && el.parentElement; i += 1) {
      const tag = (el.tagName || '').toLowerCase();
      if (tag.indexOf('-') > 0 && el.offsetHeight > 0 && el.offsetHeight < innerHeight * 0.8) {
        return el;
      }
      el = el.parentElement;
    }
    return null;
  };

  /** Les noeuds de texte dont le contenu entier correspond. */
  const __labelled = (re, fn) => {
    document.querySelectorAll('span, h2, h3, div[role="heading"], a').forEach((n) => {
      if (n.children.length) return;
      const t = (n.textContent || '').trim();
      if (!__fresh(re, n, t)) return;
      if (t.length < 40 && re.test(t)) fn(n);
    });
  };

  const SHORTS = /^shorts$/i;
  const COMMENTS = /^(commentaires|comments)$/i;
  const NEXT = /^(a suivre|à suivre|up next|suggestions|autres vid)/i;
  const AD = /^(sponsoris|sponsored|publicit|annonce)/i;

  __watch(() => {
    __restore();
    __scheme();
    __gray();
    __cookies();
    __native();

    // Les Shorts, par leur adresse ET par leur intitule : l'etagere, la
    // vignette et l'onglet du bas portent le meme mot.
    document.querySelectorAll('a[href^="/shorts"], a[href*="/shorts/"]').forEach((a) => {
      __hide(__unit(a) || a);
    });
    __labelled(SHORTS, (n) => __hide(__unit(n) || n));

    if (__on('comments')) {
      // Le nom « comments-entry-point-teaser-view-model » est l'actuel, verifie
      // sur une page de lecture ; l'ancien ne correspond plus a rien.
      document.querySelectorAll(
        'comments-entry-point-teaser-view-model,'
        + ' ytm-comments-entry-point-header-renderer, #comments'
      ).forEach((el) => __hide(el, 'comments'));
      __labelled(COMMENTS, (n) => __hide(__unit(n) || n, 'comments'));
    }

    if (__on('recommended')) {
      document.querySelectorAll(
        'ytm-item-section-renderer[section-identifier="related-items"], #related'
      ).forEach((el) => __hide(el, 'recommended'));
      __labelled(NEXT, (n) => __hide(__unit(n) || n, 'recommended'));
    }

    /*
      « Recherche uniquement » : la barre reste, le fil disparait. On ne
      redirige pas — rediriger enverrait sur une page de resultats vide, et
      YouTube sans champ de recherche n'a plus d'usage du tout.
    */
    if (__on('searchOnly')
        && !/^[/](results|watch|channel|@|playlist)/.test(location.pathname)) {
      document.querySelectorAll('ytm-rich-grid-renderer, ytm-section-list-renderer')
        .forEach((el) => __hide(el, 'searchOnly'));
    }

    if (__on('ads')) {
      document.querySelectorAll(
        'ytm-companion-slot, ytm-promoted-video-renderer, .ytp-ad-module,'
        + ' ad-slot-renderer, ytm-promoted-sparkles-web-renderer'
      ).forEach((el) => __hide(el, 'ads'));
      __labelled(AD, (n) => __hide(__unit(n) || n, 'ads'));
      // Passer la publicite quand YouTube veut bien le permettre.
      const skip = document.querySelector(
        '.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button'
      );
      if (skip) skip.click();
    }

    if (__on('home') && (location.pathname === '/' || location.pathname === '/feed/trending')) {
      __go('/feed/subscriptions');
    }
    if (location.pathname.startsWith('/shorts')) __go('/feed/subscriptions');
  });
})();
true;
`;


export const TIKTOK_BLOCKER = `
(() => {
  'use strict';
  ${COMMON}

  /*
    Verifie contre le vrai site mobile, pas de memoire.
    Les selecteurs precedents — nav-foryou, nav-explore, nav-upload,
    recommend-list-item-container — ne correspondaient a RIEN : sur 49
    elements portant un data-e2e, aucun ne portait ces noms-la. Et
    « messages uniquement » menait a /messages, qui n'existe pas ici.
    Les vrais chemins sont /discover, /search, /inbox et /following.
  */
  const css = \`
    [data-e2e="discover-icon"], a[href^="/discover"],
    [data-e2e="open-titok-icon"] { display: none !important; }
  \`;
  __css(css);

  __watch(() => {
    __restore();
    __scheme();
    __gray();
    __cookies();
    __native();

    if (__on('explore')) {
      document.querySelectorAll(
        '[data-e2e="discover-icon"], a[href^="/discover"], a[href^="/search"]'
      ).forEach((el) => __hide(el.closest('a') || el, 'explore'));
      if (/^[/](discover|search)/.test(location.pathname)) { __go('/following'); return; }
    }

    // « Messages uniquement » : la boite s'appelle /inbox, pas /messages.
    if (__on('dmsOnly') && !location.pathname.startsWith('/inbox')) {
      __go('/inbox');
      return;
    }

    // Le fil « Pour toi » EST le produit de TikTok : on ne garde que les
    // abonnements. C'est la seule regle qui passait deja, parce qu'elle
    // repose sur l'adresse et non sur un nom de classe.
    if (location.pathname === '/' || location.pathname.startsWith('/foryou')) {
      __go('/following');
    }
  });
})();
true;
`;


export const TWITTER_BLOCKER = `
(() => {
  'use strict';
  ${COMMON}

  // Seules les tendances sont ici : elles sont verrouillees. « Explorer »
  // est reglable, donc il se masque a la passe, ou on peut le rendre.
  const css = \`
    a[href^="/i/trends"],
    [data-testid="trend"], [aria-label="Timeline: Trending now" i] { display: none !important; }
  \`;
  __css(css);

  __watch(() => {
    // « Pour vous » est l'onglet algorithmique : on bascule sur « Abonnements ».
    const tabs = document.querySelectorAll('[role="tab"]');
    let following = null;
    tabs.forEach((t) => {
      const txt = (t.textContent || '').trim().toLowerCase();
      if (/abonnements|following/.test(txt)) following = t;
      if (/pour vous|for you/.test(txt)) t.style.setProperty('display', 'none', 'important');
    });
    if (following && following.getAttribute('aria-selected') === 'false') following.click();
    __restore();
    __scheme();
    __gray();
    __cookies();
    __native();
    if (__on('explore')) {
      document.querySelectorAll('a[href="/explore"]')
        .forEach((el) => __hide(el, 'explore'));
    }
    if (__on('dmsOnly') && !location.pathname.startsWith('/messages')) {
      __go('/messages');
    }
    if (__on('explore') && location.pathname.startsWith('/explore')) __go('/home');
  });
})();
true;
`;

/*
 * Le fond de chaque site, releve DANS le navigateur sur le site lui-meme.
 *
 * Notre bandeau du haut se peignait avec la couleur de l'app, la WebView avec
 * une troisieme, et le site avec la sienne : trois noirs presque identiques
 * empiles, donc deux coutures visibles sous l'encoche. De memoire j'aurais
 * ecrit du noir pur pour Instagram — c'est 12, 16, 20. C'est exactement le
 * genre de valeur qu'on ne devine pas, et la couture se voyait.
 *
 * YouTube redirige vers sa page de consentement avant de montrer sa couleur ;
 * on garde sa valeur connue, et elle ne coute qu'une couture si elle bouge.
 */
type Chrome = { dark: string; light: string };

export const CLIENTS = {
  instagram: {
    /*
      Le fil d'Instagram, tel qu'il l'ouvre.

      On forcait ?variant=following — le fil des seuls abonnements — en
      arrivant, par coherence avec l'app. Mais ce fil-la se recharge mal : il
      restait en chargement, et le retour en arriere depuis un post y ramenait
      en haut. Le reglage existe toujours dans Instagram, a un geste d'ici,
      pour qui le veut ; l'imposer coutait plus cher que ce qu'il rapportait.
    */
    url: 'https://www.instagram.com/',
    host: 'instagram.com',
    script: INSTAGRAM_BLOCKER,
    blocked: (p: string) => /^\/reels?(\/|$)/.test(p),
    chrome: { dark: '#0C1014', light: '#FFFFFF' } as Chrome,
  },
  tiktok: {
    url: 'https://www.tiktok.com/following',
    host: 'tiktok.com',
    script: TIKTOK_BLOCKER,
    blocked: (p: string) => p === '/' || p.startsWith('/foryou'),
    chrome: { dark: '#000000', light: '#FFFFFF' } as Chrome,
  },
  twitter: {
    url: 'https://x.com/home',
    host: 'x.com',
    script: TWITTER_BLOCKER,
    blocked: (p: string) => p.startsWith('/explore'),
    chrome: { dark: '#000000', light: '#FFFFFF' } as Chrome,
  },
  youtube: {
    url: 'https://m.youtube.com/feed/subscriptions',
    host: 'youtube.com',
    script: YOUTUBE_BLOCKER,
    blocked: (p: string) => p.startsWith('/shorts'),
    chrome: { dark: '#0F0F0F', light: '#FFFFFF' } as Chrome,
  },
} as const;

export type ClientId = keyof typeof CLIENTS;
