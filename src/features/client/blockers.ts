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

  const __clickDecline = () => {
    const sel = 'button, [role="button"], div[tabindex], span[role="link"], a[role="button"]';
    const nodes = Array.from(document.querySelectorAll(sel));
    // 1. Un libelle explicite de refus.
    for (const n of nodes) {
      const t = (n.textContent || '').trim();
      if (t && t.length < 70 && DECLINE.test(t)) { n.click(); return true; }
    }
    // 2. Sinon, dans un dialogue : le bouton qui n'accepte pas.
    const dialog = document.querySelector('[role="dialog"]');
    if (dialog) {
      const btns = Array.from(dialog.querySelectorAll(sel))
        .filter((b) => (b.textContent || '').trim().length > 0);
      const refuse = btns.find((b) => !ACCEPT.test((b.textContent || '')));
      if (refuse) { refuse.click(); return true; }
    }
    return false;
  };

  let __tries = 0;
  const __cookies = () => { if (__tries < 40) { __tries += 1; __clickDecline(); } };
  setInterval(() => { if (__tries < 40) { __tries += 1; __clickDecline(); } }, 300);

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

  const css = \`
    a[href^="/reels"], a[href$="/reels/"] { display: none !important; }
    svg[aria-label="Reels" i] { display: none !important; }
  \`;
  const style = document.createElement('style');
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);

  __watch(() => {
    // Un reel du fil est un <article> contenant un lien /reel/xxx ;
    // dans l'explore c'est une simple tuile.
    document.querySelectorAll('a[href*="/reel/"]').forEach((a) => {
      __hide(a.closest('article') || a);
    });
    if (/^\\/reels?(\\/|$)/.test(location.pathname)) location.replace('/');
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
      location.replace('/feed/subscriptions');
    }
    if (location.pathname.startsWith('/shorts')) location.replace('/feed/subscriptions');
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
      location.replace('/messages');
    }
    // Le fil « Pour toi » EST le produit de TikTok : on ne garde que les abonnements.
    if (location.pathname === '/' || location.pathname.startsWith('/foryou')) {
      location.replace('/following');
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
      location.replace('/messages');
    }
    if (location.pathname.startsWith('/explore')) location.replace('/home');
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
