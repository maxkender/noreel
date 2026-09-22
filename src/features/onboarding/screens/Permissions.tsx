import { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { colors, withAlpha } from '@/theme/colors';
import { radii, space } from '@/theme/spacing';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/type/Text';
import { track } from '@/services';
import {
  FAMILY_CONTROLS_ENABLED, authorizationStatus, requestAuthorization,
  type AuthState,
} from '@/services/shield.real';

export function Permissions({ onDone }: { onDone: () => void }) {
  const [state, setState] = useState<AuthState>('notDetermined');

  useEffect(() => { void authorizationStatus().then(setState); }, []);

  const ask = useCallback(async () => {
    const next = await requestAuthorization();
    setState(next);
    track('step_viewed', { step: 'permissions', result: next });
  }, []);

  const unsupported = !FAMILY_CONTROLS_ENABLED || state === 'unsupported';

  return (
    <Screen
      cta={unsupported || state === 'approved' ? 'Continuer' : 'Autoriser'}
      onPress={unsupported || state === 'approved' ? onDone : ask}
      secondary={unsupported || state === 'approved' ? undefined : 'Plus tard'}
      onSecondary={unsupported || state === 'approved' ? undefined : onDone}
    >
      <Text variant="displayM">Ferme la porte de derrière.</Text>
      <Text variant="lead" tone="secondary" style={{ marginTop: space.md }}>
        Sans ça, un réflexe suffit : tu rouvres l’app d’origine et tout
        recommence.
      </Text>

      <View style={st.card}>
        <Text variant="title">
          {unsupported ? 'Pas encore disponible'
            : state === 'approved' ? 'Autorisation accordée'
            : state === 'denied' ? 'Autorisation refusée'
            : 'Temps d’écran'}
        </Text>
        <Text variant="body" tone="secondary" style={{ marginTop: space.sm }}>
          {unsupported
            ? (Platform.OS === 'ios'
              ? 'Le blocage utilise Temps d’écran. La fonctionnalité arrive bientôt.'
              : 'Le blocage Android arrive bientôt.')
            : state === 'approved'
              ? 'NoReel peut mettre les apps d’origine en pause.'
              : state === 'denied'
                ? 'Réactivable dans Réglages > Temps d’écran.'
                : 'iOS va te demander d’autoriser NoReel. Rien ne quitte ton téléphone.'}
        </Text>
      </View>
    </Screen>
  );
}

const st = StyleSheet.create({
  card: {
    marginTop: space.xl, padding: space.lg, borderRadius: radii.panel,
    borderWidth: 1, borderColor: withAlpha(colors.mist, 0.12),
    backgroundColor: withAlpha(colors.mist, 0.04),
  },
});
