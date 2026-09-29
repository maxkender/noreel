import { useEffect, useMemo, useState } from 'react';
import { Animated as RNAnimated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeIn, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { Cake } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Emblem } from '../scenes/Emblem';
import { withAlpha } from '@/theme/colors';
import { useColors } from '@/theme/useColors';
import { space } from '@/theme/spacing';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/type/Text';
import { Typewriter, typeDuration } from '@/components/type/Typewriter';
import { haptics } from '@/lib/haptics';
import { formatHours } from '@/lib/format';
import { track } from '@/services';
import { useT } from '@/i18n';
import { useOnboardingStore } from '@/store/onboarding';
import { compareGuess } from '../calculations';
import { VerticalGauge } from '../scenes/VerticalGauge';
import { AgeInput } from '../scenes/AgeInput';

type P = { onNext: () => void };

/* ---------- L'estimation ---------- */

/**
 * « A ton avis, combien ? » — et rien d'autre sur l'ecran.
 *
 * Le sous-titre calculait en direct la part de journee eveillee que ca
 * represente. C'etait la reponse de l'ecran suivant, donnee avant qu'on ait
 * fini de repondre a celui-ci : on regardait le pourcentage bouger au lieu
 * de chercher son propre chiffre. Une question, une jauge, une phrase pour
 * dire qu'on ne juge pas.
 */
const THINKING = require('@/assets/rig/corti-pose-pense.png');

export function Guess({ onNext }: P) {
  const st = useMemo(() => sheet(), []);
  const { d } = useT();
  const stored = useOnboardingStore((x) => x.minutesPerDay);
  const setMinutes = useOnboardingStore((x) => x.setMinutesPerDay);
  const [minutes, setDraft] = useState(stored);
  /*
    Tout doit tenir AU-DESSUS du bouton, sans defiler : la jauge se regle
    au doigt, et une page qui bouge sous le doigt est une page qu'on ne
    peut pas regler. On mesure l'ecran et on donne a la colonne ce qui
    reste une fois le titre, Corti et le bouton poses — et sur un petit
    ecran, Corti cede sa place a la jauge.
  */
  const { height: winH } = useWindowDimensions();
  const gaugeH = Math.max(150, Math.min(280, winH - 630));
  const showCorti = winH >= 720;
  /*
    La ligne sous la jauge REPOND, sans juger : en bas, elle rappelle que
    presque tout le monde sous-estime ; en haut, elle dit que c'est beaucoup
    et qu'on va s'en occuper. Elle change de phrase, jamais de place — une
    hauteur fixe, sinon la jauge bougerait sous le doigt.
  */
  const tier = minutes >= 240 ? 'high' : minutes < 90 ? 'low' : 'mid';
  const line = tier === 'high' ? d.s5.high : tier === 'low' ? d.s5.low : d.s5.noJudge;

  return (
    <Screen emblem={showCorti ? <Image source={THINKING} style={{ width: 96, height: 96 }} contentFit="contain" /> : undefined}
      cta={d.s5.ctaA}
      onPress={() => {
        setMinutes(minutes);
        track('screen_time_set', { minutes });
        onNext();
      }}
      center
      still
      hue="accent"
    >
      <Typewriter text={d.s5.titleA} variant="displayM" style={st.center} />
      <Text variant="body" tone="tertiary" style={[st.center, { marginTop: space.sm }]}>
        {d.s5.hint}
      </Text>
      <View style={st.gaugeTight}>
        <VerticalGauge minutes={minutes} onChange={setDraft} onCommit={setMinutes} height={gaugeH} />
      </View>
      <View style={st.reassure}>
        <Animated.View key={tier} entering={FadeIn.duration(320)}>
          <Text variant="body" tone="tertiary" style={st.center}>{line}</Text>
        </Animated.View>
      </View>
    </Screen>
  );
}

/* ---------- Le vrai chiffre ---------- */

