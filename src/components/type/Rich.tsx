import type { StyleProp, TextStyle } from 'react-native';
import { useColors } from '@/theme/useColors';
import { Text } from './Text';
import { parseAccents } from './Typewriter';
import type { TypeName } from '@/theme/typography';

/**
 * Un texte dont les morceaux entre accolades prennent la couleur d'accent.
 * La meme ecriture que la frappe, sans la frappe : « reprendre {le controle} ».
 */
export function Rich({
  text, variant = 'displayM', style,
}: { text: string; variant?: TypeName; style?: StyleProp<TextStyle> }) {
  const c = useColors();
  return (
    <Text variant={variant} style={style}>
      {parseAccents(text).map((seg, i) => (
        seg.accent
          ? <Text key={i} variant={variant} color={c.accent}>{seg.text}</Text>
          : <Text key={i} variant={variant}>{seg.text}</Text>
      ))}
    </Text>
  );
}
