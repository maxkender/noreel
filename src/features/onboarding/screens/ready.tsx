import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing, FadeIn, cancelAnimation, runOnJS, useSharedValue, withTiming,
} from 'react-native-reanimated';
import { space } from '@/theme/spacing';
import { useColors } from '@/theme/useColors';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/type/Text';
import { Typewriter } from '@/components/type/Typewriter';
import { CortiRig } from '@/components/CortiRig';
import { CortiRecovery, RECOVERY_MS } from '@/components/CortiRecovery';
import { haptics } from '@/lib/haptics';
import { useT } from '@/i18n';
import { HoldRing } from '../scenes/HoldRing';

type P = { onNext: () => void };

/**
 * « Tu es pret ? » — on repond en TENANT.
 *
 * Tout le parcours se traverse du doigt. Ici on demande la premiere
 * decision, et elle ne peut pas se prendre avec le geste qui vaut zero. On
 * appuie n'importe ou sur l'ecran, et on tient : pendant six secondes Corti
 * passe d'affaisse a rayonnant — la sequence complete du studio — et un
 * anneau se remplit autour de lui. On lache avant la fin : il retombe, et
 * l'anneau se vide. On tient jusqu'au bout : c'est fait, et c'est lui qu'on
 * vient de relever.
 *
 * Six secondes, c'est long pour un ecran. C'est le point : le temps de
 * vouloir, pas celui de cliquer.
 */
export function Ready({ onNext }: P) {
  const c = useColors();
  const st = useMemo(() => sheet(), []);
  const { d } = useT();
  const [holding, setHolding] = useState(false);
  // Change a chaque prise : la sequence repart du debut au lieu de reprendre
  // une animation deja terminee.
  const [run, setRun] = useState(0);
  const fill = useSharedValue(0);
  const fired = useRef(false);

  const done = () => {
    if (fired.current) return;
    fired.current = true;
    haptics.success();
    onNext();
  };

  const grab = () => {
    setHolding(true);
    setRun((n) => n + 1);
    haptics.press();
    fill.value = withTiming(1, { duration: RECOVERY_MS, easing: Easing.linear }, (finished) => {
      if (finished) runOnJS(done)();
    });
  };

  const release = () => {
    if (fired.current) return;
    setHolding(false);
    cancelAnimation(fill);
    // Il se vide plus vite qu'il ne s'est rempli : lacher est une reponse.
    fill.value = withTiming(0, { duration: 320 });
  };

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
          <HoldRing progress={fill} size={280}>
            {holding ? (
              <CortiRecovery key={run} size={240} loop={false} />
            ) : (
              <CortiRig level={0} size={240} />
            )}
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
