/**
 * Ces ecrans ne sont pas verifies : ils sont MONTES.
 *
 * Cette machine n'a que les outils en ligne de commande d'Xcode, pas Xcode :
 * aucun simulateur, donc aucun moyen de lancer l'app avant de la construire.
 * TypeScript attrape les noms, le linter attrape les hooks, mais ni l'un ni
 * l'autre n'attrape une valeur de style que React Native refuse, un composant
 * qui lit une propriete absente, ou un rendu qui leve. Monter chaque ecran une
 * fois coute une seconde et remplace l'aller-retour de vingt minutes par
 * TestFlight.
 */
/*
 * Les imports sont en tete, les mocks apres : babel-jest hisse les appels a
 * jest.mock au-dessus des imports de toute facon, donc l'ordre ecrit ici ne
 * change rien a l'execution — et un fichier se lit mieux avec ses imports
 * groupes en haut.
 */
import { render } from '@testing-library/react-native';
import { Attribution, Commit, Proof, RateAsk, Reveal } from './extra';
import { Paywall } from './Paywall';

// Le magasin d'Apple n'existe pas dans un test : sans offre, les ecrans
// doivent afficher leurs prix de secours et non tomber.
jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: { configure: jest.fn(), setLogLevel: jest.fn() },
  LOG_LEVEL: { WARN: 'WARN' },
}));

jest.mock('expo-store-review', () => ({
  hasAction: () => Promise.resolve(false),
  requestReview: () => Promise.resolve(),
  isAvailableAsync: () => Promise.resolve(false),
}));

jest.mock('react-native-device-activity', () => ({}));


const noop = () => {};

describe('les ecrans du parcours se montent', () => {
  it('le chiffre retourne', () => {
    render(<Reveal onNext={noop} onBack={noop} />);
  });

  it('la demonstration', () => {
    render(<Proof onNext={noop} />);
  });

  it('l’attribution', () => {
    render(<Attribution onNext={noop} />);
  });

  it('les etoiles', () => {
    render(<RateAsk onNext={noop} />);
  });

  it('l’engagement en pleine couleur', () => {
    render(<Commit onNext={noop} />);
  });

  /*
    Le paywall dans ses deux etats.
    C'est l'ecran qui a le plus de raisons de tomber : il lit le magasin, choisit
    un forfait, et change de bloc selon le forfait choisi. Le delai de sortie a
    zero est celui du paywall ouvert depuis un cadenas.
  */
  it('le paywall du parcours', () => {
    render(<Paywall onDone={noop} />);
  });

  it('le paywall ouvert depuis un cadenas', () => {
    render(<Paywall onDone={noop} exitDelay={0} />);
  });
});