/**
 * Le vrai temps, recopie depuis Reglages.
 *
 * Apple ne le donne a AUCUNE app : le rapport de Temps d'ecran vit dans une
 * extension isolee et ses nombres ne traversent jamais vers l'app hote. Les
 * apps qui semblent le lire demandent en realite de le recopier — c'est ce
 * qu'on fait ici, en le disant. Trois etapes pour le trouver, la meme jauge
 * que pour l'estimation pour le poser, et les prises en main a cote, qui
 * sont sur la meme page de Reglages.
 */
export function RealTime({ onNext }: P) {
  const c = useColors();
  const st = useMemo(() => sheet(), []);
  const { d } = useT();
  const guess = useOnboardingStore((x) => x.minutesPerDay);
  const storedReal = useOnboardingStore((x) => x.realMinutes);
  const setReal = useOnboardingStore((x) => x.setReal);
  // On part de l'estimation : la jauge ne peut pas partir de zero sans
  // laisser croire que le vrai chiffre est zero.
  const [minutes, setMinutes] = useState(storedReal ?? guess);

  return (
    <Screen
      cta={d.time.realCta}
      onPress={() => { setReal(minutes); track('screen_time_set', { minutes, real: true }); onNext(); }}
      hue="warm"
    >
      <Text variant="displayM">{d.time.realTitle}</Text>
      <Text variant="lead" tone="secondary" style={{ marginTop: space.sm }}>{d.time.realBody}</Text>

      <View style={st.path}>
        {[d.time.step1, d.time.step2, d.time.step3].map((s, i) => (
          <View key={s} style={st.pathRow}>
            <View style={[st.badge, { backgroundColor: c.accent }]}>
              <Text variant="label" color={c.night}>{i + 1}</Text>
            </View>
            <Text variant="body" style={{ flex: 1 }}>{s}</Text>
          </View>
        ))}
      </View>

      <View style={[st.gauge, { marginTop: space.lg }]}>
        <VerticalGauge minutes={minutes} onChange={setMinutes} />
      </View>

    </Screen>
  );
}

/* ---------- La comparaison ---------- */

const COL_H = 220;
const GROW_MS = 1100;

/**
 * Faut-il montrer la comparaison ? Seulement si la realite depasse
 * l'estimation. Quand on a vu plus grand que le vrai chiffre, il n'y a rien
 * a apprendre — et « moins que tu ne pensais » felicite quelqu'un qui s'est
 * juste trompe dans l'autre sens.
 */
export function shouldCompare(guess: number, real: number): boolean {
  return real >= guess;
}

/**
 * Ce qu'on croyait, puis ce qui est.
 *
 * Le chiffre est SAISI depuis Reglages : Apple ne le donne a aucune app, et
 * l'extension qui sait le dessiner ne se lance pas sur tous les telephones.
 * Une fois saisi, si la realite depasse l'estimation, on la montre : la
 * scene, pas un tableau.
 */
export function Compare({ onNext }: P) {
  const guess = useOnboardingStore((x) => x.minutesPerDay);
  const storedReal = useOnboardingStore((x) => x.realMinutes);
  const [entered, setEntered] = useState(storedReal !== undefined);
  const real = storedReal ?? guess;

  // Saisi, et plus petit que l'estimation : rien a montrer, on passe.
  const skip = entered && !shouldCompare(guess, real);
  useEffect(() => { if (skip) onNext(); }, [skip, onNext]);

  if (!entered) return <RealTime onNext={() => setEntered(true)} />;
  if (skip) return <Screen center hue="accent"><View /></Screen>;
  return <Reveal guess={guess} real={real} onNext={onNext} />;
}

/**
 * La scene, en trois temps.
 *
 * L'estimation monte d'abord, seule, son chiffre avec elle : on regarde ce
 * qu'on croyait. Puis la realite monte a cote — plus haut — et l'estimation
 * s'efface un peu quand elle est depassee. Enfin l'ecart se pose entre les
 * deux, et le verdict dessous. Rien ne s'affiche d'un coup : c'est le
 * trajet qui se ressent, pas la valeur finale. Le bouton attend la fin.
 */
