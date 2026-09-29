import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Animated from 'react-native-reanimated';
import { Check } from 'lucide-react-native';
import { Image } from 'expo-image';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { gutter, space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { Glass } from '@/components/glass/Glass';
import { HelpSheet, type HelpTopic } from '@/components/HelpSheet';
import { haptics } from '@/lib/haptics';
import { formatHours } from '@/lib/format';
import { CortiDock } from '@/components/CortiDock';
import { CortiRecovery } from '@/components/CortiRecovery';
import { cortiReact, type CortiReaction } from '@/components/CortiRig';
import { cortiLevel, cortiLine } from '@/components/Corti';
import { CARE_PER_DAY, logCare, stats, type CareId, type Stats } from '@/services/protect';
import { CARE, careOfTheDay } from '@/services/care';
import { claimCheer } from '@/services/cheer';
import { useT } from '@/i18n';
import type { Scroll } from './parts';

/*
 * L'onglet de Corti : lui, son chiffre, une phrase, un geste.
 *
 * Il portait tout ce qu'on pouvait dire de l'indice — la regle en trois
 * lignes chiffrees, les quatre etats, la pause, ce que ce n'est pas — et
 * neuf gestes en trois familles. Tout etait vrai, et on ne comprenait rien :
 * une page qui explique tout n'explique plus rien. Elle dit maintenant UNE
 * chose par bloc, et le reste attend derriere « comment ca marche ? » pour
 * qui le veut. La regle entiere, malus compris, y est toujours : la cacher
 * rendrait la jauge incomprehensible le jour ou elle descend.
 */
export function CortiTab({ onScroll }: { onScroll: Scroll }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const { d, t } = useT();
  const [s, setS] = useState<Stats | null>(null);
  /** Les gestes deja declares aujourd'hui. */
  const [done, setDone] = useState<string[]>([]);
  const [help, setHelp] = useState(false);
  const [all, setAll] = useState(false);
  const today = careOfTheDay();
  const tick = (id: CareId) => {
    if (done.includes(id)) return;
    haptics.success();
    void logCare(id).then(setDone);
  };

  useFocusEffect(useCallback(() => {
    void stats().then((x) => { setS(x); setDone(x.careToday); });
  }, []));

  /*
    Le septieme jour et le trentieme, la scene cede sa place a la sequence
    complete : Corti passe d'affaisse a rayonnant, une fois, puis la scene
    reprend — sur un saut de joie, pas sur un arret net. C'est le seul moment
    ou l'app se rejouit ; le reste du temps elle dit ou l'on en est.
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

  // Tout le detail, range derriere une ligne. Les memes mots qu'avant, au
  // meme endroit pour qui les cherche — et hors du chemin de qui ne veut
  // que savoir comment va Corti.
  const topics: HelpTopic[] = [
    { t: d.cortiTab.plainTitle, h: d.cortiTab.oneLine, b: `${d.cortiTab.plainBody}\n\n${d.cortiTab.startB}` },
    {
      t: d.cortiTab.howTitle, h: d.cortiTab.howH,
      b: [
        `${d.cortiTab.upL} : ${d.cortiTab.upV}. ${d.cortiTab.upB}`,
        `${d.cortiTab.rawL} : ${d.cortiTab.rawV}. ${d.cortiTab.rawB}`,
        `${d.cortiTab.passL} : ${d.cortiTab.passV}. ${d.cortiTab.passB}`,
        '', d.cortiTab.pauseB,
      ].join('\n'),
    },
    {
      t: d.cortiTab.statesTitle, h: d.cortiTab.statesH,
      b: [d.cortiTab.s0, d.cortiTab.s1, d.cortiTab.s2, d.cortiTab.s3, '', d.cortiTab.statesB].join('\n'),
    },
    { t: d.cortiTab.careTitle, h: d.cortiTab.careShort, b: d.cortiTab.careBody },
    { t: d.cortiTab.honestTitle, h: d.cortiTab.honestH, b: d.cortiTab.honestB },
  ];

  return (
    <Animated.ScrollView
      contentContainerStyle={st.scroll}
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      {/* Lui d'abord, sur sa soucoupe : c'est son etat qu'on vient voir. Le
          halo prend la couleur de l'indice, et on sait ou l'on en est avant
          d'avoir lu un chiffre. */}
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

      {/* Sa phrase a lui : la seule ligne de l'app qui ne rapporte pas un
          chiffre, et c'est pour elle qu'on revient voir comment il va. */}
      {s && (
        <Text variant="lead" color={c.accent} style={st.line}>
          {cortiLine(level, s.days)}
        </Text>
      )}

      {/* Le chiffre, et UNE phrase. Le reste attend derriere la ligne bleue. */}
      <Glass radius={24} intensity={50} warmEdge="none" style={st.gauge}>
        <View style={st.gaugeTop}>
          <Text variant="label" tone="tertiary">{d.cortiTab.index}</Text>
          <Text variant="displayM" color={tone}>{`${brain} %`}</Text>
        </View>
        <View style={st.track}>
          <View style={[st.fill, { width: `${brain}%`, backgroundColor: tone }]} />
        </View>
        <Text variant="body" tone="secondary" style={{ marginTop: space.md }}>{d.cortiTab.oneLine}</Text>
        <Pressable
          onPress={() => { haptics.tap(); setHelp(true); }}
          hitSlop={8}
          accessibilityRole="button"
          style={st.how}
        >
          <Text variant="label" color={c.accent}>{d.cortiTab.how}</Text>
        </Pressable>
      </Glass>

      {/* Les trois chiffres qu'on a OBSERVES — ceux qui justifient
          l'abonnement a la fin du mois. Trois nombres, pas un paragraphe. */}
      {s && (
        <View style={st.figures}>
          <Count v={String(s.blocked)} label={d.stats.reelsAvoided} c={c.accent} />
          <Count v={formatHours(s.minutes)} label={d.stats.timeBack} c={c.accent} />
          <Count v={`${s.days} j`} label={d.stats.daysKept} c={c.accent} />
        </View>
      )}

      {/*
        UN geste, mis en avant. Neuf cases sont un formulaire ; une
        proposition est un geste. Les huit autres attendent derriere une
        ligne, pour qui en veut plus aujourd'hui.
      */}
      <Text variant="button" style={st.h}>{d.cortiTab.todayTitle}</Text>
      <Text variant="body" tone="secondary">{d.cortiTab.careShort}</Text>
      <CareCard id={today} done={done.includes(today)} featured onPress={() => tick(today)} />

      <Pressable onPress={() => { haptics.tap(); setAll((x) => !x); }} hitSlop={8} accessibilityRole="button" style={st.more}>
        <Text variant="label" color={c.accent}>{all ? d.cortiTab.less : d.cortiTab.more}</Text>
      </Pressable>
      {all && (
        <View style={st.cares}>
          {CARE.filter((x) => x.id !== today).map((x) => (
            <CareCard key={x.id} id={x.id} done={done.includes(x.id)} onPress={() => tick(x.id)} />
          ))}
        </View>
      )}
      {done.length > 0 && (
        <Text variant="label" tone="tertiary" style={st.note}>
          {done.length >= CARE_PER_DAY
            ? d.cortiTab.careFull
            : t(d.cortiTab.careLeft, { n: Math.min(done.length, CARE_PER_DAY) })}
        </Text>
      )}

      <HelpSheet visible={help} onClose={() => setHelp(false)} topics={topics} />
    </Animated.ScrollView>
  );
}

