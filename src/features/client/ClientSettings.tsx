import { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { LogOut, Lock, UserRoundCog } from 'lucide-react-native';
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
 * Changer de compte, par la porte du site lui-meme.
 *
 * Isoler deux sessions cote app demanderait un magasin de cookies par
 * compte, et WKWebView n'en expose qu'un seul a react-native-webview. Mais
 * Instagram, X et TikTok savent deja tenir plusieurs comptes a la fois :
 * se connecter depuis leur page ajoute le compte a LEUR selecteur sans
 * chasser le premier. On y mene, plutot que d'imiter mal.
 */
const ACCOUNT: Record<ClientId, { add: string; out: string; note?: string }> = {
  instagram: {
    add: 'https://www.instagram.com/accounts/login/',
    out: 'https://www.instagram.com/accounts/logout/',
  },
  twitter: {
    add: 'https://x.com/i/flow/login',
    out: 'https://x.com/logout',
  },
  tiktok: {
    add: 'https://www.tiktok.com/login',
    out: 'https://www.tiktok.com/logout',
  },
  youtube: {
    add: 'https://accounts.google.com/AccountChooser?continue=https://m.youtube.com/',
    out: 'https://accounts.google.com/Logout',
    // Google refuse souvent la connexion depuis un navigateur integre. On
    // le dit ici plutot que de laisser son message d'erreur passer pour une
    // panne de notre cote.
    note: 'Google refuse parfois la connexion depuis un navigateur intégré.',
  },
};

/**
 * Les reglages de l'app, atteignables SANS la quitter.
 *
 * Un changement s'applique SUR-LE-CHAMP : l'ecran pousse la nouvelle table
 * de reglages dans la page, qui repasse et rend ce qu'elle ne doit plus
 * cacher. Il n'y a donc plus rien a recharger.
 */
export function ClientSettings({
  id, visible, onClose, onGo,
}: { id: ClientId; visible: boolean; onClose: () => void; onGo: (url: string) => void }) {
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
              Les changements s’appliquent tout de suite.
            </Text>

            <Text variant="label" tone="tertiary" style={st.section}>COMPTE</Text>

            <Pressable
              style={st.action}
              onPress={() => { haptics.press(); onGo(ACCOUNT[id].add); }}
            >
              <UserRoundCog size={15} strokeWidth={2} color={c.accent} />
              <Text variant="body" style={{ flex: 1 }}>Changer de compte</Text>
            </Pressable>

            <Pressable
              style={st.action}
              onPress={() => { haptics.press(); onGo(ACCOUNT[id].out); }}
            >
              <LogOut size={15} strokeWidth={2} color={withAlpha(c.mist, 0.45)} />
              <Text variant="body" tone="secondary" style={{ flex: 1 }}>Se déconnecter</Text>
            </Pressable>

            <Text variant="label" tone="tertiary" style={st.note}>
              {ACCOUNT[id].note
                ?? `Connecte-toi à un deuxième compte : ${name} les garde tous les deux et tu passes de l’un à l’autre depuis ton profil.`}
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
  // Fige sur la palette sombre, ce voile faisait un panneau noir en mode
  // clair, avec du texte sombre dessus.
  tint: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: withAlpha(c.night, 0.94),
  },
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
  section: { marginTop: space.xl, marginBottom: space.xs },
  action: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: withAlpha(c.mist, 0.1),
  },
});
