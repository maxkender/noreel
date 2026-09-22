import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle, useSharedValue, withSpring,
} from 'react-native-reanimated';
import { colors, withAlpha } from '@/theme/colors';
import { space } from '@/theme/spacing';
import { springs } from '@/theme/motion';
import { haptics } from '@/lib/haptics';
import { Text } from '@/components/type/Text';

const MIN = 10, MAX = 99;

/**
 * Deux cases, un chiffre chacune. La reglette qui defilait demandait un
 * geste precis pour une valeur que tout le monde connait par coeur : on la
 * tape, c'est tout.
 */
export function AgeInput({
  age, onChange,
}: { age: number; onChange: (v: number) => void }) {
  const init = String(Math.min(MAX, Math.max(MIN, age))).padStart(2, '0');
  const [d, setD] = useState<[string, string]>([init[0], init[1]]);
  const [focus, setFocus] = useState(0);
  const second = useRef<TextInput>(null);
  const first = useRef<TextInput>(null);

  useEffect(() => {
    const n = parseInt(d[0] + d[1], 10);
    if (!Number.isNaN(n) && n >= MIN && n <= MAX && n !== age) onChange(n);
  }, [d, age, onChange]);

  const set = (i: 0 | 1, raw: string) => {
    const c = raw.replace(/\D/g, '').slice(-1);
    const next: [string, string] = [...d] as [string, string];
    next[i] = c;
    setD(next);
    if (c && i === 0) { second.current?.focus(); setFocus(1); }
    haptics.tick();
  };

  return (
    <View style={st.root}>
      <View style={st.row}>
        {[0, 1].map((i) => (
          <Cell
            key={i}
            value={d[i]}
            active={focus === i}
            innerRef={i === 0 ? first : second}
            onFocus={() => setFocus(i)}
            onChange={(v) => set(i as 0 | 1, v)}
            onBack={() => {
              if (!d[i] && i === 1) { first.current?.focus(); setFocus(0); }
            }}
          />
        ))}
      </View>
      <Text variant="label" tone="tertiary" style={st.hint}>ANS</Text>
    </View>
  );
}

function Cell({
  value, active, innerRef, onFocus, onChange, onBack,
}: {
  value: string;
  active: boolean;
  innerRef: React.RefObject<TextInput | null>;
  onFocus: () => void;
  onChange: (v: string) => void;
  onBack: () => void;
}) {
  const on = useSharedValue(active ? 1 : 0);
  useEffect(() => { on.value = withSpring(active ? 1 : 0, springs.snappy); }, [active, on]);

  const shell = useAnimatedStyle(() => ({
    borderColor: active ? withAlpha(colors.accent, 0.7) : withAlpha(colors.mist, 0.14),
    transform: [{ scale: 1 + on.value * 0.03 }],
  }));
  const glow = useAnimatedStyle(() => ({ opacity: on.value * 0.5 }));

  return (
    <Pressable onPress={() => innerRef.current?.focus()}>
      <Animated.View style={[st.cell, shell]}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={st.cellTint} />
        <Animated.View style={[st.glow, glow]} pointerEvents="none" />
        <TextInput
          ref={innerRef}
          value={value}
          onChangeText={onChange}
          onFocus={onFocus}
          onKeyPress={(e) => { if (e.nativeEvent.key === 'Backspace') onBack(); }}
          keyboardType="number-pad"
          maxLength={1}
          selectionColor={colors.accent}
          style={st.input}
        />
      </Animated.View>
    </Pressable>
  );
}

const st = StyleSheet.create({
  root: { alignItems: 'center', gap: space.md },
  row: { flexDirection: 'row', gap: space.md },
  cell: {
    width: 92, height: 116, borderRadius: 24, overflow: 'hidden',
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
  },
  cellTint: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: withAlpha(colors.mist, 0.05),
  },
  glow: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: withAlpha(colors.accent, 0.14),
  },
  input: {
    width: '100%', height: '100%', textAlign: 'center',
    fontFamily: 'SansBold', fontSize: 52, color: colors.mist,
  },
  hint: { letterSpacing: 3 },
});
