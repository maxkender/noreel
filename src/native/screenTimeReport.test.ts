/**
 * Le rapport natif, la ou il n'existe pas.
 *
 * Dans les tests, dans Expo Go et dans tout binaire construit sans le flag,
 * il n'y a ni extension ni vue. Le code qui les appelle doit alors rendre la
 * main SANS lever — c'est ce qui laisse le parcours prendre l'autre chemin,
 * la saisie depuis Reglages, au lieu de tomber au premier ecran.
 */
import { prepareReport, reportAvailable } from './screenTimeReport';

jest.mock('react-native-device-activity', () => ({}));

it('dit non quand rien n’est construit', () => {
  expect(reportAvailable()).toBe(false);
});

it('ne leve pas quand le stockage partage manque', () => {
  // La bibliotheque est absente : userDefaultsSet n'existe pas. On avale,
  // parce qu'un rapport dessine avec ses valeurs de secours vaut mieux
  // qu'un ecran qui leve.
  expect(() => prepareReport(150, { lessTitle: 'x' }, {
    accent: '#000', danger: '#000', good: '#000', ink: '#fff', inkSoft: '#999',
  })).not.toThrow();
});
