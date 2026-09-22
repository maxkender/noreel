/**
 * Scripts injectes AVANT l'execution de la page : aucun flash de contenu.
 * On ne cible QUE des attributs semantiques — les classes d'Instagram et de
 * YouTube sont obfusquees et changent en permanence.
 */

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
    document.querySelectorAll('a[href^="/shorts"]').forEach((a) => {
      __hide(a.closest('ytd-rich-item-renderer, ytd-video-renderer, ytm-shorts-lockup-view-model') || a);
    });
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
