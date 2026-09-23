import { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { withAlpha } from '@/theme/colors';
import { useBlurTint, useColors, type Palette } from '@/theme/useColors';
import { gutter, space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { haptics } from '@/lib/haptics';
import { LIFE_YEARS, WAKING_HOURS } from '@/features/onboarding/calculations';

const REFS = [
  {
    t: 'Amour et circuit de la récompense',
    a: 'Fisher, Aron & Brown — Journal of Comparative Neurology, 2005',
    d: 'L’amour naissant active l’aire tegmentale ventrale et le noyau caudé, les régions dopaminergiques de la récompense.',
  },
  {
    t: 'Récompense et désensibilisation',
    a: 'Volkow et coll. — travaux sur les récepteurs D2',
    d: 'Une stimulation répétée du circuit de la récompense s’accompagne d’une réponse émoussée aux plaisirs ordinaires.',
  },
];

/**
 * Sources et methode.
 *
 * Une app qui avance des chiffres sur le cerveau doit pouvoir dire d'ou ils
 * viennent. La ligne des sources ouvrait sur rien.
 */
export function Sources({ visible, onClose }: { visible: boolean; onClose: () => void }) {
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
            <Text variant="title" style={{ flex: 1 }}>Sources et méthode</Text>
            <Pressable onPress={() => { haptics.tap(); onClose(); }} style={st.done} hitSlop={10}>
              <Text variant="label" color={c.night}>OK</Text>
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
            <Text variant="label" tone="tertiary" style={st.group}>CALCUL</Text>
            <Text variant="body" tone="secondary" style={st.body}>
              On part de ton temps quotidien et de ton âge, jusqu’à {LIFE_YEARS} ans.
              Les années passées devant un écran valent ton temps quotidien
              rapporté à une journée éveillée de {WAKING_HOURS} heures. La part
              affichée est ce même rapport, en pourcentage.
            </Text>

            <Text variant="label" tone="tertiary" style={st.group}>RECHERCHE</Text>
            {REFS.map((r) => (
              <View key={r.t} style={st.ref}>
                <Text variant="body">{r.t}</Text>
                <Text variant="label" color={c.accent}>{r.a}</Text>
                <Text variant="label" tone="tertiary" style={{ lineHeight: 17 }}>{r.d}</Text>
              </View>
            ))}

            <Text variant="label" tone="tertiary" style={[st.group, { lineHeight: 17 }]}>
              Ces travaux décrivent le circuit de la récompense. Le lien avec le
              scroll est une conséquence qu’on en tire, pas leur conclusion.
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
  tint: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0B0D11F0' },
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
