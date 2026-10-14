import { useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useColors, type Palette } from '@/theme/useColors';
import { gutter, space } from '@/theme/spacing';
import { Button } from './Button';
import { Text } from './type/Text';
import type { Hue } from './Glow';
import { Stars } from './Stars';
import { ProgressContext } from './ProgressContext';

/**
 * Coquille unique. Le halo est au fond, le contenu defile, le bouton est
 * ancre hors du flux : rien ne peut se chevaucher ni sortir de l'ecran.
 */
export function Screen({
  children, cta, onPress, disabled, secondary, onSecondary, center = false,
  tapToContinue, hintDelay: hintRaw = 1800, backdrop, note,
  still = false, emblem, stars = true, readyAfter: readyRaw = 0,
}: {
  children: ReactNode;
  /** Absent : aucun pied de page. L'ecran fournit alors sa propre action. */
  cta?: string;
  onPress?: () => void;
  disabled?: boolean;
  secondary?: string;
  onSecondary?: () => void;
  /** Vrai pour les ecrans-affirmation : titre seul, centre verticalement. */
  center?: boolean;
  /** Pas de bouton : tout l'ecran est tactile, avec une invite discrete. */
  tapToContinue?: boolean;
  /** Retard avant l'invite, en ms. Laisse le temps de lire.  */
  hintDelay?: number;
  /** Teinte du halo : elle change d'un ecran a l'autre. */
  hue?: Hue;
  /**
   * Un fond a soi, pose SOUS le halo.
   *
   * Tous les ecrans partagent le meme noir, ce qui est voulu : c'est ce qui
   * fait qu'on est dans la meme app. Le paywall, lui, doit se distinguer — on
   * n'y arrive pas pour lire une etape de plus, et un ecran de vente qui
   * ressemble en tout point a celui d'avant ne donne envie de rien.
   */
  backdrop?: ReactNode;
  /** 0 a 1 : intensite du halo, pour les ecrans qui montent en tension. */
  hueLevel?: number;
  /**
   * Une ligne posee JUSTE au-dessus du bouton.
   *
   * Quand une action echoue, l'explication doit arriver la ou l'oeil se
   * trouve — c'est-a-dire sur le bouton qu'on vient de toucher. Placee dans
   * le contenu qui defile, elle apparaissait hors champ : on appuyait, rien
   * ne semblait se passer, et on recommencait.
   */
  note?: ReactNode;
  /**
   * L'ecran ne DEFILE pas.
   *
   * Un ecran qui porte un geste vertical — une jauge qu'on remplit vers le
   * haut — ne peut pas aussi defiler : le doigt qui monte faisait bouger la
   * page au lieu du niveau, et le niveau au lieu de la page, sans qu'on sache
   * lequel allait gagner. Ici tout tient a l'ecran, et rien ne bouge sous le
   * doigt sauf ce qu'on regle.
   */
  still?: boolean;
  /** La poussiere lumineuse du fond. Coupee la ou elle gene la lecture. */
  stars?: boolean;
  /**
   * Le temps, en millisecondes, pendant lequel on ne peut PAS avancer.
   *
   * Un ecran qui s'anime se laissait sauter d'un tap au premier dixieme de
   * seconde — et le parcours se courait au lieu de se regarder. Tant que ce
   * delai court, le bouton est eteint et l'ecran ne repond pas au toucher ;
   * l'invite « touche pour continuer » n'arrive qu'a ce moment-la.
   */
  readyAfter?: number;
  /** Une icone en tete du contenu : ce que l'ecran demande, avant qu'on lise. */
  emblem?: ReactNode;
}) {
  const bar = useContext(ProgressContext);
  const c = useColors();
  const styles = useMemo(() => sheet(c), [c]);

  const Root: React.ElementType = tapToContinue ? Pressable : View;

  /*
    On n'attend JAMAIS plus d'une seconde pour passer un ecran : au-dela,
    le parcours paraissait bloque. L'animation continue, le doigt est libre.
  */
  const readyAfter = Math.min(readyRaw, 1000);
  const hintDelay = Math.min(hintRaw, 1000);
  const [locked, setLocked] = useState(readyAfter > 0);
  useEffect(() => {
    if (readyAfter <= 0) return;
    const id = setTimeout(() => setLocked(false), readyAfter);
    return () => clearTimeout(id);
  }, [readyAfter]);
  const tap = tapToContinue && onPress ? () => { if (!locked) onPress(); } : undefined;
  const hintAt = Math.max(hintDelay, readyAfter);

  return (
    <Root style={styles.root} onPress={tap}>
      {backdrop}
      {/* Un noir uni, quelques points a peine : la lecture d'abord. */}
      {stars && <Stars count={4} />}
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {bar && <View style={styles.progress}>{bar}</View>}

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, center && styles.centered]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!still}
          bounces={!still}
        >
          {emblem && <View style={styles.emblem}>{emblem}</View>}
          {children}
        </ScrollView>

        {/* Le contenu se dissout dans le fond avant d'atteindre le bouton :
            sans ce fondu, le pied de page coupait le texte d'un trait net. */}
        <LinearGradient
          colors={['transparent', c.night]}
          style={styles.hem}
          pointerEvents="none"
        />

        {note && <View style={styles.note}>{note}</View>}

        {!cta ? (
          secondary && onSecondary ? (
            <View style={styles.footer}>
              <Button label={secondary} onPress={onSecondary} variant="ghost" />
            </View>
          ) : null
        ) : tapToContinue ? (
          // L'invite n'apparait qu'apres le texte : le silence fait le suspense.
          <Animated.View
            entering={FadeIn.delay(hintAt).duration(900)}
            style={styles.hint}
          >
            <Text variant="label" tone="tertiary">{cta}</Text>
          </Animated.View>
        ) : (
          <View style={styles.footer}>
            <Button label={cta} onPress={onPress ?? (() => {})} disabled={disabled || locked} />
            {secondary && onSecondary && (
              <Button label={secondary} onPress={onSecondary} variant="ghost" />
            )}
          </View>
        )}
      </SafeAreaView>
    </Root>
  );
}

// Le fond de chaque ecran du parcours suit le theme. Fige sur la palette
// sombre, il donnait un fond noir sous du texte devenu sombre en mode
// clair : plus une ligne de lisible.
const sheet = (c: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.night },
  safe: { flex: 1 },
  progress: { paddingHorizontal: gutter, paddingTop: space.sm },
  emblem: { alignItems: 'center', marginBottom: space.lg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: gutter, paddingTop: space.xl, paddingBottom: space.xl },
  centered: { flexGrow: 1, justifyContent: 'center' },
  // De l'air AU-DESSUS : collee au contenu qui la precede, la ligne se
  // lisait comme la derniere phrase du texte et non comme la mention du
  // bouton qu'elle accompagne.
  note: {
    paddingHorizontal: gutter, paddingTop: space.lg, paddingBottom: space.xs,
  },
  footer: { paddingHorizontal: gutter, paddingTop: space.md, paddingBottom: space.xs },
  hem: { height: 36, marginTop: -36 },
  hint: { alignItems: 'center', paddingBottom: space.xl, paddingTop: space.md },
});
