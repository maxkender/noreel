import { useMemo, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';

/**
 * Une maquette d'iPhone, partagee par tous les ecrans de demonstration.
 *
 * Trois ecrans en avaient besoin et chacun redessinait son cadre : les
 * proportions divergeaient d'un ecran a l'autre, ce qui se voit quand on les
 * enchaine. Le rapport 9/19,5 est celui des iPhone a encoche ; l'encoche
 * elle-meme est une pilule, pas un rectangle, sinon l'oeil lit un ecran de
 * veille et non un telephone.
 */
export function PhoneFrame({
  children, width = 240, style, dim = false,
}: {
  children?: ReactNode;
  width?: number;
  style?: StyleProp<ViewStyle>;
  /** Assombrit l'interieur : l'etat « avant », qu'on montre pour le comparer. */
  dim?: boolean;
}) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const height = Math.round(width * (19.5 / 9));
  const radius = Math.round(width * 0.14);

  return (
    <View style={[st.shell, { width, height, borderRadius: radius }, style]}>
      <View style={[st.screen, { borderRadius: radius - 4 }]}>
        {children}
        {dim && <View style={[StyleSheet.absoluteFill, st.dim]} pointerEvents="none" />}
      </View>
      <View style={st.island} pointerEvents="none" />
    </View>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  shell: {
    alignSelf: 'center', padding: 4, overflow: 'hidden',
    backgroundColor: withAlpha(c.mist, 0.1),
    borderWidth: 1, borderColor: withAlpha(c.mist, 0.16),
    shadowColor: c.shadowTint, shadowOpacity: c.shadowAlpha,
    shadowRadius: 22, shadowOffset: { width: 0, height: 10 },
  },
  screen: { flex: 1, overflow: 'hidden', backgroundColor: c.night },
  dim: { backgroundColor: withAlpha(c.night, 0.55) },
  // L'ilot dynamique : une pilule, jamais un rectangle.
  island: {
    position: 'absolute', top: 12, alignSelf: 'center',
    width: 58, height: 17, borderRadius: 9,
    backgroundColor: '#000000',
  },
});
