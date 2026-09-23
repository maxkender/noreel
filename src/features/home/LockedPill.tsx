import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Lock } from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
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
export function LockedPill() {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  return (
    <View style={st.pill} accessibilityLabel="Toujours actif, non modifiable">
      <Lock size={11} strokeWidth={2.4} color={withAlpha(c.mist, 0.5)} />
      <Text variant="label" tone="tertiary">Toujours</Text>
    </View>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999,
    backgroundColor: withAlpha(c.mist, 0.07),
  },
});
