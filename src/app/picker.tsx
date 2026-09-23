import { useRouter } from 'expo-router';
import { Picker } from '@/features/onboarding/screens/Picker';

export default function PickerRoute() {
  const router = useRouter();
  return <Picker onNext={() => router.back()} />;
}
