/*
 * Ce que tout test a besoin de trouver en place.
 *
 * Les modules natifs n'existent pas sous Jest : AsyncStorage y rend « null »
 * et n'importe quel ecran qui lit un reglage tombe a l'import, avant le premier
 * rendu. Le paquet fournit son propre faux, en memoire — on le pose ici plutot
 * que dans chaque fichier.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

/*
 * Le magasin de cookies est natif lui aussi : sous Jest il n'existe pas, et
 * le service des comptes tombe a l'import. Un faux vide, en memoire.
 */
jest.mock('@react-native-cookies/cookies', () => ({
  __esModule: true,
  default: {
    get: () => Promise.resolve({}),
    getAll: () => Promise.resolve({}),
    set: () => Promise.resolve(true),
    clearAll: () => Promise.resolve(true),
    clearByName: () => Promise.resolve(true),
  },
}));
