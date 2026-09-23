import type { CoachStep } from '@/components/Coach';

/** La visite jouee a la premiere ouverture d'une app filtree. */
export const CLIENT_TOUR: CoachStep[] = [
  {
    mark: '🔒',
    title: 'Voilà comment ça se passe',
    body: 'Tu te connectes sur le site d’Instagram lui-même. Ton mot de passe ne passe jamais par nous, et les cookies te gardent connecté ensuite.',
    at: 'middle',
    cta: 'Compris',
  },
  {
    mark: '👆',
    title: 'Appuie sur la bulle',
    body: 'Elle ouvre ta sortie. Tu peux la déplacer n’importe où sur l’écran — elle reste là où tu la laisses.',
    at: 'top',
  },
  {
    mark: '🏠',
    title: 'Elle te ramène à UnSwipe',
    body: 'La croix en haut fait la même chose. Deux sorties, toujours accessibles.',
    at: 'middle',
  },
];
