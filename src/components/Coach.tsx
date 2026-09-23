import { useState, type ReactNode, useMemo } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { withAlpha } from '@/theme/colors';
import { useBlurTint, useColors, type Palette } from '@/theme/useColors';
import { gutter, space } from '@/theme/spacing';
import { Text } from './type/Text';
import { Button } from './Button';
import { haptics } from '@/lib/haptics';

export type CoachStep = {
  /** Icone ou emoji montre au-dessus du titre. */
  mark?: ReactNode;
  title: string;
  body?: string;
  /** Ou poser la bulle : le doigt doit pouvoir atteindre ce qu'elle designe. */
  at?: 'top' | 'middle' | 'bottom';
  /** Libelle du bouton. Absent : on avance en touchant l'ecran. */
  cta?: string;
};

/**
 * Visite guidee posee PAR-DESSUS l'interface reelle.
 *
 * Elle ne mime rien : l'ecran en dessous est le vrai, et la bulle se
 * contente de le designer. C'est ce qui fait qu'on apprend le geste plutot
 * que de lire une notice.
 */
export function Coach({
  steps, visible, onDone,
}: {
  steps: CoachStep[];
  visible: boolean;
  onDone: () => void;
}) {
  // Monte seulement quand elle doit jouer : l'etape repart ainsi de zero
  // sans effet de remise a zero, qui relancait un rendu pour rien.
  if (!visible || steps.length === 0) return null;
  return <Tour steps={steps} onDone={onDone} />;
}

function Tour({ steps, onDone }: { steps: CoachStep[]; onDone: () => void }) {
  const c = useColors();
  const tint = useBlurTint();
  const styles = useMemo(() => sheet(c), [c]);
  const { height } = useWindowDimensions();
  const [i, setI] = useState(0);

  const step = steps[Math.min(i, steps.length - 1)];
  const last = i >= steps.length - 1;

  const next = () => {
    haptics.tap();
    if (last) { onDone(); return; }
    setI((n) => n + 1);
  };

  const top = step.at === 'top' ? height * 0.12
    : step.at === 'bottom' ? height * 0.58
    : height * 0.34;

  return (
    <Animated.View
      entering={FadeIn.duration(280)}
      exiting={FadeOut.duration(220)}
      style={styles.layer}
    >
      {/* Le voile assombrit sans masquer : on doit reconnaitre l'ecran. */}
      <Pressable style={StyleSheet.absoluteFill} onPress={step.cta ? undefined : next} />

      <Animated.View key={i} entering={FadeIn.duration(260)} style={[styles.bubble, { top }]}>
        <BlurView intensity={60} tint={tint} style={StyleSheet.absoluteFill} />
        <View style={styles.tint} />

        {step.mark ? <View style={styles.mark}>{step.mark}</View> : null}
        <Text variant="title" color="#15171C" style={styles.title}>{step.title}</Text>
        {step.body ? (
          <Text variant="body" color="#4A4E57" style={styles.body}>{step.body}</Text>
        ) : null}

        {step.cta ? (
          <View style={styles.cta}><Button label={step.cta} onPress={next} /></View>
        ) : (
          <Text variant="label" color="#8A8E97" style={styles.hint}>
            Appuie n’importe où pour continuer
          </Text>
        )}

        <View style={styles.dots}>
          {steps.map((s, k) => (
            <View key={s.title} style={[styles.dot, k === i && styles.dotOn]} />
          ))}
        </View>
      </Animated.View>

      <Pressable style={styles.skip} onPress={() => { haptics.tap(); onDone(); }} hitSlop={12}>
        <Text variant="label" color={withAlpha(c.mist, 0.7)}>Passer</Text>
      </Pressable>
    </Animated.View>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  layer: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: withAlpha(c.ground, 0.55), zIndex: 200,
  },
  bubble: {
    position: 'absolute', left: gutter, right: gutter,
    borderRadius: 24, overflow: 'hidden', padding: space.lg,
    shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 26,
    shadowOffset: { width: 0, height: 12 },
  },
  // Claire sur fond sombre comme sur fond clair : c'est le contraste avec
  // la page, pas la couleur, qui la fait lire.
  tint: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#F7F7F5F2',
  },
  mark: { alignItems: 'center', marginBottom: space.md },
  title: { textAlign: 'center' },
  body: { textAlign: 'center', marginTop: space.sm, lineHeight: 21 },
  cta: { marginTop: space.lg },
  hint: { textAlign: 'center', marginTop: space.lg },
  dots: { flexDirection: 'row', gap: 5, justifyContent: 'center', marginTop: space.lg },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#C9CBD1' },
  dotOn: { width: 16, backgroundColor: '#4B63D8' },
  skip: { position: 'absolute', top: 60, right: gutter, padding: space.sm },
});
