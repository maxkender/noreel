import { useEffect, useRef, type ComponentRef } from 'react';
import { type ImageStyle, type StyleProp } from 'react-native';
import { Image } from 'expo-image';
import { useT } from '@/i18n';

/*
 * Les six secondes qui racontent tout.
 *
 * Le studio a livre la sequence complete — affaisse sur sa soucoupe rouge,
 * l'etincelle, il se regonfle, reprend ses couleurs, s'allume, saute, rayonne —
 * en WebP anime a fond transparent : 400 px, 24 images par seconde, 144 images.
 *
 * Elle remplace ce que je reconstituais a la main avec une table d'images cles.
 * Ma version tenait debout mais restait une approximation d'un dessin anime par
 * un moteur qui n'anime que des transformations : elle ne pouvait ni faire
 * changer les COULEURS du corps, ni les plis, ni la lueur — or c'est justement
 * ce virage du gris au bleu qui porte toute la promesse.
 *
 * Le poids — 3,8 Mo — est le prix d'une image par image a fond transparent. Il
 * se paie une seule fois : le fichier est partage par les ecrans qui s'en
 * servent, et c'est le seul de l'app a ce tarif.
 */

const SOURCE = require('@/assets/corti/recovery.webp');

/** La duree exacte de la sequence : 144 images a 24 par seconde. */
export const RECOVERY_MS = 6000;

/*
 * On s'arrete un peu AVANT la fin.
 *
 * expo-image ne sait pas compter les tours : une image animee tourne en
 * boucle, et `stopAnimating` la fige la ou elle en est. Coupee pile a six
 * secondes, la derive du minuteur la rattrape parfois apres le bouclage — et
 * elle se fige alors sur la premiere image, Corti ecrase et gris, c'est-a-dire
 * exactement le contraire de ce qu'on venait de montrer.
 */
const FREEZE_MS = RECOVERY_MS - 140;

export function CortiRecovery({
  size = 220, loop = true, onDone, style,
}: {
  size?: number;
  /** Faux : elle se joue une fois et se fige sur le Corti rayonnant. */
  loop?: boolean;
  /** Appele a la fin du tour unique, pour rendre la main a la scene fixe. */
  onDone?: () => void;
  style?: StyleProp<ImageStyle>;
}) {
  const { d } = useT();
  const ref = useRef<ComponentRef<typeof Image>>(null);
  /*
    Le rappel passe par une reference, et elle se met a jour dans un effet a
    elle. Appele avec une fonction ecrite sur place — `onDone={() => ...}` —
    ce composant en recevrait une nouvelle a chaque rendu : mise en dependance
    de l'effet ci-dessous, elle en relancerait les minuteurs sans arret, et la
    sequence ne se terminerait jamais.
  */
  const done = useRef(onDone);
  useEffect(() => { done.current = onDone; }, [onDone]);

  useEffect(() => {
    if (loop) return;
    const stop = setTimeout(() => ref.current?.stopAnimating(), FREEZE_MS);
    const end = setTimeout(() => done.current?.(), RECOVERY_MS);
    return () => { clearTimeout(stop); clearTimeout(end); };
  }, [loop]);

  return (
    <Image
      ref={ref}
      source={SOURCE}
      // Toujours dans un carre : le brief du studio l'interdit autrement, et
      // un cerveau etire ne ressemble plus a rien.
      style={[{ width: size, height: size }, style]}
      contentFit="contain"
      autoplay
      cachePolicy="memory-disk"
      priority="high"
      accessibilityLabel={d.corti.recoveryAlt}
    />
  );
}
