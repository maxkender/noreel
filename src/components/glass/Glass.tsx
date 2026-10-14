import { type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useColors } from '@/theme/useColors';
import { radii } from '@/theme/spacing';

type Props = {
  children?: ReactNode;
  radius?: number;
  intensity?: number;
  /** Côté du liseré chaud : le soleil est bas, donc « bottom » par défaut (§4.4). */
  warmEdge?: 'bottom' | 'top' | 'none';
  style?: StyleProp<ViewStyle>;
  /** Un panneau devant du détail mérite un vrai flou ; sur un ciel lisse, non. */
  blur?: boolean;
};
export function Glass({
  children,
  radius = radii.panel,
  style,
}: Props) {
  /*
    UNE CARTE PLEINE, comme chez Opal.
    Plus de flou, de reflet ni de lisere : un aplat un cran plus clair que
    le fond, un filet fin, des coins genereux. Le nom reste pour ne pas
    toucher a chaque ecran qui pose une carte.
  */
  const c = useColors();
  const shell: ViewStyle = {
    borderRadius: radius,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: c.glassEdge,
    backgroundColor: c.glassSolid,
  };
  return <View style={[shell, style]}>{children}</View>;
}
