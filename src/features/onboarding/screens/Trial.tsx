import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Bell } from 'lucide-react-native';
import Animated, {
  Easing, FadeIn, FadeInDown, FadeInUp, ZoomIn, cancelAnimation, useAnimatedStyle, useSharedValue,
  withDelay, withRepeat, withSequence, withTiming, type SharedValue,
} from 'react-native-reanimated';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { radii, space } from '@/theme/spacing';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/type/Text';
import { haptics } from '@/lib/haptics';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { useT } from '@/i18n';
import { TRIAL_DAYS } from './Paywall';
import { PhoneFrame } from '@/components/PhoneFrame';
import { MockFeed } from '@/components/MockFeed';

const MARK = require('@/assets/brand/mark.png');
const GIFT_PHONE = 160;

type P = { onNext: () => void };

/** Les deux ecrans se laissent lire avant d'avancer. */
const READY_MS = 1100;

/** Lance une boucle sur le fil d'animation, hors du rendu. */
function loop(sv: SharedValue<number>, anim: number) { sv.value = anim; }

/*
 * Les deux ecrans qui precedent le paywall.
 *
 * Le premier dit qu'on OFFRE l'essai, le second dit qu'on PREVIENDRA avant
 * qu'il se termine : une idee chacun, une icone qui vit, une phrase. Ils
 * desamorcent les deux peurs d'un essai — payer sans le vouloir, oublier
 * d'annuler — avant que les prix apparaissent. Le rappel est reel : c'est
 * la notification que l'app envoie la veille de la fin de l'essai.
 */

/* ---------- Le cadeau ---------- */

export function TrialGift({ onNext }: P) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const { d, t } = useT();
  /*
    L'essai, MONTRE plutot que promis : le meme telephone que plus tot,
    ou les Reels tombent un a un puis l'onglet s'en va. Le cadeau et ses
    eclats faisaient image generee ; ici on voit ce qu'on essaie.
  */
  const [filtered, setFiltered] = useState(false);
  const [tab, setTab] = useState(true);
  useEffect(() => {
    const a1 = setTimeout(() => { setFiltered(true); haptics.tick(); }, 700);
    const a2 = setTimeout(() => { setTab(false); haptics.success(); }, 2100);
    return () => { clearTimeout(a1); clearTimeout(a2); };
  }, []);

  return (
    <Screen cta={d.ob.keepGoing} onPress={onNext} center hue="accent" readyAfter={READY_MS}>
      <Animated.View entering={FadeIn.duration(400)} style={{ alignItems: 'center', marginBottom: space.xl }}>
        <PhoneFrame width={GIFT_PHONE}>
          <MockFeed filtered={filtered} tab={tab} drift u={(GIFT_PHONE - 8) / 188} />
        </PhoneFrame>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).duration(480)}>
        <Text variant="displayM" style={st.center}>{d.trial.giftTitle}</Text>
      </Animated.View>
      <Animated.View entering={FadeIn.delay(500).duration(480)}>
        <Text variant="lead" tone="secondary" style={[st.center, { marginTop: space.md }]}>
          {t(d.trial.giftBody, { n: TRIAL_DAYS })}
        </Text>
      </Animated.View>
    </Screen>
  );
}

/* Ou les eclats se posent, en part de la scene : autour du paquet, jamais dessus. */

/* ---------- La cloche ---------- */

