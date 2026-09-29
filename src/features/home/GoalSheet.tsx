import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { gutter, space } from '@/theme/spacing';
import { Button } from '@/components/Button';
import { Text } from '@/components/type/Text';
import { haptics } from '@/lib/haptics';
import { useT } from '@/i18n';
import { GOAL_EMOJIS, GOAL_POINTS } from '@/store/goals';

/**
 * Creer un objectif : un nom, un emoji, ses points. Rien d'autre.
 *
 * La feuille monte du bas, le clavier avec elle. On ne demande ni frequence
 * ni categorie : un objectif est une case a cocher, une fois par jour.
 */
export function GoalSheet({
  visible, onClose, onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (title: string, emoji: string, points: number) => void;
}) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const { d, t } = useT();
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState<string>(GOAL_EMOJIS[0]);
  const [points, setPoints] = useState<number>(15);

  const save = () => {
    if (!title.trim()) return;
    haptics.success();
    onAdd(title, emoji, points);
    setTitle('');
    setEmoji(GOAL_EMOJIS[0]);
    setPoints(15);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <BlurView intensity={26} tint="dark" style={StyleSheet.absoluteFill} />
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={st.root} pointerEvents="box-none">
        <SafeAreaView edges={['bottom']} pointerEvents="box-none">
          <View style={st.card}>
            <View style={st.grab} />
            <Text variant="title">{d.cortiTab.goalNewTitle}</Text>

            <View style={st.field}>
              <Text variant="title">{emoji}</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder={d.cortiTab.goalNamePh}
                placeholderTextColor={withAlpha(c.mist, 0.4)}
                style={[st.input, { color: c.mist }]}
                maxLength={48}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={save}
              />
            </View>

            <View style={st.emojis}>
              {GOAL_EMOJIS.map((e) => (
                <Pressable
                  key={e}
                  onPress={() => { haptics.tick(); setEmoji(e); }}
                  style={[st.emoji, e === emoji && { backgroundColor: withAlpha(c.accent, 0.22), borderColor: c.accent }]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: e === emoji }}
                >
                  <Text variant="body">{e}</Text>
                </Pressable>
              ))}
            </View>

            <Text variant="label" tone="tertiary" style={{ marginTop: space.md }}>{d.cortiTab.goalPoints}</Text>
            <View style={st.points}>
              {GOAL_POINTS.map((p) => (
                <Pressable
                  key={p}
                  onPress={() => { haptics.tick(); setPoints(p); }}
                  style={[st.point, p === points && { backgroundColor: c.accent }]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: p === points }}
                >
                  <Text variant="button" color={p === points ? c.night : c.mist}>{t(d.cortiTab.pts, { n: p })}</Text>
                </Pressable>
              ))}
            </View>

            <View style={st.actions}>
              <Button label={d.cortiTab.goalSave} onPress={save} disabled={!title.trim()} />
              <Button label={d.cortiTab.goalCancel} onPress={() => { haptics.tap(); onClose(); }} variant="ghost" />
            </View>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  card: {
    backgroundColor: c.night, borderTopLeftRadius: 26, borderTopRightRadius: 26,
    paddingTop: space.sm, paddingHorizontal: gutter, paddingBottom: space.lg, gap: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: withAlpha(c.mist, 0.16),
  },
  grab: {
    width: 38, height: 4, borderRadius: 2, alignSelf: 'center',
    backgroundColor: withAlpha(c.mist, 0.25), marginBottom: space.sm,
  },
  field: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.sm,
    paddingHorizontal: space.md, height: 54, borderRadius: 16,
    backgroundColor: withAlpha(c.mist, 0.08), borderWidth: 1, borderColor: withAlpha(c.mist, 0.14),
  },
  input: { flex: 1, fontSize: 16, fontFamily: 'SansMedium', paddingVertical: 0 },
  emojis: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: space.sm },
  emoji: {
    width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center',
    backgroundColor: withAlpha(c.mist, 0.06), borderWidth: 1, borderColor: withAlpha(c.mist, 0.12),
  },
  points: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
  point: {
    flex: 1, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: withAlpha(c.mist, 0.08),
  },
  actions: { marginTop: space.md, gap: space.xs },
});
