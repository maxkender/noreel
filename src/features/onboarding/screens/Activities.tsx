import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { space } from '@/theme/spacing';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/type/Text';
import { haptics } from '@/lib/haptics';
import { useT } from '@/i18n';
import { effectiveMinutes, useOnboardingStore } from '@/store/onboarding';
import { ACTIVITIES, activityCount } from '../calculations';

type P = { onNext: () => void };

const SHOW = 5;        // le nombre de pilules
const STEP = 380;      // l'ecart entre deux pilules

/**
 * Ce que l'annee ecoulee aurait pu contenir — une ligne a la fois.
 *
 * Le chiffre brut, « 1 095 heures », ne veut rien dire. Converti en choses
 * qu'on se represente, il redevient une perte qu'on sent. Et ce sont des
 * choses qui font AVANCER : lire, monter sa boite, courir, apprendre a
 * coder, se transformer.
 *
 * Une seule ligne a l'ecran : elle monte en se revelant, se lit, s'eleve
 * en s'effacant, et la suivante prend sa place par le meme chemin. Empilees,
 * l'oeil les comparait au lieu de les recevoir. Pas de sous-titre.
 */
export function Activities({ onNext }: P) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const { d, t } = useT();
  const minutes = useOnboardingStore(effectiveMinutes);
  const hours = (minutes * 365) / 60;

  /*
    Cinq lignes : « apprendre une langue » TOUJOURS, en deuxieme — c'est
    l'equivalence que tout le monde comprend — et quatre autres, celles qu'on
    peut faire au moins une fois d'abord, dans l'ordre de la liste.
  */
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
    const lang = all.find((r) => r.id === 'language');
    const others = all.filter((r) => r.id !== 'language');
    const can = others.filter((r) => r.n >= 1);
    const rest = others.filter((r) => r.n < 1);
    const picked = [...can, ...rest].slice(0, SHOW - 1);
    return lang ? [picked[0], lang, ...picked.slice(1)] : picked;
  }, [hours, d, t]);

  // Le bouton attend la derniere pilule.
  const [read, setRead] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setRead(true), STEP * rows.length + 500);
    for (let k = 0; k < rows.length; k += 1) setTimeout(() => haptics.tick(), STEP * k + 120);
    return () => clearTimeout(id);
  }, [rows.length]);

  return (
    <Screen cta={d.s6.cta2} onPress={onNext} disabled={!read} center hue="ember" hueLevel={0.5}>
      <Text variant="displayM" style={st.title}>{d.s6.afterTitle}</Text>

      {/* Les pilules, l'une sous l'autre, chacune qui POP a son tour : la
          premiere, bam, la deuxieme apparait — rien a attendre qui defile. */}
      <View style={st.pills}>
        {rows.map((r, k) => (
          <Animated.View
            key={r.id}
            entering={FadeIn.delay(STEP * k).duration(450)}
            style={[st.pill, { backgroundColor: withAlpha(c.ember, 0.14), borderColor: withAlpha(c.ember, 0.45) }]}
          >
            <Text variant="title" style={st.pillText}>{r.text}</Text>
          </Animated.View>
        ))}
      </View>
    </Screen>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  title: { textAlign: 'center' },
  pills: { alignSelf: 'stretch', gap: space.sm, marginTop: space.xl },
  pill: {
    paddingVertical: 14, paddingHorizontal: 18, borderRadius: 18, borderWidth: 1,
    alignItems: 'center', backgroundColor: withAlpha(c.ember, 0.14),
  },
  pillText: { textAlign: 'center' },
});
