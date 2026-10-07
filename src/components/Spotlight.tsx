import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaInsetsContext, initialWindowMetrics } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { gutter, radii, space } from '@/theme/spacing';
import { Button } from './Button';
import { Text } from './type/Text';
import { haptics } from '@/lib/haptics';
import { useT } from '@/i18n';
import { measureAnchor, scrollTabBy, type Rect as Box } from '@/features/home/anchors';

export type SpotStep = {
  /** L'ancre a eclairer — ou plusieurs, la premiere presente l'emporte. */
  target: string | string[];
  title: string;
  body?: string;
  /** L'etape saute si son ancre n'est pas la, au lieu de parler dans le vide. */
  optional?: boolean;
};

/** Le vide autour de l'element eclaire, et le temps de laisser l'onglet se poser. */
const PAD = 8;
const SETTLE_MS = 380;

/*
 * Le projecteur : la visite guidee par-dessus la vraie page.
 *
 * Tout l'ecran s'assombrit, sauf l'element dont on parle, decoupe dans le
 * voile et cercle d'un trait. La carte se pose sous lui, ou au-dessus quand
 * il est bas. Un tap n'importe ou avance ; « Passer » sort. Si l'element
 * est hors champ, la liste de l'onglet defile pour l'amener sous les yeux
 * avant qu'on le cercle. On ne montre pas une image de la fonction : on
 * montre la fonction.
 */
