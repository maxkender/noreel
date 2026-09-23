import { Component, useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useColors, type Palette } from '@/theme/useColors';
import { gutter, space } from '@/theme/spacing';
import { Text } from './type/Text';
import { Button } from './Button';

type Props = { children: ReactNode; onSkip: () => void };
type State = { failed: boolean };

/**
 * Filet de securite autour d'une etape d'onboarding.
 *
 * Sans lui, une erreur de rendu dans un seul ecran fait quitter l'app et le
 * parcours est mort : impossible d'aller plus loin, meme en rouvrant. Ici
 * l'etape fautive est remplacee par une sortie, et l'utilisateur continue.
 */
export class StepBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    if (__DEV__) console.warn('[onboarding] etape en echec', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <Fallback onSkip={() => { this.setState({ failed: false }); this.props.onSkip(); }} />
    );
  }
}

/**
 * La vue de repli, a part : une classe ne peut pas lire le theme par un
 * crochet, et un fond fige sur la palette sombre donnait un panneau noir
 * sous du texte devenu sombre.
 */
function Fallback({ onSkip }: { onSkip: () => void }) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);

  return (
      <View style={st.root}>
        <Text variant="displayM">Cette étape a calé.</Text>
        <Text variant="lead" tone="secondary" style={{ marginTop: space.md }}>
          Rien n’est perdu, on passe à la suivante.
        </Text>
        <View style={st.cta}>
          <Button label="Continuer" onPress={onSkip} />
        </View>
      </View>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  root: {
    flex: 1, backgroundColor: c.night,
    paddingHorizontal: gutter, justifyContent: 'center',
  },
  cta: { marginTop: space.xxl },
});
