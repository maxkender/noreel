import { useMemo, useEffect, useRef, useState } from 'react';
import { font } from '@/theme/typography';
import { Keyboard, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  useAnimatedStyle, useSharedValue, withSpring,
} from 'react-native-reanimated';
import { withAlpha } from '@/theme/colors';
import { dict } from '@/i18n';
import { useColors, type Palette } from '@/theme/useColors';
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
  age, onChange, onReady,
}: { age: number; onChange: (v: number) => void; onReady?: (ok: boolean) => void }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  // Vides au depart : afficher un age par defaut, c'est repondre a la place
  // de l'utilisateur.
  const [d, setD] = useState<[string, string]>(['', '']);
  const [focus, setFocus] = useState(0);

  const second = useRef<TextInput>(null);
  const first = useRef<TextInput>(null);

  // Le clavier arrive apres la transition d'ecran, pas pendant.
  useEffect(() => {
    const id = setTimeout(() => first.current?.focus(), 420);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const n = parseInt(d[0] + d[1], 10);
    const ok = !Number.isNaN(n) && n >= MIN && n <= MAX;
    onReady?.(ok);
    if (ok && n !== age) onChange(n);
  }, [d, age, onChange, onReady]);

  const set = (i: 0 | 1, raw: string) => {
    const c = raw.replace(/\D/g, '').slice(-1);
    const next: [string, string] = [...d] as [string, string];
    next[i] = c;
    setD(next);
    if (c && i === 0) { second.current?.focus(); setFocus(1); }
    // Deuxieme chiffre pose : le clavier se retire pour laisser voir le
    // bouton, sans avancer d'office — une faute de frappe doit rester
    // corrigeable.
    if (c && i === 1) { Keyboard.dismiss(); setFocus(-1); }
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
      <Text variant="label" tone="tertiary" style={st.hint}>{dict.ui.yearsUnit}</Text>
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
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const on = useSharedValue(active ? 1 : 0);
  useEffect(() => { on.value = withSpring(active ? 1 : 0, springs.snappy); }, [active, on]);

  // Aucune couleur animee : le liseré actif est un calque qu'on allume.
  // Animer borderColor faisait quitter l'app a l'arrivee sur cet ecran.
  const shell = useAnimatedStyle(() => ({ transform: [{ scale: 1 + on.value * 0.03 }] }));
  const lit = useAnimatedStyle(() => ({ opacity: on.value }));

  return (
    <Pressable onPress={() => innerRef.current?.focus()}>
      <Animated.View style={[st.cell, shell]}>
        <Animated.View style={[st.ring, lit]} pointerEvents="none" />
        <TextInput
          ref={innerRef}
          value={value}
          onChangeText={onChange}
          onFocus={onFocus}
          onKeyPress={(e) => { if (e.nativeEvent.key === 'Backspace') onBack(); }}
          keyboardType="number-pad"
          maxLength={1}
          selectionColor={c.accent}
          style={st.input}
        />
      </Animated.View>
    </Pressable>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  root: { alignItems: 'center', gap: space.md },
  row: { flexDirection: 'row', gap: space.md },
  cell: {
    width: 68, height: 84, borderRadius: 18, overflow: 'hidden',
    borderWidth: 1.5, borderColor: withAlpha(c.mist, 0.16),
    alignItems: 'center', justifyContent: 'center',
  },
  ring: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 18, borderWidth: 1.5, borderColor: withAlpha(c.accent, 0.7),
  },
  input: {
    width: '100%', height: '100%', textAlign: 'center',
    ...font('SansBold'), fontSize: 38, color: c.mist,
  },
  hint: { letterSpacing: 3 },
});
