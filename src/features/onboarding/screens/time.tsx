import { useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Cake } from 'lucide-react-native';
import { Emblem } from '../scenes/Emblem';
import { space } from '@/theme/spacing';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/type/Text';
import { Typewriter } from '@/components/type/Typewriter';
import { track } from '@/services';
import { useT } from '@/i18n';
import { useOnboardingStore } from '@/store/onboarding';
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
  gaugeTight: { alignItems: 'center', marginVertical: space.lg },
  reassure: { height: 48, justifyContent: 'center' },
  age: { marginTop: space.xxl, alignItems: 'center' },
});
