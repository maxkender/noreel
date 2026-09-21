import { Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { colors, textAlpha, withAlpha } from '@/theme/colors';
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
  const base = type[variant] as TextStyle;
  return (
    <RNText
      maxFontSizeMultiplier={maxFontSizeMultiplier[variant]}
      style={[base, { color: color ?? withAlpha(colors.mist, textAlpha[tone]) }, style]}
      {...rest}
    />
  );
}
