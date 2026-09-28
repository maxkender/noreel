/**
 * L'onglet qui EXPLIQUE le pourcentage.
 *
 * Le chiffre etait affiche a trois endroits sans qu'on dise nulle part ce
 * qu'il mesure ni comment il bouge. Un pourcentage sans regle se lit soit
 * comme un verdict, soit comme une decoration — dans les deux cas on cesse de
 * le regarder, et le jour ou il DESCEND c'est l'app qu'on soupconne.
 */
import { render, screen } from '@testing-library/react-native';
import { CortiTab } from './CortiTab';
import { dict } from '@/i18n';

jest.mock('react-native-device-activity', () => ({}));
jest.mock('expo-router', () => ({ useFocusEffect: (fn: () => void) => fn() }));

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
