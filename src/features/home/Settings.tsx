import { useEffect, useState, useMemo } from 'react';
import {
  Linking, Modal, Pressable, ScrollView, Share, StyleSheet, View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { withAlpha } from '@/theme/colors';
import { useBlurTint, useColors, type Palette, type ThemeName } from '@/theme/useColors';
import { space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { haptics } from '@/lib/haptics';
import { useT } from '@/i18n';
import { formatHours } from '@/lib/format';
import { useSettings } from '@/store/settings';
import { useAppsStore } from '@/store/apps';
import { TINTS } from '@/theme/tints';
import { Toggle } from './parts';
import { Feedback, SUPPORT_EMAIL } from './Feedback';
import { Sources } from './Sources';
import {
  FAMILY_CONTROLS_ENABLED, authorizationStatus, requestAuthorization,
  type AuthState,
} from '@/services/shield.real';

/*
 * Les jours, dans l'ordre ou on les lit — et numerotes comme Date.getDay les
 * numerote : dimanche vaut 0. Ecrire la liste dans l'ordre francais et se
 * servir de l'indice aurait decale toute la semaine d'un cran.
 */
const DAYS: [number, string][] = [
  [1, 'Lundi'], [2, 'Mardi'], [3, 'Mercredi'], [4, 'Jeudi'],
  [5, 'Vendredi'], [6, 'Samedi'], [0, 'Dimanche'],
];

// Le soir seulement : une fenetre le matin se prolonge sur la journee.
const HOURS = [18, 19, 20, 21, 22];

const GOALS = [60, 90, 120, 180, 240];
const THEMES: [ThemeName, string][] = [
  ['system', 'Système'], ['dark', 'Sombre'], ['light', 'Clair'],
];

/** Feuille de reglages : tout ce qu'il y a dedans agit reellement. */
export function Settings({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const c = useColors();
  const tint = useBlurTint();
  const st = useMemo(() => sheet(c), [c]);
  const { d } = useT();
  const s = useSettings();
  const instaTint = useAppsStore((x) => x.tints.instagram);
  const setTint = useAppsStore((x) => x.setTint);
  const [cleared, setCleared] = useState(false);
  const [feedback, setFeedback] = useState(false);
  const [sources, setSources] = useState(false);
  const [auth, setAuth] = useState<AuthState>('notDetermined');

  useEffect(() => { if (visible) void authorizationStatus().then(setAuth); }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={st.scrim} onPress={onClose}>
        <Animated.View entering={SlideInDown.duration(280)} style={st.sheet}>
          <BlurView intensity={65} tint={tint} style={StyleSheet.absoluteFill} />
          <View style={st.tint} />

          <View style={st.head}>
            <View style={{ width: 44 }} />
            <Text variant="title" style={{ flex: 1, textAlign: 'center' }}>Paramètres</Text>
            <Pressable onPress={onClose} style={st.done} hitSlop={10}>
              <Text variant="label" color={c.night}>OK</Text>
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
                <Text variant="label" color={auth === 'approved' ? c.accent : c.mist}>
                  {auth === 'approved' ? 'OK' : 'Activer'}
                </Text>
              }
              onPress={auth === 'approved' || !FAMILY_CONTROLS_ENABLED
                ? () => void Linking.openSettings()
                : () => { void requestAuthorization().then(setAuth); }}
            />
            <Line
              label="Blocage strict des reels"
              sub="Un reel touché affiche un mur, au lieu de ne rien faire."
              right={<Toggle on={s.strictMode} onChange={(v) => s.set('strictMode', v)} />}
            />

            {/*
              La soupape.
              Elle a l'air de contredire toute l'app, et c'est ce qui fait tenir
              le blocage : une interdiction totale se contourne en
              desinstallant, une heure annoncee d'avance se respecte. Eteinte
              par defaut — on ne l'impose pas, on la rend possible.
            */}
            {/*
              La couleur est AUSSI ici.
              Elle ne vivait que dans le panneau qu'on ouvre depuis la barre
              flottante, a l'interieur d'Instagram : c'est l'endroit logique,
              et personne ne l'y a trouvee. Un reglage qu'on ne decouvre qu'en
              sachant deja qu'il existe n'existe pas.
            */}
            <Group title="Couleur d’Instagram" />
            <View style={st.chips}>
              {TINTS.map((t) => {
                const on = (instaTint ?? 'default') === t.id;
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => { haptics.tick(); setTint('instagram', t.id); }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={t.label}
                    style={[st.swatch, { backgroundColor: t.hex }, on && st.swatchOn]}
                  />
                );
              })}
            </View>
            <Text variant="label" tone="tertiary" style={st.hint}>
              Boutons, liens et tes bulles de message. Chaque app a la sienne,
              dans ses réglages depuis la barre flottante.
            </Text>

            <Group title="Fenêtre autorisée" />
            <Line
              label="Une heure par semaine"
              sub={s.valve.on
                ? `${DAYS.find(([k]) => k === s.valve.day)?.[1] ?? ''} de ${s.valve.from} h à ${s.valve.to} h, les reels passent.`
                : 'Une heure choisie où les reels passent. Mieux tenue qu’un blocage total.'}
              right={
                <Toggle
                  on={s.valve.on}
                  onChange={(v) => s.set('valve', { ...s.valve, on: v })}
                />
              }
            />
            {s.valve.on && (
              <>
                <View style={st.chips}>
                  {DAYS.map(([k, label]) => {
                    const on = s.valve.day === k;
                    return (
                      <Pressable
                        key={k}
                        onPress={() => { haptics.tick(); s.set('valve', { ...s.valve, day: k }); }}
                        style={[st.chip, on && st.chipOn]}
                      >
                        <Text variant="label" color={on ? c.night : withAlpha(c.mist, 0.7)}>
                          {label.slice(0, 3)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={st.chips}>
                  {HOURS.map((h) => {
                    const on = s.valve.from === h;
                    return (
                      <Pressable
                        key={h}
                        // La fenetre dure une heure : la fin suit le debut, on
                        // ne peut donc pas se retrouver avec une fin avant son
                        // debut, ni avec une soupape ouverte toute la soiree.
                        onPress={() => {
                          haptics.tick();
                          s.set('valve', { ...s.valve, from: h, to: h + 1 });
                        }}
                        style={[st.chip, on && st.chipOn]}
                      >
                        <Text variant="label" color={on ? c.night : withAlpha(c.mist, 0.7)}>
                          {h} h
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            <Group title="Apparence" />
            <View style={st.chips}>
              {THEMES.map(([k, label]) => {
                const on = s.theme === k;
                return (
                  <Pressable
                    key={k}
                    onPress={() => { haptics.tick(); s.set('theme', k); }}
                    style={[st.chip, on && st.chipOn]}
                  >
                    <Text variant="label" color={on ? c.night : withAlpha(c.mist, 0.7)}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Group title="Plafond quotidien" />
            <View style={st.chips}>
              {GOALS.map((g) => {
                const on = s.goalMinutes === g;
                return (
                  <Pressable
                    key={g}
                    onPress={() => { haptics.tick(); s.set('goalMinutes', g); }}
                    style={[st.chip, on && st.chipOn]}
                  >
                    <Text variant="label" color={on ? c.night : withAlpha(c.mist, 0.7)}>
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

            {/*
              Une seule porte vers les reglages d’iOS.
              Il y en avait trois — notifications, apps autorisées, réglages —
              qui menaient toutes au meme endroit, et deux groupes « À propos »
              se suivaient. Un reglage qui ne fait rien de particulier n’a pas
              besoin de sa ligne.
            */}
            <Group title="Aide" />
            <Line
              label="Faire un retour"
              sub="Un bug, une idée, une app qui résiste au filtre."
              onPress={() => setFeedback(true)}
            />
            <Line
              label="Écrire au support"
              sub={SUPPORT_EMAIL}
              onPress={() => {
                void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${
                  encodeURIComponent('[UnSwipe] Support')}`).catch(() => {});
              }}
            />
            <Line
              label="Réglages iOS de UnSwipe"
              sub="Notifications, Temps d’écran, autorisations."
              onPress={() => void Linking.openSettings()}
            />

            <Group title="À propos" />
            <Line
              label="Partager UnSwipe"
              onPress={() => {
                void Share.share({
                  message: 'UnSwipe : Instagram, TikTok, X et YouTube sans les reels.',
                });
              }}
            />
            <Line
              label="Sources médicales"
              sub="D’où viennent les chiffres sur le cerveau, et leurs limites."
              onPress={() => setSources(true)}
            />
            <Line
              label="Confidentialité"
              sub="Rien ne quitte ton téléphone. Aucun compte, aucun serveur."
            />
            {/*
              Le NUMERO DE BUILD, pas seulement la version.
              Sans lui, impossible de savoir quelle version tourne : on a
              cherche un bug de verrouillage pendant un moment avant de
              comprendre que le telephone etait reste sur un build anterieur.
              TestFlight ne met pas a jour tout seul.
            */}
            <Line label="Version" right={
              <Text variant="body" tone="secondary">
                1.0.0 ({Constants.nativeBuildVersion ?? '—'})
              </Text>
            } />
            <Line
              label={cleared ? 'Données effacées' : 'Effacer mes données'}
              danger
              onPress={async () => {
                await AsyncStorage.clear();
                haptics.stop();
                setCleared(true);
              }}
            />

            <Text variant="label" tone="tertiary" style={st.foot}>
              {d.account.dataBody}
            </Text>
          </ScrollView>
        </Animated.View>
      </Pressable>

      <Feedback visible={feedback} onClose={() => setFeedback(false)} />
      <Sources visible={sources} onClose={() => setSources(false)} />
    </Modal>
  );
}

function Group({ title }: { title: string }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  return <Text variant="label" tone="tertiary" style={st.group}>{title}</Text>;
}

function Line({
  label, sub, right, onPress, danger,
}: { label: string; sub?: string; right?: React.ReactNode; onPress?: () => void; danger?: boolean }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const Wrap: React.ElementType = onPress ? Pressable : View;
  return (
    <Wrap onPress={onPress ? () => { haptics.tap(); onPress(); } : undefined} style={st.line}>
      <View style={{ flex: 1 }}>
        <Text variant="body" color={danger ? c.danger : undefined}>{label}</Text>
        {sub && <Text variant="label" tone="secondary">{sub}</Text>}
      </View>
      {right ?? (onPress ? <Text variant="body" tone="tertiary">›</Text> : null)}
    </Wrap>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  scrim: { flex: 1, backgroundColor: '#000000C0', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden',
    paddingHorizontal: space.lg, paddingBottom: space.xxl,
  },
  tint: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: withAlpha(c.night, 0.95),
  },
  head: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.lg },
  done: {
    width: 44, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', backgroundColor: c.accent,
  },
  group: { marginTop: space.lg, marginBottom: space.xs },
  line: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line,
  },
  swatch: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(c.mist, 0.2),
  },
  // Le choix se voit a l'anneau : une pastille qui grandit decale les autres.
  swatchOn: { borderWidth: 2.5, borderColor: c.mist },
  hint: { marginTop: space.xs, lineHeight: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.lineStrong,
  },
  chipOn: { backgroundColor: c.accent, borderColor: c.accent },
  foot: { marginTop: space.lg },
});
