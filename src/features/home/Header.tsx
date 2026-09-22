import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, withAlpha } from '@/theme/colors';
import { gutter, space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { haptics } from '@/lib/haptics';

const MARK = require('@/assets/brand/mark.png');
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
      <Image source={MARK} style={st.mark} contentFit="contain" />

      <Pressable
        style={st.pill}
        onPress={() => { haptics.tap(); onStreak?.(); }}
        accessibilityRole="button"
        accessibilityLabel={`Série de ${streak} jours`}
      >
        <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} />
        <LinearGradient
          colors={[withAlpha(colors.mist, 0.14), withAlpha(colors.accent, 0.08)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Image source={STREAK} style={st.flame} contentFit="contain" />
        <Text variant="title">{streak}</Text>
        <Text variant="label" tone="secondary">jours</Text>
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
  mark: { width: 44, height: 44 },
  pill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, height: 44, borderRadius: 22, overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(colors.mist, 0.2),
  },
  flame: { width: 20, height: 20 },
  profile: { width: 40, height: 40 },
});
