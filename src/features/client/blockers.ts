/**
 * Scripts injectes AVANT l'execution de la page : aucun flash de contenu.
 * On ne cible QUE des attributs semantiques — les classes d'Instagram et de
 * YouTube sont obfusquees et changent en permanence.
 */

/** Construit le script final en y injectant les reglages actifs. */
export function buildScript(base: string, settings: Record<string, boolean>): string {
  return `window.__NR = ${JSON.stringify(settings)};\n` + base;
}

const COMMON = `
  let __q = false;
  const __schedule = (fn) => {
    if (__q) return;
    __q = true;
    requestAnimationFrame(() => { __q = false; fn(); });
  };
  const __watch = (fn) => {
    new MutationObserver(() => __schedule(fn))
      .observe(document.documentElement, { childList: true, subtree: true });
    for (const m of ['pushState', 'replaceState']) {
      const o = history[m];
      history[m] = function (...a) { const r = o.apply(this, a); __schedule(fn); return r; };
    }
    addEventListener('popstate', () => __schedule(fn));
    __schedule(fn);
  };
  const __hide = (el) => el && el.style.setProperty('display', 'none', 'important');
  const __on = (k) => !!(window.__NR && window.__NR[k]);

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
  const __cookies = () => { if (__tries < 40) { __tries += 1; __clickDecline(); } };
  setInterval(__cookies, 300);

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

  // Noir et blanc : un filtre sur la racine, applique et retire a la volee.
  const __gray = () => {
    const v = __on('grayscale') ? 'grayscale(1)' : '';
    document.documentElement.style.setProperty('filter', v, 'important');
  };
`;

export const INSTAGRAM_BLOCKER = `
(() => {
  'use strict';
  ${COMMON}

  // Reels et Explorer sont coupes en permanence : c'est la promesse de l'app,
  // les deux interrupteurs correspondants sont verrouilles cote reglages.
  const css = \`
    a[href^="/reels"], a[href$="/reels/"], a[href^="/explore"],
    svg[aria-label="Reels" i],
    svg[aria-label="Explorer" i], svg[aria-label="Explore" i],
    svg[aria-label="Rechercher et explorer" i],
    svg[aria-label="Search and explore" i] { display: none !important; }
  \`;
  const style = document.createElement('style');
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);

  const SUGGEST = /suggestions? pour vous|suggested for you|publications sugg|suggested posts/i;

  // Le carrousel de stories n'a pas d'attribut a lui : on remonte depuis un
  // lien /stories/ jusqu'au premier parent qui en contient plusieurs.
  const __tray = () => {
    const a = document.querySelector('main a[href^="/stories/"]');
    if (!a) return null;
    let n = a.parentElement;
    for (let i = 0; i < 8 && n; i += 1) {
      if (n.querySelectorAll('a[href^="/stories/"]').length >= 3) return n;
      n = n.parentElement;
    }
    return null;
  };

  __watch(() => {
    __gray();
    __cookies();

    // Un reel du fil est un <article> contenant un lien /reel/xxx ;
    // dans l'explore c'est une simple tuile.
    document.querySelectorAll('a[href*="/reel/"]').forEach((a) => {
      __hide(a.closest('article') || a);
    });

    if (__on('suggested')) {
      document.querySelectorAll('main article').forEach((art) => {
        if (SUGGEST.test((art.textContent || '').slice(0, 240))) __hide(art);
      });
    }

    if (__on('stories') || __on('feed')) __hide(__tray());
    if (__on('feed')) document.querySelectorAll('main article').forEach(__hide);

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
    ytd-guide-entry-renderer a[title="Shorts"],
    ytm-pivot-bar-item-renderer[tab-identifier="FEshorts"],
    a[href^="/shorts"] { display: none !important; }
  \`;
  const style = document.createElement('style');
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);

  __watch(() => {
    __gray();
    __cookies();
    document.querySelectorAll('a[href^="/shorts"]').forEach((a) => {
      __hide(a.closest('ytd-rich-item-renderer, ytd-video-renderer, ytm-shorts-lockup-view-model') || a);
    });
    if (__on('comments')) {
      document.querySelectorAll('#comments, ytm-comments-entry-point-header-renderer').forEach(__hide);
    }
    if (__on('recommended')) {
      document.querySelectorAll('#related, ytm-item-section-renderer[section-identifier="related-items"]').forEach(__hide);
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
    __gray();
    __cookies();
    if (__on('explore')) {
      document.querySelectorAll('[data-e2e="nav-explore"], a[href^="/explore"]').forEach(__hide);
    }
    if (__on('create')) {
      document.querySelectorAll('[data-e2e="nav-upload"], a[href^="/upload"]').forEach(__hide);
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

  const css = \`
    a[href="/explore"], a[href^="/i/trends"],
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
    __gray();
    __cookies();
    if (__on('dmsOnly') && !location.pathname.startsWith('/messages')) {
      __go('/messages');
    }
    if (location.pathname.startsWith('/explore')) __go('/home');
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
