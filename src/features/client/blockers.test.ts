import { CLIENTS, buildScript, type ClientId } from './blockers';
import { APP_TOGGLES } from '@/store/toggles';

/**
 * Un script injecte qui ne compile pas ne previent personne : la WebView
 * l'avale en silence, la page s'affiche NUE, et le filtre est mort sans
 * qu'aucune erreur ne remonte. On le compile donc ici — `new Function`
 * analyse sans executer, ce qui suffit a attraper une parenthese ou une
 * regex cassee par un echappement de gabarit.
 */
describe('les scripts injectes compilent', () => {
  for (const [id, client] of Object.entries(CLIENTS)) {
    it(id, () => {
      expect(() => new Function(buildScript(client.script, { reels: true }))).not.toThrow();
    });
  }
});

describe('les regles de blocage d’adresse', () => {
  it('coupe un reel Instagram, au singulier comme au pluriel', () => {
    expect(CLIENTS.instagram.blocked('/reel/Cx7')).toBe(true);
    expect(CLIENTS.instagram.blocked('/reels/')).toBe(true);
    expect(CLIENTS.instagram.blocked('/reels')).toBe(true);
  });

  it('laisse passer un profil, un post et les messages', () => {
    for (const p of ['/leo/', '/p/Cx7/', '/direct/inbox/', '/stories/leo/12/']) {
      expect(CLIENTS.instagram.blocked(p)).toBe(false);
    }
  });

  it('ne confond pas un profil qui commence par « reel »', () => {
    expect(CLIENTS.instagram.blocked('/reelmagic/')).toBe(false);
  });
});

/**
 * Un interrupteur qu'aucun script ne lit est pire qu'un interrupteur
 * absent : il promet un reglage, l'utilisateur le bascule, et rien ne
 * bouge. « Explorer » sur X etait dans ce cas — annonce comme reglable,
 * impose en dur. Rien ne le signalait.
 */
describe('chaque interrupteur est reellement lu', () => {
  for (const [id, toggles] of Object.entries(APP_TOGGLES)) {
    const script = CLIENTS[id as ClientId].script;
    for (const t of toggles) {
      if (t.locked) continue;
      it(`${id} · ${t.key}`, () => {
        expect(script).toContain(`__on('${t.key}')`);
      });
    }
  }
});

/**
 * Et ce qu'un reglage cache, il doit pouvoir le rendre. Une regle posee
 * dans la feuille de style injectee au chargement ne se retire jamais :
 * elle n'a donc le droit de servir qu'aux reglages verrouilles.
 */
describe('la feuille de style ne fige que le verrouille', () => {
  for (const [id, toggles] of Object.entries(APP_TOGGLES)) {
    const script = CLIENTS[id as ClientId].script;
    /*
      La feuille va de sa declaration a sa pose. Le repere etait
      « appendChild(style) », qui a disparu le jour ou les quatre scripts sont
      passes par un helper commun : indexOf rendait -1, le slice remontait
      alors jusqu'a l'avant-dernier caractere du script entier, et le test
      cherchait donc ses selecteurs dans TOUT le code — ou il les trouvait,
      evidemment. Un repere absent doit faire echouer l'extraction, pas la
      fausser en silence.
    */
    const from = script.indexOf('const css');
    const to = script.indexOf('__css(css)');
    if (from < 0 || to < 0) throw new Error(`feuille introuvable dans ${id}`);
    const css = script.slice(from, to);
    for (const t of toggles) {
      if (t.locked) continue;
      it(`${id} · ${t.key} n’est pas fige`, () => {
        // Un reglage debrayable ne doit pas voir son nom, ni son chemin,
        // apparaitre dans la feuille figee.
        expect(css).not.toContain(`/${t.key}`);
      });
    }
  }
});

/**
 * Le client YouTube ouvre m.youtube.com, dont les composants s'appellent
 * « ytm- ». Les selecteurs « ytd- » sont ceux du site de BUREAU : ils
 * n'echouent pas, ils ne trouvent rien, en silence. La moitie des reglages
 * YouTube a semble morte pour cette seule raison.
 */
it('le bloqueur YouTube ne vise pas le site de bureau', () => {
  expect(CLIENTS.youtube.url).toContain('m.youtube.com');
  // Les commentaires ont le droit d'en parler ; le code, non.
  const code = CLIENTS.youtube.script
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*/g, '');
  expect(code).not.toContain('ytd-');
});

