import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useColors, type Palette } from '@/theme/useColors';
import { space } from '@/theme/spacing';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/type/Text';
import { haptics } from '@/lib/haptics';
import { useT } from '@/i18n';
import { effectiveMinutes, useOnboardingStore } from '@/store/onboarding';
import { ACTIVITIES, activityCount } from '../calculations';

type P = { onNext: () => void };

const SHOW = 5;        // le nombre de lignes qu'on fait passer
const HOLD = 1500;     // le temps qu'on lise une ligne
const FADE = 350;      // le temps qu'elle s'efface

/**
 * Ce que l'annee ecoulee aurait pu contenir — une ligne a la fois.
 *
 * Le chiffre brut, « 1 095 heures », ne veut rien dire. Converti en choses
 * qu'on se represente, il redevient une perte qu'on sent. Et ce sont des
 * choses qui font AVANCER : lire, monter sa boite, courir, apprendre a
 * coder, se transformer.
 *
 * Une seule ligne a l'ecran, qui apparait, se lit, s'efface, et la suivante
 * prend sa place. Empilees, l'oeil les comparait au lieu de les recevoir.
 * Pas de sous-titre : la ligne suffit.
 */
export function Activities({ onNext }: P) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const { d, t } = useT();
  const minutes = useOnboardingStore(effectiveMinutes);
  const hours = (minutes * 365) / 60;

  // Les lignes qu'on peut faire au moins une fois d'abord, dans l'ordre de
  // la liste ; les autres completent, en pourcentage du chemin.
  const rows = useMemo(() => {
    const all = ACTIVITIES.map((a) => {
      const n = activityCount(hours, a.costHours);
      const whole = Math.floor(n);
      const w = d.s6.activities[a.id];
      const text = whole >= 2 ? w.other.replace('{n}', String(whole))
        : whole === 1 ? w.one
        : t(d.s6.progress, { p: String(Math.round(n * 100)), what: w.one });
      return { id: a.id, text, n };
    });
    const can = all.filter((r) => r.n >= 1);
    const rest = all.filter((r) => r.n < 1);
    return [...can, ...rest].slice(0, SHOW);
  }, [hours, d, t]);

  const [i, setI] = useState(0);
  const last = i >= rows.length - 1;

  useEffect(() => {
    haptics.tick();
    if (last) return;
    const id = setTimeout(() => setI((n) => n + 1), HOLD + FADE);
    return () => clearTimeout(id);
  }, [i, last]);

  const row = rows[i];

  return (
    <Screen cta={d.s6.cta2} onPress={onNext} disabled={!last} center hue="ember" hueLevel={0.5}>
      <Text variant="displayM" style={st.title}>{d.s6.afterTitle}</Text>

      {/* Hauteur FIXE : une ligne de deux rangees recentrerait tout le bloc,
          et le texte sauterait a chaque passage. */}
      <View style={st.stage}>
        {row && (
          <Animated.View key={row.id} entering={FadeIn.duration(420)} exiting={FadeOut.duration(FADE)} style={st.line}>
            <Text variant="hero" style={st.big} numberOfLines={3} adjustsFontSizeToFit>{row.text}</Text>
          </Animated.View>
        )}
      </View>

      <View style={st.dots}>
        {rows.map((r, k) => (
          <View key={r.id} style={[st.dot, k <= i && { backgroundColor: c.ember }]} />
        ))}
      </View>
    </Screen>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  title: { textAlign: 'center' },
  stage: { height: 210, marginTop: space.xl, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  line: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  big: { textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginTop: space.xl },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: c.line },
});
