import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { colors } from '@/theme/colors';
import { useOnboardingStore } from '@/store/onboarding';

export default function Index() {
  const hasHydrated = useOnboardingStore((s) => s.hasHydrated);
  const completed = useOnboardingStore((s) => s.completed);

  // Tant que le store n'est pas hydraté on ne redirige pas : sinon on verrait
  // l'onboarding clignoter chez quelqu'un qui l'a déjà terminé.
  if (!hasHydrated) return <View style={{ flex: 1, backgroundColor: colors.night }} />;

  return <Redirect href={completed ? '/home' : '/onboarding'} />;
}