function Reveal({ guess, real, onNext }: { guess: number; real: number; onNext: () => void }) {
  const c = useColors();
  const st = useMemo(() => sheet(), []);
  const { d, t } = useT();
  const { pct, verdict } = compareGuess(guess, real);
  const more = verdict === 'more';
  const tone = more ? c.danger : c.accent;
  const top = Math.max(guess, real, 1);
  const [phase, setPhase] = useState(0);
  const [gN, setGN] = useState(0);
  const [rN, setRN] = useState(0);
  const [gScale] = useState(() => new RNAnimated.Value(0));
  const [rScale] = useState(() => new RNAnimated.Value(0));
  const [gDim] = useState(() => new RNAnimated.Value(1));

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const tickers: ReturnType<typeof setInterval>[] = [];
    // Le chiffre monte AVEC la colonne : trente pas, un tic tous les six.
    const count = (to: number, set: (n: number) => void, ms: number) => {
      const steps = 30;
      let i = 0;
      tickers.push(setInterval(() => {
        i += 1;
        set(Math.round((to * i) / steps));
        if (i % 6 === 0) haptics.tick();
        if (i >= steps) clearInterval(tickers[tickers.length - 1]);
      }, ms / steps));
    };
    const grow = (v: RNAnimated.Value, to: number, ms: number) => {
      RNAnimated.timing(v, { toValue: to, duration: ms, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    };
    const t0 = typeDuration(d.time.cmpTitle, 32, 0) + 300;
    const t1 = t0 + GROW_MS + 500;
    const t2 = t1 + GROW_MS + 300 + 450;
    timers.push(setTimeout(() => { setPhase(1); grow(gScale, guess / top, GROW_MS); count(guess, setGN, GROW_MS); }, t0));
    timers.push(setTimeout(() => {
      setPhase(2);
      grow(rScale, real / top, GROW_MS + 300);
      count(real, setRN, GROW_MS + 300);
      // L'estimation s'efface un peu au moment ou la realite la depasse.
      if (more) {
        RNAnimated.timing(gDim, { toValue: 0.45, duration: 600, delay: GROW_MS * 0.6, useNativeDriver: true }).start();
      }
    }, t1));
    timers.push(setTimeout(() => { setPhase(3); haptics.success(); }, t2));
    return () => { timers.forEach(clearTimeout); tickers.forEach(clearInterval); };
  }, [d.time.cmpTitle, guess, real, top, more, gScale, rScale, gDim]);

  return (
    <Screen
      cta={d.ob.keepGoing}
      onPress={onNext}
      center
      still
      hue={more ? 'ember' : 'accent'}
      hueLevel={phase >= 2 ? 0.8 : 0.3}
      disabled={phase < 3}
    >
      <Typewriter text={d.time.cmpTitle} variant="displayM" style={st.center} />

      <View style={st.stage}>
        <Column
          value={gN}
          shown={phase >= 1}
          scale={gScale}
          dim={gDim}
          label={d.time.guessLabel}
          colors={[withAlpha(c.mist, 0.5), withAlpha(c.mist, 0.14)]}
          rim={withAlpha(c.mist, 0.75)}
          tone={c.mist}
        />
        {/* L'ecart se pose ENTRE les deux : c'est lui qu'on retient. */}
        <View style={st.deltaSlot}>
          {phase >= 3 && (
            <Animated.View
              entering={ZoomIn.springify().damping(12)}
              style={[st.deltaPill, { backgroundColor: withAlpha(tone, 0.16), borderColor: withAlpha(tone, 0.5) }]}
            >
              <Text variant="button" color={tone}>{more ? `+${formatHours(real - guess)}` : '≈'}</Text>
              <Text variant="label" color={tone} style={st.center}>
                {t(more ? d.time.deltaMore : d.time.deltaSame, { p: pct })}
              </Text>
            </Animated.View>
          )}
        </View>
        <Column
          value={rN}
          shown={phase >= 2}
          scale={rScale}
          label={d.time.realLabel}
          colors={more ? [c.danger, c.ember] : [c.accent, withAlpha(c.accent, 0.4)]}
          rim="#FFFFFF"
          tone={tone}
        />
      </View>

      {/* Le verdict a une place FIXE : il arrive en dernier, et rien ne
          doit bouger quand il se pose. */}
      <View style={st.verdictSlot}>
        {phase >= 3 && (
          <Animated.View entering={FadeInUp.duration(520)}>
            <Text variant="displayM" color={tone} style={st.center}>
              {more ? d.time.verdictMore : d.time.verdictSame}
            </Text>
            <Text variant="body" tone="secondary" style={[st.center, { marginTop: space.sm }]}>
              {more ? d.time.moreSub : d.time.sameSub}
            </Text>
          </Animated.View>
        )}
      </View>
    </Screen>
  );
}

