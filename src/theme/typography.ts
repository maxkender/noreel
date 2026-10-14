import { Dimensions, Platform } from 'react-native';

const { width } = Dimensions.get('window');

/** §4.3 : mise à l'échelle bornée, pour ne casser ni les petits ni les grands écrans. */
export const scale = Math.min(Math.max(width / 390, 0.88), 1.1);

const s = (n: number) => Math.round(n * scale * 10) / 10;

/*
 * LA POLICE DU SYSTEME, comme Opal.
 *
 * Poppins faisait « app de demo » : ronde, large, partout la meme voix.
 * San Francisco (Roboto sur Android) est ce que lit l'oeil toute la journee
 * sur son telephone, donc ce qui parait serieux. La hierarchie vient des
 * graisses et d'un approche legerement resserre sur les grands titres.
 */
export type Weight = '400' | '500' | '600' | '700';
const FAMILY = Platform.OS === 'ios' ? 'System' : undefined;

/** Les anciens noms de police, devenus des graisses du systeme. */
export const font = (name: 'Sans' | 'SansMedium' | 'SansSemi' | 'SansBold') => ({
  fontFamily: FAMILY,
  fontWeight: ({ Sans: '400', SansMedium: '500', SansSemi: '600', SansBold: '700' } as const)[name],
});

export type TypeStyle = {
  fontFamily?: string;
  fontWeight: Weight;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  fontStyle?: 'italic';
};

/** L'approche est en % dans le brief : on la convertit en points ici. */
const track = (size: number, pct: number) => (size * pct) / 100;

export const type = {
  hero:     { fontFamily: FAMILY, fontWeight: '700', fontSize: s(44), lineHeight: s(44) * 1.12, letterSpacing: track(s(44), -2) },
  displayL: { fontFamily: FAMILY, fontWeight: '700', fontSize: s(30), lineHeight: s(30) * 1.2,  letterSpacing: track(s(30), -1.2) },
  displayM: { fontFamily: FAMILY, fontWeight: '600', fontSize: s(24), lineHeight: s(24) * 1.25, letterSpacing: track(s(24), -0.8) },
  title:    { fontFamily: FAMILY, fontWeight: '600', fontSize: s(18), lineHeight: s(18) * 1.3,  letterSpacing: track(s(18), -0.3) },
  quote:    { fontFamily: FAMILY, fontWeight: '400', fontSize: s(18), lineHeight: s(18) * 1.4,  letterSpacing: 0 },
  lead:     { fontFamily: FAMILY, fontWeight: '400', fontSize: s(17), lineHeight: s(17) * 1.4,  letterSpacing: 0 },
  body:     { fontFamily: FAMILY, fontWeight: '400', fontSize: s(16), lineHeight: s(16) * 1.4,  letterSpacing: 0 },
  label:    { fontFamily: FAMILY, fontWeight: '500', fontSize: s(13), lineHeight: s(13) * 1.35, letterSpacing: 0 },
  button:   { fontFamily: FAMILY, fontWeight: '600', fontSize: s(17), lineHeight: s(17) * 1.25, letterSpacing: 0 },
} satisfies Record<string, TypeStyle>;

export type TypeName = keyof typeof type;

/** §4.3 : 1,15 pour les display, 1,3 pour le corps. */
export const maxFontSizeMultiplier: Record<TypeName, number> = {
  hero: 1.15, displayL: 1.15, displayM: 1.15, title: 1.15, quote: 1.15,
  lead: 1.3, body: 1.3, label: 1.3, button: 1.3,
};
