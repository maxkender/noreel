import { useMemo, useState } from 'react';
import {
  Linking, Modal, Pressable, StyleSheet, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { gutter, space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { Button } from '@/components/Button';
import { haptics } from '@/lib/haptics';

export const SUPPORT_EMAIL = 'maximilien@vikstudios.com';

/**
 * Un retour sur l'app.
 *
 * On PREPARE le message, on ne l'envoie pas. L'app n'a pas de serveur et ne
 * doit pas en avoir un pour ca : le brouillon s'ouvre dans la messagerie de
 * la personne, qui relit et appuie sur envoyer elle-meme. Son adresse est
 * demandee parce qu'un message envoye depuis une autre boite ne permettrait
 * pas de lui repondre.
 */
export function Feedback({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const [subject, setSubject] = useState('');
  const [email, setEmail] = useState('');
  const [body, setBody] = useState('');

  const ok = subject.trim().length > 2 && /.+@.+\..+/.test(email.trim());

  const send = () => {
    haptics.press();
    const text = `${body.trim()}\n\n—\nRépondre à : ${email.trim()}\nUnSwipe 1.0.0`;
    const url = `mailto:${SUPPORT_EMAIL}`
      + `?subject=${encodeURIComponent(`[UnSwipe] ${subject.trim()}`)}`
      + `&body=${encodeURIComponent(text)}`;
    void Linking.openURL(url).catch(() => { /* pas de messagerie configuree */ });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={st.root}>
        <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
          <View style={st.head}>
            <Pressable onPress={() => { haptics.tap(); onClose(); }} hitSlop={12}>
              <Text variant="label" color={c.accent}>Annuler</Text>
            </Pressable>
            <Text variant="label" tone="tertiary">Faire un retour</Text>
            <View style={{ width: 54 }} />
          </View>

          <View style={st.body}>
            <Text variant="displayM">Dis-nous tout.</Text>
            <Text variant="body" tone="secondary" style={{ marginTop: space.sm }}>
              Un bug, une idée, une app qui résiste au filtre. On lit tout.
            </Text>

            <Text variant="label" tone="tertiary" style={st.label}>SUJET</Text>
            <TextInput
              style={st.input}
              value={subject}
              onChangeText={setSubject}
              placeholder="Les stories reviennent sur Instagram"
              placeholderTextColor={withAlpha(c.mist, 0.3)}
            />

            <Text variant="label" tone="tertiary" style={st.label}>TON ADRESSE</Text>
            <TextInput
              style={st.input}
              value={email}
              onChangeText={setEmail}
              placeholder="toi@exemple.com"
              placeholderTextColor={withAlpha(c.mist, 0.3)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text variant="label" tone="tertiary" style={st.label}>TON MESSAGE</Text>
            <TextInput
              style={[st.input, st.area]}
              value={body}
              onChangeText={setBody}
              multiline
              placeholder="Ce qui s’est passé, et ce que tu attendais."
              placeholderTextColor={withAlpha(c.mist, 0.3)}
            />

            <Text variant="label" tone="tertiary" style={st.note}>
              Le message s’ouvrira dans ta messagerie, à destination de{' '}
              {SUPPORT_EMAIL}. C’est toi qui l’envoies.
            </Text>
          </View>

          <View style={st.foot}>
            <Button label="Préparer le message" disabled={!ok} onPress={send} />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.night },
  head: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: gutter, paddingVertical: space.md,
  },
  body: { flex: 1, paddingHorizontal: gutter, paddingTop: space.md },
  label: { marginTop: space.lg, marginBottom: space.xs },
  input: {
    padding: space.md, borderRadius: 14,
    color: c.mist, fontFamily: 'Sans', fontSize: 16,
    backgroundColor: c.surfaceHi,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.lineStrong,
  },
  area: { minHeight: 100, textAlignVertical: 'top' },
  note: { marginTop: space.lg, lineHeight: 17 },
  foot: { paddingHorizontal: gutter, paddingBottom: space.md },
});
