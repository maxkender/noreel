import { Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { withAlpha } from '@/theme/colors';
import { useColors } from '@/theme/useColors';
import { maxFontSizeMultiplier, type, type TypeName } from '@/theme/typography';

type Props = TextProps & {
  variant?: TypeName;
  tone?: 'primary' | 'secondary' | 'tertiary';
  color?: string;
};

/** Le ton, en opacite — elle depend de la palette, pas du composant. */
function alpha(c: ReturnType<typeof useColors>, tone: Props['tone']): number {
  if (tone === 'secondary') return c.textSecondary;
  if (tone === 'tertiary') return c.textTertiary;
  return 1;
}

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
        { color: color ?? withAlpha(c.mist, alpha(c, tone)) },
        style,
      ]}
      {...rest}
    />
  );
}
