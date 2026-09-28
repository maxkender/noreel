/**
 * L'onglet qui EXPLIQUE le pourcentage.
 *
 * Le chiffre etait affiche a trois endroits sans qu'on dise nulle part ce
 * qu'il mesure ni comment il bouge. Un pourcentage sans regle se lit soit
 * comme un verdict, soit comme une decoration — dans les deux cas on cesse de
 * le regarder, et le jour ou il DESCEND c'est l'app qu'on soupconne.
 */
import { render, screen, waitFor } from '@testing-library/react-native';
import { CortiTab } from './CortiTab';
import { dict } from '@/i18n';

jest.mock('react-native-device-activity', () => ({}));
jest.mock('expo-router', () => ({ useFocusEffect: (fn: () => void) => fn() }));

const mockClaim = jest.fn((_n: number) => Promise.resolve(false));
jest.mock('@/services/cheer', () => ({ claimCheer: (n: number) => mockClaim(n) }));

const noop = (() => {}) as never;

it('donne la regle en entier, malus compris', () => {
  render(<CortiTab onScroll={noop} />);

  // Ce qui le fait monter.
  expect(screen.getByText(dict.cortiTab.upL)).toBeTruthy();
  expect(screen.getByText(dict.cortiTab.upV)).toBeTruthy();

  /*
    Et surtout ce qui le fait DESCENDRE. Les cacher rendrait la jauge
    incomprehensible le jour ou elle baisse, et c'est precisement le jour ou
    il ne faut pas laisser croire que le chiffre est arbitraire.
  */
  expect(screen.getByText(dict.cortiTab.rawL)).toBeTruthy();
  expect(screen.getByText(dict.cortiTab.rawV)).toBeTruthy();
  expect(screen.getByText(dict.cortiTab.passL)).toBeTruthy();
  expect(screen.getByText(dict.cortiTab.passV)).toBeTruthy();
});

it('dit que ce n’est pas une mesure du cerveau', () => {
  // Un pourcentage affiche a cote d'un cerveau se lit comme une mesure du
  // cerveau. Ce n'en est pas une, et le taire serait le laisser croire.
  render(<CortiTab onScroll={noop} />);
  expect(screen.getByText(dict.cortiTab.honestTitle)).toBeTruthy();
  expect(screen.getByText(dict.cortiTab.honestB)).toBeTruthy();
});

it('montre les quatre etats et le depart a 18', () => {
  render(<CortiTab onScroll={noop} />);
  for (const s of [dict.cortiTab.s0, dict.cortiTab.s1, dict.cortiTab.s2, dict.cortiTab.s3]) {
    expect(screen.getByText(s)).toBeTruthy();
  }
  // Sans registre, l'indice vaut son point de depart — pas zero.
  expect(screen.getByText('18 %')).toBeTruthy();
});

/*
  Ce qui a SUIVI Corti sur cet onglet.

  La carte de l'onglet blocage portait sa soucoupe, sa phrase, la celebration
  des paliers et les trois chiffres qui justifient l'abonnement. En deplacant
  Corti ici j'ai retire cette carte — et tout ce qu'elle portait a disparu de
  l'app sans qu'aucun test ne bronche : l'animation de six secondes du studio,
  trois megaoctets et demi embarques, n'etait plus atteignable nulle part.
  Ces tests-la sont ce qui rend la suppression sure.
*/
describe('ce qui a suivi Corti', () => {
  // Les chiffres viennent du disque : ils n'existent qu'au second rendu.
  it('garde les chiffres qui justifient l’abonnement', async () => {
    render(<CortiTab onScroll={noop} />);
    expect(await screen.findByText(dict.stats.reelsAvoided)).toBeTruthy();
    expect(screen.getByText(dict.stats.timeBack)).toBeTruthy();
    expect(screen.getByText(dict.stats.daysKept)).toBeTruthy();
  });

  it('demande encore la celebration des paliers', async () => {
    // Sans cet appel, le septieme et le trentieme jour ne se fetent plus, et
    // le fichier anime du studio ne sert plus a rien dans le paquet.
    render(<CortiTab onScroll={noop} />);
    await waitFor(() => expect(mockClaim).toHaveBeenCalled());
  });
});

describe('reparer l’indice', () => {
  it('propose des gestes, et dit qu’on te croit sur parole', () => {
    /*
      L'indice ne descendait que par des malus et ne montait qu'en attendant
      le lendemain : aucune prise dans l'instant, donc un compteur qu'on
      regarde une fois. Et comme rien de tout cela n'est verifiable, la page
      doit l'ecrire — un chiffre qui prend ta parole sans le dire est un
      chiffre que personne ne peut contester.
    */
    render(<CortiTab onScroll={noop} />);
    expect(screen.getByText(dict.cortiTab.careTitle)).toBeTruthy();
    expect(screen.getByText(dict.cortiTab.water)).toBeTruthy();
    expect(screen.getByText(dict.cortiTab.move)).toBeTruthy();
    expect(screen.getByText(dict.cortiTab.careBody)).toBeTruthy();
  });

  it('explique l’indice en une phrase avant le detail', () => {
    // Le tableau chiffre repondait a « comment » avant qu'on ait compris
    // « quoi ».
    render(<CortiTab onScroll={noop} />);
    expect(screen.getByText(dict.cortiTab.plainBody)).toBeTruthy();
  });
});
