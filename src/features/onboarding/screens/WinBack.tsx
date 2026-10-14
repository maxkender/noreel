import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { X } from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { gutter, space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { haptics } from '@/lib/haptics';
import { useProStore } from '@/store/pro';
import { useSettings } from '@/store/settings';
import { buy, winbackOffering } from '@/services/purchases';
import type { PurchasesPackage } from 'react-native-purchases';
import { dict } from '@/i18n';

/*
 * Les couleurs de cet ecran ne suivent PAS le theme.
 *
 * Il se peignait avec les accents de la palette active : trois teintes
 * differentes selon le mode, du texte qui virait du creme au noir, et un
 * ensemble qui ne s'accordait avec rien. C'est une scene, pas du mobilier —
 * comme l'intro et le final, elle garde ses couleurs. Une seule famille,
 * du violet au bleu, et du blanc par-dessus : lisible partout, identique
 * partout.
 */
const DEEP = '#5B3FD6';
const MID = '#3F57C9';
const LOW = '#26307A';
const INK = '#FFFFFF';

/**
 * L'offre de rattrapage. Un ecran, une phrase, un bouton.
 *
 * Elle ne parait qu'une fois dans la vie de l'app : proposer deux fois une
 * remise apres un refus n'est plus une offre, c'est du harcelement — et ca
 * apprend a attendre le rabais.
 */
export function WinBack({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const st = useMemo(() => sheet(), []);
  const [pack, setPack] = useState<PurchasesPackage | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    void winbackOffering().then((o) => setPack(o?.availablePackages?.[0] ?? null));
  }, [visible]);

  // Sans offre configuree cote magasin, on ne montre rien : annoncer un prix
  // sur lequel l'achat echouerait serait pire que se taire.
  const show = visible && !!pack;

  const close = () => { haptics.tap(); onClose(); };

  const go = async () => {
    if (!pack) return;
    setBusy(true);
    const r = await buy(pack);
    setBusy(false);
    if (r === 'bought') useProStore.getState().setPro(true);
    onClose();
  };

  return (
    <Modal visible={show} animationType="slide" onRequestClose={close}>
      <View style={st.root}>
        <LinearGradient
          colors={[DEEP, MID, LOW]}
          locations={[0, 0.55, 1]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <SafeAreaView edges={['top', 'bottom']} style={st.safe}>
          {/* Une seule sortie, discrete. Il y en avait trois. */}
          <Pressable onPress={close} hitSlop={16} style={st.close}>
            <X size={18} strokeWidth={2.4} color={withAlpha(INK, 0.75)} />
          </Pressable>

          <View style={{ flex: 1 }} />

          <Animated.View entering={FadeIn.duration(520)}>
            <Text variant="label" color={withAlpha(INK, 0.65)}>{dict.ui.wbKicker}</Text>
            <Text variant="displayL" color={INK} style={st.title}>
              {dict.ui.wbTitle}
            </Text>
            <View style={st.priceRow}>
              <Text variant="hero" color={INK}>{pack?.product.priceString ?? '14,99 €'}</Text>
              <Text variant="lead" color={withAlpha(INK, 0.7)}>{dict.ui.wbPerYear}</Text>
            </View>
            <Text variant="lead" color={withAlpha(INK, 0.75)} style={st.body}>
              {dict.ui.wbBody}
            </Text>
          </Animated.View>

          <View style={{ flex: 1 }} />

          <Pressable style={st.cta} onPress={() => { haptics.press(); void go(); }} disabled={busy}>
            <Text variant="button" color={LOW}>
              {busy ? dict.pay.wait : dict.misc.takeOffer}
            </Text>
          </Pressable>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

/** Marque l'offre comme vue. Appele au moment ou on la montre, pas apres :
 *  si l'app est tuee pendant, elle ne doit pas revenir au lancement suivant. */
export function markWinbackSeen(): void {
  useSettings.getState().set('winbackSeen', true);
}

export function winbackSeen(): boolean {
  return useSettings.getState().winbackSeen;
}

const sheet = () => StyleSheet.create({
  root: { flex: 1, backgroundColor: LOW },
  safe: { flex: 1, paddingHorizontal: gutter, paddingBottom: space.xl },
  close: {
    alignSelf: 'flex-end', marginTop: space.sm,
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: withAlpha(INK, 0.14),
  },
  title: { marginTop: space.xs },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm, marginTop: space.lg },
  body: { marginTop: space.lg, lineHeight: 24 },
  cta: {
    height: 56, borderRadius: 28, backgroundColor: INK,
    alignItems: 'center', justifyContent: 'center',
  },
});