export function Spotlight({
  steps, tab, onDone, testID = 'spot',
}: {
  steps: SpotStep[];
  /** L'onglet dont la liste doit defiler pour amener l'element en vue. */
  tab: string;
  onDone: () => void;
  testID?: string;
}) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const { d } = useT();
  const { width: W, height: H } = useWindowDimensions();
  const insets = useContext(SafeAreaInsetsContext);
  const top = Math.max(insets?.top ?? 0, initialWindowMetrics?.insets.top ?? 0, 20);
  const bottom = Math.max(insets?.bottom ?? 0, initialWindowMetrics?.insets.bottom ?? 0, 12);

  const [i, setI] = useState(0);
  /** L'etape mesuree et son cadre — `null` quand rien n'est a eclairer. Une autre etape que `i` : on mesure encore. */
  const [found, setFound] = useState<{ step: number; rect: Box | null } | null>(null);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  const n = steps.length;
  const last = i >= n - 1;

  const finish = useCallback(() => { onDone(); }, [onDone]);

  // L'element reste lisible entre l'en-tete et la barre du bas.
  const bandTop = top + 64;
  const bandBottom = H - bottom - 118;

  const find = useCallback(async (k: number): Promise<Box | null> => {
    const ids = Array.isArray(steps[k].target) ? steps[k].target : [steps[k].target];
    for (const id of ids) {
      const r = await measureAnchor(id);
      if (r) return r;
    }
    return null;
  }, [steps]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      // L'onglet vient d'apparaitre : on le laisse se poser avant de mesurer.
      await new Promise((r) => setTimeout(r, i === 0 ? SETTLE_MS : 60));
      if (cancelled || !alive.current) return;
      let r = await find(i);
      if (cancelled || !alive.current) return;
      if (!r && steps[i].optional) {
        // Rien a montrer : on passe a la suite, ou on sort si c'etait la derniere.
        if (i < n - 1) setI(i + 1); else finish();
        return;
      }
      if (r) {
        // Hors champ : on fait defiler, puis on remesure.
        const dy = r.y + r.h > bandBottom ? r.y + r.h - bandBottom + 16
          : r.y < bandTop ? r.y - bandTop - 16 : 0;
        if (dy !== 0 && scrollTabBy(tab, dy)) {
          await new Promise((res) => setTimeout(res, 420));
          if (cancelled || !alive.current) return;
          r = (await find(i)) ?? r;
        }
      }
      if (!cancelled && alive.current) setFound({ step: i, rect: r });
    };
    void run();
    return () => { cancelled = true; };
  }, [i, find, steps, n, tab, bandTop, bandBottom, finish]);

  const next = () => {
    if (last) { finish(); return; }
    haptics.tick();
    setI((k) => k + 1);
  };

  if (!found || found.step !== i) {
    // On mesure : un voile leger, sans carte, pour que rien ne saute.
    return <View style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(c.night, 0.35) }]} testID={testID} />;
  }

  const box = found.rect;
  const hole = box
    ? { x: box.x - PAD, y: box.y - PAD, w: box.w + PAD * 2, h: box.h + PAD * 2 }
    : null;
  // La carte va sous l'element quand il est haut, au-dessus quand il est bas.
  const below = hole ? hole.y + hole.h < H * 0.55 : false;
  const cardPos = hole
    ? below
      ? { top: hole.y + hole.h + space.lg }
      : { bottom: H - hole.y + space.lg }
    : { top: H * 0.3 };

  const { title, body } = steps[i];

  return (
    <Pressable style={StyleSheet.absoluteFill} onPress={next} testID={testID}>
      <Animated.View key={`veil-${i}`} entering={FadeIn.duration(260)} exiting={FadeOut.duration(160)} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
          <Defs>
            <Mask id="hole">
              <Rect x={0} y={0} width={W} height={H} fill="#fff" />
              {hole && <Rect x={hole.x} y={hole.y} width={hole.w} height={hole.h} rx={radii.tile} ry={radii.tile} fill="#000" />}
            </Mask>
          </Defs>
          <Rect x={0} y={0} width={W} height={H} fill={c.night} opacity={0.8} mask="url(#hole)" />
          {hole && (
            <Rect
              x={hole.x} y={hole.y} width={hole.w} height={hole.h}
              rx={radii.tile} ry={radii.tile}
              fill="none" stroke={c.accent} strokeWidth={2}
            />
          )}
        </Svg>
      </Animated.View>

      <View style={[st.head, { top: top + 10 }]} pointerEvents="box-none">
        <Text variant="label" tone="tertiary">{`${i + 1} / ${n}`}</Text>
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => { haptics.tap(); finish(); }} hitSlop={12} accessibilityRole="button" style={st.skip}>
          <Text variant="label" tone="secondary">{d.tuto.skip}</Text>
        </Pressable>
      </View>

      <Animated.View key={`card-${i}`} entering={FadeInDown.duration(300)} style={[st.cardWrap, cardPos]} pointerEvents="box-none">
        {/* La carte absorbe le tap : taper sur ce qu'on lit n'avance pas. */}
        <Pressable onPress={() => {}} style={st.card}>
          <Text variant="title">{title}</Text>
          {body ? <Text variant="body" tone="secondary" style={{ marginTop: space.xs }}>{body}</Text> : null}
          <View style={st.dots}>
            {steps.map((_, k) => (
              <View key={k} style={[st.dot, k === i && { backgroundColor: c.accent, width: 18 }]} />
            ))}
          </View>
          <View style={st.foot}>
            {last
              ? <Button label={d.tuto.go} onPress={finish} />
              : (
                <Pressable onPress={next} style={st.next} accessibilityRole="button" testID={`${testID}-next`}>
                  <Text variant="button" color={c.night}>{d.tour.next}</Text>
                </Pressable>
              )}
          </View>
        </Pressable>
      </Animated.View>
    </Pressable>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  head: { position: 'absolute', left: gutter, right: gutter, flexDirection: 'row', alignItems: 'center' },
  skip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: radii.pill, backgroundColor: withAlpha(c.mist, 0.14) },
  cardWrap: { position: 'absolute', left: gutter, right: gutter },
  card: {
    borderRadius: radii.tile, padding: space.lg,
    backgroundColor: c.night, borderWidth: 1, borderColor: withAlpha(c.mist, 0.18),
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 16,
  },
  dots: { flexDirection: 'row', gap: 5, marginTop: space.md },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: withAlpha(c.mist, 0.25) },
  foot: { marginTop: space.md },
  next: {
    alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center',
    height: 48, borderRadius: radii.chip, backgroundColor: c.accent,
  },
});
