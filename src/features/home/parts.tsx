import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { colors, withAlpha } from '@/theme/colors';
import { space } from '@/theme/spacing';
import { springs } from '@/theme/motion';
import { haptics } from '@/lib/haptics';
import { Text } from '@/components/type/Text';

export function Card({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[st.card, style]}>{children}</View>;
}

export function Row({
  title, body, right, onPress,
}: { title: string; body?: string; right?: ReactNode; onPress?: () => void }) {
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
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress ? () => { haptics.tap(); onPress(); } : undefined}
      style={[st.pill, muted && st.pillMuted]}
    >
      <Text variant="label" color={muted ? withAlpha(colors.mist, 0.4) : colors.night}>
        {label}
      </Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  card: {
    borderRadius: 18, padding: space.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  track: {
    width: 44, height: 26, borderRadius: 13, padding: 3,
    backgroundColor: colors.surfaceHi,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.lineStrong,
  },
  trackOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  knob: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.mist },
  pill: {
    paddingHorizontal: space.lg, paddingVertical: space.sm, borderRadius: 999,
    backgroundColor: colors.mist,
  },
  pillMuted: { backgroundColor: colors.surfaceHi },
});
