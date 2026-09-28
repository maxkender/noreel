import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ArrowDown, ArrowUp, Check, Ticket } from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { gutter, space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { Glass } from '@/components/glass/Glass';
import { haptics } from '@/lib/haptics';
import { formatHours } from '@/lib/format';
import { CortiDock } from '@/components/CortiDock';
import { CortiRecovery } from '@/components/CortiRecovery';
import { CortiRig, cortiReact, type CortiReaction } from '@/components/CortiRig';
import { cortiLevel, cortiLine, type CortiLevel } from '@/components/Corti';
import {
  CARE_IDS, CARE_PER_DAY, logCare, stats, type Stats,
} from '@/services/protect';
import { claimCheer } from '@/services/cheer';
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
  const { d, t } = useT();
  const [s, setS] = useState<Stats | null>(null);
  /** Les gestes deja declares aujourd'hui. */
  const [done, setDone] = useState<string[]>([]);

  useFocusEffect(useCallback(() => {
    void stats().then((x) => { setS(x); setDone(x.careToday); });
  }, []));

  /*
    Le septieme jour et le trentieme, la scene cede sa place a la sequence
    complete : Corti passe d'affaisse a rayonnant, une fois, puis la scene
    reprend — sur un saut de joie, pas sur un arret net. C'est le seul moment
    ou l'app se rejouit ; le reste du temps elle dit ou l'on en est.

    Elle vivait sur l'onglet blocage. En deplacant Corti ici, je l'ai rendue
    INATTEIGNABLE : la carte qui la portait n'etait plus rendue nulle part, et
    les six secondes du studio — trois megaoctets et demi embarques — ne
    pouvaient plus se jouer. Elle suit donc Corti, comme le reste.
  */
  const [cheer, setCheer] = useState(false);
  const [hooray, setHooray] = useState<CortiReaction | undefined>();
  useEffect(() => {
    let alive = true;
    void claimCheer(cortiLevel(s?.days ?? 0)).then((ok) => { if (alive && ok) setCheer(true); });
    return () => { alive = false; };
  }, [s?.days]);

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

      {/*
        Lui d'abord, sur sa soucoupe, et le chiffre ensuite.

        C'est son etat qu'on vient voir ; le pourcentage n'est que la legende
        de ce qu'on lit deja sur sa figure. Et il est POSE sur la scene du
        studio plutot que sur du vide : elle ne s'arrete jamais — le socle
        flotte, l'anneau tourne, les eclats derivent — et le halo prend la
        couleur de l'indice, si bien qu'on sait ou l'on en est avant d'avoir
        lu le moindre chiffre. Une vignette immobile ne donne aucune raison de
        revenir sur cet onglet ; une scene qui vit, si.
      */}
      <View style={st.stage}>
        {cheer ? (
          <CortiRecovery
            size={268}
            loop={false}
            onDone={() => { setCheer(false); setHooray(cortiReact('celebrate')); }}
          />
        ) : (
          <CortiDock level={level} size={268} tint={tone} reaction={hooray} />
        )}
      </View>

      {/* Sa phrase a lui. C'est la seule ligne de l'app qui ne rapporte pas un
          chiffre, et c'est pour elle qu'on revient voir comment il va. */}
      {s && (
        <Text variant="lead" color={c.accent} style={st.line}>
          {cortiLine(level, s.days)}
        </Text>
      )}

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
            <Count v={String(s.days)} label={d.cortiTab.daysL} c={c.accent} />
            <Count v={String(s.passes)} label={d.cortiTab.passesL} c={c.ember} />
          </View>
        )}
      </Glass>

      {/*
        Les chiffres qui justifient l'abonnement a la fin du mois.

        Ils vivaient sur la carte de l'onglet blocage. En deplacant Corti ici
        j'ai retire cette carte, et ces trois-la ont disparu de l'app avec
        elle : les reels evites, le temps repris, les jours tenus. Ce sont les
        seuls chiffres qu'on ait le droit de montrer — ceux qu'on a OBSERVES —
        et les perdre en reorganisant des onglets aurait ete le genre de
        regression qu'on ne voit qu'au moment de resilier.
      */}
      {s && (
        <View style={st.figures}>
          <Count v={String(s.blocked)} label={d.stats.reelsAvoided} c={c.accent} />
          <Count v={formatHours(s.minutes)} label={d.stats.timeBack} c={c.accent} />
          <Count v={`${s.days} j`} label={d.stats.daysKept} c={c.accent} />
        </View>
      )}

      {/*
        UNE phrase avant le detail.

        La page ouvrait sur un tableau de trois lignes chiffrees : c'est la
        reponse a « comment » avant qu'on ait compris « quoi ». On dit d'abord
        ce qu'est l'indice en une phrase, et le detail vient pour qui le veut.
      */}
      <Text variant="button" style={st.h}>{d.cortiTab.plainTitle}</Text>
      <Text variant="body" tone="secondary">{d.cortiTab.plainBody}</Text>

      {/*
        Et de quoi le REPARER.

        L'indice ne descendait que par des malus et ne montait qu'en attendant
        le lendemain : rien a faire dans l'instant, sinon patienter. Un
        compteur sur lequel on n'a aucune prise se regarde une fois. Ces
        gestes-la donnent une action tout de suite — et ils rapportent PEU,
        parce qu'on ne peut rien verifier : un point chacun, trois par jour au
        plus, et l'ecran ecrit qu'on te croit sur parole. Un compteur qui
        prend ta parole sans le dire fabrique un chiffre incontestable, et
        c'est justement ce qu'on reproche a ces apps-la.
      */}
      <Text variant="button" style={st.h}>{d.cortiTab.careTitle}</Text>
      <Text variant="body" tone="secondary">{d.cortiTab.careBody}</Text>
      <View style={st.cares}>
        {CARE_IDS.map((id) => {
          const on = done.includes(id);
          return (
            <Pressable
              key={id}
              onPress={() => { if (!on) { haptics.success(); void logCare(id).then(setDone); } }}
              disabled={on}
              style={[st.care, on && { borderColor: c.accent, backgroundColor: withAlpha(c.accent, 0.1) }]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
            >
              <View style={[st.tick, on && { backgroundColor: c.accent }]}>
                {on && <Check size={12} strokeWidth={3} color={c.night} />}
              </View>
              <Text variant="body" tone={on ? 'primary' : 'secondary'} style={{ flex: 1 }}>
                {d.cortiTab[id]}
              </Text>
              {on && <Text variant="label" color={c.accent}>+1</Text>}
            </Pressable>
          );
        })}
      </View>
      <Text variant="label" tone="tertiary" style={st.note}>
        {done.length >= CARE_PER_DAY
          ? d.cortiTab.careFull
          : t(d.cortiTab.careLeft, { n: Math.min(done.length, CARE_PER_DAY) })}
      </Text>

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

function Count({ v, label, c }: { v: string; label: string; c: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text variant="button" color={c}>{v}</Text>
      <Text variant="label" tone="tertiary" style={{ textAlign: 'center' }}>{label}</Text>
    </View>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  scroll: { paddingHorizontal: gutter, paddingBottom: 140, paddingTop: space.md },
  stage: { alignItems: 'center', marginTop: space.lg },
  line: { textAlign: 'center', marginTop: space.sm },
  gauge: { padding: space.lg, marginTop: space.md },
  gaugeTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  track: {
    height: 8, borderRadius: 4, overflow: 'hidden', marginTop: space.sm,
    backgroundColor: withAlpha(c.mist, 0.1),
  },
  fill: { height: 8, borderRadius: 4 },
  counts: { flexDirection: 'row', marginTop: space.lg, gap: space.md },
  figures: {
    flexDirection: 'row', gap: space.md, marginTop: space.md,
    paddingVertical: space.lg, borderRadius: 20,
    backgroundColor: withAlpha(c.mist, 0.06),
  },
  h: { marginTop: space.xl, marginBottom: space.sm },
  moves: { gap: space.sm },
  cares: { gap: space.sm, marginTop: space.md },
  care: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    padding: space.md, borderRadius: 16, borderWidth: 1,
    borderColor: withAlpha(c.mist, 0.12),
  },
  tick: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 1.5,
    borderColor: withAlpha(c.mist, 0.3),
    alignItems: 'center', justifyContent: 'center',
  },
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
