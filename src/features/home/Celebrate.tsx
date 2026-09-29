import { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, withTiming } from 'react-native-reanimated';
import { X } from 'lucide-react-native';
import { withAlpha } from '@/theme/colors';
import { useColors, type Palette } from '@/theme/useColors';
import { space } from '@/theme/spacing';
import { Button } from '@/components/Button';
import { Text } from '@/components/type/Text';
import { CortiRig } from '@/components/CortiRig';
import { haptics } from '@/lib/haptics';

/**
 * La fenetre qui fete quelque chose : un badge, un geste, une journee.
 *
 * Une seule forme pour toutes les fetes, pour qu'on la reconnaisse : Corti
 * rayonnant qui arrive en sautant, un mot en haut, le titre, une ligne, un
 * bouton. Elle se ferme d'un tap n'importe ou — une fete qu'on ne peut pas
 * quitter n'en est plus une.
 *
 * Elle arrive SIMPLEMENT : un fondu et trois pour cent d'echelle, un quart
 * de seconde. Le ressort qui la faisait rebondir, et Corti qui tombait
 * dedans, faisaient deux mouvements pour une seule chose a lire.
 */
function soft() {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ scale: 0.97 }] },
    animations: {
      opacity: withTiming(1, { duration: 220 }),
      transform: [{ scale: withTiming(1, { duration: 260 }) }],
    },
  };
}
export function Celebrate({
  visible, kicker, title, body, cta, onClose, icon,
}: {
  visible: boolean;
  kicker: string;
  title: string;
  body: string;
  cta: string;
  onClose: () => void;
  /** A la place de Corti : l'icone du badge, par exemple. */
  icon?: React.ReactNode;
}) {
  const c = useColors();
  const st = useMemo(() => sheet(c), [c]);
  if (!visible) return null;
  return (
    <Modal visible animationType="fade" onRequestClose={onClose} transparent>
      <Pressable style={st.scrim} onPress={onClose} accessibilityRole="button">
        <SafeAreaView style={st.center} pointerEvents="box-none">
          <Animated.View entering={soft} style={st.card}>
            <LinearGradient
              colors={[withAlpha(c.accent, 0.24), withAlpha(c.accentWarm, 0.08)]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Pressable onPress={onClose} hitSlop={16} style={st.close} accessibilityRole="button">
              <X size={18} strokeWidth={2.2} color={withAlpha(c.mist, 0.6)} />
            </Pressable>
            <View style={st.art}>
              {icon ?? <CortiRig level={3} size={150} expression="ravi" />}
            </View>
            <Animated.View entering={FadeIn.delay(80).duration(300)} style={{ alignItems: 'center' }}>
              <Text variant="label" color={c.accent}>{kicker}</Text>
              <Text variant="displayM" style={st.mid}>{title}</Text>
              <Text variant="body" tone="secondary" style={[st.mid, { marginTop: space.xs }]}>{body}</Text>
            </Animated.View>
            <View style={st.btn}>
              <Button label={cta} onPress={() => { haptics.tap(); onClose(); }} />
            </View>
          </Animated.View>
        </SafeAreaView>
      </Pressable>
    </Modal>
  );
}

const sheet = (c: Palette) => StyleSheet.create({
  scrim: { flex: 1, backgroundColor: withAlpha(c.night, 0.78) },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.lg },
  card: {
    alignSelf: 'stretch', alignItems: 'center', gap: space.md,
    padding: space.xl, paddingTop: space.xxl, borderRadius: 28, overflow: 'hidden',
    backgroundColor: c.night, borderWidth: 1, borderColor: withAlpha(c.accent, 0.35),
  },
  close: { position: 'absolute', top: space.md, right: space.md, zIndex: 2 },
  art: { height: 150, alignItems: 'center', justifyContent: 'center' },
  mid: { textAlign: 'center' },
  btn: { alignSelf: 'stretch', marginTop: space.sm },
});
