import { Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { textAlpha, withAlpha } from '@/theme/colors';
import { useColors } from '@/theme/useColors';
import { maxFontSizeMultiplier, type, type TypeName } from '@/theme/typography';

type Props = TextProps & {
  variant?: TypeName;
  tone?: 'primary' | 'secondary' | 'tertiary';
  color?: string;
};

export function Text({
  variant = 'body',
  tone = 'primary',
  color,
  style,
  ...rest
}: Props) {
  const c = useColors();
  const base = type[variant] as TextStyle;
  return (
    <RNText
      maxFontSizeMultiplier={maxFontSizeMultiplier[variant]}
      style={[
        base,
        // Les labels en capitales espacees : c'est ce qui donne le ton technique.
        variant === 'label' && { textTransform: 'uppercase' as const },
        { color: color ?? withAlpha(c.mist, textAlpha[tone]) },
        style,
      ]}
      {...rest}
    />
  );
}
