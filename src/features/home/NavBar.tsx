import { useEffect, useMemo } from 'react';
import { I18nManager, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming,
} from 'react-native-reanimated';
import type { LucideIcon } from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { useBlurTint, useColors, type Palette } from '@/theme/useColors';
import { gutter, space } from '@/theme/spacing';
import { haptics } from '@/lib/haptics';
import { Text } from '@/components/type/Text';
import { useAnchor } from './anchors';

// iOS : une barre basse et serree, collee au bas de l'ecran, comme Opal.
const IOS = Platform.OS === 'ios';
const PAD = IOS ? 3 : 6;
// Sortie douce, sans depassement : rien ne rebondit.
const EASE = Easing.bezier(0.22, 1, 0.36, 1);
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
  const c = useColors();
  const tint = useBlurTint();
  const st = useMemo(() => sheet(c), [c]);
  const { width } = useWindowDimensions();
  const inner = width - gutter * 2 - PAD * 2;
  const cell = inner / tabs.length;
  const index = Math.max(0, tabs.findIndex(([k]) => k === value));

  const x = useSharedValue(index * cell);
  const pop = useSharedValue(0);

  useEffect(() => {
    // Courbes, pas ressorts : un ressort depasse sa cible puis revient, et
    // c'est ce rebond qu'on voyait a chaque changement d'onglet.
    x.value = withTiming(index * cell, { duration: 260, easing: EASE });
    pop.value = withSequence(
      withTiming(1, { duration: 130, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 220, easing: Easing.inOut(Easing.quad) })
    );
  }, [index, cell, x, pop]);

  const pill = useAnimatedStyle(() => ({
    width: cell,
    transform: [
      // De droite a gauche, la pastille part de la droite : le glissement s'inverse.
      { translateX: x.value * (I18nManager.isRTL ? -1 : 1) },
      { scaleX: 1 + pop.value * 0.06 },
      { scaleY: 1 + pop.value * 0.12 },
    ],
  }));
  const halo = useAnimatedStyle(() => ({ opacity: pop.value * 0.55 }));
  // La barre entiere : la visite guidee s'arrete au-dessus d'elle.
  const frame = useAnchor('frame-bottom');

  return (
    <View ref={frame} collapsable={false} style={st.wrap} pointerEvents="box-none">
      <View style={st.bar}>
        <BlurView intensity={100} tint={tint} style={StyleSheet.absoluteFill} />
        <LinearGradient
          colors={[withAlpha(c.mist, 0.16), withAlpha(c.mist, 0.05)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        {/* Reflet haut : c'est lui qui donne l'epaisseur du verre. */}
        <LinearGradient
          colors={['transparent', withAlpha(c.mist, 0.5), 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={st.sheen}
          pointerEvents="none"
        />

        {/* La pastille suit l'onglet : elle est sous les icones. */}
        <Animated.View style={[st.pill, pill]} pointerEvents="none">
          <LinearGradient
            colors={[withAlpha(c.accent, 0.3), withAlpha(c.accentWarm, 0.16)]}
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
            anchor={`nav-${key}`}
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
  anchor, label, Icon, active, onPress,
}: { anchor: string; label: string; Icon: LucideIcon; active: boolean; onPress: () => void }) {
  const ref = useAnchor(anchor);
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const press = useSharedValue(0);
  const on = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    on.value = withTiming(active ? 1 : 0, { duration: 200, easing: EASE });
  }, [active, on]);

  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: (1 - press.value * 0.12) * (1 + on.value * 0.08) }],
  }));

  return (
    <Pressable
      ref={ref}
      collapsable={false}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPressIn={() => { press.value = withTiming(1, { duration: 90 }); }}
      onPressOut={() => { press.value = withTiming(0, { duration: 160, easing: EASE }); }}
      onPress={onPress}
      style={st.tab}
    >
      <AIcon style={anim}>
        <Icon
          size={IOS ? 19 : 21}
          strokeWidth={active ? 2.2 : 1.8}
          color={active ? c.accent : withAlpha(c.mist, 0.45)}
        />
      </AIcon>
      <Text variant="label" color={active ? c.accent : withAlpha(c.mist, 0.45)} style={IOS ? { fontSize: 10, lineHeight: 12 } : undefined}>
        {label}
      </Text>
    </Pressable>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  wrap: { position: 'absolute', left: gutter, right: gutter, bottom: IOS ? 18 : 28 },
  bar: {
    flexDirection: 'row', borderRadius: IOS ? 24 : 28, overflow: 'hidden', padding: PAD,
    borderWidth: 1, borderColor: withAlpha(c.mist, 0.32),
    shadowColor: '#000', shadowOpacity: 0.7, shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 }, elevation: 20,
  },
  sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: 1.5 },
  pill: {
    position: 'absolute', top: PAD, bottom: PAD, left: PAD,
    borderRadius: IOS ? 21 : 22, overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(c.accent, 0.4),
  },
  flash: { backgroundColor: withAlpha(c.mist, 0.3) },
  tab: { flex: 1, alignItems: 'center', gap: IOS ? 1 : 4, paddingVertical: IOS ? 5 : space.sm },
});
