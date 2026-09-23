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
    body: 'Elle ouvre ta barre de navigation. Tu peux la déplacer n’importe où sur l’écran — elle reste là où tu la laisses.',
    at: 'top',
  },
  {
    mark: '⚙️',
    title: 'Les réglages sont dans la barre',
    body: 'Reels, stories, publicités, fil : tu changes tout sans quitter la page. Recharge ensuite pour appliquer.',
    at: 'middle',
  },
  {
    mark: '🏠',
    title: 'Accueil te ramène en haut du site',
    body: 'Et la croix, comme celle de la barre du haut, te ramène à UnSwipe. Deux sorties, toujours accessibles.',
    at: 'middle',
  },
];
