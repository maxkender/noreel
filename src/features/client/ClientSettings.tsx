import { useCallback, useContext, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { Hourglass, LogOut, Lock } from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { useBlurTint, useColors, type Palette } from '@/theme/useColors';
import { gutter, space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { haptics } from '@/lib/haptics';
import { useT } from '@/i18n';
import { APP_TOGGLES, useAppsStore } from '@/store/apps';
import { Toggle } from '@/features/home/parts';
import { LockedPill } from '@/features/home/LockedPill';
import { useProStore } from '@/store/pro';
import { LOGOS, APPS } from '@/features/home/AppSlider';
import { PASS_MINUTES } from './ReelsPass';
import type { ClientId } from './blockers';
import { ACCOUNT } from './accounts';
import { AccountList } from './SwitchSheet';
import type { Session } from '@/store/sessions';


/**
 * Les reglages de l'app, atteignables SANS la quitter.
 *
 * Un changement s'applique SUR-LE-CHAMP : l'ecran pousse la nouvelle table
 * de reglages dans la page, qui repasse et rend ce qu'elle ne doit plus
 * cacher. Il n'y a donc plus rien a recharger.
 */
export function ClientSettings({
  id, visible, onClose, onGo, onPass, onPost, accounts, current, onPick, onAdd, onRemove,
}: {
  id: ClientId;
  visible: boolean;
  onClose: () => void;
  onGo: (url: string) => void;
  /** Ouvre l'epreuve du laissez-passer. Jouee par l'ecran, pas par la feuille :
   *  deux fenetres modales empilees se comportent mal sur iOS. */
  onPass: () => void;
  /** Ouvre les reglages du mode publication. */
  onPost: () => void;
  /** Les comptes gardes par l'app, et celui en cours. */
  accounts: Session[];
  current: string | null;
  onPick: (uid: string) => void;
  onAdd: () => void;
  onRemove: (uid: string) => void;
}) {
  const c = useColors();
  const { height: winH } = useWindowDimensions();
  const insets = useContext(SafeAreaInsetsContext);
  const tint = useBlurTint();
  const st = useMemo(() => sheet(c), [c]);
  const { d, t } = useT();
  const pro = useProStore((p) => p.pro);
  const isOn = useAppsStore((s) => s.isOn);
  const toggle = useAppsStore((s) => s.toggle);
  useAppsStore((s) => s.settings);
  // « tint » est deja pris plus haut par la teinte du FLOU de la feuille :
  // celle-ci est la couleur choisie pour l'app.
  /*
    La feuille SORT, elle ne disparait pas : une fenetre modale se demonte a
    l'instant ou on la ferme, donc son animation de sortie n'a jamais le temps
    de jouer. On la garde montee deux dixiemes de seconde de plus.
  */
  const [closing, setClosing] = useState(false);
  const close = useCallback(() => {
    setClosing(true);
    setTimeout(() => { setClosing(false); onClose(); }, 220);
  }, [onClose]);


  const name = APPS.find((a) => a.id === id)?.name ?? id;

  return (
    <Modal
      visible={visible || closing}
      transparent
      animationType="none"
      onRequestClose={close}
    >
      {/*
        La page reste VISIBLE derriere, a peine assombrie.
        Un reglage agit tout de suite : on doit voir le carrousel partir, la
        grille se vider, pendant qu'on touche l'interrupteur. Un voile flou
        cachait justement ce qu'on venait verifier.
      */}
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(180)}
        style={[StyleSheet.absoluteFill, { backgroundColor: '#00000055' }]}
      >
        {/* Le voile est DERRIERE la feuille, pas autour : il ne recoit que ce qui tombe a cote. */}
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityRole="button" />
      </Animated.View>
      <View style={[st.scrim, { paddingBottom: Math.max(insets?.bottom ?? 0, 10) + 4 }]} pointerEvents="box-none">
        {!closing && (
        <Animated.View
          entering={SlideInDown.duration(280)}
          exiting={SlideOutDown.duration(220)}
          style={[st.sheet, { maxHeight: winH * 0.6 }]}
        >
          {/* Le flou en direct ralentit Android au point que les appuis trainent : un verre plein, la-bas. */}
          {Platform.OS === 'ios' && <BlurView intensity={80} tint={tint} style={StyleSheet.absoluteFill} />}
          <View style={[st.tint, Platform.OS !== 'ios' && st.tintSolid]} />
          {/* Le reflet haut : c'est lui qui donne l'epaisseur du verre. */}
          <View style={st.sheen} pointerEvents="none" />

          <View style={st.grab} />
          <View style={st.head}>
            <Image source={LOGOS[id]} style={st.logo} contentFit="contain" />
            <Text variant="title" style={{ flex: 1 }}>{name}</Text>
            <Pressable onPress={() => { haptics.tap(); close(); }} style={st.done} hitSlop={10}>
              <Text variant="label" color={c.night}>OK</Text>
            </Pressable>
          </View>

          <ScrollView style={{ flexGrow: 0 }} showsVerticalScrollIndicator={false} bounces>
            {/* Ce qui ne se discute pas, d'abord : allume, et cadenasse. */}
            <Text variant="label" tone="tertiary" style={st.group}>{d.ui.alwaysActive}</Text>
            {APP_TOGGLES[id].filter((t) => t.locked).map((t) => (
              <View key={t.key} style={st.line}>
                <Lock size={12} strokeWidth={2} color={withAlpha(c.mist, 0.3)} />
                <Text variant="body" style={{ flex: 1 }}>{d.toggles[t.label]}</Text>
                <View pointerEvents="none" style={{ opacity: 0.75 }}><Toggle on onChange={() => {}} /></View>
              </View>
            ))}

            <Text variant="label" tone="tertiary" style={st.group}>{d.ui.proSettings}</Text>
            {APP_TOGGLES[id].filter((t) => !t.locked).map((t) => (
              /*
                La LIGNE entiere est l'interrupteur.
                Le seul pouce faisait 44 sur 26 points, dans une liste qui
                defile : sur Android, un doigt qui bouge d'un rien devenait un
                defilement et l'appui se perdait. On touche le texte, ca marche.
              */
              <Pressable
                key={t.key}
                style={st.line}
                disabled={!pro}
                onPress={() => { haptics.tick(); toggle(id, t.key, !isOn(id, t.key)); }}
                android_ripple={{ color: withAlpha(c.mist, 0.12) }}
                accessibilityRole="switch"
                accessibilityState={{ checked: pro && isOn(id, t.key), disabled: !pro }}
              >
                <Text variant="body" style={{ flexShrink: 1 }}>{d.toggles[t.label]}</Text>
                {t.beta && (
                  <View style={st.beta}><Text variant="label" tone="tertiary" style={{ fontSize: 9 }}>Beta</Text></View>
                )}
                <View style={{ flex: 1 }} />
                {pro
                  ? <View pointerEvents="none"><Toggle on={isOn(id, t.key)} onChange={() => {}} /></View>
                  : <LockedPill label="Pro" />}
              </Pressable>
            ))}

            <Text variant="label" tone="tertiary" style={st.note}>
              {d.ui.applyNow}
            </Text>


            {/*
              La teinte.
              Instagram publie sa palette en proprietes CSS personnalisees :
              on remplace les variables d'ACCENT — boutons, liens, ses propres
              bulles de message — et le bandeau du haut suit. Les fonds ne
              bougent pas : un fil sur vert sature ne se lit plus, et ce n'est
              pas ce qu'on demande en demandant un Instagram vert.
            */}
            <Text variant="label" tone="tertiary" style={st.section}>{d.ui.passSection}</Text>

            {/*
              Cinq minutes de reels, gagnees.
              Ce qui fait desinstaller un bloqueur, c'est l'impasse : qui veut
              vraiment voir un reel le verra, ici ou en supprimant l'app. La
              seule chose qu'on choisisse, c'est le prix du passage.
            */}
            <Pressable
              style={st.action}
              onPress={() => { haptics.press(); close(); onPass(); }}
            >
              <Hourglass size={15} strokeWidth={2} color={c.ember} />
              <Text variant="body" style={{ flex: 1 }}>
                {t(d.ui.passBtn, { n: PASS_MINUTES })}
              </Text>
            </Pressable>

            <Text variant="label" tone="tertiary" style={st.note}>
              {d.ui.passNote}
            </Text>

            {id === 'instagram' && (
              <>
                <Text variant="label" tone="tertiary" style={st.section}>{d.ui.publication}</Text>
                <Pressable
                  style={st.action}
                  onPress={() => { haptics.press(); close(); onPost(); }}
                >
                  <Hourglass size={15} strokeWidth={2} color={c.accent} />
                  <Text variant="body" style={{ flex: 1 }}>{d.client.postModeTitle}</Text>
                </Pressable>
                <Text variant="label" tone="tertiary" style={st.note}>{d.client.postModeNote}</Text>
              </>
            )}

            <Text variant="label" tone="tertiary" style={st.section}>{d.client.accounts}</Text>

            {/* Les comptes tenus par l'app : on en ajoute un ici, et la touche
                « changer de compte » apparait dans la barre des qu'il y en a deux. */}
            <AccountList accounts={accounts} current={current} onPick={onPick} onAdd={onAdd} onRemove={onRemove} />

            <Pressable
              style={st.action}
              onPress={() => { haptics.press(); if (current) onRemove(current); onGo(ACCOUNT[id].out); }}
            >
              <LogOut size={15} strokeWidth={2} color={withAlpha(c.mist, 0.45)} />
              <Text variant="body" tone="secondary" style={{ flex: 1 }}>{d.client.signOut}</Text>
            </Pressable>

            <Text variant="label" tone="tertiary" style={st.note}>
              {ACCOUNT[id].note ? d.ui[ACCOUNT[id].note] : d.client.accountsNote}
            </Text>
          </ScrollView>
        </Animated.View>
        )}
      </View>
    </Modal>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 10 },
  /*
    Une carte de verre qui FLOTTE : arrondie de tous cotes, decollee des
    bords, bordee d'un filet clair. Et d'une autre couleur que le fond
    d'Instagram — un bleu nuit — pour qu'on la lise comme la notre, posee
    sur leur page, et non comme un panneau de leur site.
  */
  sheet: {
    borderRadius: 28, overflow: 'hidden',
    borderWidth: 1, borderColor: withAlpha(c.mist, 0.18),
    paddingHorizontal: gutter, paddingTop: space.lg, paddingBottom: space.lg,
    shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 24, shadowOffset: { width: 0, height: 10 },
  },
  tint: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: withAlpha(c.glassTint, 0.84),
  },
  tintSolid: { backgroundColor: withAlpha(c.glassTint, 0.97) },
  sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: withAlpha(c.mist, 0.35) },
  grab: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: withAlpha(c.mist, 0.25), marginTop: -8, marginBottom: space.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingBottom: space.sm },
  group: { marginTop: space.md, marginBottom: 2 },
  beta: {
    marginLeft: space.sm, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
    backgroundColor: withAlpha(c.mist, 0.1), borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(c.mist, 0.2),
  },
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
