import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated as RNAnimated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Animated, { FadeInDown, FadeOut, ZoomIn } from 'react-native-reanimated';
import { Check, Plus, Trash2 } from 'lucide-react-native';
import { Image } from 'expo-image';
import * as StoreReview from 'expo-store-review';
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
import { cortiLine } from '@/components/Corti';
import {
  CARE_PER_DAY, CARE_POINTS, XP_LEVELS, customEntry, logCare, pointsOf, stats, type CareId, type Stats,
} from '@/services/protect';
import { CARE, careOfTheDay } from '@/services/care';
import { BADGES, badgeGap, claimBadges, unlockedBadges, type Badge } from '@/services/badges';
import { claimCheer } from '@/services/cheer';
import { useGoals, type Goal } from '@/store/goals';
import { useT } from '@/i18n';
import { Celebrate } from './Celebrate';
import { BadgeArt } from './BadgeArt';
import { GoalSheet } from './GoalSheet';
import type { Scroll } from './parts';

/*
 * L'onglet de Corti : ses points de dopamine, ses objectifs, ses badges.
 *
 * Les points de dopamine sont la SANTE de Corti, pas un score de jeu : ils
 * montent avec chaque objectif coche et chaque journee sans Reels, ils
 * descendent avec un laissez-passer ou une journee sans filtre, et ce sont
 * eux qui decident de son etat — eteint, en veilleuse, allume, rayonnant.
 * La jauge le montre comme un chemin a quatre etapes, et un objectif coche
 * se voit tout de suite : la page remonte sur la jauge, la barre avance, le
 * chiffre grimpe, « +15 points de dopamine » se pose, et Corti saute.
 *
 * Les objectifs ne portent que leur nom et leurs points. Les siens, la
 * personne les cree elle-meme.
 */

/** Le mot et la ligne d'un badge, lus dans le dictionnaire par son identifiant. */
const NAME: Record<string, ['bDay1' | 'bDay7' | 'bDay30' | 'bDay100' | 'bReels100' | 'bReels1000' | 'bReels10000' | 'bCare1' | 'bCare10' | 'bCare3', 'bDay1H' | 'bDay7H' | 'bDay30H' | 'bDay100H' | 'bReels100H' | 'bReels1000H' | 'bReels10000H' | 'bCare1H' | 'bCare10H' | 'bCare3H']> = {
  day1: ['bDay1', 'bDay1H'], day7: ['bDay7', 'bDay7H'], day30: ['bDay30', 'bDay30H'], day100: ['bDay100', 'bDay100H'],
  reels100: ['bReels100', 'bReels100H'], reels1000: ['bReels1000', 'bReels1000H'], reels10000: ['bReels10000', 'bReels10000H'],
  care1: ['bCare1', 'bCare1H'], care10: ['bCare10', 'bCare10H'], care3: ['bCare3', 'bCare3H'],
};

type Pop =
  | { kind: 'badge'; id: string }
  | { kind: 'level'; level: number };

/** Un objectif a cocher : fourni (icone du studio) ou cree (emoji). */
type Item = { key: string; entry: string; title: string; points: number; care?: CareId; goal?: Goal };

