import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Link, X } from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { gutter, space } from '@/theme/spacing';
import { Button } from '@/components/Button';
import { Text } from '@/components/type/Text';
import { haptics } from '@/lib/haptics';
import { useT } from '@/i18n';
import type { ClientId } from './blockers';
import { linkFor } from './links';

/**
 * « Ouvrir un lien » : on colle, ca s'ouvre ici.
 *
 * Un lien recu ailleurs ouvre l'app d'origine — celle qu'on bloque. On lit
 * le presse-papiers au moment ou l'on touche le bouton, jamais avant :
 * iOS le signale, et une app qui lit le presse-papiers sans qu'on lui ait
 * rien demande est une app qu'on supprime.
 */
export function LinkSheet({
  id, app, visible, onClose, onGo,
}: {
  id: ClientId;
  app: string;
  visible: boolean;
  onClose: () => void;
  onGo: (url: string) => void;
}) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const { d, t } = useT();
  const [bad, setBad] = useState(false);

  const paste = async () => {
    haptics.tap();
    const text = await Clipboard.getStringAsync().catch(() => '');
    const url = linkFor(id, text);
    if (!url) { setBad(true); haptics.stop(); return; }
    setBad(false);
    onGo(url);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={st.scrim} onPress={onClose} />
      <SafeAreaView edges={['top']} pointerEvents="box-none" style={st.top}>
        <View style={st.card}>
          <View style={st.head}>
            <Link size={18} strokeWidth={2.2} color={c.mist} />
            <Text variant="title" style={{ flex: 1 }}>{d.client.linkTitle}</Text>
            <Pressable onPress={onClose} hitSlop={12} style={st.close} accessibilityRole="button">
              <X size={16} strokeWidth={2.2} color={withAlpha(c.mist, 0.7)} />
            </Pressable>
          </View>
          <Text variant="body" tone="secondary">{d.client.linkBody}</Text>
          <Button label={d.client.linkPaste} onPress={() => { void paste(); }} />
          {bad && (
            <Text variant="label" color={c.danger} style={{ textAlign: 'center' }}>
              {t(d.client.linkBad, { app })}
            </Text>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: withAlpha(c.night, 0.6) },
  top: { position: 'absolute', top: 0, left: 0, right: 0 },
  card: {
    marginHorizontal: gutter, marginTop: space.md, padding: space.lg, gap: space.md,
    borderRadius: 22, backgroundColor: c.night,
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(c.mist, 0.2),
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  close: {
    width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
    backgroundColor: withAlpha(c.mist, 0.1),
  },
});
