import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

/** §6 : 20 pt, 24 au-delà de 414 pt de large. */
export const gutter = width >= 414 ? 24 : 20;

export const space = { xs: 4, sm: 8, md: 12, lg: 20, xl: 32, xxl: 48 } as const;

/** §4.4 : des rayons hiérarchisés, jamais un rayon unique partout. */
export const radii = {
  panel: 28,
  tile: 22,
  chip: 14,
  pill: 999,
  phone: 44,
} as const;
