/**
 * Le registre de la protection : ses comptes portent les chiffres qu'on
 * affiche, et une erreur dedans ne se voit pas — elle donne juste un nombre
 * legerement faux, tous les jours, sur l'ecran qu'on relit avant de renouveler.
 */

// L'import est en tete : babel-jest hisse les appels a jest.mock au-dessus
// des imports de toute facon, donc l'ordre ecrit ici ne change rien a
// l'execution — et un fichier se lit mieux avec ses imports en haut.
import { brainIndex, careScore } from './protect';

// Un disque en memoire. Le vrai module n'a rien a faire ici : on teste le
// comptage, pas la persistance d'AsyncStorage.
// Le prefixe « mock » est impose par Jest : une fabrique de mock ne peut
// referencer que des variables ainsi nommees, pour eviter qu'elle capture
// quelque chose qui n'est pas encore initialise.
const mockDisk = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (k: string) => Promise.resolve(mockDisk.get(k) ?? null),
    setItem: (k: string, v: string) => { mockDisk.set(k, v); return Promise.resolve(); },
    removeItem: (k: string) => { mockDisk.delete(k); return Promise.resolve(); },
  },
}));

// On ne veut pas envoyer de notification depuis un test.
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: () => Promise.resolve({ granted: false }),
  scheduleNotificationAsync: () => Promise.resolve('x'),
}));

/*
 * Le module est RECHARGE a chaque test.
 * Le registre garde une copie en memoire pour ne pas relire le disque a chaque
 * appel ; sans rechargement, cette copie traverserait les tests et le
 * troisieme compterait les reels du premier. `import()` dynamique n'est pas
 * disponible dans cet environnement, d'ou le require.
 */
const load = (): typeof import('./protect') =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('./protect') as typeof import('./protect');

describe('l’indice de recuperation', () => {
  // Il part de 18 et non de 0 : un premier jour n'est pas un cerveau eteint,
  // et un compteur qui demarre a zero se lit comme un verdict.
  it('ne part pas de zero', () => {
    expect(brainIndex(0, 0)).toBe(18);
  });

  it('monte avec les jours proteges', () => {
    expect(brainIndex(10, 0)).toBeGreaterThan(brainIndex(5, 0));
  });

  it('descend avec les jours passes sans filtre', () => {
    expect(brainIndex(10, 2)).toBeLessThan(brainIndex(10, 0));
  });

  // Les bornes tiennent : un anneau ne peut pas depasser son tour, ni afficher
  // un nombre negatif.
  it('ne depasse jamais cent', () => {
    expect(brainIndex(400, 0)).toBe(100);
  });

  it('ne descend jamais sous zero', () => {
    expect(brainIndex(0, 40)).toBe(0);
  });

  /*
    Un mois de protection doit suffire a arriver en haut.
    C'est le seul reglage de cette formule qui se ressent : trop lent, l'anneau
    ne bouge jamais et ne veut plus rien dire ; trop rapide, il est plein au
    bout d'une semaine et ne dit plus rien non plus.
  */
  it('arrive en haut apres environ un mois', () => {
    expect(brainIndex(34, 0)).toBeGreaterThanOrEqual(99);
    expect(brainIndex(20, 0)).toBeLessThan(90);
  });
});

describe('le registre', () => {
  beforeEach(() => { mockDisk.clear(); jest.resetModules(); });

  it('numerote chaque reel referme', async () => {
    const { countBlocked } = load();
    expect(await countBlocked()).toBe(1);
    expect(await countBlocked()).toBe(2);
    expect(await countBlocked()).toBe(3);
  });

  /*
    Trois demi-tours sur une meme page valent UNE seance evitee.
    Le detecteur peut repartir trois fois de suite ; comptees separement, ces
    trois sorties auraient fait trente-six minutes « reprises » pour un seul
    reel ouvert. Le temps affiche aurait grossi tout seul.
  */
  it('ne compte qu’une seance evitee pour une rafale', async () => {
    const { countBlocked, stats } = load();
    await countBlocked();
    await countBlocked();
    await countBlocked();
    const s = await stats();
    expect(s.blocked).toBe(3);
    expect(s.avoided).toBe(1);
    expect(s.minutes).toBe(12);
  });

  it('marque le jour une seule fois', async () => {
    const { markDay, stats } = load();
    await markDay();
    await markDay();
    expect((await stats()).days).toBe(1);
  });

  /*
    Un chargement muet ne prouve rien — une page peut etre vide. Trois
    d'affilee, et le filtre est a verifier. Et une seule prise remet le
    compteur a zero.
  */
  it('ne s’alarme qu’au troisieme chargement muet', async () => {
    const { reportRules, stats } = load();
    await reportRules('instagram', 0);
    await reportRules('instagram', 0);
    expect((await stats()).shaky).toBeNull();
    await reportRules('instagram', 0);
    expect((await stats()).shaky).toBe('instagram');
    await reportRules('instagram', 4);
    expect((await stats()).shaky).toBeNull();
  });

  it('marque la derniere verification quand une regle mord', async () => {
    const { reportRules, stats } = load();
    expect((await stats()).fresh).toBe(false);
    await reportRules('instagram', 2);
    expect((await stats()).fresh).toBe(true);
  });
});

