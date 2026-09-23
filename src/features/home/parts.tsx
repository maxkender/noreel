import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { space } from '@/theme/spacing';
import { springs } from '@/theme/motion';
import { haptics } from '@/lib/haptics';
import { Text } from '@/components/type/Text';
import { Glass } from '@/components/glass/Glass';

/** Toutes les cartes sont en verre : c'est la matiere de l'app. */
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  return (
    <Glass radius={20} intensity={45} warmEdge="none" style={[st.card, style]}>
      {children}
    </Glass>
  );
}

export function Row({
  title, body, right, onPress,
}: { title: string; body?: string; right?: ReactNode; onPress?: () => void }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const Wrap: React.ElementType = onPress ? Pressable : View;
  return (
    <Wrap
      onPress={onPress ? () => { haptics.tap(); onPress(); } : undefined}
      style={st.row}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="body">{title}</Text>
        {body && <Text variant="label" tone="secondary">{body}</Text>}
      </View>
      {right}
    </Wrap>
  );
}

/** Interrupteur maison : le pouce glisse au ressort, pas en saut. */
export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const x = useSharedValue(on ? 18 : 0);
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      onPress={() => {
        const next = !on;
        x.value = withSpring(next ? 18 : 0, springs.snappy);
        haptics.tick();
        onChange(next);
      }}
      style={[st.track, on && st.trackOn]}
    >
      <Animated.View style={[st.knob, knob]} />
    </Pressable>
  );
}

export function Pill({ label, onPress, muted }: { label: string; onPress?: () => void; muted?: boolean }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress ? () => { haptics.tap(); onPress(); } : undefined}
      style={[st.pill, muted && st.pillMuted]}
    >
      <Text
        variant="label"
        numberOfLines={1}
        color={muted ? withAlpha(c.mist, 0.4) : c.night}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  card: { padding: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  track: {
    width: 44, height: 26, borderRadius: 13, padding: 3,
    backgroundColor: c.surfaceHi,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.lineStrong,
  },
  trackOn: { backgroundColor: c.accent, borderColor: c.accent },
  knob: { width: 20, height: 20, borderRadius: 10, backgroundColor: c.mist },
  pill: {
    paddingHorizontal: space.lg, paddingVertical: space.sm, borderRadius: 999,
    backgroundColor: c.mist,
  },
  pillMuted: { backgroundColor: c.surfaceHi },
});
