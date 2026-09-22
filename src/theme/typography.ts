import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

/** §4.3 : mise à l'échelle bornée, pour ne casser ni les petits ni les grands écrans. */
export const scale = Math.min(Math.max(width / 390, 0.88), 1.1);

const s = (n: number) => Math.round(n * scale * 10) / 10;

/**
 * Pas de `fontWeight` ici, volontairement : chaque graisse est une police
 * chargee a part (Sans, SansMedium, SansSemi, SansBold). Poser les deux fait
 * resoudre iOS vers une fonte systeme — c'est ce qui faisait reapparaitre
 * du San Francisco au milieu du Poppins.
 */
export type TypeStyle = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  fontStyle?: 'italic';
};

/** L'approche est en % dans le brief : on la convertit en points ici. */
const track = (size: number, pct: number) => (size * pct) / 100;

export const type = {
  hero:     { fontFamily: 'SansBold',   fontSize: s(52), lineHeight: s(52) * 1.14, letterSpacing: track(s(52), -2) },
  displayL: { fontFamily: 'SansBold',   fontSize: s(32), lineHeight: s(32) * 1.28, letterSpacing: track(s(32), -1.5) },
  displayM: { fontFamily: 'SansBold',   fontSize: s(26), lineHeight: s(26) * 1.32, letterSpacing: track(s(26), -1) },
  title:    { fontFamily: 'SansSemi',   fontSize: s(18), lineHeight: s(18) * 1.38, letterSpacing: 0 },
  quote:    { fontFamily: 'Sans',       fontSize: s(18), lineHeight: s(18) * 1.45, letterSpacing: 0 },
  lead:     { fontFamily: 'Sans',       fontSize: s(16), lineHeight: s(16) * 1.5,  letterSpacing: 0 },
  body:     { fontFamily: 'Sans',       fontSize: s(15), lineHeight: s(15) * 1.55, letterSpacing: 0 },
  label:    { fontFamily: 'SansMedium', fontSize: s(12), lineHeight: s(12) * 1.45, letterSpacing: track(s(12), 1.5) },
  // 1,3 et pas 1,0 : a hauteur de ligne egale a la taille, Poppins perd ses
  // jambages et le libelle paraissait rogne en bas.
  button:   { fontFamily: 'SansSemi',   fontSize: s(16), lineHeight: s(16) * 1.3,  letterSpacing: 0 },
} satisfies Record<string, TypeStyle>;

export type TypeName = keyof typeof type;

/** §4.3 : 1,15 pour les display, 1,3 pour le corps. */
export const maxFontSizeMultiplier: Record<TypeName, number> = {
  hero: 1.15, displayL: 1.15, displayM: 1.15, title: 1.15, quote: 1.15,
  lead: 1.3, body: 1.3, label: 1.3, button: 1.3,
};
