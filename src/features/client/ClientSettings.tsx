import { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { Check, Hourglass, LogOut, Lock, UserRoundCog } from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { useBlurTint, useColors, type Palette } from '@/theme/useColors';
import { gutter, space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { haptics } from '@/lib/haptics';
import { APP_TOGGLES, useAppsStore } from '@/store/apps';
import { Toggle } from '@/features/home/parts';
import { LockedPill } from '@/features/home/LockedPill';
import { useProStore } from '@/store/pro';
import { LOGOS, APPS } from '@/features/home/AppSlider';
import { TINTS } from '@/theme/tints';
import { PASS_MINUTES } from './ReelsPass';
import type { ClientId } from './blockers';
import { ACCOUNT } from './accounts';


/**
 * Les reglages de l'app, atteignables SANS la quitter.
 *
 * Un changement s'applique SUR-LE-CHAMP : l'ecran pousse la nouvelle table
 * de reglages dans la page, qui repasse et rend ce qu'elle ne doit plus
 * cacher. Il n'y a donc plus rien a recharger.
 */
export function ClientSettings({
  id, visible, onClose, onGo, onPass,
}: {
  id: ClientId;
  visible: boolean;
  onClose: () => void;
  onGo: (url: string) => void;
  /** Ouvre l'epreuve du laissez-passer. Jouee par l'ecran, pas par la feuille :
   *  deux fenetres modales empilees se comportent mal sur iOS. */
  onPass: () => void;
}) {
  const c = useColors();
  const tint = useBlurTint();
  const st = useMemo(() => sheet(c), [c]);
  const pro = useProStore((p) => p.pro);
  const isOn = useAppsStore((s) => s.isOn);
  const toggle = useAppsStore((s) => s.toggle);
  useAppsStore((s) => s.settings);
  // « tint » est deja pris plus haut par la teinte du FLOU de la feuille :
  // celle-ci est la couleur choisie pour l'app.
  const colour = useAppsStore((s) => s.tints[id]);
  const setColour = useAppsStore((s) => s.setTint);

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
                {t.locked
                  ? <LockedPill />
                  : pro
                    ? <Toggle on={isOn(id, t.key)} onChange={(v) => toggle(id, t.key, v)} />
                    : <LockedPill label="Pro" />}
              </View>
            ))}

            <Text variant="label" tone="tertiary" style={st.note}>
              Les changements s’appliquent tout de suite.
            </Text>


            {/*
              La teinte.
              Instagram publie sa palette en proprietes CSS personnalisees :
              on remplace les variables d'ACCENT — boutons, liens, ses propres
              bulles de message — et le bandeau du haut suit. Les fonds ne
              bougent pas : un fil sur vert sature ne se lit plus, et ce n'est
              pas ce qu'on demande en demandant un Instagram vert.
            */}
            <Text variant="label" tone="tertiary" style={st.section}>LAISSEZ-PASSER</Text>

            {/*
              Cinq minutes de reels, gagnees.
              Ce qui fait desinstaller un bloqueur, c'est l'impasse : qui veut
              vraiment voir un reel le verra, ici ou en supprimant l'app. La
              seule chose qu'on choisisse, c'est le prix du passage.
            */}
            <Pressable
              style={st.action}
              onPress={() => { haptics.press(); onClose(); onPass(); }}
            >
              <Hourglass size={15} strokeWidth={2} color={c.ember} />
              <Text variant="body" style={{ flex: 1 }}>
                Débloquer les Reels {PASS_MINUTES} minutes
              </Text>
            </Pressable>

            <Text variant="label" tone="tertiary" style={st.note}>
              Une attente, trois calculs et une suite à retenir. C’est long
              exprès.
            </Text>

            <Text variant="label" tone="tertiary" style={st.section}>COULEUR</Text>

            <View style={st.tints}>
              {TINTS.map((t) => {
                const on = (colour ?? 'default') === t.id;
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => { haptics.tick(); setColour(id, t.id); }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={t.label}
                    style={[st.swatch, { backgroundColor: t.hex }, on && st.swatchOn]}
                  >
                    {on && <Check size={15} strokeWidth={3} color={t.ink} />}
                  </Pressable>
                );
              })}
            </View>

            <Text variant="label" tone="tertiary" style={st.note}>
              {id === 'instagram'
                ? 'Change les boutons, les liens et tes bulles de message.'
                : 'Change le bandeau du haut. Les couleurs du site ne bougent que sur Instagram.'}
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
  tints: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.xs },
  swatch: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(c.mist, 0.2),
  },
  // Le choix se voit a l'anneau, pas a la taille : une pastille qui grandit
  // decale toutes les autres.
  swatchOn: { borderWidth: 2.5, borderColor: c.mist },
  action: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: withAlpha(c.mist, 0.1),
  },
});
