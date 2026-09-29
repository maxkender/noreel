/**
 * L'onglet qui dit UNE chose par bloc.
 *
 * Il expliquait tout — la regle chiffree, les etats, la pause, ce que ce
 * n'est pas — et on ne comprenait rien. Il montre maintenant Corti, le
 * chiffre, une phrase et le geste du jour ; la regle entiere attend derriere
 * « comment ca marche ? », malus compris, parce que la cacher rendrait la
 * jauge incomprehensible le jour ou elle descend.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { CortiTab } from './CortiTab';
import { dict } from '@/i18n';

jest.mock('react-native-device-activity', () => ({}));
jest.mock('expo-router', () => ({ useFocusEffect: (fn: () => void) => fn() }));

const mockClaim = jest.fn((_n: number) => Promise.resolve(false));
jest.mock('@/services/cheer', () => ({ claimCheer: (n: number) => mockClaim(n) }));

const noop = (() => {}) as never;

it('montre le chiffre et une seule phrase', () => {
  render(<CortiTab onScroll={noop} />);
  // Sans registre, l'indice vaut son point de depart — pas zero.
  expect(screen.getByText('18 %')).toBeTruthy();
  expect(screen.getByText(dict.cortiTab.oneLine)).toBeTruthy();
  // Le detail n'est PAS sur la page.
  expect(screen.queryByText(dict.cortiTab.honestB)).toBeNull();
  expect(screen.queryByText(dict.cortiTab.upB)).toBeNull();
});

it('garde la regle entiere, malus compris, derriere « comment ca marche »', () => {
  render(<CortiTab onScroll={noop} />);
  fireEvent.press(screen.getByText(dict.cortiTab.how));
  for (const title of [
    dict.cortiTab.plainTitle, dict.cortiTab.howTitle, dict.cortiTab.statesTitle,
    dict.cortiTab.careTitle, dict.cortiTab.honestTitle,
  ]) {
    expect(screen.getByText(title)).toBeTruthy();
  }
  // Ce qui le fait DESCENDRE est ecrit, avec le chiffre.
  fireEvent.press(screen.getByText(dict.cortiTab.howTitle));
  expect(screen.getByText(new RegExp(dict.cortiTab.rawV))).toBeTruthy();
  expect(screen.getByText(new RegExp(dict.cortiTab.passV))).toBeTruthy();
});

/*
  Ce qui a SUIVI Corti sur cet onglet : sa soucoupe, sa phrase, la
  celebration des paliers et les trois chiffres qui justifient l'abonnement.
  Ces tests-la sont ce qui rend chaque simplification sure.
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
    render(<CortiTab onScroll={noop} />);
    await waitFor(() => expect(mockClaim).toHaveBeenCalled());
  });
});

describe('reparer l’indice', () => {
  it('propose UN geste, et les autres sur demande', () => {
    render(<CortiTab onScroll={noop} />);
    expect(screen.getByText(dict.cortiTab.todayTitle)).toBeTruthy();
    expect(screen.getByText(dict.cortiTab.careShort)).toBeTruthy();
    expect(screen.getByText(dict.cortiTab.todayPick)).toBeTruthy();
    // Un seul geste visible : les huit autres attendent derriere une ligne.
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
    fireEvent.press(screen.getByText(dict.cortiTab.more));
    expect(screen.getAllByRole('checkbox')).toHaveLength(9);
    // Chaque geste porte sa RAISON : c'est elle qui fait qu'on le choisit.
    expect(screen.getByText(dict.cortiTab.focusT)).toBeTruthy();
    expect(screen.getByText(dict.cortiTab.focusW)).toBeTruthy();
  });
});
