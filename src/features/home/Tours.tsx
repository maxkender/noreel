import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Check, Lock, Shield, Smartphone, Timer, X } from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { radii, space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { CortiRig } from '@/components/CortiRig';
import { Story, type Slide } from '@/components/Story';
import { useT } from '@/i18n';
import { LOGOS } from './AppSlider';
import { BadgeArt } from './BadgeArt';
import { Toggle } from './parts';
import { markTourSeen, tourSeen, type TourId } from './tourSeen';

/*
 * Les stories des trois onglets : Applis, Corti, Blocage.
 *
 * La premiere fois qu'on arrive sur un onglet, elle se joue par-dessus et
 * dit tout ce qu'il y a — une idee par planche, une image, une ligne. Puis
 * plus jamais, sauf si on la redemande (« Comment ca marche ? » sur Corti).
 * Pas de story sur le compte : il n'y a rien a y apprendre.
 */
export function TabTour({
  tab, replay, onDone,
}: {
  tab: TourId | 'account';
  /** Rejouer une story deja vue : un compteur, qui change a chaque demande. */
  replay?: { id: TourId; n: number } | null;
  onDone: () => void;
}) {
  // Ce qu'on sait du disque, onglet par onglet : rien, vue, pas vue.
  const [seen, setSeen] = useState<Partial<Record<TourId, boolean>>>({});
  useEffect(() => {
    if (tab === 'account' || seen[tab] !== undefined) return;
    let alive = true;
    void tourSeen(tab).then((v) => { if (alive) setSeen((x) => ({ ...x, [tab]: v })); });
    return () => { alive = false; };
  }, [tab, seen]);

  const show: TourId | null = replay ? replay.id : (tab !== 'account' && seen[tab] === false ? tab : null);
  if (!show) return null;
  const done = () => {
    void markTourSeen(show);
    setSeen((x) => ({ ...x, [show]: true }));
    onDone();
  };
  return (
    <View style={StyleSheet.absoluteFill} testID={`tour-${show}`}>
      {show === 'home' && <HomeTour onDone={done} />}
      {show === 'corti' && <CortiTour onDone={done} />}
      {show === 'block' && <BlockTour onDone={done} />}
    </View>
  );
}

/* ---------- Applis ---------- */

function HomeTour({ onDone }: { onDone: () => void }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const { d } = useT();
  const slides: Slide[] = [
    {
      title: d.tour.h1, body: d.tour.h1b,
      art: (
        <View style={st.row}>
          {(['instagram', 'tiktok', 'twitter', 'youtube'] as const).map((id) => (
            <Image key={id} source={LOGOS[id]} style={st.logo} contentFit="contain" />
          ))}
        </View>
      ),
    },
    {
      title: d.tour.h2, body: d.tour.h2b,
      art: (
        <View style={{ alignItems: 'center', gap: space.md }}>
          <Image source={LOGOS.instagram} style={st.logoBig} contentFit="contain" />
          <View style={[st.pill, { backgroundColor: withAlpha(c.accent, 0.16), borderColor: withAlpha(c.accent, 0.5) }]}>
            <Text variant="label" color={c.accent}>{d.tour.h2pill}</Text>
          </View>
        </View>
      ),
    },
    {
      title: d.tour.h3, body: d.tour.h3b,
      art: <Ring tone={c.accent}><Smartphone size={40} strokeWidth={2} color={c.accent} /></Ring>,
    },
    {
      title: d.tour.h4, body: d.tour.h4b,
      art: <Ring tone={c.ember}><Lock size={40} strokeWidth={2} color={c.ember} /></Ring>,
    },
  ];
  return <Story slides={slides} onDone={onDone} testID="story-home" />;
}

/* ---------- Corti ---------- */

function CortiTour({ onDone }: { onDone: () => void }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const { d } = useT();
  const states = [d.corti.off, d.corti.dim, d.corti.lit, d.corti.bright];
  const tones = [c.danger, c.ember, c.accent, c.accent];
  const slides: Slide[] = [
    { title: d.tour.c1, body: d.tour.c1b, art: <CortiRig level={3} size={210} expression="ravi" /> },
    {
      title: d.tour.c2, body: d.tour.c2b,
      art: (
        <View style={st.states}>
          {states.map((name, i) => (
            <View key={name} style={st.state}>
              <CortiRig level={i as 0 | 1 | 2 | 3} size={52} animated={false} />
              <Text variant="label" color={tones[i]} style={[st.center, { textTransform: 'capitalize' }]} numberOfLines={1}>{name}</Text>
            </View>
          ))}
        </View>
      ),
    },
    {
      title: d.tour.c3, body: d.tour.c3b,
      art: <Big text="+20" tone={c.accent} />,
    },
    {
      title: d.tour.c4, body: d.tour.c4b,
      art: (
        <View style={[st.goal, { borderColor: withAlpha(c.ember, 0.4), backgroundColor: withAlpha(c.ember, 0.08) }]}>
          <View style={st.emoji}><Text variant="title">📚</Text></View>
          <Text variant="button" style={{ flex: 1 }}>{d.tour.c4goal}</Text>
          <View style={[st.pts, { backgroundColor: withAlpha(c.accent, 0.14) }]}>
            <Text variant="label" color={c.accent}>+15</Text>
          </View>
          <View style={[st.tick, { backgroundColor: c.accent }]}><Check size={12} strokeWidth={3} color={c.night} /></View>
        </View>
      ),
    },
    {
      title: d.tour.c5, body: d.tour.c5b,
      art: (
        <View style={st.row}>
          <Big text="−20" tone={c.danger} small />
          <Big text="−30" tone={c.danger} small />
        </View>
      ),
    },
    { title: d.tour.c6, body: d.tour.c6b, art: <BadgeArt id="day7" on size={170} big /> },
  ];
  return <Story slides={slides} onDone={onDone} testID="story-corti" />;
}

/* ---------- Blocage ---------- */

function BlockTour({ onDone }: { onDone: () => void }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const { d } = useT();
  const picks: [string, boolean][] = [['Instagram', true], ['TikTok', true], [d.tour.b2cat, false]];
  const slides: Slide[] = [
    {
      title: d.tour.b1, body: d.tour.b1b,
      art: <Ring tone={c.accent}><Shield size={40} strokeWidth={2} color={c.accent} /></Ring>,
    },
    {
      title: d.tour.b2, body: d.tour.b2b,
      art: (
        <View style={st.list}>
          {picks.map(([name, ok]) => (
            <View key={name} style={st.line}>
              <View style={[st.tick, ok ? { backgroundColor: c.accent } : { borderWidth: 1.5, borderColor: withAlpha(c.danger, 0.6) }]}>
                {ok ? <Check size={12} strokeWidth={3} color={c.night} /> : <X size={12} strokeWidth={3} color={c.danger} />}
              </View>
              <Text variant="body" tone={ok ? 'primary' : 'secondary'}>{name}</Text>
            </View>
          ))}
        </View>
      ),
    },
    {
      title: d.tour.b3, body: d.tour.b3b,
      art: (
        <View style={[st.line, st.armed, { borderColor: withAlpha(c.accent, 0.4) }]}>
          <Text variant="button" style={{ flex: 1 }}>{d.tour.b3row}</Text>
          <Toggle on onChange={() => {}} />
        </View>
      ),
    },
    {
      title: d.tour.b4, body: d.tour.b4b,
      art: (
        <View style={{ alignItems: 'center', gap: space.md }}>
          <Ring tone={c.ember}><Lock size={40} strokeWidth={2} color={c.ember} /></Ring>
          <View style={st.row}>
            <Timer size={16} strokeWidth={2.2} color={withAlpha(c.mist, 0.6)} />
            <Text variant="label" tone="secondary">{d.tour.b4time}</Text>
          </View>
        </View>
      ),
    },
  ];
  return <Story slides={slides} onDone={onDone} testID="story-block" />;
}

/* ---------- Pieces ---------- */

function Ring({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <View style={{
      width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center',
      borderWidth: 1.5, borderColor: withAlpha(tone, 0.5), backgroundColor: withAlpha(tone, 0.1),
    }}
    >
      {children}
    </View>
  );
}

function Big({ text, tone, small = false }: { text: string; tone: string; small?: boolean }) {
  return (
    <View style={{
      paddingHorizontal: small ? 22 : 30, paddingVertical: small ? 12 : 16, borderRadius: 24,
      backgroundColor: withAlpha(tone, 0.14), borderWidth: 1.5, borderColor: withAlpha(tone, 0.5),
    }}
    >
      <Text variant={small ? 'displayM' : 'hero'} color={tone}>{text}</Text>
    </View>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  center: { textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.md },
  logo: { width: 60, height: 60, borderRadius: 16 },
  logoBig: { width: 104, height: 104, borderRadius: 26 },
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radii.pill, borderWidth: 1 },
  states: { flexDirection: 'row', justifyContent: 'center', gap: space.sm, alignSelf: 'stretch' },
  state: { alignItems: 'center', gap: 6, width: 76 },
  goal: {
    alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: space.md,
    padding: space.lg, borderRadius: 20, borderWidth: 1,
  },
  emoji: {
    width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    backgroundColor: withAlpha(c.mist, 0.08),
  },
  pts: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
  tick: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  list: {
    alignSelf: 'stretch', borderRadius: radii.tile, overflow: 'hidden',
    backgroundColor: withAlpha(c.mist, 0.06), borderWidth: 1, borderColor: withAlpha(c.mist, 0.12),
  },
  line: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    paddingHorizontal: space.lg, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: withAlpha(c.mist, 0.1),
  },
  armed: {
    alignSelf: 'stretch', borderRadius: 18, borderWidth: 1, borderBottomWidth: 1,
    backgroundColor: withAlpha(c.accent, 0.08),
  },
});
