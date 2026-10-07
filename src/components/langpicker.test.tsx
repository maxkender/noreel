/**
 * Le choix de la langue change toute l'app sur-le-champ : le dictionnaire,
 * les ecrans qui passent par `useT`, et ce que les fonctions hors React lisent.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { dict, useT } from '@/i18n';
import { de } from '@/i18n/de';
import { fr } from '@/i18n/fr';
import { formatHours, lang } from '@/lib/format';
import { useLang } from '@/store/lang';
import { LangPicker } from './LangPicker';

function Probe() {
  const { d } = useT();
  return <Text>{d.tuto.skip}</Text>;
}

afterEach(() => { useLang.getState().set('fr'); });

it('bascule la langue partout, tout de suite', () => {
  useLang.getState().set('fr');
  render(<><LangPicker /><Probe /></>);
  expect(screen.getByText(fr.tuto.skip)).toBeTruthy();
  fireEvent.press(screen.getByTestId('lang-de'));
  expect(screen.getByText(de.tuto.skip)).toBeTruthy();
  expect(dict.tuto.skip).toBe(de.tuto.skip);
  expect(lang).toBe('de');
  expect(formatHours(195)).toBe('3 Std. 15 Min.');
});

it('propose les six langues, dans leur propre langue', () => {
  render(<LangPicker />);
  for (const name of ['English', 'Français', 'Deutsch', 'Türkçe', 'Italiano', 'Español']) {
    expect(screen.getByText(name)).toBeTruthy();
  }
});
