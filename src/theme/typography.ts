import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

/** §4.3 : mise à l'échelle bornée, pour ne casser ni les petits ni les grands écrans. */
export const scale = Math.min(Math.max(width / 390, 0.88), 1.1);

const s = (n: number) => Math.round(n * scale * 10) / 10;

export type TypeStyle = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  fontWeight: '400' | '500' | '600';
  letterSpacing: number;
  fontStyle?: 'italic';
};

/** L'approche est en % dans le brief : on la convertit en points ici. */
const track = (size: number, pct: number) => (size * pct) / 100;

export const type = {
  hero:     { fontFamily: 'GeistSemiBold', fontSize: s(64), lineHeight: s(64) * 1.0,  fontWeight: '600', letterSpacing: track(s(64), -3) },
  displayL: { fontFamily: 'GeistSemiBold', fontSize: s(36), lineHeight: s(36) * 1.12, fontWeight: '600', letterSpacing: track(s(36), -2.5) },
  displayM: { fontFamily: 'GeistSemiBold', fontSize: s(28), lineHeight: s(28) * 1.2,  fontWeight: '600', letterSpacing: track(s(28), -2) },
  title:    { fontFamily: 'GeistMedium',   fontSize: s(19), lineHeight: s(19) * 1.3,  fontWeight: '500', letterSpacing: track(s(19), -1) },
  quote:    { fontFamily: 'Geist',         fontSize: s(19), lineHeight: s(19) * 1.4,  fontWeight: '400', letterSpacing: 0 },
  lead:     { fontFamily: 'Geist',         fontSize: s(17), lineHeight: s(17) * 1.5,  fontWeight: '400', letterSpacing: track(s(17), -0.5) },
  body:     { fontFamily: 'Geist',         fontSize: s(15), lineHeight: s(15) * 1.55, fontWeight: '400', letterSpacing: 0 },
  label:    { fontFamily: 'GeistMedium',   fontSize: s(12), lineHeight: s(12) * 1.35, fontWeight: '500', letterSpacing: track(s(12), 2) },
  button:   { fontFamily: 'GeistSemiBold', fontSize: s(16), lineHeight: s(16),        fontWeight: '600', letterSpacing: 0 },
} satisfies Record<string, TypeStyle>;

export type TypeName = keyof typeof type;

/** §4.3 : 1,15 pour les display, 1,3 pour le corps. */
export const maxFontSizeMultiplier: Record<TypeName, number> = {
  hero: 1.15, displayL: 1.15, displayM: 1.15, title: 1.15, quote: 1.15,
  lead: 1.3, body: 1.3, label: 1.3, button: 1.3,
};
