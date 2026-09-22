// Script injecté dans la page Instagram AVANT son exécution.
// C'est le seul fichier à retoucher quand Instagram change son HTML.
export const REELS_BLOCKER = `
(() => {
  'use strict';

  const isReelPath = p => /^\\/reels?(\\/|\$)/.test(p);

  // Les classes d'Instagram sont obfusquées et tournent en permanence :
  // on ne cible QUE des attributs sémantiques et stables.
  const CSS = \`
    /* Onglet Reels : barre du bas (mobile), sidebar (desktop), onglet profil */
    a[href^="/reels"]              { display: none !important; }
    a[href$="/reels/"]             { display: none !important; }
    svg[aria-label="Reels" i]      { display: none !important; }

    /* Bandeaux "Ouvrir dans l'application" / "Installer" */
    [class*="AppInstallBanner"],
    [data-testid*="app-install"],
    [id*="app-install-banner"]     { display: none !important; }

    /* Le feed reprend toute la largeur une fois la colonne Reels partie */
    body { overscroll-behavior-y: contain; }
  \`;

  const injectCSS = () => {
    if (document.getElementById('__rf_css')) return;
    const s = document.createElement('style');
    s.id = '__rf_css';
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  };

  const hide = el => el && el.style.setProperty('display', 'none', 'important');

  let queued = false;

  const sweep = () => {
    queued = false;
    injectCSS();

    // 1. Reels dans le feed (<article> entier) et tuiles de l'explore.
    document.querySelectorAll('a[href*="/reel/"]').forEach(a => {
      hide(a.closest('article') || a);
    });

    // 2. Carrousels "Reels suggérés" : pas d'attribut stable, on passe par le
    //    titre de section, puis on remonte au conteneur.
    document.querySelectorAll('h1,h2,h3,span').forEach(el => {
      const t = (el.textContent || '').trim().toLowerCase();
      if (t.length > 40) return;
      if (/\\breels?\\b/.test(t) && /suggér|suggest|pour vous|for you/.test(t)) {
        hide(el.closest('section') || el.closest('div'));
      }
    });

    // 3. Filet : si on atterrit quand même sur un reel, retour au feed.
    if (isReelPath(location.pathname)) location.replace('/');
  };

  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(sweep);
  };

  new MutationObserver(schedule)
    .observe(document.documentElement, { childList: true, subtree: true });

  // Instagram est une SPA : il navigue par pushState, sans recharger la page.
  for (const m of ['pushState', 'replaceState']) {
    const orig = history[m];
    history[m] = function (...args) {
      const r = orig.apply(this, args);
      schedule();
      return r;
    };
  }
  addEventListener('popstate', schedule);

  schedule();
})();
true;
`;
