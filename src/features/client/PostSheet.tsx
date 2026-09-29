import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Hourglass, Minus, Plus, Unplug } from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { gutter, space } from '@/theme/spacing';
import { Button } from '@/components/Button';
import { Text } from '@/components/type/Text';
import { haptics } from '@/lib/haptics';
import { useT } from '@/i18n';
import { useSettings } from '@/store/settings';
import { POST_MAX, POST_MIN, postModeStatus } from '@/services/postmode';

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
          <Button label={d.client.postOpen} onPress={() => { haptics.press(); onOpen(); }} />
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
 * Les reglages du mode publication : la duree accordee, la limite du jour,
 * et ce qui a deja ete utilise. Sans blocage arme, il n'y a rien a lever, et
 * la feuille le dit.
 */
export function PostModeSheet({
  visible, onClose, armed,
}: {
  visible: boolean;
  onClose: () => void;
  /** Le blocage est arme sur une selection : le mode a quelque chose a lever. */
  armed: boolean;
}) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const { d, t } = useT();
  const minutes = useSettings((x) => x.postMinutes);
  const limit = useSettings((x) => x.postLimit);
  const set = useSettings((x) => x.set);
  const [used, setUsed] = useState(0);

  useEffect(() => {
    if (!visible) return;
    let alive = true;
    void postModeStatus().then((s) => { if (alive) setUsed(s.usedToday); });
    return () => { alive = false; };
  }, [visible]);

  const bump = (key: 'postMinutes' | 'postLimit', delta: number) => {
    haptics.tick();
    const cur = key === 'postMinutes' ? minutes : limit;
    const lo = key === 'postMinutes' ? POST_MIN : 0;
    const hi = key === 'postMinutes' ? POST_MAX : 10;
    set(key, Math.min(hi, Math.max(lo, cur + delta)));
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <BlurView intensity={26} tint="dark" style={StyleSheet.absoluteFill} />
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <SafeAreaView style={st.bottom} edges={['bottom']} pointerEvents="box-none">
        <View style={st.sheetCard}>
          <View style={st.grab} />
          <View style={st.head}>
            <Text variant="title" style={{ flex: 1 }}>{d.client.postModeTitle}</Text>
            <Pressable onPress={onClose} hitSlop={10} style={st.done} accessibilityRole="button">
              <Text variant="label">{d.client.postDone}</Text>
            </Pressable>
          </View>

          <View style={st.row}>
            <Hourglass size={15} strokeWidth={2} color={withAlpha(c.mist, 0.6)} />
            <Text variant="body" style={{ flex: 1 }}>{t(d.client.postUsed, { n: used })}</Text>
          </View>

          <Stepper
            label={d.client.postDuration}
            value={t(d.client.postMinutes, { n: minutes })}
            onLess={() => bump('postMinutes', -1)}
            onMore={() => bump('postMinutes', 1)}
          />
          <Stepper
            label={d.client.postLimit}
            value={limit > 0 ? t(d.client.postPerDay, { n: limit }) : d.client.postNoLimit}
            onLess={() => bump('postLimit', -1)}
            onMore={() => bump('postLimit', 1)}
          />

          {!armed && (
            <View style={st.connect}>
              <Unplug size={22} strokeWidth={2} color={withAlpha(c.mist, 0.5)} />
              <Text variant="button" style={st.center}>{d.client.postConnectT}</Text>
              <Text variant="body" tone="secondary" style={st.center}>{d.client.postConnect}</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function Stepper({
  label, value, onLess, onMore,
}: { label: string; value: string; onLess: () => void; onMore: () => void }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  return (
    <View style={st.row}>
      <Text variant="body" style={{ flex: 1 }}>{label}</Text>
      <Pressable onPress={onLess} hitSlop={8} style={st.step} accessibilityRole="button">
        <Minus size={15} strokeWidth={2.4} color={c.mist} />
      </Pressable>
      <Text variant="button" style={st.value}>{value}</Text>
      <Pressable onPress={onMore} hitSlop={8} style={st.step} accessibilityRole="button">
        <Plus size={15} strokeWidth={2.4} color={c.mist} />
      </Pressable>
    </View>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
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
  done: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: withAlpha(c.mist, 0.1) },
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
