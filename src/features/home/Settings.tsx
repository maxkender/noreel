import { useCallback, useEffect, useState, useMemo } from 'react';
import {
  Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { withAlpha } from '@/theme/colors';
import { useBlurTint, useColors, type Palette, type ThemeName } from '@/theme/useColors';
import { space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { haptics } from '@/lib/haptics';
import { useT } from '@/i18n';
import { LANGS, formatHours } from '@/lib/format';
import { useSettings } from '@/store/settings';
import { Toggle } from './parts';
import { LANG_NAMES } from '@/components/LangPicker';
import { FLAGS } from '@/features/onboarding/screens/Language';
import { useLang } from '@/store/lang';
import { Check } from 'lucide-react-native';
import { STORE_URL, shareApp, shareOnWhatsApp } from '@/lib/share';
import { Feedback, SUPPORT_EMAIL } from './Feedback';
import { Sources } from './Sources';
import {
  FAMILY_CONTROLS_ENABLED, authorizationStatus, requestAuthorization,
  type AuthState,
} from '@/services/shield.real';
import { alertsOn } from '@/services/igAlerts';
import { useRouter } from 'expo-router';



const GOALS = [60, 90, 120, 180, 240];
/* Les libelles sont lus au rendu : la table vit au niveau du module, ou le
   dictionnaire n'est pas encore charge. */
const THEMES: [ThemeName, 'themeSystem' | 'themeDark' | 'themeLight'][] = [
  ['system', 'themeSystem'], ['dark', 'themeDark'], ['light', 'themeLight'],
];

/** Feuille de reglages : tout ce qu'il y a dedans agit reellement. */
export function Settings({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const c = useColors();
  const tint = useBlurTint();
  const st = useMemo(() => sheet(c), [c]);
  const { d, lang } = useT();
  /*
    La feuille SORT, elle ne disparait pas.

    Elle entrait en glissant et s'evanouissait d'un coup : une fenetre modale
    se demonte a l'instant ou on la ferme, donc l'animation de sortie n'avait
    jamais le temps de jouer. On garde la fenetre montee deux dixiemes de
    seconde de plus, le temps que la feuille redescende — c'est la seule
    facon d'avoir une sortie dans une modale.
  */
  const [closing, setClosing] = useState(false);
  const close = useCallback(() => {
    setClosing(true);
    setTimeout(() => { setClosing(false); onClose(); }, 220);
  }, [onClose]);

  const s = useSettings();
  const [cleared, setCleared] = useState(false);
  const [feedback, setFeedback] = useState(false);
  const [sources, setSources] = useState(false);
  const [auth, setAuth] = useState<AuthState>('notDetermined');

  useEffect(() => { if (visible) void authorizationStatus().then(setAuth); }, [visible]);

  const [langOpen, setLangOpen] = useState(false);
  const setLang = useLang((x) => x.set);
  const router = useRouter();
  /** Ferme la feuille, PUIS ouvre l'ecran : iOS n'empile pas une page sur une fenetre ouverte. */
  const go = (path: '/help' | '/alerts') => { haptics.tap(); close(); setTimeout(() => router.push(path), 260); };
  const [alerts, setAlerts] = useState(false);
  useEffect(() => { if (visible) void alertsOn().then(setAlerts); }, [visible]);


  return (
    <Modal
      visible={visible || closing}
      transparent
      animationType="none"
      onRequestClose={close}
    >
      {/* Le fond de l'app se floute derriere la feuille : sans ca, la feuille
          de verre se detache d'une image nette et ressemble a un calque. */}
      <Animated.View
        entering={FadeIn.duration(220)}
        exiting={FadeOut.duration(200)}
        style={StyleSheet.absoluteFill}
      >
        <BlurView intensity={26} tint={tint} style={StyleSheet.absoluteFill} />
      </Animated.View>

      <Pressable style={st.scrim} onPress={close}>
        {!closing && (
        <Animated.View
          entering={SlideInDown.duration(280)}
          exiting={SlideOutDown.duration(220)}
          style={st.sheet}
        >
          <BlurView intensity={65} tint={tint} style={StyleSheet.absoluteFill} />
          <View style={st.tint} />

          <View style={st.head}>
            <View style={{ width: 44 }} />
            <Text variant="title" style={{ flex: 1, textAlign: 'center' }}>{d.prefs.title}</Text>
            <Pressable onPress={close} style={st.done} hitSlop={10}>
              <Text variant="label" color={c.night}>OK</Text>
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
            {/*
              La langue, EN HAUT et en clair : une ligne, la langue du moment,
              et la liste qui se deplie sur place. Elle vivait en bas, en
              nuage de pastilles, et on ne la trouvait pas. Pas de seconde
              fenetre : iOS refuse d'en ouvrir une par-dessus celle-ci.
            */}
            <Group title={d.ui.language} />
            <Line
              label={`${FLAGS[lang]}  ${LANG_NAMES[lang]}`}
              right={<Text variant="body" tone="tertiary">{langOpen ? '⌃' : '›'}</Text>}
              onPress={() => setLangOpen((o) => !o)}
            />
            {langOpen && LANGS.map((l) => (
              <Line
                key={l}
                label={`${FLAGS[l]}  ${LANG_NAMES[l]}`}
                right={l === lang ? <Check size={18} strokeWidth={2.6} color={c.accent} /> : <View />}
                onPress={() => { if (l !== lang) { haptics.tick(); setLang(l); } }}
              />
            ))}

            {/* Les alertes Instagram : iPhone seulement pour l'instant. */}
            {Platform.OS === 'ios' && (
              <>
                <Group title={d.alerts.title} />
                <Line
                  label={d.alerts.row}
                  right={<Text variant="body" tone="tertiary">{`${alerts ? d.alerts.on : d.alerts.off}  ›`}</Text>}
                  onPress={() => go('/alerts')}
                />
              </>
            )}

            {Platform.OS === 'ios' && (
              <>
            <Group title={d.block.title} />
            <Line
              label={d.prefs.screenTime}
              sub={auth === 'approved' ? d.prefs.screenTimeOk : d.prefs.screenTimeNeed}
              right={
                <Text variant="label" color={auth === 'approved' ? c.accent : c.mist}>
                  {auth === 'approved' ? 'OK' : d.block.activate}
                </Text>
              }
              onPress={auth === 'approved' || !FAMILY_CONTROLS_ENABLED
                ? () => void Linking.openSettings()
                : () => { void requestAuthorization().then(setAuth); }}
            />
              </>
            )}
            <Line
              label={d.prefs.strictReels}
              sub={d.prefs.strictReelsBody}
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
            <Group title={d.ui.share} />
            {/* Deux portes : WhatsApp directement, ou la feuille de partage d'iOS avec le lien. */}
            <Line label={d.ui.shareWhatsApp} onPress={() => { void shareOnWhatsApp(); }} />
            <Line label={d.ui.shareLink} sub={STORE_URL.replace('https://', '')} onPress={() => { void shareApp(); }} />

            <Group title={d.prefs.look} />
            <View style={st.chips}>
              {THEMES.map(([k, key]) => {
                const on = s.theme === k;
                return (
                  <Pressable
                    key={k}
                    onPress={() => { haptics.tick(); s.set('theme', k); }}
                    style={[st.chip, on && st.chipOn]}
                  >
                    <Text variant="label" color={on ? c.night : withAlpha(c.mist, 0.7)}>
                      {d.ob[key]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Group title={d.prefs.cap} />
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

            <Group title={d.prefs.custom} />
            <Line label={d.prefs.haptics} right={
              <Toggle on={s.haptics} onChange={(v) => s.set('haptics', v)} />
            } />
            <Line label={d.prefs.reduceMotion} right={
              <Toggle on={s.reduceMotion} onChange={(v) => s.set('reduceMotion', v)} />
            } />

            {/*
              Une seule porte vers les reglages d’iOS.
              Il y en avait trois — notifications, apps autorisées, réglages —
              qui menaient toutes au meme endroit, et deux groupes « À propos »
              se suivaient. Un reglage qui ne fait rien de particulier n’a pas
              besoin de sa ligne.
            */}
            <Group title={d.prefs.help} />
            <Line label={d.faq.row} onPress={() => go('/help')} />
            <Line
              label={d.prefs.feedback}
              sub={d.prefs.feedbackBody}
              onPress={() => setFeedback(true)}
            />
            <Line
              label={d.prefs.support}
              sub={SUPPORT_EMAIL}
              onPress={() => {
                void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${
                  encodeURIComponent('[UnSwipe] Support')}`).catch(() => {});
              }}
            />
            {Platform.OS === 'ios' && (
            <Line
              label={d.prefs.iosSettings}
              sub={d.prefs.iosSettingsBody}
              onPress={() => void Linking.openSettings()}
            />
            )}

            <Group title={d.prefs.about} />
            <Line
              label={d.prefs.medical}
              sub={d.prefs.medicalBody}
              onPress={() => setSources(true)}
            />
            <Line
              label={d.prefs.privacy}
              sub={d.prefs.privacyBody}
            />
            {/*
              Le NUMERO DE BUILD, pas seulement la version.
              Sans lui, impossible de savoir quelle version tourne : on a
              cherche un bug de verrouillage pendant un moment avant de
              comprendre que le telephone etait reste sur un build anterieur.
              TestFlight ne met pas a jour tout seul.
            */}
            <Line label={d.prefs.version} right={
              <Text variant="body" tone="secondary">
                {Constants.expoConfig?.version ?? ''} ({Constants.nativeBuildVersion ?? '—'})
              </Text>
            } />
            <Line
              label={cleared ? d.prefs.wiped : d.prefs.wipe}
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
        )}
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
  scrim: { flex: 1, backgroundColor: '#00000090', justifyContent: 'flex-end' },
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
