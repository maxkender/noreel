import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  Easing, useAnimatedStyle, useSharedValue, withTiming,
} from 'react-native-reanimated';
import { useColors, type Palette } from '@/theme/useColors';
import { space } from '@/theme/spacing';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/type/Text';
import { haptics } from '@/lib/haptics';
import { useT } from '@/i18n';
import { useOnboardingStore } from '@/store/onboarding';
import { ACTIVITIES, activityCount } from '../calculations';

type P = { onNext: () => void };

const A = Animated.createAnimatedComponent(BlurView);

const SHARPEN = 700;   // le temps que la ligne se fasse nette
const HOLD = 2200;     // le temps qu'on la lise
const SOFTEN = 450;    // le temps qu'elle se redissolve

/**
 * Ce que l'annee ecoulee aurait pu contenir.
 *
 * Le chiffre brut — « 1 095 heures » — ne veut rien dire : personne ne sait
 * a quoi ressemblent mille heures. Converti en choses qu'on se represente,
 * il redevient une perte qu'on sent.
 *
 * Les trois equivalences arrivent UNE PAR UNE, floues, et se font nettes.
 * Empilees en liste, l'oeil les comparait au lieu de les recevoir : trois
 * lignes cote a cote font un tableau de conversion. Une seule a l'ecran, qui
 * se precise puis se dissout, force a la regarder — et le rythme change,
 * dans un parcours ou tout le reste s'affiche d'un coup.
 */
export function Activities({ onNext }: P) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const { d, t } = useT();
  const minutes = useOnboardingStore((x) => x.minutesPerDay);
  const hours = (minutes * 365) / 60;

  /*
    Trois lignes, pas cinq. Le chinois est garde quoi qu'il arrive — c'est
    l'exemple qu'on retient — et on lui adjoint les deux plus gros chiffres.
  */
  const rows = useMemo(() => {
    const all = ACTIVITIES.map((a) => ({ id: a.id, n: activityCount(hours, a.costHours) }));
    const chinese = all.find((a) => a.id === 'chinese')!;
    return [
      chinese,
      ...all.filter((a) => a.id !== 'chinese').sort((x, y) => y.n - x.n).slice(0, 2),
    ];
  }, [hours]);

  const [i, setI] = useState(0);
  const sharp = useSharedValue(0);
  const last = i >= rows.length - 1;

  useEffect(() => {
    sharp.value = 0;
    sharp.value = withTiming(1, { duration: SHARPEN, easing: Easing.out(Easing.cubic) });
    haptics.tick();
    if (i >= rows.length - 1) return;
    // Les deux minuteries font avancer, jamais le corps de l'effet : un etat
    // ecrit la ferait rendre deux fois a chaque ligne.
    const soften = setTimeout(() => {
      sharp.value = withTiming(0, { duration: SOFTEN, easing: Easing.in(Easing.cubic) });
    }, HOLD);
    const next = setTimeout(() => setI((n) => n + 1), HOLD + SOFTEN);
    return () => { clearTimeout(soften); clearTimeout(next); };
  }, [i, rows.length, sharp]);

  // Le texte se pose en meme temps qu'il se fait net : l'echelle seule
  // suffirait a donner la mise au point, le flou la rend litterale.
  const line = useAnimatedStyle(() => ({
    opacity: 0.25 + sharp.value * 0.75,
    transform: [{ scale: 0.97 + sharp.value * 0.03 }],
  }));
  const veil = useAnimatedStyle(() => ({ opacity: 1 - sharp.value }));

  const row = rows[i];
  const a = d.s6.activities[row.id];
  const whole = Math.floor(row.n);
  const text = whole >= 2 ? a.other.replace('{n}', String(whole))
    : whole === 1 ? a.one
    // t() prend le TEXTE, pas la cle : ecrite entre guillemets, la cle
    // ressortait telle quelle a l'ecran — « s6.progress » en toutes lettres.
    : t(d.s6.progress, { p: String(Math.round(row.n * 100)), what: a.one });

  return (
    <Screen
      cta={d.s6.cta2}
      onPress={onNext}
      // On laisse les trois passer : partir avant, c'est n'en avoir lu qu'une.
      disabled={!last}
      center
      hue="ember"
      hueLevel={0.5}
    >
      <Text variant="displayM" style={st.title}>{d.s6.afterTitle}</Text>

      {/* Hauteur FIXE : une equivalence de deux lignes recentrerait tout le
          bloc, et le texte sauterait a chaque passage. */}
      <View style={st.stage}>
        <Animated.View style={line}>
          <Text variant="hero" style={st.big} numberOfLines={3} adjustsFontSizeToFit>
            {text}
          </Text>
        </Animated.View>

        {/* Le voile flou par-dessus, qui se retire : c'est un vrai flou qui
            se resout, pas une opacite qui imite la mise au point. */}
        <A
          intensity={22}
          tint="dark"
          style={[StyleSheet.absoluteFill, veil]}
          pointerEvents="none"
        />
      </View>

      <View style={st.dots}>
        {rows.map((r, k) => (
          <View key={r.id} style={[st.dot, k <= i && { backgroundColor: c.ember }]} />
        ))}
      </View>

      <Text variant="label" tone="tertiary" style={st.note}>{d.s6.estimates}</Text>
    </Screen>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  title: { textAlign: 'center' },
  stage: {
    height: 200, marginTop: space.xl,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  big: { textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginTop: space.xl },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: c.line },
  note: { marginTop: space.xl, textAlign: 'center' },
});
