import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn, useAnimatedStyle, useSharedValue, withTiming, Easing,
} from 'react-native-reanimated';
import { colors, withAlpha } from '@/theme/colors';
import { gutter, radii, space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { Glass } from '@/components/glass/Glass';
import { GlassButton } from '@/components/glass/GlassButton';
import { haptics } from '@/lib/haptics';
import { useT } from '@/i18n';
import { useSky } from '@/components/sky/SkyProvider';

export function S7Harms({ onNext }: { onNext: () => void }) {
  const { d } = useT();
  const sky = useSky();
  useEffect(() => { sky.to('fog'); }, [sky]);

  return (
    <ScrollView contentContainerStyle={styles.root} showsVerticalScrollIndicator={false}>
      <Text variant="displayM">{d.s7.title}</Text>

      <Panel
        title={d.s7.p1Title}
        number={d.s7.p1Number}
        body={d.s7.p1Body}
        back={d.s7.p1Back}
        source={d.s7.source}
        backLabel={d.s7.backFace}
      >
        <BrokenSentence sentences={d.s7.p1Sentences} />
      </Panel>

      <Panel
        title={d.s7.p2Title}
        body={d.s7.p2Body}
        back={d.s7.p2Back}
        source={d.s7.source}
        backLabel={d.s7.backFace}
        caption={d.s7.p2Definition}
      >
        <FadingWorld />
      </Panel>

      <View style={{ marginTop: space.xl }}>
        <GlassButton label={d.s7.cta} onPress={onNext} />
      </View>
    </ScrollView>
  );
}

function Panel({
  title, number, body, back, source, backLabel, caption, children,
}: {
  title: string; number?: string; body: string; back: string;
  source: string; backLabel: string; caption?: string; children?: React.ReactNode;
}) {
  const [flipped, setFlipped] = useState(false);
  return (
    <Glass style={styles.panel}>
      {flipped ? (
        <Animated.View entering={FadeIn.duration(240)}>
          <Text variant="body" tone="secondary">{back}</Text>
        </Animated.View>
      ) : (
        <>
          {children}
          {number && <Text variant="hero" style={styles.number}>{number}</Text>}
          <Text variant="title" style={{ marginTop: space.sm }}>{title}</Text>
          {caption && (
            <Text variant="label" tone="tertiary" style={{ marginTop: 4 }}>{caption}</Text>
          )}
          <Text variant="body" tone="secondary" style={{ marginTop: space.sm }}>{body}</Text>
        </>
      )}
      <Pressable
        onPress={() => { haptics.tap(); setFlipped((f) => !f); }}
        style={styles.sourceBtn}
      >
        <Text variant="label" tone="tertiary">{flipped ? backLabel : source}</Text>
      </Pressable>
    </Glass>
  );
}

/** La phrase qu'on ne finit jamais : swipee a mi-chemin, trois fois, en accelerant. */
function BrokenSentence({ sentences }: { sentences: string[] }) {
  const [i, setI] = useState(0);
  const y = useSharedValue(0);

  useEffect(() => {
    if (i >= sentences.length) return;
    const delay = 1600 - i * 380;
    const id = setTimeout(() => {
      haptics.tap();
      y.value = withTiming(-1, { duration: 160 }, () => { y.value = 0; });
      setI((n) => n + 1);
    }, delay);
    return () => clearTimeout(id);
  }, [i, sentences.length, y]);

  const s = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value * 40 }],
    opacity: 1 + y.value,
  }));

  return (
    <View style={styles.sentenceBox}>
      <Animated.View style={s}>
        <Text variant="quote" tone="secondary">
          {sentences[Math.min(i, sentences.length - 1)]}
        </Text>
      </Animated.View>
    </View>
  );
}

/** Le monde qui se decolore : la ligne de plaisir s'aplatit. */
function FadingWorld() {
  const fade = useSharedValue(0);
  useEffect(() => {
    fade.value = withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.quad) });
  }, [fade]);

  const sky = useAnimatedStyle(() => ({ opacity: 1 - fade.value * 0.85 }));
  const pulse = useAnimatedStyle(() => ({ transform: [{ scaleY: 1 - fade.value * 0.92 }] }));

  return (
    <View style={styles.world}>
      <Animated.View style={[styles.worldSky, sky]} />
      <Animated.View style={[styles.pulseRow, pulse]}>
        {[10, 26, 8, 34, 12, 30, 9, 28, 11].map((h, k) => (
          <View key={k} style={[styles.pulseBar, { height: h }]} />
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: gutter, paddingTop: space.lg, paddingBottom: space.xxl },
  panel: { padding: space.lg, marginTop: space.lg, borderRadius: radii.panel },
  number: { fontSize: 52, lineHeight: 56, marginTop: space.md },
  sentenceBox: { minHeight: 78, justifyContent: 'center' },
  sourceBtn: { marginTop: space.md, alignSelf: 'flex-start' },
  world: { height: 86, borderRadius: radii.tile, overflow: 'hidden', justifyContent: 'flex-end' },
  worldSky: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: withAlpha(colors.dawn, 0.35),
  },
  pulseRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 5,
    paddingHorizontal: space.md, paddingBottom: space.md,
  },
  pulseBar: { width: 3, borderRadius: 2, backgroundColor: colors.sun },
});
