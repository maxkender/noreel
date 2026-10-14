import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaInsetsContext, initialWindowMetrics } from 'react-native-safe-area-context';
import Animated, {
  Easing, FadeIn, useAnimatedProps, useSharedValue, withTiming, type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
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

/** Le vide autour de l'element eclaire, l'ecart avec la carte, et les temps. */
const PAD = 8;
const GAP = 16;
const SETTLE_MS = 380;
const SCROLL_MS = 460;
const EASE = Easing.bezier(0.22, 1, 0.36, 1);

const APath = Animated.createAnimatedComponent(Path);

/** Un rectangle arrondi, en trace SVG. Ecrit sur le fil d'animation. */
function roundedRect(x: number, y: number, w: number, h: number, r: number): string {
  'worklet';
  const rr = Math.min(r, w / 2, h / 2);
  return `M${x + rr} ${y}H${x + w - rr}A${rr} ${rr} 0 0 1 ${x + w} ${y + rr}V${y + h - rr}A${rr} ${rr} 0 0 1 ${x + w - rr} ${y + h}H${x + rr}A${rr} ${rr} 0 0 1 ${x} ${y + h - rr}V${y + rr}A${rr} ${rr} 0 0 1 ${x + rr} ${y}Z`;
}

/**
 * Pose la valeur SUR PLACE.
 * Le cadre glissait d'un element a l'autre en se deformant : un grand
 * carre qui traverse l'ecran. Il se pose maintenant directement, et c'est
 * le contour qui apparait en fondu.
 */
function glide(sv: SharedValue<number>, to: number) {
  sv.value = to;
}

/*
 * Le projecteur : la visite guidee par-dessus la vraie page.
 *
 * Tout l'ecran s'assombrit, sauf l'element dont on parle, decoupe dans le
 * voile et cercle d'un trait. D'une etape a l'autre le trou GLISSE jusqu'au
 * prochain element — il ne saute pas — et la carte se deplace avec lui :
 * sous l'element quand il y a la place, au-dessus sinon. Si l'element est
 * hors champ ou trop bas pour laisser la place a la carte, la liste de
 * l'onglet defile d'abord pour l'amener juste sous l'en-tete. Un tap
 * n'importe ou avance ; « Passer » sort. On ne montre pas une image de la
 * fonction : on montre la fonction.
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
  /** L'etape mesuree et son cadre — `null` quand rien n'est a eclairer. */
  const [found, setFound] = useState<{ step: number; rect: Box | null } | null>(null);
  /** La hauteur de la carte, lue au rendu : elle decide ou la poser. */
  const [cardH, setCardH] = useState(170);
  const alive = useRef(true);
  const busy = useRef(false);
  /** Le dernier cadre eclaire : quand le suivant manque, le trou se referme dessus. */
  const prev = useRef<Box | null>(null);
  useEffect(() => () => { alive.current = false; }, []);

  const n = steps.length;
  const last = i >= n - 1;
  const finish = useCallback(() => { onDone(); }, [onDone]);

  // Le trou, sur le fil d'animation : il glisse d'un element au suivant.
  const hx = useSharedValue(W / 2);
  const hy = useSharedValue(H / 2);
  const hw = useSharedValue(0);
  const hh = useSharedValue(0);
  /*
    Le voile est UN trace a deux contours — l'ecran, moins le trou — rempli en
    « evenodd » : pas de masque a recalculer a chaque image, le natif ne fait
    que redessiner une forme. C'est ce qui rend le glissement fluide.
  */
  const veilProps = useAnimatedProps(() => ({
    d: `M0 0H${W}V${H}H0Z ${roundedRect(hx.value, hy.value, hw.value, hh.value, radii.tile)}`,
  }));
  const ringOn = useSharedValue(0);
  const ringProps = useAnimatedProps(() => ({
    d: roundedRect(hx.value, hy.value, hw.value, hh.value, radii.tile),
    strokeOpacity: hw.value > 1 ? ringOn.value : 0,
  }));

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
    busy.current = true;
    const run = async () => {
      // L'onglet vient d'apparaitre : on le laisse se poser avant de mesurer.
      await new Promise((r) => setTimeout(r, i === 0 ? SETTLE_MS : 40));
      if (cancelled || !alive.current) return;
      let r = await find(i);
      if (cancelled || !alive.current) return;
      if (!r && steps[i].optional) {
        // Rien a montrer : on passe a la suite, ou on sort si c'etait la derniere.
        if (i < n - 1) setI(i + 1); else finish();
        return;
      }
      if (r) {
        /*
          Le champ : entre l'en-tete et la barre du bas, mesures eux aussi.
          L'element doit y tenir ENTIER, avec la place de la carte au-dessus
          ou en dessous. Sinon la liste defile pour le poser juste sous
          l'en-tete, et la carte vient dessous.
        */
        const head = await measureAnchor('frame-top');
        const foot = await measureAnchor('frame-bottom');
        if (cancelled || !alive.current) return;
        const bt = head ? head.y + head.h : top + 64;
        const bb = foot ? foot.y - 8 : H - bottom - 118;
        const need = cardH + GAP * 2;
        const inBand = r.y - PAD >= bt && r.y + r.h + PAD <= bb;
        const room = r.y + r.h + PAD + need <= bb || r.y - PAD - need >= bt;
        if (!inBand || !room) {
          const dy = r.y - PAD - (bt + 8);
          if (scrollTabBy(tab, dy)) {
            await new Promise((res) => setTimeout(res, SCROLL_MS));
            if (cancelled || !alive.current) return;
            r = (await find(i)) ?? r;
          }
        }
      }
      if (cancelled || !alive.current) return;
      setFound({ step: i, rect: r });
      busy.current = false;
    };
    void run();
    return () => { cancelled = true; };
  // La hauteur de la carte sert au calcul mais ne doit pas relancer la mesure.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, find, steps, n, tab, top, bottom, H, finish]);

  // Le trou glisse vers le cadre trouve ; sans cadre, il se referme sur place.
  useEffect(() => {
    if (!found) return;
    const r = found.rect;
    const p = prev.current;
    const cx = p ? p.x + p.w / 2 : W / 2;
    const cy = p ? p.y + p.h / 2 : H / 2;
    const to = r
      ? { x: r.x - PAD, y: r.y - PAD, w: r.w + PAD * 2, h: r.h + PAD * 2 }
      : { x: cx, y: cy, w: 0, h: 0 };
    prev.current = r;
    ringOn.value = 0;
    glide(hx, to.x); glide(hy, to.y); glide(hw, to.w); glide(hh, to.h);
    ringOn.value = withTiming(1, { duration: 280, easing: EASE });
  }, [found, hx, hy, hw, hh, W, H, ringOn]);

  const next = () => {
    if (busy.current) return;
    if (last) { finish(); return; }
    haptics.tick();
    setI((k) => k + 1);
  };

  // La carte : sous l'element quand ca tient, au-dessus sinon, et jamais hors de l'ecran.
  const r = found?.rect ?? null;
  const minTop = top + GAP;
  const maxTop = H - bottom - GAP - cardH;
  // Deux places seulement : en bas, ou en haut si l'element eclaire est dans
  // la moitie basse. La carte ne glisse plus d'un bout a l'autre de l'ecran.
  const low = r ? r.y + r.h / 2 > H / 2 : false;
  const cardTop = low ? minTop : maxTop;

  const { title, body } = steps[i];
  // La carte ne se montre qu'une fois l'etape en cours mesuree.
  const shown = found !== null && found.step === i;

  return (
    <Pressable style={StyleSheet.absoluteFill} onPress={next} testID={testID}>
      <Animated.View entering={FadeIn.duration(320)} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
          <APath animatedProps={veilProps} fill={c.night} fillOpacity={0.7} fillRule="evenodd" />
          <APath animatedProps={ringProps} fill="none" stroke={c.accent} strokeWidth={2} />
        </Svg>
      </Animated.View>

      {/* La carte suit le trou : sa place change en glissant, son texte en fondu. */}
      <Animated.View
        style={[st.cardWrap, { top: cardTop, opacity: shown ? 1 : 0 }]}
        pointerEvents={shown ? 'box-none' : 'none'}
        testID={shown ? `${testID}-ready` : undefined}
        onLayout={(e) => { const h = Math.round(e.nativeEvent.layout.height); if (h && h !== cardH) setCardH(h); }}
      >
        {/* La carte absorbe le tap : taper sur ce qu'on lit n'avance pas. */}
        <Pressable onPress={() => {}} style={st.card}>
          <Animated.View key={i} entering={FadeIn.duration(240)}>
            <View style={st.head}>
              <Text variant="label" tone="tertiary">{`${i + 1} / ${n}`}</Text>
              <View style={{ flex: 1 }} />
              <Pressable onPress={() => { haptics.tap(); finish(); }} hitSlop={12} accessibilityRole="button" style={st.skip}>
                <Text variant="label" tone="secondary">{d.tuto.skip}</Text>
              </Pressable>
            </View>
            <Text variant="title">{title}</Text>
            {body ? <Text variant="body" tone="secondary" style={{ marginTop: space.xs }}>{body}</Text> : null}
            <View style={st.foot}>
              {last
                ? <Button label={d.tuto.go} onPress={finish} />
                : (
                  <Pressable onPress={next} style={st.next} accessibilityRole="button" testID={`${testID}-next`}>
                    <Text variant="button" color={c.night}>{d.tour.next}</Text>
                  </Pressable>
                )}
            </View>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Pressable>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  cardWrap: { position: 'absolute', left: gutter, right: gutter },
  card: {
    borderRadius: radii.tile, padding: space.lg,
    backgroundColor: c.glassSolid, borderWidth: 1, borderColor: c.glassEdge,
  },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: space.sm },
  skip: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: radii.pill, backgroundColor: withAlpha(c.mist, 0.12) },
  foot: { marginTop: space.md },
  next: {
    alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center',
    height: 48, borderRadius: 24, backgroundColor: c.mist,
  },
});
