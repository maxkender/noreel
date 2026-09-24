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
    t: 'Tomber amoureux passe par le circuit de la récompense',
    a: 'Fisher, Aron & Brown — Journal of Comparative Neurology, 2005, 493(1), 58-62',
    d: 'L’imagerie de l’amour naissant montre une activation de l’aire tegmentale ventrale et du noyau caudé, les régions dopaminergiques de la récompense — les mêmes que sollicite une gratification immédiate répétée.',
  },
  {
    t: 'Les récepteurs s’émoussent sous stimulation répétée',
    a: 'Volkow, Fowler, Wang, Swanson & Telang — Archives of Neurology, 2007, 64(11), 1575-1579',
    d: 'Une stimulation intense et répétée du circuit de la récompense s’accompagne d’une disponibilité réduite des récepteurs D2, et d’une réponse émoussée aux plaisirs ordinaires.',
  },
  {
    t: 'Le même mécanisme, imagé',
    a: 'Volkow et coll. — Neuropharmacology, 2009, 56 (suppl. 1), 3-8',
    d: 'Revue des travaux d’imagerie sur le rôle de la dopamine dans la perte de contrôle et la recherche compulsive de récompense.',
  },
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
const CAVEAT = 'Ces travaux portent sur la dépendance et sur des '
  + 'stimulations intenses, pas sur les vidéos courtes. Le rapprochement '
  + 'que fait UnSwipe est une inférence raisonnable, pas un résultat '
  + 'démontré. Les durées affichées sont des estimations calculées à partir '
  + 'de ce que tu as déclaré.';

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
