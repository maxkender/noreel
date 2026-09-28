/**
 * Le fil d'Instagram est VIRTUALISE : en descendant, il reutilise les memes
 * elements pour de nouvelles publications.
 *
 * Deux defauts venaient de la, et tous deux ne se voyaient qu'apres une minute
 * de defilement — le genre qu'on ne reproduit pas en relisant du code :
 *
 *  - un noeud marque « deja examine » ne l'etait plus une fois recycle, donc
 *    la publication suivante echappait a toutes les regles ;
 *  - un element cache le restait tant que sa regle etait active, donc la carte
 *    qui portait un reel finissait par porter une publication ordinaire,
 *    cachee pour toujours. Le fil se vidait.
 */
import { CLIENTS } from './blockers';

/** Decoupe une fonction du script injecte et la rend appelable. */
function grab(name: string, extra = ''): string {
  const src = CLIENTS.instagram.script;
  const from = src.indexOf(`const ${name} =`);
  if (from < 0) throw new Error(`${name} introuvable dans le script injecte`);
  const end = src.indexOf('\n  };', from);
  if (end < 0) throw new Error(`fin de ${name} introuvable`);
  return src.slice(from, end + 5) + extra;
}

describe('le cache de lecture', () => {
  // __fresh s'appuie sur la table __scanned, declaree juste au-dessus de lui :
  // sans elle, la fonction decoupee leve des sa premiere ligne.
  const make = new Function(
    `const __scanned = new Map();\n${grab('__fresh')}\nreturn __fresh;`
  );
  const fresh = make() as (re: RegExp, n: object, t: string) => boolean;

  const RE = /x/;

  it('ne relit pas un noeud inchange', () => {
    const node = {};
    expect(fresh(RE, node, 'bonjour')).toBe(true);
    expect(fresh(RE, node, 'bonjour')).toBe(false);
  });

  /*
    Le cas du recyclage : MEME noeud, AUTRE texte. C'est exactement ce que fait
    Instagram en descendant, et c'est ce que la version precedente ratait.
  */
  it('relit un noeud recycle', () => {
    const node = {};
    expect(fresh(RE, node, 'la premiere publication')).toBe(true);
    expect(fresh(RE, node, 'une toute autre publication')).toBe(true);
  });

  it('ne lit jamais un noeud sans texte', () => {
    expect(fresh(RE, {}, '')).toBe(false);
  });

  // Chaque regle a son propre cache : YouTube passe quatre motifs sur les
  // memes noeuds dans une seule passe.
  it('garde un cache par regle', () => {
    const node = {};
    expect(fresh(/a/, node, 'texte')).toBe(true);
    expect(fresh(/b/, node, 'texte')).toBe(true);
  });
});

describe('les verificateurs de masquage', () => {
  const src = CLIENTS.instagram.script;

  // Ils sont poses sur __still, un par nom de regle.
  for (const key of ['short', 'ads', 'suggested']) {
    it(`la regle « ${key} » sait se reverifier`, () => {
      expect(src).toContain(`__still.${key} =`);
    });
  }

  /*
    Et __restore doit les CONSULTER. C'est la ligne qui manquait : sans elle,
    les verificateurs existent et ne servent a rien.
  */
  it('la restauration consulte le verificateur', () => {
    const from = src.indexOf('const __restore =');
    const body = src.slice(from, src.indexOf('\n  };', from));
    expect(body).toContain('__still[k]');
    expect(body).toContain('check(el)');
  });
});
