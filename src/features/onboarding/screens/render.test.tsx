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
import { Attribution, Meet, Prep, Proof, RateAsk } from './extra';
import { Paywall } from './Paywall';
import { AgeAsk, Compare, Guess, RealTime } from './time';
import { LifeYears } from './index';
import { Dopamine, Exploited, LovePage, NothingLands, ReceptorsPage } from './science';
import { PromiseScreen, Welcome } from './setup';
import { Ready } from './ready';
import { DmReel, NotBlocker } from './story';
import { useOnboardingStore } from '@/store/onboarding';

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
  it('la rencontre avec Corti', () => {
    render(<Meet onNext={noop} />);
  });

  it('la preparation du programme', () => {
    const r = render(<Prep onNext={noop} />);
    expect(r.toJSON()).toBeTruthy();
    r.unmount();
  });

  it('la bienvenue', () => {
    const r = render(<Welcome onNext={noop} />);
    expect(r.toJSON()).toBeTruthy();
  });

  it('« tu n’es pas accro »', () => {
    const r = render(<Exploited onNext={noop} />);
    expect(r.toJSON()).toBeTruthy();
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

/*
  Le milieu du parcours, refait : une estimation a la jauge, le vrai chiffre
  recopie, la comparaison, l'analyse, puis une page par idee et le bouton
  qu'on maintient. Huit ecrans nouveaux ou reecrits — chacun est monte, et
  la comparaison l'est dans ses trois verdicts, puisque c'est elle qui
  choisit son titre.
*/
describe('le temps d’ecran, en quatre ecrans', () => {
  it('l’estimation a la jauge', () => { render(<Guess onNext={noop} />); });
  it('le vrai chiffre', () => { render(<RealTime onNext={noop} />); });
  it('l’age', () => { render(<AgeAsk onNext={noop} />); });
  it('les annees qu’il reste', () => { const r = render(<LifeYears onNext={noop} />); r.unmount(); });

  it('la comparaison, dans ses trois verdicts', () => {
    for (const real of [60, 150, 300]) {
      useOnboardingStore.setState({ minutesPerDay: 150, realMinutes: real });
      const r = render(<Compare onNext={noop} />);
      expect(r.toJSON()).toBeTruthy();
      r.unmount();
    }
  });
});

describe('une page par idee', () => {
  it('la dose', () => { render(<Dopamine onNext={noop} />); });
  it('les recepteurs', () => { render(<ReceptorsPage onNext={noop} />); });
  it('plus rien ne fait d’effet', () => { render(<NothingLands onNext={noop} />); });
  it('l’amour', () => { render(<LovePage onNext={noop} />); });
  it('le serment, a signer', () => { render(<PromiseScreen onNext={noop} />); });
  it('« tu es pret ? », a tenir', () => { render(<Ready onNext={noop} />); });
  it('pas un bloqueur de plus', () => { render(<NotBlocker onNext={noop} />); });
  it('le reel envoye par un ami', () => { render(<DmReel onNext={noop} />); });
});
