import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ArrowDown, ArrowUp, Ticket } from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { gutter, space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { Glass } from '@/components/glass/Glass';
import { CortiRig } from '@/components/CortiRig';
import { cortiLevel, type CortiLevel } from '@/components/Corti';
import { stats, type Stats } from '@/services/protect';
import { useT } from '@/i18n';
import type { Scroll } from './parts';

/*
 * L'onglet de Corti : ce qu'est le chiffre, et d'ou il vient.
 *
 * Il etait affiche a trois endroits — sous la mascotte, dans une jauge, sur
 * le paywall — et nulle part on ne disait ce qu'il mesure. Un pourcentage
 * sans regle se lit soit comme un verdict, soit comme une decoration ; dans
 * les deux cas on cesse de le regarder. Celui-la a une regle simple, et elle
 * tient sur un ecran : on la donne en entier, chiffres compris, y compris ce
 * qui le fait BAISSER.
 *
 * Montrer les malus est un choix. Les cacher rendrait la jauge incomprehensible
 * le jour ou elle descend — et ce jour-la, c'est l'app qu'on soupconne.
 */

const ROW_ICON = { up: ArrowUp, raw: ArrowDown, pass: Ticket };

export function CortiTab({ onScroll }: { onScroll: Scroll }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const { d } = useT();
  const [s, setS] = useState<Stats | null>(null);

  useFocusEffect(useCallback(() => { void stats().then(setS); }, []));

  const level = cortiLevel(s?.days ?? 0);
  const brain = s?.brain ?? 18;
  const tone = brain < 35 ? c.danger : brain < 70 ? c.ember : c.accent;

  const moves: [keyof typeof ROW_ICON, string, string, string, string][] = [
    ['up', d.cortiTab.upV, d.cortiTab.upL, d.cortiTab.upB, c.accent],
    ['raw', d.cortiTab.rawV, d.cortiTab.rawL, d.cortiTab.rawB, c.danger],
    ['pass', d.cortiTab.passV, d.cortiTab.passL, d.cortiTab.passB, c.ember],
  ];

  const states: [CortiLevel, string][] = [
    [0, d.cortiTab.s0], [1, d.cortiTab.s1], [2, d.cortiTab.s2], [3, d.cortiTab.s3],
  ];

  return (
    <Animated.ScrollView
      contentContainerStyle={st.scroll}
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      <Text variant="displayM">{d.cortiTab.title}</Text>
      <Text variant="lead" tone="secondary" style={{ marginTop: space.sm }}>
        {d.cortiTab.lead}
      </Text>

      {/* Lui d'abord, le chiffre ensuite : c'est son etat qu'on vient voir,
          et le pourcentage n'est que la legende de ce qu'on lit sur sa tete. */}
      <View style={st.stage}>
        <CortiRig level={level} size={190} />
      </View>

      <Glass radius={24} intensity={50} warmEdge="none" style={st.gauge}>
        <View style={st.gaugeTop}>
          <Text variant="label" tone="tertiary">{d.cortiTab.index}</Text>
          <Text variant="displayM" color={tone}>{`${brain} %`}</Text>
        </View>
        <View style={st.track}>
          <View style={[st.fill, { width: `${brain}%`, backgroundColor: tone }]} />
        </View>

        {/* Les trois nombres d'ou sort le pourcentage. Sans eux la regle qui
            suit reste une theorie : la, on peut refaire le calcul soi-meme. */}
        {s && (
          <View style={st.counts}>
            <Count n={s.days} label={d.cortiTab.daysL} c={c.accent} />
            <Count n={s.passes} label={d.cortiTab.passesL} c={c.ember} />
          </View>
        )}
      </Glass>

      <Text variant="button" style={st.h}>{d.cortiTab.howTitle}</Text>
      <View style={st.moves}>
        {moves.map(([k, v, label, body, col], i) => {
          const Icon = ROW_ICON[k];
          return (
            <Animated.View
              key={k}
              entering={FadeIn.delay(60 * i).duration(320)}
              style={[st.move, { borderColor: withAlpha(col, 0.25) }]}
            >
              <View style={[st.badge, { backgroundColor: withAlpha(col, 0.14) }]}>
                <Icon size={15} strokeWidth={2.4} color={col} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={st.moveTop}>
                  <Text variant="button" style={{ flex: 1 }}>{label}</Text>
                  <Text variant="button" color={col}>{v}</Text>
                </View>
                <Text variant="body" tone="secondary" style={{ marginTop: 2 }}>{body}</Text>
              </View>
            </Animated.View>
          );
        })}
      </View>
      <Text variant="body" tone="tertiary" style={st.note}>{d.cortiTab.startB}</Text>

      <Text variant="button" style={st.h}>{d.cortiTab.pauseTitle}</Text>
      <Text variant="body" tone="secondary">{d.cortiTab.pauseB}</Text>

      <Text variant="button" style={st.h}>{d.cortiTab.statesTitle}</Text>
      <View style={st.states}>
        {states.map(([n, label]) => (
          <View key={n} style={[st.state, level === n && { borderColor: c.accent }]}>
            {/* Fige : quatre mascottes animees cote a cote se disputent le
                regard, et on ne voit plus laquelle est la sienne. */}
            <CortiRig level={n} size={54} animated={false} />
            <Text
              variant="label"
              tone={level === n ? 'primary' : 'tertiary'}
              style={st.stateLabel}
            >
              {label}
            </Text>
          </View>
        ))}
      </View>
      <Text variant="body" tone="tertiary" style={st.note}>{d.cortiTab.statesB}</Text>

      {/*
        Ce que ce n'est pas.
        Un pourcentage affiche a cote d'un cerveau se lit comme une mesure du
        cerveau. Ce n'en est pas une, personne ne peut en faire une depuis un
        telephone, et le dire ici coute moins cher que de le laisser croire.
      */}
      <Text variant="button" style={st.h}>{d.cortiTab.honestTitle}</Text>
      <Text variant="body" tone="secondary">{d.cortiTab.honestB}</Text>
    </Animated.ScrollView>
  );
}

function Count({ n, label, c }: { n: number; label: string; c: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text variant="button" color={c}>{n}</Text>
      <Text variant="label" tone="tertiary" style={{ textAlign: 'center' }}>{label}</Text>
    </View>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  scroll: { paddingHorizontal: gutter, paddingBottom: 140, paddingTop: space.md },
  stage: { alignItems: 'center', marginTop: space.lg },
  gauge: { padding: space.lg, marginTop: space.md },
  gaugeTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  track: {
    height: 8, borderRadius: 4, overflow: 'hidden', marginTop: space.sm,
    backgroundColor: withAlpha(c.mist, 0.1),
  },
  fill: { height: 8, borderRadius: 4 },
  counts: { flexDirection: 'row', marginTop: space.lg, gap: space.md },
  h: { marginTop: space.xl, marginBottom: space.sm },
  moves: { gap: space.sm },
  move: {
    flexDirection: 'row', alignItems: 'flex-start', gap: space.md,
    padding: space.md, borderRadius: 18, borderWidth: 1,
    backgroundColor: withAlpha(c.mist, 0.05),
  },
  badge: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  moveTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  note: { marginTop: space.md },
  states: { flexDirection: 'row', gap: space.sm },
  state: {
    flex: 1, alignItems: 'center', gap: 4, paddingVertical: space.md,
    borderRadius: 16, borderWidth: 1, borderColor: withAlpha(c.mist, 0.12),
  },
  stateLabel: { textAlign: 'center', paddingHorizontal: 4 },
});
