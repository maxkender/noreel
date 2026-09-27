/**
 * Le plan de demonstration, monte une fois : c'est lui qu'on filme.
 *
 * Ce fichier ne peut PAS vivre a cote de son sujet, dans src/app.
 * Expo Router decouvre les routes avec un require.context sur ce dossier : il
 * y prend tout, y compris un fichier de test, qui entraine alors
 * @testing-library/react-native puis les modules de Node dans le paquet de
 * l'app. La construction a echoue sur exactement ca, a l'etape d'empaquetage —
 * apres trois minutes d'attente et sans autre message qu'« erreur inconnue ».
 * C'est la raison d'etre de la regle du projet : rien d'autre que des routes
 * dans src/app.
 */
/*
 * Les imports sont en tete, les mocks apres : babel-jest hisse les appels a
 * jest.mock au-dessus des imports de toute facon, donc l'ordre ecrit ici ne
 * change rien a l'execution — et un fichier se lit mieux avec ses imports
 * groupes en haut.
 */
import { render } from '@testing-library/react-native';
import Demo from './app/demo';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn() }) }));


it('le plan de demonstration se monte', () => {
  const r = render(<Demo />);
  expect(r.toJSON()).toBeTruthy();
});
