import { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Check, Plus, UsersRound } from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { gutter, space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { haptics } from '@/lib/haptics';
import { useT } from '@/i18n';

/*
 * Changer de compte, en une feuille.
 *
 * C'etait une entree dans un menu flottant, et elle echouait en silence quand
 * Instagram avait deplace son propre selecteur. On ne savait ni sur quel
 * compte on etait, ni ce qui venait de se passer.
 *
 * On ne peut PAS lister les comptes de quelqu'un : ils vivent dans la session
 * d'Instagram, pas chez nous, et aucune API ne les expose. Cette feuille ne
 * fait donc pas semblant d'en avoir la liste. Elle montre celui qui est
 * connecte — lu sur la page, dans le lien de l'onglet profil — et propose les
 * deux seules choses qu'on puisse vraiment declencher : ouvrir le selecteur
 * d'Instagram, ou ajouter un compte. Une liste inventee serait plus jolie et
 * mentirait au premier appui.
 */
export function SwitchSheet({
  visible, onClose, user, onSwitch, onAdd, failed,
}: {
  visible: boolean;
  onClose: () => void;
  /** Le pseudo lu sur la page, ou nul tant qu'on ne l'a pas. */
  user: string | null;
  onSwitch: () => void;
  onAdd: () => void;
  /** Le selecteur d'Instagram n'a pas repondu au dernier essai. */
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

          {/* Le compte en cours, avec sa coche. C'est la reponse a « je suis
              sur lequel, la ? » — la question qu'on se pose avant de basculer. */}
          <View style={[st.row, st.rowOn]}>
            <View style={[st.avatar, { backgroundColor: withAlpha(c.accent, 0.2) }]}>
              <Text variant="button" color={c.accent}>
                {(user || '?').slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <Text variant="button" style={{ flex: 1 }} numberOfLines={1}>
              {user ? `@${user}` : d.client.switchCurrent}
            </Text>
            <Check size={18} strokeWidth={2.6} color={c.accent} />
          </View>

          <Pressable
            onPress={() => { haptics.tap(); onSwitch(); }}
            style={st.row}
            accessibilityRole="button"
          >
            <View style={st.icon}>
              <UsersRound size={17} strokeWidth={2.2} color={withAlpha(c.mist, 0.7)} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="button">{d.client.switchOther}</Text>
              <Text variant="body" tone="secondary" style={{ marginTop: 1 }}>
                {d.client.switchOtherB}
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => { haptics.tap(); onAdd(); }}
            style={st.row}
            accessibilityRole="button"
          >
            <View style={st.icon}>
              <Plus size={17} strokeWidth={2.4} color={withAlpha(c.mist, 0.7)} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="button">{d.client.switchAdd}</Text>
              <Text variant="body" tone="secondary" style={{ marginTop: 1 }}>
                {d.client.switchAddB}
              </Text>
            </View>
          </Pressable>

          {/* L'echec se dit ICI et pas en passant : le selecteur d'Instagram
              bouge d'une version a l'autre, et un bouton qui ne fait rien sans
              rien dire se lit comme une app cassee. */}
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
  row: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    padding: space.md, borderRadius: 16,
    backgroundColor: withAlpha(c.mist, 0.06),
  },
  rowOn: { backgroundColor: withAlpha(c.mist, 0.1) },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  icon: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center',
    justifyContent: 'center', backgroundColor: withAlpha(c.mist, 0.08),
  },
  fail: { textAlign: 'center', marginTop: space.xs },
});
