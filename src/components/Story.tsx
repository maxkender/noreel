import { useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaInsetsContext, initialWindowMetrics } from 'react-native-safe-area-context';
import Animated, {
  Easing, FadeIn, FadeOut, cancelAnimation, runOnJS, useAnimatedStyle, useSharedValue, withTiming,
} from 'react-native-reanimated';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { radii, space } from '@/theme/spacing';
import { Button } from './Button';
import { Text } from './type/Text';
import { haptics } from '@/lib/haptics';
import { useT } from '@/i18n';

/** Le temps d'une planche : une phrase, pas plus. */
const SLIDE_MS = 4200;

export type Slide = { title: string; body?: string; art: ReactNode };

/*
 * Une story, comme sur Instagram : des barres en haut, un tap pour avancer,
 * un tap a gauche pour revenir, un doigt qui reste pour mettre en pause.
 *
 * C'est le format que tout le monde connait, et c'est pour ca qu'il sert a
 * expliquer chaque page de l'app la premiere fois qu'on y vient : UNE idee
 * par planche, une grande image, une ligne. Les barres se posent SOUS
 * l'encoche, avec la marge lue sur l'appareil.
 */
export function Story({
  slides, onDone, testID = 'story',
}: {
  slides: Slide[];
  onDone: () => void;
  testID?: string;
}) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const { d } = useT();
  const insets = useContext(SafeAreaInsetsContext);
  const top = Math.max(insets?.top ?? 0, initialWindowMetrics?.insets.top ?? 0, 20);
  const bottom = Math.max(insets?.bottom ?? 0, initialWindowMetrics?.insets.bottom ?? 0, 12);
  const [i, setI] = useState(0);
  const fill = useSharedValue(0);
  const n = slides.length;
  const last = i >= n - 1;
  const paused = useRef(false);

  const go = (k: number) => { setI(Math.max(0, Math.min(n - 1, k))); haptics.tick(); };
  const advance = () => { setI((k) => (k < n - 1 ? k + 1 : k)); };

  const run = (from: number) => {
    fill.value = from;
    fill.value = withTiming(1, { duration: SLIDE_MS * (1 - from), easing: Easing.linear }, (finished) => {
      if (finished) runOnJS(advance)();
    });
  };
  useEffect(() => {
    paused.current = false;
    run(0);
    return () => cancelAnimation(fill);
  // La barre repart de zero a chaque planche, et seulement la.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  const pause = () => { paused.current = true; cancelAnimation(fill); };
  const resume = () => { if (paused.current) { paused.current = false; run(fill.value); } };
  const tap = (dir: -1 | 1) => {
    if (dir > 0 && last) { onDone(); return; }
    go(i + dir);
  };
  const barStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: fill.value }] }));

  const { title, body, art } = slides[i];

  return (
    <View style={[st.root, { paddingTop: top + 10, paddingBottom: bottom }]} testID={testID}>
      <View style={st.bars}>
        {slides.map((_, k) => (
          <View key={k} style={st.track}>
            {k < i && <View style={[st.fill, { transform: [{ scaleX: 1 }] }]} />}
            {k === i && <Animated.View style={[st.fill, barStyle]} />}
          </View>
        ))}
      </View>

      <View style={st.head}>
        <Text variant="label" tone="tertiary">{`${i + 1} / ${n}`}</Text>
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => { haptics.tap(); onDone(); }} hitSlop={12} accessibilityRole="button" style={st.skip}>
          <Text variant="label" tone="secondary">{d.tuto.skip}</Text>
        </Pressable>
      </View>

      <View style={st.stage}>
        <Animated.View key={i} entering={FadeIn.duration(280)} exiting={FadeOut.duration(160)} style={st.slide}>
          <View style={st.art}>{art}</View>
          <Text variant="displayM" style={st.center}>{title}</Text>
          {body ? (
            <Text variant="lead" tone="secondary" style={[st.center, { marginTop: space.md }]}>{body}</Text>
          ) : null}
        </Animated.View>
      </View>

      <Pressable style={[st.zoneL, { top: top + 60 }]} onPress={() => tap(-1)} onLongPress={pause} delayLongPress={300} onPressOut={resume} testID={`${testID}-prev`} accessibilityLabel={d.client.back} />
      <Pressable style={[st.zoneR, { top: top + 60 }]} onPress={() => tap(1)} onLongPress={pause} delayLongPress={300} onPressOut={resume} testID={`${testID}-next`} accessibilityLabel={d.client.forward} />

      <View style={st.foot}>
        {last
          ? <Button label={d.tuto.go} onPress={onDone} />
          : <Text variant="label" tone="tertiary" style={st.center}>{d.tuto.hint}</Text>}
      </View>
    </View>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.night },
  bars: { flexDirection: 'row', gap: 5, paddingHorizontal: space.lg },
  track: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: withAlpha(c.mist, 0.28) },
  fill: { height: 4, borderRadius: 2, width: '100%', backgroundColor: c.mist, transformOrigin: 'left' },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: space.md },
  skip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: radii.pill, backgroundColor: withAlpha(c.mist, 0.1) },
  stage: { flex: 1, justifyContent: 'center', paddingHorizontal: space.xl },
  slide: { alignItems: 'center' },
  art: { height: 280, alignItems: 'center', justifyContent: 'center', marginBottom: space.xl, alignSelf: 'stretch' },
  center: { textAlign: 'center' },
  zoneL: { position: 'absolute', left: 0, bottom: 140, width: '30%' },
  zoneR: { position: 'absolute', right: 0, bottom: 140, width: '70%' },
  foot: { paddingHorizontal: space.lg, paddingBottom: space.md, minHeight: 84, justifyContent: 'center' },
});
