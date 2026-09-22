import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

/** §4.3 : mise à l'échelle bornée, pour ne casser ni les petits ni les grands écrans. */
export const scale = Math.min(Math.max(width / 390, 0.88), 1.1);

const s = (n: number) => Math.round(n * scale * 10) / 10;

export type TypeStyle = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  fontWeight: '400' | '500' | '600' | '700';
  letterSpacing: number;
  fontStyle?: 'italic';
};

/** L'approche est en % dans le brief : on la convertit en points ici. */
const track = (size: number, pct: number) => (size * pct) / 100;

export const type = {
  hero:     { fontFamily: 'SansBold', fontSize: s(52), lineHeight: s(52) * 1.1,  fontWeight: '700', letterSpacing: track(s(52), -2) },
  displayL: { fontFamily: 'SansBold', fontSize: s(32), lineHeight: s(32) * 1.25, fontWeight: '700', letterSpacing: track(s(32), -1.5) },
  displayM: { fontFamily: 'SansBold', fontSize: s(26), lineHeight: s(26) * 1.3,  fontWeight: '700', letterSpacing: track(s(26), -1) },
  title:    { fontFamily: 'SansSemi', fontSize: s(18), lineHeight: s(18) * 1.35, fontWeight: '600', letterSpacing: 0 },
  quote:    { fontFamily: 'Sans',     fontSize: s(18), lineHeight: s(18) * 1.45, fontWeight: '400', letterSpacing: 0 },
  lead:     { fontFamily: 'Sans',     fontSize: s(16), lineHeight: s(16) * 1.5,  fontWeight: '400', letterSpacing: 0 },
  body:     { fontFamily: 'Sans',     fontSize: s(15), lineHeight: s(15) * 1.55, fontWeight: '400', letterSpacing: 0 },
  label:    { fontFamily: 'SansMedium', fontSize: s(12), lineHeight: s(12) * 1.4, fontWeight: '500', letterSpacing: track(s(12), 1.5) },
  button:   { fontFamily: 'SansSemi', fontSize: s(16), lineHeight: s(16),        fontWeight: '600', letterSpacing: 0 },
} satisfies Record<string, TypeStyle>;

export type TypeName = keyof typeof type;

/** §4.3 : 1,15 pour les display, 1,3 pour le corps. */
export const maxFontSizeMultiplier: Record<TypeName, number> = {
  hero: 1.15, displayL: 1.15, displayM: 1.15, title: 1.15, quote: 1.15,
  lead: 1.3, body: 1.3, label: 1.3, button: 1.3,
};
