import { useMemo, type ComponentType } from 'react';
import { StyleSheet, View } from 'react-native';
import { useColors } from '@/theme/useColors';

type IconProps = { size?: number; color?: string; strokeWidth?: number };

/**
 * Une icone dans un disque, a plat.
 *
 * Elle dit d'un coup d'oeil ce que l'ecran demande. Elle avait un halo qui
 * battait et un degrade colore : ca faisait « image generee ». Un aplat, un
 * filet, l'icone — comme le reste de l'app.
 */
export function Emblem({
  icon: Icon, tone, size = 64, style,
}: {
  icon: ComponentType<IconProps>;
  tone?: string;
  size?: number;
  style?: object;
}) {
  const c = useColors();
  const colour = tone ?? c.accent;
  const st = useMemo(() => sheet(size), [size]);
  return (
    <View style={[st.root, style]} pointerEvents="none">
      <View style={[st.ring, { borderColor: c.glassEdge, backgroundColor: c.glassSolid }]}>
        <Icon size={size * 0.42} strokeWidth={2} color={colour} />
      </View>
    </View>
  );
}

const sheet = (size: number) => StyleSheet.create({
  root: { width: size, height: size, alignItems: 'center', justifyContent: 'center' },
  ring: {
    width: size, height: size, borderRadius: size / 2,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
});
