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
    title: 'Ta barre est là',
    body: 'Appuie sur la poignée pour l’ouvrir. Tu peux la déplacer n’importe où sur l’écran — elle reste là où tu la laisses.',
    at: 'top',
  },
  {
    mark: '⚙️',
    title: 'Les réglages sont dans la barre',
    body: 'Reels, stories, publicités, fil : tu changes tout sans quitter la page, et ça s’applique tout de suite.',
    at: 'middle',
  },
  {
    mark: '🏠',
    title: 'Accueil te ramène en haut du site',
    body: 'Et la croix, juste en dessous de la barre, te ramène à UnSwipe.',
    at: 'middle',
  },
];
