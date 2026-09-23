import { Modal } from 'react-native';
import { Paywall } from '@/features/onboarding/screens/Paywall';

/**
 * Le paywall, hors du parcours.
 *
 * Il n'existait qu'a la fin de l'onboarding. Une app verrouillee doit
 * pouvoir le rappeler la ou le verrou se presente — sur l'icone qu'on vient
 * de toucher — sinon on voit un cadenas sans jamais savoir ce qu'il ouvre.
 */
export function ProGate({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <Paywall onDone={onClose} />
    </Modal>
  );
}
