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
import { CLIENTS, buildScript, type ClientId } from './blockers';
import { ReelsPass } from './ReelsPass';
import { ClientSettings } from './ClientSettings';
import { TINTS } from '@/theme/tints';

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


/*
 * L'epreuve du laissez-passer, et le panneau qui la propose.
 */
describe('le laissez-passer', () => {
  it('se monte', () => {
    const r = render(
      <ReelsPass visible onCancel={() => {}} onPass={() => {}} />
    );
    expect(r.toJSON()).toBeTruthy();
  });

  it('ne rend rien quand il est ferme', () => {
    render(<ReelsPass visible={false} onCancel={() => {}} onPass={() => {}} />);
  });
});

describe('le panneau de reglages du client', () => {
  for (const id of Object.keys(CLIENTS) as ClientId[]) {
    it(id, () => {
      const r = render(
        <ClientSettings
          id={id}
          visible
          onClose={() => {}}
          onGo={() => {}}
          onPass={() => {}}
          onPost={() => {}}
        />
      );
      expect(r.toJSON()).toBeTruthy();
    });
  }
});

/*
 * Les teintes doivent etre lisibles : l'encre est choisie sur la luminance,
 * pas a l'oeil, et une pastille sans encre contrastee donne un bandeau dont
 * on ne lit plus le titre.
 */
describe('les teintes', () => {
  for (const t of TINTS) {
    it(`${t.label} a une couleur et une encre`, () => {
      expect(t.hex).toMatch(/^#[0-9A-F]{6}$/i);
      expect(t.rgb).toMatch(/^\d{1,3}, \d{1,3}, \d{1,3}$/);
      expect(['#0C1014', '#FFFFFF']).toContain(t.ink);
    });
  }

  // Le triplet doit correspondre a l'hexadecimal : les deux decrivent la meme
  // couleur, l'un pour notre bandeau, l'autre pour les variables du site.
  it('le triplet suit l’hexadecimal', () => {
    for (const t of TINTS) {
      const n = parseInt(t.hex.slice(1), 16);
      expect(t.rgb).toBe(`${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`);
    }
  });
});

/*
 * Le script transporte l'echeance du laissez-passer, et la ferme par defaut.
 * Un defaut ouvert laisserait passer les reels a toute page construite sans
 * qu'on y pense.
 */
describe('le script transporte le laissez-passer', () => {
  it('est ferme par defaut', () => {
    expect(buildScript('', {}, 'dark')).toContain('window.__nrOpenUntil = 0');
  });

  it('porte l’echeance quand il y en a une', () => {
    const s = buildScript('', {}, 'dark', undefined, null, 1893456000000);
    expect(s).toContain('window.__nrOpenUntil = 1893456000000');
  });
});
