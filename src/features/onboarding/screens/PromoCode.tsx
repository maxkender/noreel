import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ticket } from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { space } from '@/theme/spacing';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/type/Text';
import { haptics } from '@/lib/haptics';
import { PURCHASES_ENABLED, redeemCode } from '@/services/purchases';
import { useProStore } from '@/store/pro';

type P = { onNext: () => void };

/**
 * « As-tu un code promo ? », juste avant le prix.
 *
 * On n'ouvre PAS un champ de texte. Un code d'abonnement appartient a
 * Apple : lui seul le detient, l'echange contre un droit et previent
 * RevenueCat. Un champ maison ne pourrait rien verifier — il afficherait
 * « code accepte » sans qu'aucun abonnement n'existe, et la personne
 * decouvrirait le mensonge au premier lancement suivant. On ouvre donc la
 * feuille du systeme, qui elle sait dire oui ou non.
 */
export function PromoCode({ onNext }: P) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const [busy, setBusy] = useState(false);

  // Sans magasin (simulateur, beta sans cle), la question n'a pas de sens :
  // on passe. Dans un effet et non pendant le rendu — appeler le parent
  // pendant qu'on se dessine le fait rendre au milieu du notre.
  const skip = !PURCHASES_ENABLED || Platform.OS !== 'ios';
  useEffect(() => { if (skip) onNext(); }, [skip, onNext]);
  if (skip) return null;

  const open = async () => {
    haptics.press();
    setBusy(true);
    await redeemCode();
    // La feuille d'Apple ne dit pas ce qu'elle a fait : c'est le statut
    // d'abonnement qui tranche, et il arrive par son propre canal.
    await useProStore.getState().refresh();
    setBusy(false);
    onNext();
  };

  return (
    <Screen cta="Je n’en ai pas" onPress={onNext} hue="deep" center>
      <Animated.View entering={FadeIn.duration(520)} style={st.body}>
        <View style={st.ring}>
          <Ticket size={26} strokeWidth={1.8} color={c.accent} />
        </View>

        <Text variant="displayM" style={st.center}>Tu as un code promo ?</Text>
        <Text variant="lead" tone="secondary" style={st.center}>
          Si on t’en a donné un, c’est le moment. Sinon, passe : tu ne rates
          rien.
        </Text>

        <Pressable style={st.action} onPress={() => { void open(); }} disabled={busy}>
          <Text variant="button" color={c.night}>
            {busy ? 'Un instant…' : 'J’ai un code'}
          </Text>
        </Pressable>
      </Animated.View>
    </Screen>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  body: { alignItems: 'center', gap: space.md },
  center: { textAlign: 'center' },
  ring: {
    width: 62, height: 62, borderRadius: 31, marginBottom: space.md,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: withAlpha(c.accent, 0.45),
    backgroundColor: withAlpha(c.accent, 0.08),
  },
  action: {
    marginTop: space.xl, alignSelf: 'stretch', height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center', backgroundColor: c.accent,
  },
});
