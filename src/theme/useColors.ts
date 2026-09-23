import { useColorScheme } from 'react-native';
import { useSettings } from '@/store/settings';
import { palettes, type Palette, type ThemeName } from './palettes';

export type { Palette, ThemeName };

/**
 * Le jeu de couleurs actif.
 *
 * `system` suit le reglage du telephone ; les deux autres l'imposent. Le
 * resultat est un objet stable par theme, donc utilisable comme dependance
 * de useMemo sans recalculer les styles a chaque rendu.
 */
/** Le ton du flou : sombre sur fond sombre, clair sur fond clair. */
export function useBlurTint(): 'dark' | 'light' {
  const theme = useSettings((s) => s.theme);
  const system = useColorScheme();
  const name = theme === 'system' ? (system === 'light' ? 'light' : 'dark') : theme;
  return name === 'light' ? 'light' : 'dark';
}

export function useColors(): Palette {
  const theme = useSettings((s) => s.theme);
  const system = useColorScheme();
  const name = theme === 'system' ? (system === 'light' ? 'light' : 'dark') : theme;
  return palettes[name];
}
