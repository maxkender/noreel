import AsyncStorage from '@react-native-async-storage/async-storage';
import { __resetCheer, claimCheer } from './cheer';

beforeEach(async () => { await AsyncStorage.clear(); __resetCheer(); });

it('ne celebre que le septieme jour et le trentieme', async () => {
  // Les niveaux 0 et 1 changent tous les jours ou presque : une celebration
  // qui revient sans arret n'en est plus une.
  expect(await claimCheer(0)).toBe(false);
  expect(await claimCheer(1)).toBe(false);
});

it('ne celebre chaque palier qu’une seule fois', async () => {
  expect(await claimCheer(2)).toBe(true);
  expect(await claimCheer(2)).toBe(false);
  expect(await claimCheer(3)).toBe(true);
  expect(await claimCheer(3)).toBe(false);
});

it('resiste a deux demandes lancees ensemble', async () => {
  /*
    Lire puis ecrire prend deux tours de boucle : sans verrou synchrone, deux
    appels simultanes lisent tous les deux « rien de celebre ». React monte
    les effets deux fois en developpement, donc ce cas arrive pour de vrai.
  */
  const r = await Promise.all([claimCheer(2), claimCheer(2), claimCheer(2)]);
  expect(r.filter(Boolean)).toHaveLength(1);
});

it('se souvient d’une session a l’autre', async () => {
  expect(await claimCheer(3)).toBe(true);
  __resetCheer(); // l'app redemarre : le verrou de session disparait
  expect(await claimCheer(3)).toBe(false);
});