describe('les paliers', () => {
  beforeEach(() => { mockDisk.clear(); jest.resetModules(); });

  it('ne se declenche pas avant son seuil', async () => {
    const { markDay, claimMilestone } = load();
    await markDay();
    expect(await claimMilestone()).toBeNull();
  });

  it('ne se feter qu’une fois', async () => {
    const { countBlocked, claimMilestone } = load();
    for (let i = 0; i < 1000; i += 1) await countBlocked();
    expect(await claimMilestone()).toMatchObject({ id: 'reels:1000' });
    expect(await claimMilestone()).toBeNull();
  });

  /*
    Plusieurs paliers franchis d'un coup ne font qu'UNE felicitation, la plus
    haute. Sans ca, quelqu'un qui revient apres deux mois verrait defiler sept
    jours, puis trente, puis cent, l'un apres l'autre a chaque ouverture.
  */
  it('rend le plus haut et efface les autres', async () => {
    /*
      On pose cent jours proteges d'un coup, ce qui franchit sept, trente et
      cent a la fois. La premiere version de ce test n'en franchissait qu'un
      seul : elle passait, sans jamais verifier ce que le commentaire promet.
    */
    const days: Record<string, 1> = {};
    for (let i = 0; i < 100; i += 1) {
      const d = new Date(2026, 0, 1 + i);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days[k] = 1;
    }
    mockDisk.set('unswipe.protect.v1', JSON.stringify({ days }));

    const { claimMilestone } = load();
    expect(await claimMilestone()).toMatchObject({ id: 'days:100' });
    // Sept et trente ont ete marques au passage : sans ca, ils ressortiraient
    // un a un aux ouvertures suivantes.
    expect(await claimMilestone()).toBeNull();
  });
});

/*
 * Les gestes declares.
 *
 * On ne peut RIEN verifier : aucun telephone ne sait si quelqu'un a bu un
 * verre d'eau. D'ou deux garde-fous — un point chacun, trois par jour au plus
 * — sans lesquels l'indice se remplirait en martelant une liste, et ne
 * voudrait plus rien dire.
 */
describe('les gestes du jour', () => {
  it('vaut un point chacun', () => {
    expect(brainIndex(0, 0, 0, 0)).toBe(18);
    expect(brainIndex(0, 0, 0, 3)).toBe(21);
  });

  it('en compte trois par jour au plus', () => {
    // Sept gestes le meme jour valent trois : au-dela, le quatrieme ne change
    // plus rien a ce qu'on veut mesurer.
    expect(careScore({ '2026-01-01': ['a', 'b', 'c', 'd', 'e', 'f', 'g'] })).toBe(3);
  });

  it('additionne les journees', () => {
    expect(careScore({
      '2026-01-01': ['a', 'b'],
      '2026-01-02': ['a', 'b', 'c', 'd'],
    })).toBe(5);
  });

  it('ne fait pas exploser l’indice', () => {
    // Trente jours au plafond ajoutent quatre-vingt-dix : l'indice est borne
    // a cent, donc les gestes seuls ne peuvent pas simuler un mois protege
    // sans que les jours suivent.
    expect(brainIndex(0, 0, 0, careScore(
      Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`d${i}`, ['a', 'b', 'c']]))
    ))).toBe(100);
  });
});
