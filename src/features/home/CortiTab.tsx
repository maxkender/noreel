import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Animated from 'react-native-reanimated';
import {
  Award, Check, Flame, Lock, Medal, Sparkles, Star, Sunrise, Trophy, Zap,
} from 'lucide-react-native';
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
import { BADGES, badgeGap, claimBadges, unlockedBadges, type Badge } from '@/services/badges';
import { claimCheer } from '@/services/cheer';
import { useT } from '@/i18n';
import { Celebrate } from './Celebrate';
import type { Scroll } from './parts';

/*
 * L'onglet de Corti : un niveau, des badges, un geste.
 *
 * Il portait un indice en pourcentage et tout ce qu'il fallait pour le
 * comprendre — et on ne le comprenait pas. Trois choses a la place, qui
 * n'ont pas besoin d'explication : le NIVEAU de Corti et ce qu'il manque
 * pour le suivant, les BADGES gagnes, et le GESTE du jour qui rapporte un
 * merci. Chaque progres se fete dans une fenetre, une fois.
 */

/** Les paliers des niveaux, en journees protegees. Voir cortiLevel. */
const NEXT = [1, 7, 30];

const BADGE_ICON: Record<string, typeof Award> = {
  day1: Sunrise, day7: Flame, day30: Medal, day100: Trophy,
  reels100: Zap, reels1000: Star, reels10000: Award,
  care1: Sparkles, care10: Sparkles, care3: Check,
};

/** Le mot et la ligne d'un badge, lus dans le dictionnaire par son identifiant. */
const NAME: Record<string, ['bDay1' | 'bDay7' | 'bDay30' | 'bDay100' | 'bReels100' | 'bReels1000' | 'bReels10000' | 'bCare1' | 'bCare10' | 'bCare3', 'bDay1H' | 'bDay7H' | 'bDay30H' | 'bDay100H' | 'bReels100H' | 'bReels1000H' | 'bReels10000H' | 'bCare1H' | 'bCare10H' | 'bCare3H']> = {
  day1: ['bDay1', 'bDay1H'], day7: ['bDay7', 'bDay7H'], day30: ['bDay30', 'bDay30H'], day100: ['bDay100', 'bDay100H'],
  reels100: ['bReels100', 'bReels100H'], reels1000: ['bReels1000', 'bReels1000H'], reels10000: ['bReels10000', 'bReels10000H'],
  care1: ['bCare1', 'bCare1H'], care10: ['bCare10', 'bCare10H'], care3: ['bCare3', 'bCare3H'],
};

type Pop =
  | { kind: 'badge'; id: string }
  | { kind: 'care'; all: boolean };

