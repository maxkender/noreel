/**
 * Ce qu'une regle a le droit de masquer.
 *
 * Les regles trouvent une etiquette puis remontent jusqu'a un ancetre assez
 * grand pour etre la publication. Instagram ecrit les memes etiquettes DANS
 * ses fenetres — liste des likes, liste des abonnes, panneau de commentaires —
 * et la remontee y trouvait la fenetre elle-meme. Un display:none sur une
 * fenetre laisse un ecran noir dont on ne sort pas : c'est ce qu'on voyait en
 * ouvrant ses likes pour la premiere fois.
 */
import { CLIENTS } from './blockers';

/** La fonction, decoupee dans le script qui part vraiment. */
function safeFn(): (el: unknown) => unknown {
  const src = CLIENTS.instagram.script;
  const from = src.indexOf('const __safe =');
  if (from < 0) throw new Error('__safe introuvable dans le script injecte');
  const end = src.indexOf('\n  };', from);
  if (end < 0) throw new Error('fin de __safe introuvable');
  const body = src.slice(from, end + 5);
  const make = new Function('document', `${body}\nreturn __safe;`);
  return make({ body: BODY, documentElement: HTML }) as (el: unknown) => unknown;
}

type Fake = {
  tagName: string;
  role?: string;
  dialogs?: number;
  articles?: number;
};

/** Un element assez complet pour ce que __safe lui demande. */
function el({ tagName, role, dialogs = 0, articles = 0 }: Fake) {
  return {
    tagName,
    getAttribute: (k: string) => (k === 'role' ? role ?? null : null),
    querySelector: (sel: string) =>
      sel === '[role="dialog"]' && dialogs > 0 ? {} : null,
    querySelectorAll: (sel: string) =>
      ({ length: sel === 'article' ? articles : 0 }),
  };
}

const BODY = el({ tagName: 'BODY' });
const HTML = el({ tagName: 'HTML' });

describe('le garde-fou du masquage', () => {
  const safe = safeFn();

  it('refuse le corps du document', () => {
    expect(safe(BODY)).toBeNull();
  });

  it('refuse la racine du document', () => {
    expect(safe(HTML)).toBeNull();
  });

  // Ces deux balises portent des pans entiers de page : les masquer vide
  // l'ecran meme quand ce n'est pas une fenetre.
  for (const tagName of ['MAIN', 'SECTION']) {
    it(`refuse ${tagName}`, () => {
      expect(safe(el({ tagName }))).toBeNull();
    });
  }

  it('refuse une fenetre', () => {
    expect(safe(el({ tagName: 'DIV', role: 'dialog' }))).toBeNull();
  });

  // Le cas exact du bug : la remontee depuis « Suggestions pour vous » au bas
  // de la liste des likes atteint un conteneur QUI PORTE la fenetre.
  it('refuse un conteneur qui porte une fenetre', () => {
    expect(safe(el({ tagName: 'DIV', dialogs: 1 }))).toBeNull();
  });

  /*
    Plus d'une publication a l'interieur, ce n'est plus une publication :
    c'est le fil. Le masquer retire tout ce qu'on etait venu lire.
  */
  it('refuse un conteneur de plusieurs publications', () => {
    expect(safe(el({ tagName: 'DIV', articles: 3 }))).toBeNull();
  });

  it('accepte une publication', () => {
    const post = el({ tagName: 'ARTICLE', articles: 1 });
    expect(safe(post)).toBe(post);
  });

  it('accepte un bloc ordinaire', () => {
    const block = el({ tagName: 'DIV' });
    expect(safe(block)).toBe(block);
  });

  it('laisse passer l’absence d’element', () => {
    expect(safe(null)).toBeNull();
  });
});
