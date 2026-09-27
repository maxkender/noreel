import { CLIENTS, buildScript, valveOpen, type Valve } from './blockers';

/**
 * La soupape existe en DEUX exemplaires : celui de l'interface, en
 * TypeScript, et celui de la page injectee, ecrit dans un litteral de gabarit
 * qui ne peut rien importer. Deux copies d'une meme regle divergent tot ou
 * tard — ces tests les font repondre a la meme question.
 */

const SAT_20_30 = new Date(2026, 8, 26, 20, 30);   // samedi 26 septembre 2026
const SAT_19_59 = new Date(2026, 8, 26, 19, 59);
const SAT_21_00 = new Date(2026, 8, 26, 21, 0);
const SUN_20_30 = new Date(2026, 8, 27, 20, 30);

const OPEN: Valve = { on: true, day: 6, from: 20, to: 21 };

/**
 * La regle de la page, EXTRAITE du script qui part vraiment.
 *
 * Premiere version de ce test : j'avais recopie la fonction dans le test et
 * compare la copie a l'originale — donc verifie ma transcription, pas le code
 * livre. Une divergence entre la page et l'interface serait passee sans bruit,
 * ce qui est exactement ce que ce fichier est cense empecher. On decoupe
 * maintenant la source.
 */
function scriptValveSource(): string {
  const from = CLIENTS.instagram.script.indexOf('const __valve =');
  if (from < 0) throw new Error('__valve introuvable dans le script injecte');
  const end = CLIENTS.instagram.script.indexOf('};', from);
  if (end < 0) throw new Error('fin de __valve introuvable');
  return CLIENTS.instagram.script.slice(from, end + 2);
}

/** Rejoue la regle de la page, avec sa propre horloge et son propre window. */
function scriptValve(v: Valve, now: Date): boolean {
  const fn = new Function('window', 'Date', `
    ${scriptValveSource()}
    return __valve();
  `);
  return fn({ __nrValve: v }, function () { return now; }) as boolean;
}

describe('la soupape', () => {
  it('samedi 26 septembre 2026 est bien un samedi', () => {
    expect(SAT_20_30.getDay()).toBe(6);
  });

  it('est ouverte pendant la fenetre', () => {
    expect(valveOpen(OPEN, SAT_20_30)).toBe(true);
  });

  it('est fermee une minute avant', () => {
    expect(valveOpen(OPEN, SAT_19_59)).toBe(false);
  });

  // La borne haute est EXCLUE : a 21 h pile, c'est fini. Sans le test, un
  // « <= » laisserait la fenetre ouverte une minute de plus chaque semaine.
  it('est fermee a l’heure pile de fin', () => {
    expect(valveOpen(OPEN, SAT_21_00)).toBe(false);
  });

  it('est fermee un autre jour, a la meme heure', () => {
    expect(valveOpen(OPEN, SUN_20_30)).toBe(false);
  });

  it('est fermee quand le reglage est eteint', () => {
    expect(valveOpen({ ...OPEN, on: false }, SAT_20_30)).toBe(false);
  });

  it('est fermee quand rien n’est configure', () => {
    expect(valveOpen(undefined, SAT_20_30)).toBe(false);
  });
});

/*
 * Et les deux copies doivent repondre pareil. C'est le seul test qui protege
 * contre la divergence : corriger une des deux regles sans l'autre le casse.
 */
describe('les deux copies de la regle s’accordent', () => {
  const cases: [string, Valve, Date][] = [
    ['pendant', OPEN, SAT_20_30],
    ['juste avant', OPEN, SAT_19_59],
    ['a la fin pile', OPEN, SAT_21_00],
    ['un autre jour', OPEN, SUN_20_30],
    ['eteinte', { ...OPEN, on: false }, SAT_20_30],
    ['un dimanche configure', { on: true, day: 0, from: 20, to: 21 }, SUN_20_30],
  ];
  for (const [name, v, when] of cases) {
    it(name, () => {
      expect(scriptValve(v, when)).toBe(valveOpen(v, when));
    });
  }
});

/**
 * Le script porte la fenetre, et une valeur par defaut fermee.
 *
 * Un script construit sans soupape doit bloquer : le defaut d'une soupape est
 * d'etre fermee, jamais l'inverse.
 */
describe('le script transporte la soupape', () => {
  it('la pose sur window', () => {
    expect(buildScript('', {}, 'dark', OPEN)).toContain('window.__nrValve');
  });

  it('est fermee par defaut', () => {
    const s = buildScript('', {}, 'dark');
    expect(s).toContain('"on":false');
  });
});
