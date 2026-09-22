import { useEffect, useState } from 'react';
import {
  Linking, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { colors, withAlpha } from '@/theme/colors';
import { space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { haptics } from '@/lib/haptics';
import { useT } from '@/i18n';
import { formatHours, lang } from '@/lib/format';
import { useSettings } from '@/store/settings';
import { useOnboardingStore } from '@/store/onboarding';
import { Toggle } from './parts';
import {
  FAMILY_CONTROLS_ENABLED, authorizationStatus, requestAuthorization,
  type AuthState,
} from '@/services/shield.real';

const GOALS = [60, 90, 120, 180, 240];

/** Feuille de reglages : tout ce qu'il y a dedans agit reellement. */
export function Settings({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { d } = useT();
  const router = useRouter();
  const s = useSettings();
  const reset = useOnboardingStore((x) => x.reset);
  const [cleared, setCleared] = useState(false);
  const [auth, setAuth] = useState<AuthState>('notDetermined');

  useEffect(() => { if (visible) void authorizationStatus().then(setAuth); }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={st.scrim} onPress={onClose}>
        <Animated.View entering={SlideInDown.springify().damping(26).stiffness(170)} style={st.sheet}>
          <BlurView intensity={65} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={st.tint} />

          <View style={st.head}>
            <View style={{ width: 44 }} />
            <Text variant="title" style={{ flex: 1, textAlign: 'center' }}>Paramètres</Text>
            <Pressable onPress={onClose} style={st.done} hitSlop={10}>
              <Text variant="label" color={colors.night}>OK</Text>
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
            <Group title="Blocage" />
            <Line
              label="Temps d’écran"
              sub={auth === 'approved'
                ? 'Autorisé. UnSwipe peut mettre les apps en pause.'
                : 'Nécessaire pour bloquer les apps d’origine.'}
              right={
                <Text variant="label" color={auth === 'approved' ? colors.accent : colors.mist}>
                  {auth === 'approved' ? 'OK' : 'Activer'}
                </Text>
              }
              onPress={auth === 'approved' || !FAMILY_CONTROLS_ENABLED
                ? () => void Linking.openSettings()
                : () => { void requestAuthorization().then(setAuth); }}
            />
            <Line
              label="Apps toujours autorisées"
              sub="Téléphone, Plans, Santé : jamais bloquées."
              onPress={() => void Linking.openSettings()}
            />
            <Line
              label="Notifications"
              sub="Le résumé hebdomadaire."
              onPress={() => void Linking.openSettings()}
            />

            <Group title="Objectif quotidien" />
            <View style={st.chips}>
              {GOALS.map((g) => {
                const on = s.goalMinutes === g;
                return (
                  <Pressable
                    key={g}
                    onPress={() => { haptics.tick(); s.set('goalMinutes', g); }}
                    style={[st.chip, on && st.chipOn]}
                  >
                    <Text variant="label" color={on ? colors.night : withAlpha(colors.mist, 0.7)}>
                      {formatHours(g)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Group title="Personnaliser" />
            <Line label="Vibrations" right={
              <Toggle on={s.haptics} onChange={(v) => s.set('haptics', v)} />
            } />
            <Line label="Réduire les animations" right={
              <Toggle on={s.reduceMotion} onChange={(v) => s.set('reduceMotion', v)} />
            } />
            <Line
              label="Mode strict"
              sub="Impossible de mettre la protection en pause."
              right={<Toggle on={s.strictMode} onChange={(v) => s.set('strictMode', v)} />}
            />

            <Group title="Compte" />
            <Line label="Langue" right={
              <Text variant="body" tone="secondary">{lang === 'fr' ? 'Français' : 'English'}</Text>
            } />
            <Line
              label="Refaire l’introduction"
              onPress={() => { reset(); onClose(); router.replace('/onboarding'); }}
            />
            <Line
              label={cleared ? 'Données effacées' : 'Effacer mes données'}
              danger
              onPress={async () => {
                await AsyncStorage.clear();
                haptics.stop();
                setCleared(true);
              }}
            />

            <Group title="À propos" />
            <Line
              label="Réglages iOS de UnSwipe"
              onPress={() => void Linking.openSettings()}
            />

            <Group title="À propos" />
            <Line
              label="Partager UnSwipe"
              sub="Ton code de parrainage est dans l’onglet Compte."
              onPress={() => {
                void Share.share({
                  message: 'UnSwipe : Instagram, TikTok, X et YouTube sans les reels.',
                });
              }}
            />
            <Line
              label="Confidentialité"
              sub="Rien ne quitte ton téléphone. Aucun compte, aucun serveur."
            />
            <Line label="Version" right={
              <Text variant="body" tone="secondary">1.0.0 · {Platform.OS}</Text>
            } />
            <Text variant="label" tone="tertiary" style={st.foot}>
              {d.account.dataBody}
            </Text>
          </ScrollView>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

function Group({ title }: { title: string }) {
  return <Text variant="label" tone="tertiary" style={st.group}>{title}</Text>;
}

function Line({
  label, sub, right, onPress, danger,
}: { label: string; sub?: string; right?: React.ReactNode; onPress?: () => void; danger?: boolean }) {
  const Wrap: React.ElementType = onPress ? Pressable : View;
  return (
    <Wrap onPress={onPress ? () => { haptics.tap(); onPress(); } : undefined} style={st.line}>
      <View style={{ flex: 1 }}>
        <Text variant="body" color={danger ? colors.danger : undefined}>{label}</Text>
        {sub && <Text variant="label" tone="secondary">{sub}</Text>}
      </View>
      {right ?? (onPress ? <Text variant="body" tone="tertiary">›</Text> : null)}
    </Wrap>
  );
}

const st = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: '#000000C0', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden',
    paddingHorizontal: space.lg, paddingBottom: space.xxl,
  },
  tint: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0B0D11F2' },
  head: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.lg },
  done: {
    width: 44, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent,
  },
  group: { marginTop: space.lg, marginBottom: space.xs },
  line: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.lineStrong,
  },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  foot: { marginTop: space.lg },
});
