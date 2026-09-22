import { useEffect } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import type { LucideIcon } from 'lucide-react-native';
import { colors, withAlpha } from '@/theme/colors';
import { gutter, space } from '@/theme/spacing';
import { springs } from '@/theme/motion';
import { haptics } from '@/lib/haptics';
import { Text } from '@/components/type/Text';

const PAD = 6;
const AIcon = Animated.createAnimatedComponent(View);

/**
 * Barre flottante en verre. Une pastille glisse sous l'onglet actif au
 * ressort, l'icone s'enfonce sous le doigt et se releve : le changement se
 * voit et se sent, au lieu d'un simple changement de couleur.
 */
export function NavBar<T extends string>({
  tabs, value, onChange,
}: {
  tabs: [T, string, LucideIcon][];
  value: T;
  onChange: (v: T) => void;
}) {
  const { width } = useWindowDimensions();
  const inner = width - gutter * 2 - PAD * 2;
  const cell = inner / tabs.length;
  const index = Math.max(0, tabs.findIndex(([k]) => k === value));

  const x = useSharedValue(index * cell);
  const pop = useSharedValue(0);

  useEffect(() => {
    x.value = withSpring(index * cell, springs.gentle);
    // La pastille gonfle puis se repose : le changement de page se voit.
    pop.value = withSequence(
      withTiming(1, { duration: 160, easing: Easing.out(Easing.quad) }),
      withSpring(0, springs.bouncy)
    );
  }, [index, cell, x, pop]);

  const pill = useAnimatedStyle(() => ({
    width: cell,
    transform: [
      { translateX: x.value },
      { scaleX: 1 + pop.value * 0.06 },
      { scaleY: 1 + pop.value * 0.12 },
    ],
  }));
  const halo = useAnimatedStyle(() => ({ opacity: pop.value * 0.55 }));

  return (
    <View style={st.wrap} pointerEvents="box-none">
      <View style={st.bar}>
        <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
        <LinearGradient
          colors={[withAlpha(colors.mist, 0.16), withAlpha(colors.mist, 0.05)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        {/* Reflet haut : c'est lui qui donne l'epaisseur du verre. */}
        <LinearGradient
          colors={['transparent', withAlpha(colors.mist, 0.5), 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={st.sheen}
          pointerEvents="none"
        />

        {/* La pastille suit l'onglet : elle est sous les icones. */}
        <Animated.View style={[st.pill, pill]} pointerEvents="none">
          <LinearGradient
            colors={[withAlpha(colors.accent, 0.3), withAlpha(colors.accentWarm, 0.16)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Eclat bref au moment du changement. */}
          <Animated.View style={[StyleSheet.absoluteFill, st.flash, halo]} />
        </Animated.View>

        {tabs.map(([key, label, Icon]) => (
          <Tab
            key={key}
            label={label}
            Icon={Icon}
            active={key === value}
            onPress={() => { haptics.tap(); onChange(key); }}
          />
        ))}
      </View>
    </View>
  );
}

function Tab({
  label, Icon, active, onPress,
}: { label: string; Icon: LucideIcon; active: boolean; onPress: () => void }) {
  const press = useSharedValue(0);
  const on = useSharedValue(active ? 1 : 0);

  useEffect(() => { on.value = withSpring(active ? 1 : 0, springs.snappy); }, [active, on]);

  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: (1 - press.value * 0.12) * (1 + on.value * 0.08) }],
  }));

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPressIn={() => { press.value = withTiming(1, { duration: 90 }); }}
      onPressOut={() => { press.value = withSpring(0, springs.snappy); }}
      onPress={onPress}
      style={st.tab}
    >
      <AIcon style={anim}>
        <Icon
          size={21}
          strokeWidth={active ? 2.2 : 1.8}
          color={active ? colors.accent : withAlpha(colors.mist, 0.45)}
        />
      </AIcon>
      <Text variant="label" color={active ? colors.accent : withAlpha(colors.mist, 0.45)}>
        {label}
      </Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  wrap: { position: 'absolute', left: gutter, right: gutter, bottom: 28 },
  bar: {
    flexDirection: 'row', borderRadius: 28, overflow: 'hidden', padding: PAD,
    borderWidth: 1, borderColor: withAlpha(colors.mist, 0.32),
    shadowColor: '#000', shadowOpacity: 0.7, shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 }, elevation: 20,
  },
  sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: 1.5 },
  pill: {
    position: 'absolute', top: PAD, bottom: PAD, left: PAD,
    borderRadius: 22, overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(colors.accent, 0.4),
  },
  flash: { backgroundColor: withAlpha(colors.mist, 0.3) },
  tab: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: space.sm },
});
