import { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { Lock } from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { useBlurTint, useColors, type Palette } from '@/theme/useColors';
import { gutter, space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { haptics } from '@/lib/haptics';
import { APP_TOGGLES, useAppsStore } from '@/store/apps';
import { Toggle } from '@/features/home/parts';
import { LOGOS, APPS } from '@/features/home/AppSlider';
import type { ClientId } from './blockers';

/**
 * Les reglages de l'app, atteignables SANS la quitter.
 *
 * Un changement ne s'applique qu'au rechargement : le script est injecte
 * avant le chargement de la page, il ne peut pas etre modifie en vol. On le
 * dit, plutot que de laisser croire a un effet immediat.
 */
export function ClientSettings({
  id, visible, onClose,
}: { id: ClientId; visible: boolean; onClose: () => void }) {
  const c = useColors();
  const tint = useBlurTint();
  const st = useMemo(() => sheet(c), [c]);
  const isOn = useAppsStore((s) => s.isOn);
  const toggle = useAppsStore((s) => s.toggle);
  useAppsStore((s) => s.settings);

  const name = APPS.find((a) => a.id === id)?.name ?? id;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={st.scrim} onPress={onClose}>
        <Animated.View entering={SlideInDown.duration(280)} style={st.sheet}>
          <BlurView intensity={65} tint={tint} style={StyleSheet.absoluteFill} />
          <View style={st.tint} />

          <View style={st.head}>
            <Image source={LOGOS[id]} style={st.logo} contentFit="contain" />
            <Text variant="title" style={{ flex: 1 }}>{name}</Text>
            <Pressable onPress={() => { haptics.tap(); onClose(); }} style={st.done} hitSlop={10}>
              <Text variant="label" color={c.night}>OK</Text>
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
            {APP_TOGGLES[id].map((t) => (
              <View key={t.key} style={st.line}>
                {t.locked && <Lock size={12} strokeWidth={2} color={withAlpha(c.mist, 0.3)} />}
                <Text variant="body" style={{ flex: 1 }}>{t.label}</Text>
                <Toggle
                  on={t.locked ? true : isOn(id, t.key)}
                  onChange={(v) => (t.locked ? haptics.tap() : toggle(id, t.key, v))}
                />
              </View>
            ))}

            <Text variant="label" tone="tertiary" style={st.note}>
              Recharge la page pour que le changement prenne effet.
            </Text>
          </ScrollView>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  scrim: { flex: 1, backgroundColor: '#000000B8', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden',
    paddingHorizontal: gutter, paddingTop: space.lg, paddingBottom: space.xxl,
  },
  tint: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0B0D11F0' },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingBottom: space.md },
  logo: { width: 34, height: 34 },
  done: {
    width: 44, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', backgroundColor: c.accent,
  },
  line: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 13,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: withAlpha(c.mist, 0.1),
  },
  note: { marginTop: space.lg, lineHeight: 17 },
});
