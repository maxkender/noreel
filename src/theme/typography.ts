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
  hero:     { fontFamily: 'Newsreader',       fontSize: s(96), lineHeight: s(96) * 0.95, fontWeight: '500', letterSpacing: track(s(96), -2) },
  displayL: { fontFamily: 'Newsreader',       fontSize: s(44), lineHeight: s(44) * 1.02, fontWeight: '500', letterSpacing: track(s(44), -1.5) },
  displayM: { fontFamily: 'Newsreader',       fontSize: s(34), lineHeight: s(34) * 1.08, fontWeight: '500', letterSpacing: track(s(34), -1) },
  title:    { fontFamily: 'Newsreader',       fontSize: s(24), lineHeight: s(24) * 1.15, fontWeight: '500', letterSpacing: 0 },
  quote:    { fontFamily: 'NewsreaderItalic', fontSize: s(26), lineHeight: s(26) * 1.25, fontWeight: '400', letterSpacing: 0, fontStyle: 'italic' },
  lead:     { fontFamily: 'Geist',            fontSize: s(19), lineHeight: s(19) * 1.45, fontWeight: '400', letterSpacing: 0 },
  body:     { fontFamily: 'Geist',            fontSize: s(16), lineHeight: s(16) * 1.5,  fontWeight: '400', letterSpacing: 0 },
  label:    { fontFamily: 'GeistMedium',      fontSize: s(13), lineHeight: s(13) * 1.3,  fontWeight: '500', letterSpacing: track(s(13), 1) },
  button:   { fontFamily: 'GeistSemiBold',    fontSize: s(17), lineHeight: s(17),        fontWeight: '600', letterSpacing: 0 },
} satisfies Record<string, TypeStyle>;

export type TypeName = keyof typeof type;

/** §4.3 : 1,15 pour les display, 1,3 pour le corps. */
export const maxFontSizeMultiplier: Record<TypeName, number> = {
  hero: 1.15, displayL: 1.15, displayM: 1.15, title: 1.15, quote: 1.15,
  lead: 1.3, body: 1.3, label: 1.3, button: 1.3,
};
