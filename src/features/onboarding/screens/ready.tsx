import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing, FadeIn, cancelAnimation, runOnJS, useAnimatedStyle, useSharedValue, withTiming,
} from 'react-native-reanimated';
import { space } from '@/theme/spacing';
import { useColors } from '@/theme/useColors';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/type/Text';
import { Typewriter } from '@/components/type/Typewriter';
import { CortiRig, cortiReact, type CortiReaction } from '@/components/CortiRig';
import type { CortiLevel } from '@/components/Corti';
import { haptics } from '@/lib/haptics';
import { useT } from '@/i18n';
import { HoldRing } from '../scenes/HoldRing';

type P = { onNext: () => void };

/** Trois secondes : le temps de vouloir, pas celui de cliquer. */
const HOLD_MS = 3000;
/** Les paliers : a quel point du maintien Corti passe au niveau suivant. */
const STEPS: [number, CortiLevel][] = [[0.15, 1], [0.5, 2], [0.85, 3]];

/**
 * « Tu es pret ? » — on repond en TENANT.
 *
 * Tout le parcours se traverse du doigt. Ici on demande la premiere
 * decision, et elle ne peut pas se prendre avec le geste qui vaut zero. On
 * appuie n'importe ou sur l'ecran, et on tient : un anneau se remplit
 * autour de Corti et, palier par palier, il se releve — ecrase, puis en
 * veilleuse, puis allume, puis rayonnant. On lache avant la fin : il
 * retombe, et l'anneau se vide. On tient jusqu'au bout : il saute de joie,
 * et c'est lui qu'on vient de relever.
 *
 * La sequence en images du studio faisait six secondes et saccadait : trop
 * lourde a decoder pendant qu'on tient, et impossible a reprendre au
 * milieu. Le rig, lui, vit sur le fil d'animation — l'anneau et la taille
 * suivent le doigt image par image — et il se reprend la ou on l'a lache.
 */
export function Ready({ onNext }: P) {
  const c = useColors();
  const st = useMemo(() => sheet(), []);
  const { d } = useT();
  const [holding, setHolding] = useState(false);
  const [level, setLevel] = useState<CortiLevel>(0);
  const [reaction, setReaction] = useState<CortiReaction | undefined>(undefined);
  const fill = useSharedValue(0);
  const fired = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => clearTimers, []);

  const done = () => {
    if (fired.current) return;
    fired.current = true;
    haptics.success();
    setLevel(3);
    setReaction(cortiReact('celebrate'));
    // On le laisse sauter avant de tourner la page : c'est sa joie qu'on
    // vient chercher, pas l'ecran suivant.
    timers.current.push(setTimeout(onNext, 800));
  };

  const grab = () => {
    if (fired.current) return;
    setHolding(true);
    haptics.press();
    clearTimers();
    // On repart d'ou en etait l'anneau : lache puis repris, il ne saute pas
    // a zero, et les paliers restants tombent au bon moment.
    const from = fill.value;
    STEPS.forEach(([at, lv]) => {
      const ms = Math.max(0, (at - from) * HOLD_MS);
      timers.current.push(setTimeout(() => {
        setLevel(lv);
        haptics.tick();
        if (lv > 1) setReaction(cortiReact('hop'));
      }, ms));
    });
    fill.value = withTiming(1, { duration: (1 - from) * HOLD_MS, easing: Easing.linear }, (finished) => {
      if (finished) runOnJS(done)();
    });
  };

  const release = () => {
    if (fired.current) return;
    setHolding(false);
    clearTimers();
    setLevel(0);
    cancelAnimation(fill);
    // Il se vide plus vite qu'il ne s'est rempli : lacher est une reponse.
    fill.value = withTiming(0, { duration: 320 });
  };

  // Il GRANDIT en meme temps que l'anneau se remplit : on sent le maintien
  // dans le corps, pas seulement dans un trait qui tourne.
  const grow = useAnimatedStyle(() => ({
    transform: [{ scale: 0.92 + fill.value * 0.1 }],
  }));

  return (
    <Screen center still hue="accent">
      <Pressable
        onPressIn={grab}
        onPressOut={release}
        style={st.press}
        accessibilityRole="button"
        accessibilityHint={d.ready.hold}
      >
        <Typewriter text={d.brain.fix} variant="displayM" speed={38} style={st.center} />
        <Animated.View entering={FadeIn.delay(1500).duration(500)}>
          <Text variant="displayM" color={c.accent} style={[st.center, { marginTop: space.sm }]}>
            {d.brain.ready}
          </Text>
        </Animated.View>

        <View style={st.stage}>
          <HoldRing progress={fill} size={264}>
            <Animated.View style={grow}>
              <CortiRig
                level={level}
                size={220}
                expression={level === 3 ? 'ravi' : 'auto'}
                reaction={reaction}
              />
            </Animated.View>
          </HoldRing>
        </View>

        <Animated.View entering={FadeIn.delay(2400).duration(600)}>
          <Text variant="label" tone="tertiary" style={st.center}>
            {holding ? d.ready.holding : d.ready.hold}
          </Text>
        </Animated.View>
      </Pressable>
    </Screen>
  );
}

const sheet = () => StyleSheet.create({
  // Toute la page est la zone de prise : on n'a pas a viser.
  press: { flex: 1, alignSelf: 'stretch', justifyContent: 'center' },
  center: { textAlign: 'center' },
  stage: { alignItems: 'center', marginVertical: space.xl },
});
