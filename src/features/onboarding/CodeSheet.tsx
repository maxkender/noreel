import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { gutter, space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { Button } from '@/components/Button';
import { haptics } from '@/lib/haptics';
import { useT } from '@/i18n';
import { useProStore } from '@/store/pro';

/**
 * « J'ai un code », version Android.
 *
 * Sur iPhone, ce lien ouvre la feuille d'Apple, qui verifie elle-meme les codes
 * d'offre. Sur Android, il sert au code d'acces des examinateurs de Google :
 * le bon code ouvre Pro sur cet appareil, un mauvais le dit simplement.
 */
export function CodeSheet({ visible, onClose, onUnlocked }: {
  visible: boolean;
  onClose: () => void;
  onUnlocked: () => void;
}) {
  const c = useColors();
  const { d } = useT();
  const st = useMemo(() => sheet(c), [c]);
  const unlock = useProStore((x) => x.unlockReview);
  const [code, setCode] = useState('');
  const [wrong, setWrong] = useState(false);

  const apply = async () => {
    haptics.press();
    if (await unlock(code)) {
      setCode('');
      setWrong(false);
      haptics.success();
      onUnlocked();
    } else {
      haptics.stop();
      setWrong(true);
    }
  };

  const close = () => { haptics.tap(); setWrong(false); onClose(); };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <View style={st.root}>
        <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={st.head}>
              <Pressable onPress={close} hitSlop={12} testID="code-cancel">
                <Text variant="label" color={c.accent}>{d.misc.cancel}</Text>
              </Pressable>
            </View>

            <View style={st.body}>
              <Text variant="displayM">{d.pay.codeTitle}</Text>
              <TextInput
                style={st.input}
                value={code}
                onChangeText={(v) => { setCode(v); setWrong(false); }}
                placeholder={d.pay.codePlaceholder}
                placeholderTextColor={withAlpha(c.mist, 0.3)}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={() => { void apply(); }}
                testID="code-input"
              />
              {wrong && (
                <Text variant="label" color={c.danger} style={st.wrong}>{d.pay.codeWrong}</Text>
              )}
            </View>

            <View style={st.foot}>
              <Button label={d.pay.codeApply} disabled={code.trim().length < 4} onPress={() => { void apply(); }} />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.night },
  head: { paddingHorizontal: gutter, paddingVertical: space.md },
  body: { flex: 1, paddingHorizontal: gutter, paddingTop: space.md },
  input: {
    marginTop: space.lg, padding: space.md, borderRadius: 14,
    color: c.mist, fontFamily: 'Sans', fontSize: 18, letterSpacing: 1,
    backgroundColor: c.surfaceHi,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.lineStrong,
  },
  wrong: { marginTop: space.sm },
  foot: { paddingHorizontal: gutter, paddingBottom: space.md },
});
