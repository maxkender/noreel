import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, withAlpha } from '@/theme/colors';
import { gutter, space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { haptics } from '@/lib/haptics';

const LOCKUP = require('@/assets/brand/lockup.png');
const STREAK = require('@/assets/brand/streak.png');
const PROFILE = require('@/assets/brand/profile.png');

/**
 * En-tete epinglee : elle ne defile jamais. Marque a gauche, serie au
 * centre, profil a droite — les trois en PNG, comme demande.
 */
export function Header({
  streak, onProfile, onStreak,
}: { streak: number; onProfile: () => void; onStreak?: () => void }) {
  return (
    <View style={st.root}>
      <Image source={LOCKUP} style={st.lockup} contentFit="contain" />

      <View style={{ flex: 1 }} />

      <Pressable
        style={st.pill}
        onPress={() => { haptics.tap(); onStreak?.(); }}
        accessibilityRole="button"
        accessibilityLabel={`Série de ${streak} jours`}
      >
        <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} />
        <LinearGradient
          colors={[withAlpha(colors.accent, 0.14), withAlpha(colors.accentWarm, 0.1)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Image source={STREAK} style={st.flame} contentFit="contain" />
        <Text variant="label">{streak}</Text>
      </Pressable>

      <Pressable onPress={() => { haptics.tap(); onProfile(); }} hitSlop={10}>
        <Image source={PROFILE} style={st.profile} contentFit="contain" />
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  root: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    paddingHorizontal: gutter, paddingBottom: space.sm,
  },
  // Ratio du fichier : 1024 x 389. A 26 pt de haut, le mot reste lisible.
  lockup: { width: 106, height: 40 },
  // Compacte : la serie est une information, pas un bouton d'action.
  pill: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, height: 30, paddingHorizontal: 10, borderRadius: 15, overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(colors.mist, 0.18),
  },
  flame: { width: 14, height: 14 },
  profile: { width: 40, height: 40 },
});
