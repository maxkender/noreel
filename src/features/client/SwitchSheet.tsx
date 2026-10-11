import { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { Check, Plus, Trash2 } from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { gutter, space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { haptics } from '@/lib/haptics';
import { useT } from '@/i18n';
import type { Session } from '@/store/sessions';

/*
 * Changer de compte, en une feuille — avec la VRAIE liste.
 *
 * Les comptes sont tenus par l'app : chaque session est gardee sous son
 * pseudo, avec sa photo, au moment ou l'on sait qui est connecte. La feuille
 * les montre tous, coche celui en cours, et un appui remet la session de
 * l'autre. Plus rien ne depend du selecteur d'Instagram, qui bougeait d'une
 * version a l'autre et laissait le bouton sans effet.
 */
export function SwitchSheet({
  visible, onClose, accounts, current, onPick, onAdd, onRemove, failed,
}: {
  visible: boolean;
  onClose: () => void;
  accounts: Session[];
  /** L'identifiant du compte en cours, ou nul tant qu'on ne l'a pas. */
  current: string | null;
  onPick: (uid: string) => void;
  onAdd: () => void;
  onRemove: (uid: string) => void;
  /** La session n'a pas pu etre remise au dernier essai. */
  failed?: boolean;
}) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const { d } = useT();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <BlurView intensity={26} tint="dark" style={StyleSheet.absoluteFill} />
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

      <SafeAreaView style={st.root} edges={['bottom']} pointerEvents="box-none">
        <View style={st.card}>
          <View style={st.grab} />
          <Text variant="title">{d.client.switchAccount}</Text>

          <AccountList accounts={accounts} current={current} onPick={onPick} onAdd={onAdd} onRemove={onRemove} />

          {failed && (
            <Text variant="label" color={c.danger} style={st.fail}>
              {d.client.switchFailed}
            </Text>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

/**
 * La liste des comptes : photo, pseudo, coche sur celui en cours, corbeille
 * sur les autres, et « ajouter un compte » en dernier. Partagee entre la
 * feuille et les reglages.
 */
export function AccountList({
  accounts, current, onPick, onAdd, onRemove,
}: {
  accounts: Session[];
  current: string | null;
  onPick: (uid: string) => void;
  onAdd: () => void;
  onRemove: (uid: string) => void;
}) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const { d } = useT();
  return (
    <View style={st.list}>
      {accounts.map((a) => {
        const on = a.uid === current;
        return (
          <Pressable
            key={a.uid}
            onPress={() => { if (!on) { haptics.tap(); onPick(a.uid); } }}
            style={[st.row, on && st.rowOn]}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
          >
            <Avatar user={a.user} uri={a.avatar} />
            <Text variant="button" style={{ flex: 1 }} numberOfLines={1}>{`@${a.user}`}</Text>
            {on
              ? <Check size={18} strokeWidth={2.6} color={c.accent} />
              : (
                <Pressable onPress={() => { haptics.tap(); onRemove(a.uid); }} hitSlop={10} accessibilityLabel={d.client.switchRemove}>
                  <Trash2 size={16} strokeWidth={2} color={withAlpha(c.mist, 0.45)} />
                </Pressable>
              )}
          </Pressable>
        );
      })}

      {accounts.length === 0 && (
        <Text variant="body" tone="secondary" style={{ paddingHorizontal: space.sm }}>{d.client.switchNone}</Text>
      )}

      <Pressable onPress={() => { haptics.tap(); onAdd(); }} style={st.row} accessibilityRole="button">
        <View style={st.icon}>
          <Plus size={17} strokeWidth={2.4} color={withAlpha(c.mist, 0.7)} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="button">{d.client.switchAdd}</Text>
          <Text variant="body" tone="secondary" style={{ marginTop: 1 }}>{d.client.switchAddB}</Text>
        </View>
      </Pressable>
    </View>
  );
}

function Avatar({ user, uri }: { user: string; uri?: string }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  if (uri) return <Image source={{ uri }} style={st.avatar} contentFit="cover" />;
  return (
    <View style={[st.avatar, { backgroundColor: withAlpha(c.accent, 0.2) }]}>
      <Text variant="button" color={c.accent}>{user.slice(0, 1).toUpperCase()}</Text>
    </View>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  card: {
    backgroundColor: c.night, borderTopLeftRadius: 26, borderTopRightRadius: 26,
    paddingTop: space.sm, paddingHorizontal: gutter, paddingBottom: space.lg,
    gap: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: withAlpha(c.mist, 0.16),
  },
  grab: {
    width: 38, height: 4, borderRadius: 2, alignSelf: 'center',
    backgroundColor: withAlpha(c.mist, 0.25), marginBottom: space.sm,
  },
  list: { gap: space.sm },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    padding: space.md, borderRadius: 16,
    backgroundColor: withAlpha(c.mist, 0.06),
  },
  rowOn: { backgroundColor: withAlpha(c.accent, 0.12) },
  avatar: {
    width: 36, height: 36, borderRadius: 18, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  icon: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center',
    justifyContent: 'center', backgroundColor: withAlpha(c.mist, 0.08),
  },
  fail: { textAlign: 'center', marginTop: space.xs },
});