export function TrialBell({ onNext }: P) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const { d } = useT();
  const reduced = useReducedMotion();
  const swing = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    /*
      La cloche SONNE : un coup franc, puis elle s'amortit et se tait, et
      recommence un peu plus tard. Un balancement continu l'aurait fait
      ressembler a un pendule.
    */
    const ring = withSequence(
      withTiming(18, { duration: 110, easing: Easing.out(Easing.quad) }),
      withTiming(-15, { duration: 150 }),
      withTiming(11, { duration: 150 }),
      withTiming(-7, { duration: 150 }),
      withTiming(4, { duration: 140 }),
      withTiming(0, { duration: 160, easing: Easing.out(Easing.quad) }),
      withDelay(1700, withTiming(0, { duration: 1 })),
    );
    loop(swing, withDelay(500, withRepeat(ring, -1, false)));
    // Un tic a chaque coup, en phase avec la cloche.
    const first = setTimeout(() => haptics.tick(), 520);
    const id = setInterval(() => haptics.tick(), 2560);
    return () => { cancelAnimation(swing); clearTimeout(first); clearInterval(id); };
  }, [swing, reduced]);

  const bell = useAnimatedStyle(() => ({
    transform: [{ rotate: `${swing.value}deg` }],
  }));

  return (
    <Screen cta={d.ob.keepGoing} onPress={onNext} center hue="accent" readyAfter={READY_MS}>
      <View style={st.stage}>
        <Ripple delay={500} />
        <Ripple delay={1780} />
        <Animated.View entering={ZoomIn.springify().damping(13).stiffness(140)} style={st.ring}>
          {/* Elle pivote par son sommet, la ou elle est accrochee. */}
          <Animated.View style={[bell, { transformOrigin: '50% 12%' }]}>
            <Bell size={58} strokeWidth={1.7} color={c.accent} fill={withAlpha(c.accent, 0.16)} />
          </Animated.View>
          <Animated.View entering={ZoomIn.delay(700).springify().damping(10)} style={st.badge}>
            <Text variant="label" color={c.mist}>1</Text>
          </Animated.View>
        </Animated.View>
      </View>

      <Animated.View entering={FadeInDown.delay(260).duration(560)}>
        <Text variant="displayM" style={st.center}>{d.trial.bellTitle}</Text>
      </Animated.View>
      <Animated.View entering={FadeIn.delay(720).duration(520)}>
        <Text variant="lead" tone="secondary" style={[st.center, { marginTop: space.md }]}>{d.trial.bellBody}</Text>
      </Animated.View>

      {/* La notification telle qu'elle arrivera : la vraie, celle que l'app envoie. */}
      <Animated.View entering={FadeInUp.delay(1000).duration(620)} style={st.notif}>
        <Image source={MARK} style={st.notifIcon} contentFit="contain" />
        <View style={{ flex: 1 }}>
          <View style={st.notifHead}>
            <Text variant="label" tone="secondary">UnSwipe</Text>
            <Text variant="label" tone="tertiary">{d.pay.trialWarn}</Text>
          </View>
          <Text variant="button" numberOfLines={1}>{d.ui.trialTitle}</Text>
          <Text variant="label" tone="secondary" numberOfLines={2} style={{ textTransform: 'none' }}>{d.ui.trialBody}</Text>
        </View>
      </Animated.View>
    </Screen>
  );
}

/* ---------- Pieces ---------- */

/** Une onde qui part de l'icone et s'efface : le son, ou l'eclat. */
function Ripple({ delay }: { delay: number }) {
  const c = useColors();
  const reduced = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    loop(p, withDelay(delay, withRepeat(withTiming(1, { duration: 2200, easing: Easing.out(Easing.cubic) }), -1, false)));
    return () => cancelAnimation(p);
  }, [p, delay, reduced]);
  const style = useAnimatedStyle(() => ({
    opacity: (1 - p.value) * 0.45,
    transform: [{ scale: 1 + p.value * 0.9 }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', width: RING, height: RING, borderRadius: RING / 2, borderWidth: 1.5, borderColor: c.accent },
        style,
      ]}
    />
  );
}

const RING = 128;

const sheet = (c: Palette) => StyleSheet.create({
  center: { textAlign: 'center' },
  stage: { height: 230, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch', marginBottom: space.lg },
  ring: {
    width: RING, height: RING, borderRadius: RING / 2, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: withAlpha(c.accent, 0.55), backgroundColor: withAlpha(c.accent, 0.12),
    shadowColor: c.accent, shadowOpacity: 0.45, shadowRadius: 26, shadowOffset: { width: 0, height: 8 },
  },
  spark: { position: 'absolute' },
  badge: {
    position: 'absolute', top: 22, right: 24, minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6,
    alignItems: 'center', justifyContent: 'center', backgroundColor: c.danger,
    borderWidth: 2, borderColor: c.night,
  },
  notif: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, alignSelf: 'stretch',
    marginTop: space.xl, padding: space.md, borderRadius: radii.chip + 6,
    backgroundColor: withAlpha(c.mist, 0.1), borderWidth: 1, borderColor: withAlpha(c.mist, 0.16),
  },
  notifIcon: { width: 40, height: 40, borderRadius: 10 },
  notifHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
});
