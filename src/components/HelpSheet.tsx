import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { ChevronDown, X } from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { gutter, space } from '@/theme/spacing';
import { Text } from './type/Text';
import { haptics } from '@/lib/haptics';
import { useT } from '@/i18n';

/*
 * Les questions qu'on se pose AVANT d'ecrire.
 *
 * Trois moments font douter dans cette app, et ce sont les trois ou l'on perd
 * les gens : la page de connexion d'Instagram — qui n'est pas la notre et qui
 * demande un mot de passe —, le changement de compte, et la question muette
 * « qu'est-ce que vous voyez de tout ca ? ». Personne n'ecrit au support pour
 * ca ; on ferme l'app, et on ne revient pas.
 *
 * D'ou un « i » a portee de pouce, la ou le doute arrive, plutot qu'une page
 * d'aide rangee dans les reglages. Une aide qu'il faut aller chercher n'aide
 * personne, parce qu'on n'y va qu'apres avoir renonce.
 */

/** Une question : un titre, une accroche, et la reponse. */
export type HelpTopic = { t: string; h: string; b: string };

export function HelpSheet({
  visible, onClose, topics,
}: {
  visible: boolean;
  onClose: () => void;
  topics: HelpTopic[];
}) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const { d } = useT();
  /*
    Une seule ouverte a la fois.
    Tout deplier d'un coup redonne la page de texte qu'on voulait eviter :
    l'interet de la liste est qu'on voie les trois QUESTIONS d'abord, et qu'on
    ne lise que celle qui est la sienne.
  */
  const [open, setOpen] = useState<number | null>(null);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

      <SafeAreaView style={st.root} edges={['top', 'bottom']} pointerEvents="box-none">
        <View style={st.card}>
          <View style={st.head}>
            <View style={{ flex: 1 }}>
              <Text variant="displayM">{d.help.title}</Text>
              <Text variant="body" tone="secondary" style={{ marginTop: space.xs }}>
                {d.help.sub}
              </Text>
            </View>
            <Pressable
              onPress={() => { haptics.tap(); onClose(); }}
              hitSlop={16}
              style={st.close}
              accessibilityLabel={d.help.close}
              accessibilityRole="button"
            >
              <X size={19} strokeWidth={2.2} color={withAlpha(c.mist, 0.6)} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.list}>
            {topics.map((topic, i) => {
              const on = open === i;
              return (
                <Animated.View key={topic.t} layout={LinearTransition.duration(220)} style={st.row}>
                  <Pressable
                    onPress={() => { haptics.tick(); setOpen(on ? null : i); }}
                    style={st.rowHead}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: on }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text variant="button">{topic.t}</Text>
                      <Text variant="body" tone="secondary" style={{ marginTop: 2 }}>
                        {topic.h}
                      </Text>
                    </View>
                    {/* La fleche TOURNE au lieu d'etre remplacee : deux icones
                        qui se succedent se lisent comme un changement d'etat
                        du bouton, pas comme un pli qui s'ouvre. */}
                    <View style={[st.chev, on && st.chevOn]}>
                      <ChevronDown size={17} strokeWidth={2.4} color={withAlpha(c.mist, 0.5)} />
                    </View>
                  </Pressable>

                  {on && (
                    <Animated.View entering={FadeIn.duration(220)} style={st.answer}>
                      <Text variant="body" tone="secondary">{topic.b}</Text>
                    </Animated.View>
                  )}
                </Animated.View>
              );
            })}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  card: {
    maxHeight: '86%', backgroundColor: c.night,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: space.xl, paddingHorizontal: gutter, paddingBottom: space.md,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: withAlpha(c.mist, 0.16),
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  close: {
    width: 38, height: 38, borderRadius: 19, alignItems: 'center',
    justifyContent: 'center', backgroundColor: withAlpha(c.mist, 0.1),
  },
  list: { gap: space.md, paddingTop: space.xl, paddingBottom: space.xl },
  row: {
    borderRadius: 18, overflow: 'hidden',
    backgroundColor: withAlpha(c.mist, 0.07),
  },
  rowHead: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    padding: space.lg,
  },
  chev: { transform: [{ rotate: '0deg' }] },
  chevOn: { transform: [{ rotate: '180deg' }] },
  answer: { paddingHorizontal: space.lg, paddingBottom: space.lg, marginTop: -space.sm },
});
