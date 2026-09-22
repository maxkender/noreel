import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import { Check, ShieldAlert } from 'lucide-react-native';
import { colors, withAlpha } from '@/theme/colors';
import { radii, space } from '@/theme/spacing';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/type/Text';
import { track } from '@/services';
import { SystemSheet } from '../scenes/SystemSheet';
import {
  FAMILY_CONTROLS_ENABLED, authorizationStatus, requestAuthorization,
  type AuthState,
} from '@/services/shield.real';

/**
 * Trois temps : on montre l'alerte avant de la declencher, on la declenche,
 * et si l'utilisateur a appuye sur le bouton bleu on lui donne le chemin
 * exact pour revenir en arriere. Sans ce dernier temps, l'app est morte
 * pour lui.
 */
export function Permissions({ onDone }: { onDone: () => void }) {
  const [state, setState] = useState<AuthState>('notDetermined');
  const [asked, setAsked] = useState(false);

  useEffect(() => { void authorizationStatus().then(setState); }, []);

  const ask = useCallback(async () => {
    setAsked(true);
    const next = await requestAuthorization();
    setState(next);
    track('step_viewed', { step: 'permissions', result: next });
  }, []);

  const unsupported = !FAMILY_CONTROLS_ENABLED || state === 'unsupported';

  if (unsupported) {
    return (
      <Screen cta="Continuer" onPress={onDone}>
        <Text variant="displayM">Ferme la porte de derrière.</Text>
        <Text variant="lead" tone="secondary" style={{ marginTop: space.md }}>
          Sans ça, un réflexe suffit : tu rouvres l’app d’origine et tout
          recommence.
        </Text>
        <View style={st.card}>
          <Text variant="title">Pas encore disponible</Text>
          <Text variant="body" tone="secondary" style={{ marginTop: space.sm }}>
            {Platform.OS === 'ios'
              ? 'Le blocage utilise Temps d’écran. La fonctionnalité arrive bientôt.'
              : 'Le blocage Android arrive bientôt.'}
          </Text>
        </View>
      </Screen>
    );
  }

  if (state === 'approved') {
    return (
      <Screen cta="Continuer" onPress={onDone} center>
        <View style={st.okRing}>
          <Check size={34} strokeWidth={2.4} color={colors.accent} />
        </View>
        <Text variant="displayM" style={st.center}>C’est fermé.</Text>
        <Text variant="lead" tone="secondary" style={[st.center, { marginTop: space.md }]}>
          UnSwipe peut mettre les apps d’origine en pause. Rien ne quitte ton
          téléphone.
        </Text>
      </Screen>
    );
  }

  // Le bouton bleu a ete presse : on repare, on ne culpabilise pas.
  if (state === 'denied') {
    return (
      <Screen
        cta="Ouvrir Réglages"
        onPress={() => { void Linking.openSettings(); }}
        secondary="Réessayer"
        onSecondary={() => { void ask(); }}
      >
        <View style={st.warnRing}>
          <ShieldAlert size={26} strokeWidth={2} color={colors.danger} />
        </View>
        <Text variant="displayM" style={{ marginTop: space.lg }}>
          Le bouton bleu, c’était le refus.
        </Text>
        <Text variant="lead" tone="secondary" style={{ marginTop: space.md }}>
          Pas grave, ça se rattrape en dix secondes.
        </Text>

        <View style={st.card}>
          <Path n="1" text="Ouvre Réglages → Temps d’écran." />
          <Path n="2" text="Descends jusqu’à « Applications autorisées »." />
          <Path n="3" text="Active UnSwipe, puis reviens ici." />
        </View>

        <Text variant="label" tone="tertiary" style={{ marginTop: space.lg, lineHeight: 18 }}>
          Tu peux aussi continuer sans : les versions filtrées d’Instagram,
          TikTok, X et YouTube marcheront, mais les apps d’origine resteront
          ouvrables.
        </Text>
      </Screen>
    );
  }

  return (
    <Screen cta={asked ? 'Réessayer' : 'Continuer'} onPress={() => { void ask(); }} secondary="Plus tard" onSecondary={onDone}>
      <Text variant="displayM">
        Connectons UnSwipe à Temps d’écran. En toute sécurité.
      </Text>

      <SystemSheet
        goodSide="left"
        title="« UnSwipe » souhaite accéder à Temps d’écran"
        body="Autoriser « UnSwipe » à accéder à Temps d’écran peut lui permettre de voir tes données d’activité, de restreindre des contenus et de limiter l’utilisation d’Apps et de sites web."
        good="Continuer"
        bad="Ne pas autoriser"
      />

      <Text variant="body" tone="secondary" style={[st.center, { marginTop: space.xl }]}>
        Tes informations sont protégées par Apple et resteront 100 % sur ton
        téléphone.
      </Text>
    </Screen>
  );
}

function Path({ n, text }: { n: string; text: string }) {
  return (
    <View style={st.step}>
      <View style={st.badge}><Text variant="label" color={colors.night}>{n}</Text></View>
      <Text variant="body" style={{ flex: 1 }}>{text}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  card: {
    marginTop: space.xl, padding: space.lg, borderRadius: radii.panel, gap: space.md,
    borderWidth: 1, borderColor: withAlpha(colors.mist, 0.12),
    backgroundColor: withAlpha(colors.mist, 0.04),
  },
  center: { textAlign: 'center' },
  step: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  badge: {
    width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  okRing: {
    alignSelf: 'center', width: 78, height: 78, borderRadius: 39,
    alignItems: 'center', justifyContent: 'center', marginBottom: space.xl,
    borderWidth: 2, borderColor: withAlpha(colors.accent, 0.5),
    backgroundColor: withAlpha(colors.accent, 0.1),
  },
  warnRing: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: withAlpha(colors.danger, 0.5),
    backgroundColor: withAlpha(colors.danger, 0.1),
  },
});
