/**
 * L'ecran client, monte pour chacune des quatre apps.
 *
 * C'est le fichier que j'ai le plus modifie : couleur du bandeau prise sur le
 * site, plafond du jour en gratuit, bandeau de la fenetre, compteur sur le mur.
 * Chacune de ces choses se lit au rendu.
 */
/*
 * Les imports sont en tete, les mocks apres : babel-jest hisse les appels a
 * jest.mock au-dessus des imports de toute facon, donc l'ordre ecrit ici ne
 * change rien a l'execution — et un fichier se lit mieux avec ses imports
 * groupes en haut.
 */
import { render } from '@testing-library/react-native';
import { ClientScreen } from './ClientScreen';
import { CLIENTS, type ClientId } from './blockers';

/*
 * Une fausse WebView qui expose les methodes qu'on lui appelle.
 * Une simple View ne suffit pas : l'ecran pousse ses reglages dans la page par
 * `injectJavaScript` des le montage, et une vue nue n'a pas cette methode — le
 * test tombait sur mon propre faux, pas sur un defaut de l'ecran.
 */
jest.mock('react-native-webview', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  const WebView = React.forwardRef(function WebView(props: object, ref: object) {
    React.useImperativeHandle(ref, () => ({
      injectJavaScript: jest.fn(),
      reload: jest.fn(),
      goBack: jest.fn(),
      goForward: jest.fn(),
    }));
    return React.createElement(View, props);
  });
  return { WebView };
});
jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: { configure: jest.fn(), setLogLevel: jest.fn() },
  LOG_LEVEL: { WARN: 'WARN' },
}));
jest.mock('react-native-device-activity', () => ({}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => false }),
  useFocusEffect: jest.fn(),
}));


describe('l’ecran client se monte', () => {
  for (const id of Object.keys(CLIENTS) as ClientId[]) {
    it(id, () => {
      const r = render(<ClientScreen id={id} />);
      expect(r.toJSON()).toBeTruthy();
    });
  }
});

/*
 * Et la couleur du bandeau doit exister pour les quatre.
 * Elle est relevee a la main sur chaque site ; une app ajoutee sans sa couleur
 * rendrait un bandeau transparent, ce qui ne se voit qu'a l'oeil.
 */
describe('chaque app a la couleur de son site', () => {
  for (const id of Object.keys(CLIENTS) as ClientId[]) {
    it(id, () => {
      const chrome = CLIENTS[id].chrome;
      expect(chrome.dark).toMatch(/^#[0-9A-F]{6}$/i);
      expect(chrome.light).toMatch(/^#[0-9A-F]{6}$/i);
    });
  }
});
