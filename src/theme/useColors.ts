import { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { useSettings } from '@/store/settings';
import { palettes, type Palette, type ThemeName } from './palettes';

export type { Palette, ThemeName };

/**
 * Un theme impose a une branche de l'arbre, quoi qu'ait choisi l'utilisateur.
 *
 * L'onboarding s'en sert pour rester sombre : c'est une scene DESSINEE en
 * sombre — halo, poussiere lumineuse, verre qui capte la lumiere. Repeinte
 * en clair, chacun de ces elements s'inverse en salissure. Le reste de
 * l'app, lui, suit le reglage.
 */
export const ForcedTheme = createContext<'light' | 'dark' | null>(null);

/** Le theme reellement affiche ici : celui impose, sinon celui choisi. */
export function useResolvedTheme(): 'light' | 'dark' {
  const forced = useContext(ForcedTheme);
  const theme = useSettings((s) => s.theme);
  const system = useColorScheme();
  if (forced) return forced;
  if (theme === 'system') return system === 'light' ? 'light' : 'dark';
  return theme;
}

/** Le ton du flou : sombre sur fond sombre, clair sur fond clair. */
export function useBlurTint(): 'dark' | 'light' {
  return useResolvedTheme();
}

/**
 * Le jeu de couleurs actif.
 *
 * Le resultat est un objet stable par theme, donc utilisable comme
 * dependance de useMemo sans recalculer les styles a chaque rendu.
 */
export function useColors(): Palette {
  return palettes[useResolvedTheme()];
}
