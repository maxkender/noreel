/**
 * Scripts injectes AVANT l'execution de la page : aucun flash de contenu.
 * On ne cible QUE des attributs semantiques — les classes d'Instagram et de
 * YouTube sont obfusquees et changent en permanence.
 */

/** Construit le script final en y injectant les reglages actifs. */
export function buildScript(
  base: string,
  settings: Record<string, boolean>,
  theme: 'light' | 'dark' = 'dark'
): string {
  return `window.__NR = ${JSON.stringify(settings)};\n`
    + `window.__nrTheme = ${JSON.stringify(theme)};\n`
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
  const __schedule = (fn) => {
    if (__t) return;
    __t = setTimeout(() => {
      __t = null;
      try { fn(); } catch (e) { /* une passe ratee n'est pas grave */ }
    }, 300);
  };
  const __watch = (fn) => {
    window.__nrPass = fn;
    new MutationObserver(() => __schedule(fn))
      .observe(document.body || document.documentElement, { childList: true, subtree: true });
    for (const m of ['pushState', 'replaceState']) {
      const o = history[m];
      history[m] = function (...a) { const r = o.apply(this, a); __schedule(fn); return r; };
    }
    addEventListener('popstate', () => __schedule(fn));
    // La premiere passe est immediate : pas de flash de contenu.
    try { fn(); } catch (e) { /* idem */ }
  };
  // Un reglage qu'on eteint doit RENDRE ce qu'il avait cache. Chaque
  // masquage porte donc le nom de la regle qui l'a decide, et ceux dont la
  // regle ne demande plus rien reviennent des la passe suivante. Sans ca,
  // decocher un interrupteur ne faisait rien tant qu'on ne rechargeait pas.
  const __hide = (el, key) => {
    if (!el) return;
    if (key) el.setAttribute('data-nr', key);
    el.style.setProperty('display', 'none', 'important');
  };
  const __on = (k) => !!(window.__NR && window.__NR[k]);
  const __restore = () => {
    document.querySelectorAll('[data-nr]').forEach((el) => {
      if (__on(el.getAttribute('data-nr'))) return;
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
    const from = location.pathname;
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
  const __escape = () => {
    if (__auth()) return;
    const now = Date.now();
    // Un seul depart par seconde et demie : la page se reconstruit apres le
    // retour, et sans ce frein on repartirait en arriere sans fin.
    if (now - __left < 1500) return;
    __left = now;
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
   * On ne sort que devant un DEFILEMENT, jamais devant une seule video.
   *
   * Une video verticale qui occupe l'ecran ne suffit pas : ce peut etre
   * celle qu'un ami a tournee et envoyee en message, et la couper serait
   * casser la conversation. Le lecteur de format court, lui, tient toujours
   * la SUIVANTE en reserve pour que le doigt l'enchaine sans attendre :
   * deux videos verticales en memoire, dont une plein ecran, c'est le fil
   * infini et rien d'autre.
   */
  const __shorts = () => {
    const tall = Array.from(document.querySelectorAll('video')).filter(__tall);
    if (tall.length < 2) return;
    const big = tall.filter((v) => v.getBoundingClientRect().height > innerHeight * 0.5);
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
  const style = document.createElement('style');
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);

  // On reconnait un bloc a son TEXTE, jamais a ses classes : Instagram les
  // regenere a chaque deploiement, un selecteur de classe ne tient pas une
  // semaine.
  const SUGGEST = /suggestions? pour vous|suggested for you|publications sugg|suggested posts?|suggestions? pour toi/i;
  const AD = /^sponsoris|^sponsored|^publicit|paid partnership|partenariat r|en savoir plus sur cette/i;
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
      const t = (n.textContent || '').trim();
      if (t.length > 0 && t.length < 64 && re.test(t)) __hide(__block(n), key);
    });
  };

  /**
   * Le carrousel de stories n'a aucun attribut a lui.
   *
   * On part d'un lien /stories/ et on remonte tant que l'ancetre reste une
   * BANDE : un carrousel fait moins de 260 px de haut, le fil qui le
   * contient en fait des milliers. Exiger trois liens, comme avant, ratait
   * le carrousel des qu'il ne restait qu'un ou deux amis a publier.
   */
  const __tray = () => {
    const a = document.querySelector('a[href^="/stories/"]');
    if (!a) return null;
    let best = null;
    let n = a.parentElement;
    for (let i = 0; i < 12 && n; i += 1) {
      if (n.offsetHeight > 0 && n.offsetHeight < 260) best = n;
      else if (best) break;
      n = n.parentElement;
    }
    return best;
  };

  let __lastSkip = 0;

  /*
    Un clic sur une story ne part pas.
    Masquer ne suffisait pas : Instagram ouvre ses stories sans lien, par un
    gestionnaire pose sur un <div>. On ne pouvait donc rien cacher qui les
    empeche de s'ouvrir, et le reglage paraissait mort. On intercepte le clic
    lui-meme, EN CAPTURE — avant que la page ne le voie — et on refuse ceux
    qui visent une story. Le libelle est teste en francais comme en anglais :
    le site suit la langue du telephone, pas la notre.
  */
  const STORY = /\bstor(y|ies)\b|\bhistoire/i;
  const __isStory = (t) => {
    if (!t || !t.closest) return false;
    if (t.closest('a[href*="/stories/"]')) return true;
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
      if (location.pathname.startsWith('/stories/')) return;
      if (!__isStory(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    }, true);
  }

  // Le fil « Abonnements » ne se choisit qu'UNE fois par page. Cliquer a
  // chaque passe rouvrait le menu sous le doigt toutes les 300 ms.
  let __feed = false;
  const __following = () => {
    if (__feed || location.pathname !== '/') return;
    const sel = '[role="menuitem"], [role="tab"], [role="button"], button';
    for (const b of document.querySelectorAll(sel)) {
      const t = (b.textContent || '').trim().toLowerCase();
      if (/^(abonnements|following)$/.test(t)) { __feed = true; b.click(); return; }
    }
  };

  __watch(() => {
    __restore();
    __scheme();
    __gray();
    __cookies();
    __native();
    __following();

    // Les stories sont du 9:16 elles aussi : sans cette reserve, les
    // regarder aurait renvoye dehors comme un reel.
    window.__nrShorts = !location.pathname.startsWith('/stories/');
    if (window.__nrShorts) __shorts();

    // Un reel du fil est un <article> contenant un lien /reel/xxx ; dans
    // l'explore c'est une tuile. Les deux partent, et le post entier avec.
    document.querySelectorAll('a[href*="/reel/"]').forEach((a) => {
      __hide(a.closest('article') || a);
    });

    // Filet de securite : un post qui porte la mention d'un son original
    // ou le mot Reel est un reel, meme sans lien /reel/ visible.
    posts().forEach((art) => {
      if (REEL.test((art.textContent || '').slice(0, 200))) __hide(art);
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

    /*
      Bloquer les stories, par trois chemins plutot qu'un.
      On ne cherchait que la BANDE qui les porte, en remontant depuis un
      lien tant que l'ancetre restait court. Quand Instagram remanie le fil —
      ou quand la mesure de hauteur tombe pendant une recomposition — on ne
      trouve rien, et le reglage semble mort. On coupe donc aussi chaque
      vignette une a une, et surtout on refuse la page du lecteur : meme si
      une story survit a l'ecran, elle ne s'ouvre pas.
    */
    if (__on('stories')) {
      __hide(__tray(), 'stories');
      document.querySelectorAll('a[href^="/stories/"]').forEach((a) => {
        __hide(a.closest('li') || a, 'stories');
      });
      if (location.pathname.startsWith('/stories/')) { __go('/'); return; }
    } else if (__on('feed')) {
      __hide(__tray(), 'feed');
    }
    if (__on('feed')) posts().forEach((el) => __hide(el, 'feed'));

    if (__on('dmsOnly') && !location.pathname.startsWith('/direct')) {
      __go('/direct/inbox/');
      return;
    }
    if (/^\\/reels?(\\/|$)/.test(location.pathname)) __go('/');
    if (location.pathname.startsWith('/explore')) __go('/');
  });
})();
true;
`;

export const YOUTUBE_BLOCKER = `
(() => {
  'use strict';
  ${COMMON}

  const css = \`
    ytd-reel-shelf-renderer,
    ytd-rich-shelf-renderer[is-shorts],
    ytd-reel-item-renderer,
    ytm-reel-shelf-renderer,
    ytm-shorts-lockup-view-model,
    ytd-guide-entry-renderer a[title="Shorts"],
    ytm-pivot-bar-item-renderer[tab-identifier="FEshorts"],
    a[href^="/shorts"], a[href*="/shorts/"] { display: none !important; }
  \`;
  const style = document.createElement('style');
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);

  __watch(() => {
    __restore();
    __scheme();
    __gray();
    __cookies();
    __native();
    document.querySelectorAll('a[href^="/shorts"]').forEach((a) => {
      __hide(a.closest('ytd-rich-item-renderer, ytd-video-renderer, ytm-shorts-lockup-view-model') || a);
    });
    if (__on('comments')) {
      document.querySelectorAll('#comments, ytm-comments-entry-point-header-renderer')
        .forEach((el) => __hide(el, 'comments'));
    }
    if (__on('recommended')) {
      document.querySelectorAll('#related, ytm-item-section-renderer[section-identifier="related-items"]')
        .forEach((el) => __hide(el, 'recommended'));
    }

    /*
      « Recherche uniquement » : la barre reste, le fil disparait. On ne
      redirige pas — rediriger enverrait sur une page de resultats vide, et
      YouTube sans champ de recherche n'a plus d'usage du tout. On retire
      les grilles de vignettes, la ou elles sont, et seul ce qu'on est venu
      chercher s'affiche.
    */
    if (__on('searchOnly')
        && !/^[/](results|watch|channel|@|playlist)/.test(location.pathname)) {
      document.querySelectorAll(
        'ytd-rich-grid-renderer, ytm-rich-grid-renderer,'
        + ' ytd-browse[role="main"] #contents, ytm-browse,'
        + ' ytd-two-column-browse-results-renderer'
      ).forEach((el) => __hide(el, 'searchOnly'));
    }

    if (__on('ads')) {
      document.querySelectorAll(
        'ytd-ad-slot-renderer, ytm-companion-slot, ytd-promoted-sparkles-web-renderer,'
        + ' ytd-display-ad-renderer, ytm-promoted-video-renderer, .ytp-ad-module,'
        + ' ad-slot-renderer, ytd-in-feed-ad-layout-renderer'
      ).forEach((el) => __hide(el, 'ads'));
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

  const css = \`
    a[href="/foryou"], a[href^="/foryou"],
    [data-e2e="nav-foryou"], [data-e2e="recommend-list-item-container"],
    [aria-label="Pour toi" i], [aria-label="For You" i] { display: none !important; }
  \`;
  const style = document.createElement('style');
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);

  __watch(() => {
    __restore();
    __scheme();
    __gray();
    __cookies();
    __native();
    if (__on('explore')) {
      document.querySelectorAll('[data-e2e="nav-explore"], a[href^="/explore"]')
        .forEach((el) => __hide(el, 'explore'));
    }
    if (__on('create')) {
      document.querySelectorAll('[data-e2e="nav-upload"], a[href^="/upload"]')
        .forEach((el) => __hide(el, 'create'));
    }
    if (__on('dmsOnly') && !location.pathname.startsWith('/messages')) {
      __go('/messages');
    }
    // Le fil « Pour toi » EST le produit de TikTok : on ne garde que les abonnements.
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
  const style = document.createElement('style');
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);

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

export const CLIENTS = {
  instagram: {
    url: 'https://www.instagram.com/',
    host: 'instagram.com',
    script: INSTAGRAM_BLOCKER,
    blocked: (p: string) => /^\/reels?(\/|$)/.test(p),
  },
  tiktok: {
    url: 'https://www.tiktok.com/following',
    host: 'tiktok.com',
    script: TIKTOK_BLOCKER,
    blocked: (p: string) => p === '/' || p.startsWith('/foryou'),
  },
  twitter: {
    url: 'https://x.com/home',
    host: 'x.com',
    script: TWITTER_BLOCKER,
    blocked: (p: string) => p.startsWith('/explore'),
  },
  youtube: {
    url: 'https://m.youtube.com/feed/subscriptions',
    host: 'youtube.com',
    script: YOUTUBE_BLOCKER,
    blocked: (p: string) => p.startsWith('/shorts'),
  },
} as const;

export type ClientId = keyof typeof CLIENTS;
