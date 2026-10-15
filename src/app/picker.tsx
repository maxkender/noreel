import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Picker } from '@/features/onboarding/screens/Picker';
import { useColors } from '@/theme/useColors';
import { haptics } from '@/lib/haptics';

export default function PickerRoute() {
  const router = useRouter();
  const c = useColors();
  return (
    <View style={{ flex: 1 }}>
      <Picker onNext={() => router.back()} />
      {/* Un retour visible : on vient de l'onglet Blocage, on doit pouvoir y revenir sans choisir. */}
      <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="box-none">
        <Pressable
          onPress={() => { haptics.tap(); router.back(); }}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={{
            marginLeft: 12, marginTop: 4, width: 40, height: 40, borderRadius: 20,
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: c.glassSolid, borderWidth: 1, borderColor: c.glassEdge,
          }}
        >
          <ChevronLeft size={22} strokeWidth={2.2} color={c.mist} />
        </Pressable>
      </SafeAreaView>
    </View>
  );
}
