import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming,
} from 'react-native-reanimated';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { space } from '@/theme/spacing';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/type/Text';
import { useT } from '@/i18n';
import { effectiveMinutes, useOnboardingStore } from '@/store/onboarding';
import { ACTIVITIES, activityCount } from '../calculations';

type P = { onNext: () => void };

/** Points par seconde : le rythme d'un generique, lisible sans s'arreter. */
const SPEED = 30;
/** La hauteur de la fenetre ou ca defile. */
const STAGE = 300;
/** Le bouton attend qu'on ait vu quelques lignes passer. */
const READ_MS = 2500;

/**
 * Ce que l'annee ecoulee aurait pu contenir — en defilement continu.
 *
 * Le chiffre brut, « 1 095 heures », ne veut rien dire. Converti en choses
 * qu'on se represente, il redevient une perte qu'on sent. Et ce sont des
 * choses qui font AVANCER : lire, monter sa boite, courir, apprendre a
 * coder, se transformer. Pas des loisirs.
 *
 * Les lignes montent sans fin, comme un generique : on ne lit pas une liste,
 * on regarde passer tout ce qu'on n'a pas fait. La liste est doublee et
 * recommence sans couture quand la premiere copie est sortie du cadre.
 */
export function Activities({ onNext }: P) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const { d, t } = useT();
  const minutes = useOnboardingStore(effectiveMinutes);
  const hours = (minutes * 365) / 60;

  const rows = useMemo(() => ACTIVITIES.map((a) => {
    const n = activityCount(hours, a.costHours);
    const whole = Math.floor(n);
    const w = d.s6.activities[a.id];
    const text = whole >= 2 ? w.other.replace('{n}', String(whole))
      : whole === 1 ? w.one
      : t(d.s6.progress, { p: String(Math.round(n * 100)), what: w.one });
    return { id: a.id, text, detail: w.detail };
  }), [hours, d, t]);

  const [h, setH] = useState(0);
  const [read, setRead] = useState(false);
  const y = useSharedValue(0);

  useEffect(() => {
    const id = setTimeout(() => setRead(true), READ_MS);
    return () => clearTimeout(id);
  }, []);

  // Une copie de la liste sort du cadre, et on repart de zero : la seconde
  // copie est exactement la ou la premiere etait.
  useEffect(() => {
    if (!h) return;
    y.value = 0;
    y.value = withRepeat(withTiming(-h, { duration: (h / SPEED) * 1000, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(y);
  }, [h, y]);

  const roll = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  return (
    <Screen cta={d.s6.cta2} onPress={onNext} disabled={!read} center hue="ember" hueLevel={0.5}>
      <Text variant="displayM" style={st.title}>{d.s6.afterTitle}</Text>

      <View style={st.stage}>
        <Animated.View style={roll}>
          <View onLayout={(e) => setH(e.nativeEvent.layout.height)}>
            {rows.map((r) => <Row key={r.id} text={r.text} detail={r.detail} />)}
          </View>
          {rows.map((r) => <Row key={`${r.id}2`} text={r.text} detail={r.detail} />)}
        </Animated.View>

        {/* Les bords se fondent dans le fond : les lignes naissent en bas et
            s'effacent en haut, au lieu d'etre coupees net. */}
        <LinearGradient colors={[c.night, withAlpha(c.night, 0)]} style={[st.fade, { top: 0 }]} pointerEvents="none" />
        <LinearGradient colors={[withAlpha(c.night, 0), c.night]} style={[st.fade, { bottom: 0 }]} pointerEvents="none" />
      </View>

      <Text variant="label" tone="tertiary" style={st.note}>{d.s6.estimates}</Text>
    </Screen>
  );
}

function Row({ text, detail }: { text: string; detail: string }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  return (
    <View style={st.row}>
      <Text variant="title" style={st.center}>{text}</Text>
      <Text variant="label" tone="tertiary" style={st.center}>{detail}</Text>
    </View>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  title: { textAlign: 'center' },
  stage: { height: STAGE, marginTop: space.lg, alignSelf: 'stretch', overflow: 'hidden' },
  fade: { position: 'absolute', left: 0, right: 0, height: 70 },
  row: { paddingVertical: space.md, gap: 3, alignItems: 'center' },
  center: { textAlign: 'center' },
  note: { marginTop: space.lg, textAlign: 'center' },
});
