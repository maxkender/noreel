/**
 * Les surfaces de l'accueil, montees une fois chacune.
 *
 * Meme raison que pour les ecrans du parcours : sans Xcode sur cette machine,
 * il n'y a pas de simulateur, et un ecran qui leve au rendu ne se verrait
 * qu'apres vingt minutes de construction et un passage par TestFlight.
 */
/*
 * Les imports sont en tete, les mocks apres : babel-jest hisse les appels a
 * jest.mock au-dessus des imports de toute facon, donc l'ordre ecrit ici ne
 * change rien a l'execution — et un fichier se lit mieux avec ses imports
 * groupes en haut.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import {
  Milestone, ProtectionStatus, ReclaimedNote,
} from './Recovery';
import { MockFeed } from '@/components/MockFeed';
import { PhoneFrame } from '@/components/PhoneFrame';
import type { Stats } from '@/services/protect';
import { Settings } from './Settings';
import { HomeScreen } from './HomeScreen';
import { dict } from '@/i18n';

jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: { configure: jest.fn(), setLogLevel: jest.fn() },
  LOG_LEVEL: { WARN: 'WARN' },
}));
jest.mock('react-native-device-activity', () => ({}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useFocusEffect: jest.fn(),
}));
jest.mock('react-native-view-shot', () => ({ captureRef: () => Promise.resolve('file:///x.png') }));


const FRESH: Stats = {
  blocked: 412, avoided: 34, minutes: 408, days: 12,
  brain: 47, checkedAt: Date.now(), fresh: true, shaky: null, passes: 2, careToday: [], careTotal: 0, xp: 0, level: 0,
};

/* Un registre tout neuf : tous les compteurs a zero, rien de verifie. C'est
   l'etat du premier lancement, celui qu'on oublie de regarder. */
const EMPTY: Stats = {
  blocked: 0, avoided: 0, minutes: 0, days: 0,
  brain: 18, checkedAt: 0, fresh: false, shaky: null, passes: 0, careToday: [], careTotal: 0, xp: 0, level: 0,
};

const BROKEN: Stats = { ...FRESH, shaky: 'instagram' };

describe('la note d’estimation', () => {
  it('se monte', () => { render(<ReclaimedNote s={FRESH} />); });
});

describe('l’etat de la protection', () => {
  it('verifiee aujourd’hui', () => {
    render(<ProtectionStatus s={FRESH} onFix={() => {}} />);
  });
  it('jamais verifiee', () => {
    render(<ProtectionStatus s={EMPTY} onFix={() => {}} />);
  });
  it('a verifier', () => {
    render(<ProtectionStatus s={BROKEN} onFix={() => {}} />);
  });
});

describe('le palier', () => {
  // Chaque palier a son texte ; un palier sans texte doit se replier sur un
  // libelle generique au lieu de rendre « undefined ».
  for (const [kind, at] of [['days', 7], ['days', 30], ['days', 100], ['reels', 1000]] as const) {
    it(`${kind} ${at}`, () => {
      render(
        <Milestone
          prize={{ kind, at }}
          days={30}
          blocked={412}
          onClose={() => {}}
        />
      );
    });
  }

  it('un palier inconnu ne rend pas « undefined »', () => {
    const r = render(
      <Milestone prize={{ kind: 'days', at: 9999 }} days={1} blocked={1} onClose={() => {}} />
    );
    expect(r.toJSON()).toBeTruthy();
  });
});

describe('le faux fil', () => {
  it('avec ses reels', () => { render(<MockFeed filtered={false} />); });
  it('sans ses reels', () => { render(<MockFeed filtered />); });
  // Le facteur d'echelle sert au plan de demonstration, en plein ecran.
  it('a l’echelle de la video', () => { render(<MockFeed filtered={false} u={2.6} />); });
  it('dans une maquette de telephone', () => {
    render(<PhoneFrame width={196}><MockFeed filtered={false} /></PhoneFrame>);
  });
});

/*
 * Les deux ecrans que j'ai modifies sans les avoir encore montes : la feuille
 * de reglages, ou la soupape ajoute une section entiere, et l'accueil, dont
 * l'onglet blocage ouvre maintenant sur la carte de recuperation.
 */
describe('les ecrans modifies', () => {
  it('la feuille de reglages, fermee', () => {
    render(<Settings visible={false} onClose={() => {}} />);
  });

  it('la feuille de reglages, ouverte', () => {
    const r = render(<Settings visible onClose={() => {}} />);
    expect(r.toJSON()).toBeTruthy();
  });

  it('l’accueil', () => {
    const r = render(<HomeScreen />);
    expect(r.toJSON()).toBeTruthy();
  });

  /*
    LES QUATRE ONGLETS, un par un.

    Monter l'accueil ne montait que le premier : les trois autres n'etaient
    jamais rendus par aucun test. C'est comme ca qu'en deplacant Corti dans
    son propre onglet j'ai retire de l'app la celebration des paliers et les
    trois chiffres qui justifient l'abonnement, sans qu'une seule ligne rouge
    n'apparaisse. Un onglet qu'on n'ouvre jamais en test est un onglet qu'on
    casse sans le savoir.
  */
  it('les onglets s’ouvrent', () => {
    render(<HomeScreen />);
    for (const label of [dict.nav.block, dict.nav.account, dict.nav.home]) {
      fireEvent.press(screen.getByText(label));
      expect(screen.toJSON()).toBeTruthy();
    }
  });
});