export function CortiTab({ onScroll }: { onScroll: Scroll }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const { d, t } = useT();
  const [s, setS] = useState<Stats | null>(null);
  /** Les gestes deja declares aujourd'hui. */
  const [done, setDone] = useState<string[]>([]);
  const [help, setHelp] = useState(false);
  const [all, setAll] = useState(false);
  /** Les fetes en attente : une a la fois, dans l'ordre. */
  const [pops, setPops] = useState<Pop[]>([]);
  /** Le badge qu'on regarde de pres, gagne ou pas. */
  const [peek, setPeek] = useState<Badge | null>(null);
  const today = careOfTheDay();

  const load = useCallback(async () => {
    const x = await stats();
    setS(x); setDone(x.careToday);
    // Les badges gagnes depuis la derniere visite, fetes maintenant.
    const fresh = await claimBadges(x);
    if (fresh.length) setPops((p) => [...p, ...fresh.map((id) => ({ kind: 'badge', id } as Pop))]);
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const tick = async (id: CareId) => {
    if (done.includes(id)) return;
    haptics.success();
    const list = await logCare(id);
    setDone(list);
    // Le merci d'abord, puis le badge si le geste en a debloque un.
    setPops((p) => [...p, { kind: 'care', all: list.length >= CARE_PER_DAY }]);
    const x = await stats();
    setS(x);
    const fresh = await claimBadges(x);
    if (fresh.length) setPops((p) => [...p, ...fresh.map((b) => ({ kind: 'badge', id: b } as Pop))]);
  };

  /*
    Le septieme jour et le trentieme, la scene cede sa place a la sequence
    complete : Corti passe d'affaisse a rayonnant, une fois, puis la scene
    reprend — sur un saut de joie, pas sur un arret net.
  */
  const [cheer, setCheer] = useState(false);
  const [hooray, setHooray] = useState<CortiReaction | undefined>();
  useEffect(() => {
    let alive = true;
    void claimCheer(cortiLevel(s?.days ?? 0)).then((ok) => { if (alive && ok) setCheer(true); });
    return () => { alive = false; };
  }, [s?.days]);

  const days = s?.days ?? 0;
  const level = cortiLevel(days);
  const names = [d.corti.off, d.corti.dim, d.corti.lit, d.corti.bright];
  const tone = level === 0 ? c.danger : level === 1 ? c.ember : c.accent;
  const next = NEXT[level] ?? null;
  const from = level === 0 ? 0 : NEXT[level - 1];
  const progress = next ? Math.min(1, (days - from) / (next - from)) : 1;
  const missing = next ? next - days : 0;

  const have = s ? unlockedBadges(s) : [];
  const pop = pops[0];
  const popWords = pop?.kind === 'badge' ? NAME[pop.id] : null;

  const topics: HelpTopic[] = [
    { t: d.cortiTab.statesTitle, h: d.cortiTab.levelsH, b: [d.cortiTab.s0, d.cortiTab.s1, d.cortiTab.s2, d.cortiTab.s3, '', d.cortiTab.statesB].join('\n') },
    { t: d.cortiTab.badgesTitle, h: d.cortiTab.badgesH, b: d.cortiTab.badgesB },
    { t: d.cortiTab.careTitle, h: d.cortiTab.todayPick, b: d.cortiTab.careBody },
    { t: d.cortiTab.honestTitle, h: d.cortiTab.honestH, b: d.cortiTab.honestB },
  ];

  return (
    <Animated.ScrollView
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

      {/* Le niveau, et ce qu'il manque pour le suivant. Une barre qui se
          remplit par journees, pas un pourcentage qui bouge de 2,4. */}
      <Glass radius={24} intensity={50} warmEdge="none" style={st.card}>
        <View style={st.between}>
          <Text variant="label" tone="tertiary">{t(d.cortiTab.level, { n: level + 1 })}</Text>
          <Text variant="label" color={tone}>{`${days} j`}</Text>
        </View>
        <Text variant="displayM" color={tone} style={{ textTransform: 'capitalize' }}>{names[level]}</Text>
        <View style={st.track}>
          <View style={[st.fill, { width: `${Math.round(progress * 100)}%`, backgroundColor: tone }]} />
        </View>
        <Text variant="body" tone="secondary" style={{ marginTop: space.sm }}>
          {next
            ? t(d.cortiTab.nextIn, { n: missing, s: missing > 1 ? 's' : '', level: names[level + 1] })
            : d.cortiTab.maxed}
        </Text>
      </Glass>

      {/* Les trois nombres qu'on a OBSERVES. */}
      {s && (
        <View style={st.figures}>
          <Count v={String(s.blocked)} label={d.stats.reelsAvoided} c={c.accent} />
          <Count v={formatHours(s.minutes)} label={d.stats.timeBack} c={c.accent} />
          <Count v={`${s.days} j`} label={d.stats.daysKept} c={c.accent} />
        </View>
      )}

      {/* Les badges : dix jalons, gagnes une fois pour toutes. Un tap dit
          ce qu'il faut pour l'avoir. */}
      <View style={st.between}>
        <Text variant="button" style={st.h}>{d.cortiTab.badges}</Text>
        <Text variant="label" tone="tertiary" style={st.h}>{`${have.length} / ${BADGES.length}`}</Text>
      </View>
      <View style={st.badges}>
        {BADGES.map((b) => {
          const Icon = BADGE_ICON[b.id];
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
              <View style={[st.medal, on ? { backgroundColor: withAlpha(c.accent, 0.18), borderColor: withAlpha(c.accent, 0.6) } : st.medalOff]}>
                {on
                  ? <Icon size={22} strokeWidth={2} color={c.accent} />
                  : <Lock size={16} strokeWidth={2} color={withAlpha(c.mist, 0.35)} />}
              </View>
              <Text variant="label" tone={on ? 'primary' : 'tertiary'} style={st.badgeName} numberOfLines={2}>
                {d.cortiTab[NAME[b.id][0]]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* UN geste, mis en avant. Les huit autres attendent derriere une ligne. */}
      <View style={st.between}>
        <Text variant="button" style={st.h}>{d.cortiTab.todayTitle}</Text>
        <Text variant="label" tone="tertiary" style={st.h}>{`${Math.min(done.length, CARE_PER_DAY)} / ${CARE_PER_DAY}`}</Text>
      </View>
      <CareCard id={today} done={done.includes(today)} featured onPress={() => { void tick(today); }} />
      <Pressable onPress={() => { haptics.tap(); setAll((x) => !x); }} hitSlop={8} accessibilityRole="button" style={st.more}>
        <Text variant="label" color={c.accent}>{all ? d.cortiTab.less : d.cortiTab.more}</Text>
      </Pressable>
      {all && (
        <View style={st.cares}>
          {CARE.filter((x) => x.id !== today).map((x) => (
            <CareCard key={x.id} id={x.id} done={done.includes(x.id)} onPress={() => { void tick(x.id); }} />
          ))}
        </View>
      )}

      <Pressable onPress={() => { haptics.tap(); setHelp(true); }} hitSlop={8} accessibilityRole="button" style={st.how}>
        <Text variant="label" tone="tertiary">{d.cortiTab.how}</Text>
      </Pressable>

      <HelpSheet visible={help} onClose={() => setHelp(false)} topics={topics} />

      {/* Les fetes, une a la fois. */}
      <Celebrate
        visible={!!pop}
        kicker={pop?.kind === 'badge' ? d.cortiTab.unlocked : d.cortiTab.gotIt}
        title={pop?.kind === 'badge' && popWords ? d.cortiTab[popWords[0]] : pop?.kind === 'care' && pop.all ? d.cortiTab.bCare3 : d.cortiTab.todayPick}
        body={pop?.kind === 'badge' && popWords ? d.cortiTab[popWords[1]] : pop?.kind === 'care' && pop.all ? d.cortiTab.careAllDone : d.cortiTab.careThanks}
        cta={d.cortiTab.ok}
        onClose={() => setPops((p) => p.slice(1))}
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
        icon={peek ? (() => { const Icon = BADGE_ICON[peek.id]; return (
          <View style={[st.medalBig, have.includes(peek.id) ? { backgroundColor: withAlpha(c.accent, 0.18), borderColor: withAlpha(c.accent, 0.6) } : st.medalOff]}>
            <Icon size={44} strokeWidth={1.8} color={have.includes(peek.id) ? c.accent : withAlpha(c.mist, 0.4)} />
          </View>
        ); })() : undefined}
      />
    </Animated.ScrollView>
  );
}

/*
 * Une icone illustree par geste, dans le style de Corti : le meme verre bleu
 * glace et la meme lueur que la mascotte, dessinees par le studio.
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

/** Un geste : son icone, son titre, sa raison, et une coche. */
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
        <Text variant={featured ? 'button' : 'body'}>{title}</Text>
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
  card: { padding: space.lg, marginTop: space.md },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  badge: { width: '18%', alignItems: 'center', gap: 6, marginBottom: space.sm },
  medal: {
    width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
  },
  medalBig: {
    width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
  },
  medalOff: { backgroundColor: withAlpha(c.mist, 0.05), borderColor: withAlpha(c.mist, 0.14) },
  badgeName: { textAlign: 'center', fontSize: 10 },
  more: { marginTop: space.md, marginBottom: space.sm, alignSelf: 'flex-start' },
  how: { marginTop: space.xl, alignSelf: 'center' },
  cares: { gap: space.sm },
  care: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    padding: space.md, borderRadius: 16, borderWidth: 1,
    borderColor: withAlpha(c.mist, 0.12),
  },
  careFeatured: {
    marginTop: space.sm, padding: space.lg, borderRadius: 20,
    borderColor: withAlpha(c.ember, 0.4), backgroundColor: withAlpha(c.ember, 0.07),
  },
  careIcon: { width: 44, height: 44 },
  careIconBig: { width: 64, height: 64 },
  careIconDim: { opacity: 0.72 },
  tick: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 1.5,
    borderColor: withAlpha(c.mist, 0.3),
    alignItems: 'center', justifyContent: 'center',
  },
});
