import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { ArrowRight, Hourglass, Shield, ShieldCheck, Smartphone, Unlock } from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { gutter, space } from '@/theme/spacing';
import { Button } from '@/components/Button';
import { Text } from '@/components/type/Text';
import { haptics } from '@/lib/haptics';
import { useT } from '@/i18n';
import { useSettings } from '@/store/settings';
import { POST_MAX, POST_MIN, endPostMode, postModeStatus, startPostMode } from '@/services/postmode';

/**
 * « Publier depuis ici est limite. »
 *
 * Instagram bride la publication depuis sa version web. On le dit au moment
 * ou l'on touche « + », et on propose les deux seules issues honnetes :
 * continuer ici avec ce qu'Instagram permet, ou ouvrir la vraie app un
 * instant — le blocage se leve le temps accorde, puis revient tout seul.
 */
export function PostAsk({
  visible, onClose, onOpen, onSettings,
}: {
  visible: boolean;
  onClose: () => void;
  onOpen: () => void;
  onSettings: () => void;
}) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const { d, t } = useT();
  const minutes = useSettings((x) => x.postMinutes);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <BlurView intensity={24} tint="dark" style={StyleSheet.absoluteFill} />
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <SafeAreaView style={st.mid} pointerEvents="box-none">
        <View style={st.card}>
          <Text variant="displayM" style={st.center}>{d.client.postTitle}</Text>
          <Text variant="body" tone="secondary" style={st.center}>
            {t(d.client.postBody, { n: minutes })}
          </Text>
          <Button label={t(d.client.postOpen, { n: minutes })} onPress={() => { haptics.press(); onOpen(); }} />
          <Button label={d.client.postStay} onPress={onClose} variant="ghost" />
          <Pressable onPress={() => { haptics.tap(); onSettings(); }} hitSlop={8} accessibilityRole="button">
            <Text variant="label" tone="tertiary" style={st.center}>{d.client.postSettings}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

/**
 * Le mode publication, comme une fiche claire.
 *
 * En haut, la duree (un curseur). Dessous, selon le cas : l'explication et
 * ce qu'il faut pour s'en servir (sans blocage arme, il n'y a rien a lever),
 * le bouton qui debloque, ou le compte a rebours quand c'est ouvert.
 */
export function PostModeSheet({
  visible, onClose, armed, onSetup,
}: {
  visible: boolean;
  onClose: () => void;
  /** Le blocage est arme sur une selection : le mode a quelque chose a lever. */
  armed: boolean;
  /** Mener au reglage du blocage (onglet Blocage). */
  onSetup?: () => void;
}) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const { d, t } = useT();
  const minutes = useSettings((x) => x.postMinutes);
  const limit = useSettings((x) => x.postLimit);
  const selection = useSettings((x) => x.selection);
  const blocking = useSettings((x) => x.blocking);
  const set = useSettings((x) => x.set);
  const [used, setUsed] = useState(0);
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [note, setNote] = useState<string | null>(null);

  const refresh = () => { void postModeStatus().then((s) => { setUsed(s.usedToday); setUntil(s.until); }); };
  useEffect(() => {
    if (!visible) return;
    void postModeStatus().then((s) => { setUsed(s.usedToday); setUntil(s.until); });
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [visible]);

  const left = Math.max(0, until - now);
  const active = left > 0;
  const clock = `${Math.floor(left / 60000)}:${String(Math.floor((left % 60000) / 1000)).padStart(2, '0')}`;

  const unlock = async () => {
    haptics.press();
    setNote(null);
    const r = await startPostMode(selection, blocking, minutes, limit);
    if (r === 'limited') setNote(t(d.client.postLimitHit, { n: limit }));
    else if (r === 'failed') setNote(d.client.postFailed);
    refresh();
  };
  const end = async () => {
    haptics.stop();
    await endPostMode(selection);
    refresh();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={st.page}>
        <View style={st.grab} />
        <View style={st.head}>
          <Text variant="displayM" style={{ flex: 1 }}>{d.client.postModeTitle}</Text>
          <Pressable onPress={onClose} hitSlop={12} style={st.done} accessibilityRole="button">
            <Text variant="label" color={c.night}>{d.client.postDone}</Text>
          </Pressable>
        </View>

        <View style={st.pcard}>
          <View style={st.cardRow}>
            <Hourglass size={16} strokeWidth={2} color={withAlpha(c.mist, 0.7)} />
            <Text variant="title" style={{ flex: 1 }}>{d.client.postDuration}</Text>
            <Text variant="title">{t(d.client.postMinutes, { n: minutes })}</Text>
          </View>
          <Slider value={minutes} min={POST_MIN} max={POST_MAX} onChange={(v) => set('postMinutes', v)} />
        </View>

        {!armed ? (
          <View style={[st.pcard, st.how]}>
            <View style={st.howIcon}>
              <ShieldCheck size={30} strokeWidth={1.8} color={c.mist} />
            </View>
            <Text variant="title" style={st.center}>{d.client.postHowT}</Text>
            <Text variant="body" tone="secondary" style={st.center}>{d.client.postHowB}</Text>
            <Text variant="body" tone="tertiary" style={st.center}>{d.client.postGet}</Text>
            <View style={st.reqs}>
              <View style={st.req}>
                <Smartphone size={18} strokeWidth={1.9} color={withAlpha(c.mist, 0.7)} />
                <Text variant="body" style={{ flex: 1 }}>{d.client.postReq1}</Text>
              </View>
              <View style={st.req}>
                <Shield size={18} strokeWidth={1.9} color={withAlpha(c.mist, 0.7)} />
                <Text variant="body" style={{ flex: 1 }}>{d.client.postReq2}</Text>
              </View>
            </View>
            {onSetup && (
              <Pressable onPress={() => { haptics.press(); onClose(); setTimeout(onSetup, 300); }} style={st.cta} accessibilityRole="button">
                <ArrowRight size={18} strokeWidth={2.4} color={c.night} />
                <Text variant="button" color={c.night}>{d.client.postSetup}</Text>
              </Pressable>
            )}
          </View>
        ) : active ? (
          <View style={[st.pcard, st.activeCard]}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="title">{d.client.postActiveT}</Text>
              <Text variant="body" tone="secondary" style={{ fontVariant: ['tabular-nums'] }}>{t(d.client.postBackIn, { t: clock })}</Text>
            </View>
            <Pressable onPress={() => { void end(); }} style={[st.end, { backgroundColor: c.danger }]} accessibilityRole="button">
              <Text variant="label" color="#fff">{d.client.postEnd}</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => { void unlock(); }} style={st.cta} accessibilityRole="button">
            <Unlock size={18} strokeWidth={2.4} color={c.night} />
            <Text variant="button" color={c.night}>{t(d.client.postUnlock, { n: minutes })}</Text>
          </Pressable>
        )}

        {note ? <Text variant="label" color={c.ember} style={st.center}>{note}</Text> : null}

        <View style={st.foot}>
          <Hourglass size={14} strokeWidth={2} color={withAlpha(c.mist, 0.5)} />
          <Text variant="label" tone="tertiary">{used > 0 ? t(d.client.postUsed, { n: used }) : d.client.postNone}</Text>
        </View>
      </View>
    </Modal>
  );
}

