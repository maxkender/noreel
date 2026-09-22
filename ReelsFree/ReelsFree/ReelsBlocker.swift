import Foundation

/// Tout ce qui définit "qu'est-ce qu'un Reel" vit ici.
enum ReelsBlocker {

    /// Chemins qu'on refuse au niveau navigation native (ceinture + bretelles
    /// par rapport au JS, qui gère lui la navigation interne SPA).
    static func isReelPath(_ path: String) -> Bool {
        path.hasPrefix("/reels") || path.hasPrefix("/reel/")
    }

    /// Injecté à `.atDocumentStart` : s'installe avant que la page ne tourne,
    /// donc aucun flash de Reels avant masquage.
    static let script = #"""
    (() => {
      'use strict';

      const isReelPath = p => /^\/reels?(\/|$)/.test(p);

      // --- 1. CSS statique : ce qui est ciblable par attribut stable ---
      // Les noms de classes d'Instagram sont obfusqués et tournent en
      // permanence : on ne cible QUE des attributs sémantiques.
      const CSS = `
        /* Onglet Reels : barre du bas (mobile) + sidebar (desktop) */
        a[href^="/reels"]  { display: none !important; }
        /* Onglet "Reels" sur une page de profil */
        a[href$="/reels/"] { display: none !important; }
      `;

      const injectCSS = () => {
        if (document.getElementById('__rf_css')) return;
        const s = document.createElement('style');
        s.id = '__rf_css';
        s.textContent = CSS;
        (document.head || document.documentElement).appendChild(s);
      };

      // --- 2. Passe dynamique : les reels dans le feed et l'explore ---
      let queued = false;

      const sweep = () => {
        queued = false;
        injectCSS();

        // Dans le feed un reel est un <article> contenant un lien /reel/xxx ;
        // dans l'explore c'est juste une tuile <a>.
        document.querySelectorAll('a[href*="/reel/"]').forEach(a => {
          const target = a.closest('article') || a;
          target.style.setProperty('display', 'none', 'important');
        });

        // Filet : si on atterrit quand même sur un reel, on repart au feed.
        if (isReelPath(location.pathname)) location.replace('/');
      };

      const schedule = () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(sweep);
      };

      new MutationObserver(schedule)
        .observe(document.documentElement, { childList: true, subtree: true });

      // Instagram est une SPA : il navigue par pushState, sans recharger.
      // Sans ce patch, une injection one-shot ne verrait jamais les nouvelles pages.
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
    """#
}
