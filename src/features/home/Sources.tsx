import { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { withAlpha } from '@/theme/colors';
import { useBlurTint, useColors, type Palette } from '@/theme/useColors';
import { gutter, space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { haptics } from '@/lib/haptics';
import { dict, useT } from '@/i18n';
import { LIFE_YEARS, WAKING_HOURS } from '@/features/onboarding/calculations';

/* La CITATION ne se traduit pas — auteurs, revue, annee, pages sont la
   reference elle-meme. Seuls le titre et le resume passent au dictionnaire. */
const REFS = [
  { t: dict.refs.r1t, d: dict.refs.r1d,
    a: 'Fisher, Aron & Brown — Journal of Comparative Neurology, 2005, 493(1), 58-62' },
  { t: dict.refs.r2t, d: dict.refs.r2d,
    a: 'Volkow, Fowler, Wang, Swanson & Telang — Archives of Neurology, 2007, 64(11), 1575-1579' },
  { t: dict.refs.r3t, d: dict.refs.r3d,
    a: 'Volkow et coll. — Neuropharmacology, 2009, 56 (suppl. 1), 3-8' },
];

/*
 * Ce que ces travaux disent — et ce qu'ils ne disent pas.
 *
 * Ils portent sur la dependance et sur des stimulations intenses, pas sur
 * les videos courtes. Le rapprochement que fait cette app est une
 * INFERENCE, pas un resultat demontre. Une app qui parle du cerveau de
 * quelqu'un lui doit cette distinction : sans elle, on emprunte l'autorite
 * d'une science sans en accepter les limites.
 */
const CAVEAT = dict.refs.caveat;

/**
 * Sources et methode.
 *
 * Une app qui avance des chiffres sur le cerveau doit pouvoir dire d'ou ils
 * viennent. La ligne des sources ouvrait sur rien.
 */
export function Sources({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { d, t } = useT();
  const c = useColors();
  const tint = useBlurTint();
  const st = useMemo(() => sheet(c), [c]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={st.scrim} onPress={onClose}>
        <Animated.View entering={SlideInDown.duration(280)} style={st.sheet}>
          <BlurView intensity={65} tint={tint} style={StyleSheet.absoluteFill} />
          <View style={st.tint} />

          <View style={st.head}>
            <Text variant="title" style={{ flex: 1 }}>{d.refs.title}</Text>
            <Pressable onPress={() => { haptics.tap(); onClose(); }} style={st.done} hitSlop={10}>
              <Text variant="label" color={c.night}>OK</Text>
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
            <Text variant="label" tone="tertiary" style={st.group}>{d.refs.calc}</Text>
            <Text variant="body" tone="secondary" style={st.body}>{t(d.ui.calc, { life: LIFE_YEARS, waking: WAKING_HOURS })}</Text>

            <Text variant="label" tone="tertiary" style={st.group}>{d.ui.research}</Text>
            {REFS.map((r) => (
              <View key={r.t} style={st.ref}>
                <Text variant="body">{r.t}</Text>
                <Text variant="label" color={c.accent}>{r.a}</Text>
                <Text variant="label" tone="tertiary" style={{ lineHeight: 17 }}>{r.d}</Text>
              </View>
            ))}

            <Text variant="label" tone="tertiary" style={[st.group, { lineHeight: 17 }]}>
              {CAVEAT}
            </Text>
          </ScrollView>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  scrim: { flex: 1, backgroundColor: '#000000B8', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden',
    paddingHorizontal: gutter, paddingTop: space.lg, paddingBottom: space.xxl,
  },
  tint: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: withAlpha(c.night, 0.95),
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingBottom: space.lg },
  done: {
    width: 44, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', backgroundColor: c.accent,
  },
  group: { marginTop: space.lg, marginBottom: space.sm },
  body: { lineHeight: 21 },
  ref: {
    gap: 3, paddingVertical: space.md,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: withAlpha(c.mist, 0.1),
  },
});
