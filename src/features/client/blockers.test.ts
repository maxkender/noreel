import { CLIENTS, buildScript } from './blockers';

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
