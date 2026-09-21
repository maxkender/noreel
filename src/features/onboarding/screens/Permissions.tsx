import { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, withAlpha } from '@/theme/colors';
import { gutter, radii, space } from '@/theme/spacing';
import { Text } from '@/components/type/Text';
import { Glass } from '@/components/glass/Glass';
import { GlassButton } from '@/components/glass/GlassButton';
import { haptics } from '@/lib/haptics';
import { track } from '@/services';
import {
  FAMILY_CONTROLS_ENABLED, authorizationStatus, requestAuthorization,
  type AuthState,
} from '@/services/shield.real';

/**
 * Slot `permissions` du §5.2, entre l'ecran 9 et la Home.
 * iOS : FamilyControls. Android : service d'accessibilite (a venir).
 */
export function Permissions({ onDone }: { onDone: () => void }) {
  const [state, setState] = useState<AuthState>('notDetermined');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void authorizationStatus().then(setState);
  }, []);

  const ask = useCallback(async () => {
    setBusy(true);
    haptics.press();
    const next = await requestAuthorization();
    setState(next);
    setBusy(false);
    if (next === 'approved') haptics.success();
    track('step_viewed', { step: 'permissions', result: next });
  }, []);

  // Sans entitlement accorde par Apple, on ne ment pas a l'utilisateur :
  // on explique, et on le laisse avancer.
  const unsupported = !FAMILY_CONTROLS_ENABLED || state === 'unsupported';

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.body}>
        <Text variant="displayM">Bloquer les apps d’origine</Text>
        <Text variant="lead" tone="secondary" style={{ marginTop: space.md }}>
          Pour que NoReel tienne, il faut empêcher Instagram et TikTok de s’ouvrir
          normalement. Sinon, il suffit d’un réflexe pour contourner.
        </Text>

        <Glass style={styles.panel}>
          {unsupported ? (
            <>
              <Text variant="title">Pas encore disponible</Text>
              <Text variant="body" tone="secondary" style={{ marginTop: space.sm }}>
                {Platform.OS === 'ios'
                  ? 'Le blocage utilise Temps d’écran, une API qu’Apple doit autoriser pour cette app. La demande est en cours.'
                  : 'Le blocage Android passe par un service d’accessibilité, pas encore implémenté.'}
              </Text>
            </>
          ) : state === 'approved' ? (
            <>
              <Text variant="title" color={colors.sun}>Autorisation accordée</Text>
              <Text variant="body" tone="secondary" style={{ marginTop: space.sm }}>
                NoReel peut maintenant mettre les apps d’origine en pause.
              </Text>
            </>
          ) : state === 'denied' ? (
            <>
              <Text variant="title">Autorisation refusée</Text>
              <Text variant="body" tone="secondary" style={{ marginTop: space.sm }}>
                Tu peux la réactiver dans Réglages &gt; Temps d’écran. NoReel
                fonctionne sans, mais rien n’empêchera d’ouvrir l’app d’origine.
              </Text>
            </>
          ) : (
            <>
              <Text variant="title">Temps d’écran</Text>
              <Text variant="body" tone="secondary" style={{ marginTop: space.sm }}>
                iOS va te demander d’autoriser NoReel. Rien n’est envoyé nulle part :
                l’autorisation reste sur ton téléphone.
              </Text>
            </>
          )}
        </Glass>
      </View>

      <View style={styles.footer}>
        {!unsupported && state !== 'approved' && (
          <GlassButton
            label={busy ? 'En cours…' : 'Autoriser'}
            disabled={busy}
            onPress={ask}
            style={{ marginBottom: space.md }}
          />
        )}
        <GlassButton
          label={state === 'approved' ? 'Continuer' : 'Plus tard'}
          onPress={onDone}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1, paddingHorizontal: gutter, paddingTop: space.xl },
  panel: { marginTop: space.xl, padding: space.lg, borderRadius: radii.panel },
  footer: { paddingHorizontal: gutter, paddingBottom: space.lg },
});