/*
 * Une icone illustree par geste, dans le style de Corti.
 *
 * Les pictos en trait etaient corrects et pas beaux : neuf lignes grises
 * cote a cote font une liste de reglages. Celles-ci sont dessinees par le
 * studio, avec le meme verre bleu glace et la meme lueur que la mascotte —
 * l'onglet a enfin l'air d'appartenir a la meme app que Corti. Elles portent
 * leur propre halo : on ne les enferme donc plus dans un anneau.
 */
const CARE_ICON = {
  morning: require('@/assets/care/morning.png'),
  bored: require('@/assets/care/bored.png'),
  sleep: require('@/assets/care/sleep.png'),
  focus: require('@/assets/care/focus.png'),
  read: require('@/assets/care/read.png'),
  delay: require('@/assets/care/delay.png'),
  sun: require('@/assets/care/sun.png'),
  move: require('@/assets/care/move.png'),
  cold: require('@/assets/care/cold.png'),
} as const;

/**
 * Un geste : son icone, son titre, sa raison, et une coche.
 *
 * En vedette, la carte grandit et porte la mention du jour ; sinon elle
 * tient sur deux lignes. La raison est toujours la : c'est elle qui fait
 * qu'on choisit celui-la plutot qu'un autre, et pas la case a cocher.
 */
function CareCard({
  id, done, featured = false, onPress,
}: { id: CareId; done: boolean; featured?: boolean; onPress: () => void }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const { d } = useT();
  const title = d.cortiTab[`${id}T` as const];
  const why = d.cortiTab[`${id}W` as const];
  return (
    <Pressable
      onPress={onPress}
      disabled={done}
      style={[st.care, featured && st.careFeatured, done && { borderColor: c.accent, backgroundColor: withAlpha(c.accent, 0.1) }]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
    >
      <Image
        source={CARE_ICON[id]}
        style={[st.careIcon, featured && st.careIconBig, !done && !featured && st.careIconDim]}
        contentFit="contain"
      />
      <View style={{ flex: 1 }}>
        {featured && (
          <Text variant="label" color={c.ember} style={{ marginBottom: 2 }}>{d.cortiTab.todayPick}</Text>
        )}
        <Text variant={featured ? 'button' : 'body'} tone={done ? 'primary' : 'primary'}>{title}</Text>
        <Text variant="label" tone="tertiary" style={{ marginTop: 2 }}>{why}</Text>
      </View>
      <View style={[st.tick, done && { backgroundColor: c.accent, borderColor: c.accent }]}>
        {done && <Check size={12} strokeWidth={3} color={c.night} />}
      </View>
    </Pressable>
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
  figures: {
    flexDirection: 'row', gap: space.md, marginTop: space.md,
    paddingVertical: space.lg, borderRadius: 20,
    backgroundColor: withAlpha(c.mist, 0.06),
  },
  h: { marginTop: space.xl, marginBottom: space.sm },
  how: { marginTop: space.md, alignSelf: 'flex-start' },
  more: { marginTop: space.md, marginBottom: space.sm, alignSelf: 'flex-start' },
  cares: { gap: space.sm },
  care: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    padding: space.md, borderRadius: 16, borderWidth: 1,
    borderColor: withAlpha(c.mist, 0.12),
  },
  careFeatured: {
    marginTop: space.lg, padding: space.lg, borderRadius: 20,
    borderColor: withAlpha(c.ember, 0.4), backgroundColor: withAlpha(c.ember, 0.07),
  },
  careIcon: { width: 44, height: 44 },
  careIconBig: { width: 64, height: 64 },
  // Un geste pas encore fait reste un peu en retrait ; fait ou du jour, il
  // brille de toute sa lueur.
  careIconDim: { opacity: 0.72 },
  tick: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 1.5,
    borderColor: withAlpha(c.mist, 0.3),
    alignItems: 'center', justifyContent: 'center',
  },
  note: { marginTop: space.md },
});
