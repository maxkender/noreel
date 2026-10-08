import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Lock } from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { dict } from '@/i18n';
import { useColors, type Palette } from '@/theme/useColors';
import { Text } from '@/components/type/Text';

/**
 * Ce qui ne se debranche pas ne se presente pas comme un interrupteur.
 *
 * Les regles verrouillees — les Reels, l'Explorer, « Pour toi » — avaient
 * la forme d'un interrupteur allume mais refusaient d'etre bascules. On
 * appuyait, rien ne bougeait, et rien ne disait pourquoi : la meme forme
 * promettait un choix qui n'existait pas. Un cadenas ne promet rien.
 */
export function LockedPill(
  { onPress, label = dict.ui.always }: { onPress?: () => void; label?: string } = {}
) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  // Sans destination, ce n'est pas un bouton : le cadenas explique, il
  // n'emmene nulle part.
  const Wrap: React.ElementType = onPress ? Pressable : View;
  return (
    <Wrap
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={st.pill}
      accessibilityLabel={dict.ui.always}
    >
      <Lock size={11} strokeWidth={2.4} color={withAlpha(c.mist, 0.5)} />
      <Text variant="label" tone="tertiary">{label}</Text>
    </Wrap>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999,
    backgroundColor: withAlpha(c.mist, 0.07),
  },
});
