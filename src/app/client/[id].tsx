import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams, type ErrorBoundaryProps } from 'expo-router';
import { ClientScreen } from '@/features/client/ClientScreen';
import { CLIENTS, type ClientId } from '@/features/client/blockers';
import { Text } from '@/components/type/Text';
import { Button } from '@/components/Button';
import { useColors } from '@/theme/useColors';
import { gutter, space } from '@/theme/spacing';
import { useT } from '@/i18n';

export default function ClientRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const key = (id && id in CLIENTS ? id : 'instagram') as ClientId;
  return <ClientScreen id={key} />;
}

/**
 * Une erreur dans l'ecran d'une app ne ferme plus UnSwipe.
 *
 * Sans ce filet, une exception au rendu (vue sur Android : ecran noir puis
 * fermeture) emportait toute l'app, et on ne savait jamais ce qui avait casse.
 * On l'affiche, on propose de reessayer ou de revenir, et le detail se copie
 * d'un appui pour qu'on puisse nous l'envoyer.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const c = useColors();
  const { d } = useT();
  const [copied, setCopied] = useState(false);
  const detail = `${error?.name ?? 'Error'}: ${error?.message ?? ''}\n${Platform.OS} ${Platform.Version}\n${(error?.stack ?? '').slice(0, 2400)}`;
  return (
    <View style={[st.root, { backgroundColor: c.night }]}>
      <Text variant="displayM" style={st.title}>{d.client.crashTitle}</Text>
      <ScrollView style={[st.box, { backgroundColor: c.surfaceHi }]} contentContainerStyle={{ padding: space.md }}>
        <Text variant="label" tone="secondary" selectable>{detail}</Text>
      </ScrollView>
      <Pressable
        onPress={() => { void Clipboard.setStringAsync(detail).then(() => setCopied(true)); }}
        hitSlop={10}
        style={st.copy}
      >
        <Text variant="label" color={c.accent}>{copied ? '✓' : 'Copy'}</Text>
      </Pressable>
      <View style={st.actions}>
        <Button label={d.client.retry} onPress={() => { void retry(); }} />
        <Button label={d.client.back} variant="ghost" onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/home'); }} />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: gutter, paddingTop: 80, paddingBottom: 40, gap: space.md },
  title: { textAlign: 'center' },
  box: { flex: 1, borderRadius: 14 },
  copy: { alignSelf: 'flex-end' },
  actions: { gap: space.sm },
});