/** Une colonne fine, qui monte depuis le sol, avec son chiffre au-dessus. */
function Column({
  value, shown, scale, dim, label, colors, rim, tone,
}: {
  value: number;
  shown: boolean;
  scale: RNAnimated.Value;
  dim?: RNAnimated.Value;
  label: string;
  colors: [string, string];
  rim: string;
  tone: string;
}) {
  const st = useMemo(() => sheet(), []);
  return (
    <View style={st.col}>
      <View style={st.colValue}>
        {shown && (
          <Text variant="title" color={tone} numberOfLines={1} adjustsFontSizeToFit>{formatHours(value)}</Text>
        )}
      </View>
      <View style={st.colTrack}>
        <RNAnimated.View style={[st.colFill, { transform: [{ scaleY: scale }], opacity: dim ?? 1 }]}>
          <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={[st.colRim, { backgroundColor: rim }]} />
        </RNAnimated.View>
      </View>
      <Text variant="label" tone="tertiary" style={st.center}>{label}</Text>
    </View>
  );
}

/* ---------- L'age ---------- */

export function AgeAsk({ onNext }: P) {
  const st = useMemo(() => sheet(), []);
  const { d } = useT();
  const age = useOnboardingStore((x) => x.age);
  const setAge = useOnboardingStore((x) => x.setAge);
  // Les cases partent vides : tant qu'elles le sont, on ne peut pas avancer.
  const [ok, setOk] = useState(false);

  return (
    <Screen emblem={<Emblem icon={Cake} />}
      cta={d.s5.ctaB}
      onPress={() => { track('age_set', { age }); onNext(); }}
      disabled={!ok}
      center
      hue="warm"
    >
      <Typewriter text={d.s5.titleB} variant="displayM" style={st.center} />
      <View style={st.age}>
        <AgeInput age={age} onChange={setAge} onReady={setOk} />
      </View>
    </Screen>
  );
}

const sheet = () => StyleSheet.create({
  center: { textAlign: 'center' },
  gauge: { alignItems: 'center', marginVertical: space.xl },
  gaugeTight: { alignItems: 'center', marginVertical: space.lg },
  reassure: { height: 48, justifyContent: 'center' },
  scanRow: { alignSelf: 'stretch', gap: space.sm, marginBottom: space.lg },
  scanTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  scanFill: { height: 6, borderRadius: 3, transformOrigin: 'left' },
  path: { marginTop: space.lg, gap: space.sm },
  pathRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  badge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stage: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: space.md, marginTop: space.xl },
  col: { alignItems: 'center', gap: space.sm, width: 92 },
  colValue: { height: 28, justifyContent: 'flex-end' },
  colTrack: {
    width: 30, height: COL_H, justifyContent: 'flex-end', borderRadius: 15, overflow: 'hidden',
    backgroundColor: withAlpha('#FAFAFA', 0.05),
  },
  colFill: { width: 30, height: COL_H, borderRadius: 15, overflow: 'hidden', transformOrigin: 'bottom' },
  colRim: { position: 'absolute', top: 0, left: 7, right: 7, height: 2, borderRadius: 1, opacity: 0.85 },
  deltaSlot: { width: 112, height: COL_H + 28 + space.sm, alignItems: 'center', justifyContent: 'center' },
  deltaPill: { alignItems: 'center', gap: 2, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1 },
  verdictSlot: { minHeight: 120, marginTop: space.xl },
  age: { marginTop: space.xxl, alignItems: 'center' },
});