export function CortiTab({ onScroll }: { onScroll: Scroll }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const { d, t } = useT();
  const list = useRef<Animated.ScrollView>(null);
  const [s, setS] = useState<Stats | null>(null);
  /** Les entrees deja declarees aujourd'hui. */
  const [done, setDone] = useState<string[]>([]);
  const [help, setHelp] = useState(false);
  const [all, setAll] = useState(false);
  const [create, setCreate] = useState(false);
  /** Les fetes en attente : une a la fois, dans l'ordre. */
  const [pops, setPops] = useState<Pop[]>([]);
  /** Le badge qu'on regarde de pres, gagne ou pas. */
  const [peek, setPeek] = useState<Badge | null>(null);
  /** Le gain qui se pose sous la jauge, et une cle pour le rejouer. */
  const [gain, setGain] = useState<{ n: number; id: number; day: boolean } | null>(null);
  const gains = useRef(0);
  /** Le chiffre AFFICHE monte vers le vrai : on regarde les points arriver. */
  const [shown, setShown] = useState(0);
  const first = useRef(true);
  const goals = useGoals((g) => g.goals);
  const addGoal = useGoals((g) => g.add);
  const removeGoal = useGoals((g) => g.remove);
  const todayId = careOfTheDay();
  // La jauge vit sur le fil natif : elle avance a chaque objectif.
  const [bar] = useState(() => new RNAnimated.Value(0));

  const load = useCallback(async () => {
    const x = await stats();
    setS(x); setDone(x.careToday);
    // Les badges gagnes depuis la derniere visite, fetes maintenant.
    const fresh = await claimBadges(x);
    if (fresh.length) setPops((p) => [...p, ...fresh.map((id) => ({ kind: 'badge', id } as Pop))]);
    /*
      La note, demandee UNE fois, apres une vraie semaine d'usage : au
      badge des sept jours proteges. Jamais dans le parcours — Apple l'a
      refuse en revue (5.6.3) : on ne demande un avis qu'a quelqu'un qui a
      eu le temps de juger l'app.
    */
    if (fresh.includes('day7')) {
      setTimeout(() => {
        void StoreReview.hasAction().then((ok) => { if (ok) return StoreReview.requestReview(); }).catch(() => {});
      }, 2500);
    }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  /*
    Les objectifs, fournis puis crees. Chacun sait ce qu'il ecrit dans le
    registre : son identifiant pour un geste fourni, « c:id:points » pour un
    objectif cree — ses points voyagent avec lui.
  */
  const items: Item[] = useMemo(() => [
    ...CARE.map((x) => ({
      key: x.id, entry: x.id, care: x.id, title: d.cortiTab[`${x.id}T` as const], points: CARE_POINTS[x.id],
    })),
    ...goals.map((g) => ({
      key: g.id, entry: customEntry(g.id, g.points), goal: g, title: g.title, points: g.points,
    })),
  ], [goals, d]);
  const featured = items.find((x) => x.key === todayId) ?? items[0];
  const rest = items.filter((x) => x.key !== featured?.key);
  const todayCount = Math.min(done.length, CARE_PER_DAY);

  const [cheer, setCheer] = useState(false);
  const [hooray, setHooray] = useState<CortiReaction | undefined>();

  const tick = async (item: Item) => {
    if (done.includes(item.entry)) return;
    haptics.success();
    const before = s?.level ?? 0;
    const listNow = await logCare(item.entry);
    setDone(listNow);
    const x = await stats();
    setS(x);
    // Les points d'abord, sous les yeux : la page remonte sur la jauge, la
    // barre avance, le chiffre grimpe, le gain se pose, Corti saute.
    list.current?.scrollTo({ y: 0, animated: true });
    gains.current += 1;
    setGain({ n: pointsOf(item.entry), id: gains.current, day: listNow.length >= CARE_PER_DAY });
    setHooray(cortiReact('celebrate'));
    // Puis ce qui se fete dans une fenetre : un palier, un badge.
    if (x.level > before) setPops((p) => [...p, { kind: 'level', level: x.level }]);
    const fresh = await claimBadges(x);
    if (fresh.length) setPops((p) => [...p, ...fresh.map((b) => ({ kind: 'badge', id: b } as Pop))]);
  };

  /*
    Le septieme jour et le trentieme, la scene cede sa place a la sequence
    complete : Corti passe d'affaisse a rayonnant, une fois, puis la scene
    reprend — sur un saut de joie, pas sur un arret net.
  */
  useEffect(() => {
    let alive = true;
    void claimCheer(s?.level ?? 0).then((ok) => { if (alive && ok) setCheer(true); });
    return () => { alive = false; };
  }, [s?.level]);

  const xp = s?.xp ?? 0;
  const level = s?.level ?? 0;
  const names = [d.corti.off, d.corti.dim, d.corti.lit, d.corti.bright];
  const tone = level === 0 ? c.danger : level === 1 ? c.ember : c.accent;
  const next: number | null = XP_LEVELS[level + 1] ?? null;
  const from = XP_LEVELS[level];
  const within = next ? Math.min(1, (xp - from) / (next - from)) : 1;
  // Le chemin a trois segments : la position, c'est l'etape plus la part du segment en cours.
  const progress = next ? (level + within) / 3 : 1;
  const missing = next ? next - xp : 0;

  useEffect(() => {
    RNAnimated.timing(bar, { toValue: progress, duration: 1400, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [progress, bar]);
  // Le chiffre grimpe vers le vrai, en une seconde ; la premiere fois, il se pose.
  useEffect(() => {
    const start = first.current ? xp : shown;
    first.current = false;
    const steps = 22;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      const k = 1 - Math.pow(1 - i / steps, 3);
      setShown(Math.round(start + (xp - start) * k));
      if (i >= steps) clearInterval(id);
    }, 1100 / steps);
    return () => clearInterval(id);
  // Le chiffre affiche ne doit repartir que quand le VRAI change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xp]);
  // Le gain s'efface tout seul.
  useEffect(() => {
    if (!gain) return;
    const id = setTimeout(() => setGain(null), 3200);
    return () => clearTimeout(id);
  }, [gain]);

  const have = s ? unlockedBadges(s) : [];
  const pop = pops[0];
  const popWords = pop?.kind === 'badge' ? NAME[pop.id] : null;

  const topics: HelpTopic[] = [
    { t: d.cortiTab.statesTitle, h: d.cortiTab.levelsH, b: [d.cortiTab.s0, d.cortiTab.s1, d.cortiTab.s2, d.cortiTab.s3, '', d.cortiTab.statesB].join('\n') },
    { t: d.cortiTab.badgesTitle, h: d.cortiTab.badgesH, b: d.cortiTab.badgesB },
    { t: d.cortiTab.honestTitle, h: d.cortiTab.honestH, b: d.cortiTab.honestB },
  ];

  return (
    <Animated.ScrollView
      ref={list}
      contentContainerStyle={st.scroll}
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      {/* Lui d'abord, sur sa soucoupe : c'est son etat qu'on vient voir. */}
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
      {s && (
        <Text variant="lead" color={c.accent} style={st.line}>{cortiLine(level, s.days)}</Text>
      )}

      {/* La jauge : quatre etapes sur un chemin, et le chiffre en grand. */}
      <Glass radius={24} intensity={50} warmEdge="none" style={st.card}>
        <View style={st.between}>
          <Text variant="label" tone="tertiary">{d.cortiTab.gaugeTitle}</Text>
          <View style={[st.state, { backgroundColor: withAlpha(tone, 0.16) }]}>
            <Text variant="label" color={tone} style={{ textTransform: 'capitalize' }}>{names[level]}</Text>
          </View>
        </View>

        <View style={st.pointsRow}>
          <Text variant="hero" color={tone}>{String(shown)}</Text>
          <Text variant="body" tone="secondary" style={{ marginBottom: 10 }}>
            {next ? t(d.cortiTab.toNext, { n: missing, level: names[level + 1] }) : d.cortiTab.maxState}
          </Text>
        </View>

        <View style={st.path}>
          <View style={st.track}>
            <RNAnimated.View style={[st.fill, { backgroundColor: tone, transform: [{ scaleX: bar }] }]} />
          </View>
          <View style={st.nodes}>
            {names.map((name, i) => {
              const on = i <= level;
              return (
                <View key={name} style={st.node}>
                  <View style={[st.dot, on && { backgroundColor: tone, borderColor: tone }, i === level && st.dotNow]} />
                  <Text variant="label" tone={on ? 'secondary' : 'tertiary'} style={st.nodeName} numberOfLines={1}>{name}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Le gain : il se pose sous la jauge, le temps de le lire. */}
        {gain && (
          <Animated.View
            key={gain.id}
            entering={FadeInDown.duration(380)}
            exiting={FadeOut.duration(320)}
            style={[st.gainCard, { backgroundColor: withAlpha(tone, 0.14), borderColor: withAlpha(tone, 0.45) }]}
          >
            <Animated.View entering={ZoomIn.springify().damping(10).stiffness(220)}>
              <Text variant="displayM" color={tone}>{t(d.cortiTab.pts, { n: gain.n })}</Text>
            </Animated.View>
            <View style={{ flex: 1 }}>
              <Text variant="button">{t(d.cortiTab.gainTitle, { n: gain.n })}</Text>
              <Text variant="label" tone="secondary">{gain.day ? d.cortiTab.gainDay : d.cortiTab.gainBody}</Text>
            </View>
          </Animated.View>
        )}
      </Glass>

      {/* Les trois nombres qu'on a OBSERVES. */}
      {s && (
        <View style={st.figures}>
          <Count v={String(s.blocked)} label={d.stats.reelsAvoided} c={c.accent} />
          <Count v={formatHours(s.minutes)} label={d.stats.timeBack} c={c.accent} />
          <Count v={`${s.days} j`} label={d.stats.daysKept} c={c.accent} />
        </View>
      )}

      {/* Les objectifs : UN mis en avant, les autres derriere une ligne, et
          les siens qu'on cree. Chacun ne dit que son nom et ses points. */}
      <View style={st.between}>
        <Text variant="button" style={st.h}>{d.cortiTab.goalsTitle}</Text>
        <Text variant="label" color={todayCount >= CARE_PER_DAY ? c.accent : undefined} tone={todayCount >= CARE_PER_DAY ? undefined : 'tertiary'} style={st.h}>
          {todayCount >= CARE_PER_DAY ? d.cortiTab.dayDone : `${todayCount} / ${CARE_PER_DAY}`}
        </Text>
      </View>
      {featured && (
        <GoalRow item={featured} done={done.includes(featured.entry)} featured onPress={() => { void tick(featured); }} />
      )}
      <Pressable onPress={() => { haptics.tap(); setAll((x) => !x); }} hitSlop={8} accessibilityRole="button" style={st.more}>
        <Text variant="label" color={c.accent}>{all ? d.cortiTab.goalsLess : t(d.cortiTab.goalsAll, { n: items.length })}</Text>
      </Pressable>
      {all && (
        <View style={st.goals}>
          {rest.map((x) => (
            <GoalRow
              key={x.key}
              item={x}
              done={done.includes(x.entry)}
              onPress={() => { void tick(x); }}
              onRemove={x.goal ? () => { haptics.tap(); removeGoal(x.goal!.id); } : undefined}
            />
          ))}
        </View>
      )}
      <Pressable onPress={() => { haptics.tap(); setCreate(true); }} style={st.create} accessibilityRole="button">
        <View style={st.createIcon}><Plus size={16} strokeWidth={2.6} color={c.accent} /></View>
        <Text variant="button" color={c.accent}>{d.cortiTab.goalNew}</Text>
      </Pressable>

      {/* Les badges : dix jalons, gagnes une fois pour toutes. Un tap dit
          ce qu'il faut pour l'avoir. */}
      <View style={st.between}>
        <Text variant="button" style={st.h}>{d.cortiTab.badges}</Text>
        <Text variant="label" tone="tertiary" style={st.h}>{`${have.length} / ${BADGES.length}`}</Text>
      </View>
      <View style={st.badges}>
        {BADGES.map((b, i) => {
          const on = have.includes(b.id);
          return (
            <Pressable
              key={b.id}
              onPress={() => { haptics.tap(); setPeek(b); }}
              style={st.badge}
              accessibilityRole="button"
              accessibilityLabel={d.cortiTab[NAME[b.id][0]]}
              accessibilityState={{ selected: on }}
            >
              <BadgeArt id={b.id} on={on} size={60} index={i} />
              <Text variant="label" tone={on ? 'primary' : 'tertiary'} style={st.badgeName} numberOfLines={2}>
                {d.cortiTab[NAME[b.id][0]]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable onPress={() => { haptics.tap(); setHelp(true); }} hitSlop={8} accessibilityRole="button" style={st.how}>
        <Text variant="label" tone="tertiary">{d.cortiTab.how}</Text>
      </Pressable>

      <HelpSheet visible={help} onClose={() => setHelp(false)} topics={topics} />
      <GoalSheet visible={create} onClose={() => setCreate(false)} onAdd={(title, emoji, points) => { addGoal(title, emoji, points); }} />

      {/* Les fetes, une a la fois : un badge, un palier. */}
      <Celebrate
        visible={!!pop}
        kicker={pop?.kind === 'badge' ? d.cortiTab.unlocked : d.cortiTab.gotIt}
        title={pop?.kind === 'badge' && popWords ? d.cortiTab[popWords[0]] : pop?.kind === 'level' ? t(d.cortiTab.levelUp, { name: names[pop.level] }) : ''}
        body={pop?.kind === 'badge' && popWords ? d.cortiTab[popWords[1]] : pop?.kind === 'level' ? d.cortiTab.levelUpBody : ''}
        cta={d.cortiTab.ok}
        onClose={() => setPops((p) => p.slice(1))}
        icon={pop?.kind === 'badge' ? <BadgeArt id={pop.id} on size={150} big /> : undefined}
      />

      {/* Un badge regarde de pres : ce que c'est, et ce qu'il manque. */}
      <Celebrate
        visible={!!peek}
        kicker={peek && have.includes(peek.id) ? d.cortiTab.unlocked : d.cortiTab.locked}
        title={peek ? d.cortiTab[NAME[peek.id][0]] : ''}
        body={peek
          ? `${d.cortiTab[NAME[peek.id][1]]}${s && !have.includes(peek.id) ? ` ${t(d.cortiTab.missing, { n: badgeGap(peek, s) })}` : ''}`
          : ''}
        cta={d.cortiTab.ok}
        onClose={() => setPeek(null)}
        icon={peek ? <BadgeArt id={peek.id} on={have.includes(peek.id)} size={140} big /> : undefined}
      />
    </Animated.ScrollView>
  );
}

/*
 * Une icone illustree par geste fourni, dans le style de Corti : le meme
 * verre bleu glace et la meme lueur que la mascotte, dessinees par le studio.
 */
const CARE_ICON: Record<CareId, number> = {
  morning: require('@/assets/care/morning.png'),
  bored: require('@/assets/care/bored.png'),
  sleep: require('@/assets/care/sleep.png'),
  focus: require('@/assets/care/focus.png'),
  read: require('@/assets/care/read.png'),
  delay: require('@/assets/care/delay.png'),
  sun: require('@/assets/care/sun.png'),
  move: require('@/assets/care/move.png'),
  cold: require('@/assets/care/cold.png'),
};

/** Un objectif : son icone ou son emoji, son nom, ses points, une coche. */
function GoalRow({
  item, done, featured = false, onPress, onRemove,
}: { item: Item; done: boolean; featured?: boolean; onPress: () => void; onRemove?: () => void }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const { d, t } = useT();
  return (
    <Pressable
      onPress={onPress}
      disabled={done}
      style={[st.goal, featured && st.goalFeatured, done && { borderColor: c.accent, backgroundColor: withAlpha(c.accent, 0.1) }]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
    >
      {item.care ? (
        <Image
          source={CARE_ICON[item.care]}
          style={[st.goalIcon, featured && st.goalIconBig, !done && !featured && st.goalIconDim]}
          contentFit="contain"
        />
      ) : (
        <View style={[st.emoji, featured && st.emojiBig]}>
          <Text variant={featured ? 'title' : 'body'}>{item.goal?.emoji ?? '🎯'}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        {featured && (
          <Text variant="label" color={c.ember} style={{ marginBottom: 2 }}>{d.cortiTab.todayPick}</Text>
        )}
        <Text variant={featured ? 'button' : 'body'}>{item.title}</Text>
      </View>
      <View style={[st.pts, done && { backgroundColor: withAlpha(c.accent, 0.18) }]}>
        <Text variant="label" color={c.accent}>{t(d.cortiTab.pts, { n: item.points })}</Text>
      </View>
      {onRemove && !done ? (
        <Pressable onPress={onRemove} hitSlop={10} accessibilityLabel={d.cortiTab.goalDelete}>
          <Trash2 size={15} strokeWidth={2} color={withAlpha(c.mist, 0.4)} />
        </Pressable>
      ) : (
        <View style={[st.tick, done && { backgroundColor: c.accent, borderColor: c.accent }]}>
          {done && <Check size={12} strokeWidth={3} color={c.night} />}
        </View>
      )}
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
  card: { padding: space.lg, marginTop: space.md },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  state: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  pointsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md, marginTop: space.xs },
  path: { marginTop: space.sm },
  track: {
    height: 8, borderRadius: 4, overflow: 'hidden',
    backgroundColor: withAlpha(c.mist, 0.1), marginHorizontal: 6,
  },
  fill: { height: 8, borderRadius: 4, width: '100%', transformOrigin: 'left' },
  nodes: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -10 },
  node: { alignItems: 'center', width: 64 },
  dot: {
    width: 12, height: 12, borderRadius: 6, borderWidth: 2,
    borderColor: withAlpha(c.mist, 0.3), backgroundColor: c.night,
  },
  dotNow: { width: 16, height: 16, borderRadius: 8, marginTop: -2 },
  nodeName: { marginTop: 6, fontSize: 10, textTransform: 'capitalize' },
  gainCard: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    marginTop: space.md, padding: space.md, borderRadius: 16, borderWidth: 1,
  },
  figures: {
    flexDirection: 'row', gap: space.md, marginTop: space.md,
    paddingVertical: space.lg, borderRadius: 20,
    backgroundColor: withAlpha(c.mist, 0.06),
  },
  h: { marginTop: space.xl, marginBottom: space.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  badge: { width: '18%', alignItems: 'center', gap: 6, marginBottom: space.sm },
  badgeName: { textAlign: 'center', fontSize: 10 },
  more: { marginTop: space.md, marginBottom: space.sm, alignSelf: 'flex-start' },
  how: { marginTop: space.xl, alignSelf: 'center' },
  goals: { gap: space.sm },
  goal: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    padding: space.md, borderRadius: 16, borderWidth: 1,
    borderColor: withAlpha(c.mist, 0.12),
  },
  goalFeatured: {
    marginTop: space.sm, padding: space.lg, borderRadius: 20,
    borderColor: withAlpha(c.ember, 0.4), backgroundColor: withAlpha(c.ember, 0.07),
  },
  goalIcon: { width: 44, height: 44 },
  goalIconBig: { width: 64, height: 64 },
  goalIconDim: { opacity: 0.72 },
  emoji: {
    width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: withAlpha(c.mist, 0.08),
  },
  emojiBig: { width: 64, height: 64, borderRadius: 20 },
  pts: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, backgroundColor: withAlpha(c.accent, 0.1) },
  tick: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 1.5,
    borderColor: withAlpha(c.mist, 0.3),
    alignItems: 'center', justifyContent: 'center',
  },
  create: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.md,
    padding: space.md, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed',
    borderColor: withAlpha(c.accent, 0.4),
  },
  createIcon: {
    width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: withAlpha(c.accent, 0.14),
  },
});
