import { useEffect, useState, useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import * as Apple from 'expo-apple-authentication';
import { Check } from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { haptics } from '@/lib/haptics';
import { useSettings } from '@/store/settings';
import { useProStore } from '@/store/pro';
import { linkAccount } from '@/services/purchases';
import { dict } from '@/i18n';

/**
 * Connexion Apple, au seul endroit ou elle sert : rattacher les achats.
 *
 * L'app n'a pas de comptes et n'en veut pas. Mais sans identifiant stable,
 * RevenueCat suit l'installation : changer de telephone, et l'abonnement
 * ne suit pas. L'identifiant rendu par Apple est opaque et propre a cette
 * app — il n'identifie personne ailleurs, et rien n'est envoye nulle part.
 */
export function AppleSignIn() {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  const user = useSettings((s) => s.appleUser);
  const set = useSettings((s) => s.set);
  const setPro = useProStore((s) => s.setPro);
  const [can, setCan] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    void Apple.isAvailableAsync().then(setCan);
  }, []);

  if (!can) return null;

  if (user) {
    return (
      <View style={st.done}>
        <View style={st.ring}>
          <Check size={14} strokeWidth={2.8} color={c.accent} />
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <Text variant="body">{dict.misc.purchasesLinked}</Text>
          <Text variant="label" tone="tertiary">
            {dict.ui.appleFollow}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ gap: space.sm }}>
      <Apple.AppleAuthenticationButton
        buttonType={Apple.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={Apple.AppleAuthenticationButtonStyle.WHITE}
        cornerRadius={14}
        style={st.button}
        onPress={async () => {
          haptics.press();
          try {
            const c = await Apple.signInAsync({
              requestedScopes: [Apple.AppleAuthenticationScope.EMAIL],
            });
            set('appleUser', c.user);
            if (await linkAccount(c.user)) setPro(true);
            haptics.success();
          } catch {
            // Annulation ou refus : il n'y a rien a dire, l'app marche pareil.
          }
        }}
      />
      <Text variant="label" tone="tertiary" style={st.note}>
        {dict.ui.appleNote}
      </Text>
    </View>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  button: { height: 48, width: '100%' },
  note: { lineHeight: 17 },
  done: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  ring: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: withAlpha(c.accent, 0.5),
    backgroundColor: withAlpha(c.accent, 0.1),
  },
});
