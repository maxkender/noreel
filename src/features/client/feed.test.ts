import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLIENTS, buildScript } from './blockers';
import { firstRunUrl } from './firstrun';

describe('le fil qu’on ne touche plus', () => {
  /*
    Le defaut qu'on a paye trois fois : retirer les reels publication par
    publication sur une liste qu'Instagram RECYCLE. Le fil se vidait, des
    posts se changeaient en d'autres, le scroll sautait tout seul. La seule
    correction qui a tenu est un renoncement — ne rien examiner sur le fil.

    Ce test lit la SOURCE du script parce que c'est la garde elle-meme qu'il
    protege : quelqu'un (moi, dans six mois) qui retire ce `if` retrouvera les
    trois symptomes, et rien d'autre dans la suite ne s'en apercevrait.
  */
  const src = CLIENTS.instagram.script;

  it('n’examine les publications qu’en DEHORS du fil', () => {
    // La premiere occurrence du selecteur est une regle CSS (l'onglet Reels
    // de la barre, qui lui reste bloque) : c'est l'appel JS qu'on vise, et il
    // doit tomber du cote « pas le fil » de la garde.
    const i = src.indexOf('querySelectorAll(\'a[href*="/reel/"]\')');
    expect(i).toBeGreaterThan(0);
    // La branche « pas le fil » commence au profil ; l'explore vient apres.
    const branch = src.lastIndexOf('} else if (__profile())', i);
    const guard = src.lastIndexOf('if (__home())', i);
    expect(branch).toBeGreaterThan(guard);
  });

  it('sait reconnaitre le fil', () => {
    expect(src).toContain("const __home = () => location.pathname === '/'");
  });

  /*
    Le correctif precedent n'a rien repare parce qu'il ne visait qu'une regle
    sur trois. Les publicites et les « suggestions pour vous » lisent le texte
    de chaque carte et remontent en cacher le conteneur — exactement ce qu'on
    venait de retirer pour les reels — et « Suggestions pour vous » revient
    dans le fil bien plus souvent qu'un reel. Le fil devenait noir.
  */
  it('ne laisse AUCUNE regle par publication tourner sur le fil', () => {
    const inFeed = src.slice(src.indexOf('if (__home())'), src.indexOf("__on('dmsOnly')"));
    const guard = inFeed.indexOf('} else if (__profile())');
    expect(guard).toBeGreaterThan(0);
    const untouched = inFeed.slice(0, guard);
    for (const rule of ["__byLabel(AD", "__byLabel(SUGGEST", 'a[href*="/reel/"]']) {
      expect(untouched).not.toContain(rule);
    }
  });

  it('efface les marques laissees ailleurs en revenant au fil', () => {
    // Instagram est une seule page : une carte cachee sur l'explore est
    // recyclee pour porter un post du fil, et reste cachee. C'est ce qui
    // vidait le fil poste par poste jusqu'au noir.
    const inFeed = src.slice(src.indexOf('if (__home())'), src.indexOf('} else if (__profile())'));
    expect(inFeed).toContain("querySelectorAll('[data-nr]')");
    expect(inFeed).toContain("removeAttribute('data-nr')");
  });

  it('bloque le fil entier par une regle CSS, pas post par post', () => {
    // Un noeud ajoute, zero examen par passe : les publications ajoutees
    // ensuite sont cachees par le navigateur sans qu'on ait rien a faire.
    expect(src).toContain("article{display:none!important}");
    expect(src).toContain('__wall()');
    expect(src).toContain('__unwall()');
  });

  /*
    Le vrai coupable du fil noir, et le plus long a trouver : une feuille CSS.

    Elle cachait « a[href*=/reel/] » et « [aria-label*=Reels] » sur tout le
    document. Le premier est le lien qui enveloppe la video d'une publication,
    le second n'importe quel conteneur dont l'etiquette mentionne Reels. Le
    navigateur les applique a chaque noeud ajoute en descendant, et une regle
    CSS ne se defait pas — contrairement a nos marques, que __restore sait
    retirer. Deux correctifs successifs n'ont rien change parce qu'ils ne
    touchaient que le JavaScript.
  */
  it('ne cache par CSS que l’onglet, jamais une publication', () => {
    const css = src.slice(src.indexOf('const css ='), src.indexOf('__css(css)'));

    /*
      Verifie dans un vrai navigateur sur instagram.com :
      - la page ne contient AUCUN <nav> ni [role=navigation], donc y ancrer
        les selecteurs ne cachait plus rien et le bouton revenait intact ;
      - un reel isole vit a /reels/{id}/, donc le prefixe « ^=/reels » attrape
        aussi des publications ;
      - les vignettes portent des etiquettes comme « peter_mai_ reels », donc
        la recherche par sous-chaine en ramasse.

      Ce qui distingue l'onglet est son adresse RACINE, sans identifiant.
    */
    expect(css).toContain('a[href="/reels/"]');
    expect(css).not.toContain('a[href^="/reels"]');
    expect(css).not.toContain('a[href*="/reel/"]');
    expect(css).not.toContain('[aria-label*="Reels" i]');
    expect(css).not.toMatch(/\bnav\s/);
  });

  it('retient le carrousel de stories au lieu d’en chercher un nouveau', () => {
    // Un element cache a une hauteur nulle : la recherche ne le retrouvait
    // plus et designait une nouvelle victime a chaque passe.
    expect(src).toContain('if (__trayEl && document.body.contains(__trayEl)) return __trayEl;');
  });

  it('emporte les mots du panneau avec les reglages', () => {
    // Ecrits en dur dans le script, ils echapperaient au typage et a la
    // parite des langues — et sortiraient en francais dans l'app anglaise.
    const s = buildScript('', {}, 'dark', undefined, null, 0,
      { title: 'Fil bloqué', body: 'corps', hint: 'indice' });
    expect(s).toContain('window.__nrWall');
    expect(s).toContain('Fil bloqué');
    expect(buildScript('', {}, 'dark')).toContain('window.__nrWall = null');
  });
});

describe('la premiere ouverture', () => {
  beforeEach(() => AsyncStorage.clear());

  it('mene a la connexion, une seule fois', async () => {
    // Le fil renvoie une page quasi vide tant qu'on n'est pas connecte : on
    // arrivait devant du blanc, sans rien qui dise quoi faire.
    expect(await firstRunUrl('instagram', CLIENTS.instagram.login)).toBe(
      'https://www.instagram.com/accounts/login/'
    );
    expect(await firstRunUrl('instagram', CLIENTS.instagram.login)).toBeNull();
  });

  it('compte chaque app separement', async () => {
    await firstRunUrl('instagram', CLIENTS.instagram.login);
    expect(await firstRunUrl('tiktok', CLIENTS.tiktok.login)).toBe(
      'https://www.tiktok.com/login'
    );
  });

  it('ne detourne pas une app sans page de connexion utilisable', async () => {
    // Google refuse ses formulaires dans une vue web integree : y envoyer
    // quelqu'un serait l'envoyer dans un mur.
    expect('login' in CLIENTS.youtube).toBe(false);
    expect(await firstRunUrl('youtube', undefined)).toBeNull();
  });
});
