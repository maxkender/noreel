/** Le plan de demonstration, monte une fois : c'est lui qu'on filme. */
/*
 * Les imports sont en tete, les mocks apres : babel-jest hisse les appels a
 * jest.mock au-dessus des imports de toute facon, donc l'ordre ecrit ici ne
 * change rien a l'execution — et un fichier se lit mieux avec ses imports
 * groupes en haut.
 */
import { render } from '@testing-library/react-native';
import Demo from './demo';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn() }) }));


it('le plan de demonstration se monte', () => {
  const r = render(<Demo />);
  expect(r.toJSON()).toBeTruthy();
});