/** Un curseur simple : la piste se remplit, le rond suit le doigt, par minute. */
function Slider({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const [w, setW] = useState(0);
  const span = Math.max(1, w - KNOB);
  const pos = ((value - min) / (max - min)) * span;
  const pick = (x: number) => {
    const v = Math.round(min + (Math.max(0, Math.min(span, x - KNOB / 2)) / span) * (max - min));
    if (v !== value) { haptics.tick(); onChange(v); }
  };
  return (
    <View
      style={st.track}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(e) => pick(e.nativeEvent.locationX)}
      onResponderMove={(e) => pick(e.nativeEvent.locationX)}
      accessibilityRole="adjustable"
      accessibilityValue={{ min, max, now: value }}
    >
      <View style={st.rail} />
      <View style={[st.railOn, { width: pos + KNOB / 2 }]} />
      <View style={[st.knob, { left: pos }]} pointerEvents="none" />
    </View>
  );
}

const KNOB = 40;

const sheet = (c: Palette) => StyleSheet.create({
  page: { flex: 1, backgroundColor: c.night, paddingHorizontal: gutter, paddingTop: space.sm, gap: space.md },
  pcard: { borderRadius: 24, borderWidth: 1, borderColor: c.glassEdge, backgroundColor: c.glassSolid, padding: space.lg, gap: space.md },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  how: { alignItems: 'center' },
  howIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: withAlpha(c.mist, 0.08) },
  reqs: { alignSelf: 'stretch', gap: space.sm, marginTop: space.xs },
  req: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm,
    alignSelf: 'stretch', height: 54, borderRadius: 27, backgroundColor: c.mist,
  },
  activeCard: { flexDirection: 'row', alignItems: 'center' },
  end: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.xs },
  track: { height: KNOB, justifyContent: 'center' },
  rail: { position: 'absolute', left: KNOB / 2, right: KNOB / 2, height: 6, borderRadius: 3, backgroundColor: withAlpha(c.mist, 0.12) },
  railOn: { position: 'absolute', left: 0, height: 6, borderRadius: 3, backgroundColor: c.mist },
  knob: {
    position: 'absolute', width: KNOB, height: 30, borderRadius: 15, backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  mid: { flex: 1, justifyContent: 'center', paddingHorizontal: gutter },
  bottom: { flex: 1, justifyContent: 'flex-end' },
  center: { textAlign: 'center' },
  card: {
    padding: space.xl, gap: space.md, borderRadius: 28, backgroundColor: c.night,
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(c.mist, 0.2),
  },
  sheetCard: {
    backgroundColor: c.night, borderTopLeftRadius: 26, borderTopRightRadius: 26,
    paddingTop: space.sm, paddingHorizontal: gutter, paddingBottom: space.xl, gap: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: withAlpha(c.mist, 0.16),
  },
  grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: withAlpha(c.mist, 0.3), marginBottom: space.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.sm },
  done: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, backgroundColor: c.mist },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm,
    padding: space.md, borderRadius: 16, backgroundColor: withAlpha(c.mist, 0.06),
  },
  step: {
    width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
    backgroundColor: withAlpha(c.mist, 0.1),
  },
  value: { minWidth: 64, textAlign: 'center' },
  connect: { alignItems: 'center', gap: 6, padding: space.lg, marginTop: space.sm },
});
