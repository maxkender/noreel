import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { space } from '@/theme/spacing';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/type/Text';
import { useT } from '@/i18n';
import { useOnboardingStore } from '@/store/onboarding';
import { ACTIVITIES, activityCount } from '../calculations';

type P = { onNext: () => void };

/**
 * Ce que l'annee ecoulee aurait pu contenir.
 *
 * Le chiffre brut — « 1 095 heures » — ne veut rien dire : personne ne sait
 * a quoi ressemblent mille heures. Converti en choses qu'on se represente,
 * il redevient une perte qu'on sent. Les activites sont classees par ordre
 * decroissant, et celles qu'on n'a pas tout a fait atteintes sont dites en
 * part du chemin plutot que tues : rater le chinois de trente pour cent
 * pese plus lourd que de ne pas le voir du tout.
 */
export function Activities({ onNext }: P) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const { d, t } = useT();
  const minutes = useOnboardingStore((x) => x.minutesPerDay);
  const hours = (minutes * 365) / 60;

  /*
    Trois lignes, pas cinq.
    Une liste de cinq equivalences se lit comme un tableau de conversion et
    ne frappe plus : l'oeil les compare au lieu de les recevoir. Le chinois
    est garde quoi qu'il arrive — c'est l'exemple qu'on retient — et on lui
    adjoint les deux plus gros chiffres.
  */
  const all = ACTIVITIES.map((a) => ({ id: a.id, n: activityCount(hours, a.costHours) }));
  const chinese = all.find((a) => a.id === 'chinese')!;
  const rows = [
    chinese,
    ...all.filter((a) => a.id !== 'chinese').sort((x, y) => y.n - x.n).slice(0, 2),
  ];

  return (
    <Screen cta={d.s6.cta2} onPress={onNext} hue="ember" hueLevel={0.5}>
      <Text variant="displayM" style={st.title}>{d.s6.afterTitle}</Text>

      <View style={st.list}>
        {rows.map((r, i) => {
          const a = d.s6.activities[r.id];
          const whole = Math.floor(r.n);
          // Une ligne, pas deux.
          //
          // Chaque entree portait sous elle son bareme — « ≈ 6 h par livre ».
          // Trois lignes de note sous trois lignes de texte : l'oeil lisait
          // le bas de page au lieu du chiffre. Ce qui n'est pas atteint se
          // dit dans la phrase elle-meme, pas en dessous.
          const line = whole >= 2 ? a.other.replace('{n}', String(whole))
            : whole === 1 ? a.one
            : t('s6.progress', { p: String(Math.round(r.n * 100)), what: a.one });
          return (
            <Animated.View
              key={r.id}
              entering={FadeIn.delay(320 + i * 160).duration(520)}
              style={st.row}
            >
              <View style={st.bullet} />
              <Text variant="lead" style={{ flex: 1 }}>{line}</Text>
            </Animated.View>
          );
        })}
      </View>

      <Text variant="label" tone="tertiary" style={st.note}>{d.s6.estimates}</Text>
    </Screen>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  title: { textAlign: 'center' },
  body: { marginTop: space.md },
  list: { marginTop: space.xxl, gap: space.xl },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  bullet: {
    width: 7, height: 7, borderRadius: 4, marginTop: 8,
    backgroundColor: withAlpha(c.ember, 0.9),
  },
  note: { marginTop: space.xl, textAlign: 'center' },
});
