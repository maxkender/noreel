import { Modal } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { Paywall } from '@/features/onboarding/screens/Paywall';

/**
 * Le paywall, hors du parcours.
 *
 * Il n'existait qu'a la fin de l'onboarding. Une app verrouillee doit
 * pouvoir le rappeler la ou le verrou se presente — sur l'icone qu'on vient
 * de toucher — sinon on voit un cadenas sans jamais savoir ce qu'il ouvre.
 *
 * Le fournisseur de marges est REPOSE a l'interieur de la fenetre. Une
 * fenetre modale de React Native ouvre son propre arbre : celui du dessous
 * ne le traverse pas, les marges d'encoche y valaient donc zero, et
 * l'en-tete se collait sous l'encoche alors que le meme ecran etait bien
 * place dans l'onboarding.
 */
export function ProGate({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        {/*
          La croix est immediate ici, et non apres sept secondes : on arrive
          en touchant un cadenas, donc en sachant deja ce qu'on va lire. Le
          delai n'a de sens qu'a la premiere rencontre, a la fin du parcours.
        */}
        <Paywall onDone={onClose} exitDelay={0} />
      </SafeAreaProvider>
    </Modal>
  );
}
