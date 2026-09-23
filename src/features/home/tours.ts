import type { CoachStep } from '@/components/Coach';

/**
 * Le texte des visites guidees.
 *
 * Elles ne decrivent pas l'ecran : elles demandent un geste. « Appuie sur
 * Instagram » s'apprend en une fois ; « voici la liste de tes apps » ne
 * s'apprend pas du tout.
 */
export const HOME_TOUR: CoachStep[] = [
  {
    mark: '👆',
    title: 'Appuie sur Instagram pour l’ouvrir',
    body: 'Rapide tour du propriétaire, le temps de te montrer comment ça marche.',
    at: 'top',
  },
  {
    mark: '🔒',
    title: 'Voilà comment ça se passe',
    body: 'À la première ouverture, tu te connectes sur le site d’Instagram lui-même. Ton mot de passe ne passe jamais par nous — ce sont les cookies qui te gardent connecté ensuite.',
    at: 'middle',
    cta: 'Compris',
  },
  {
    mark: '⬅️',
    title: 'La bulle te ramène ici',
    body: 'Elle flotte au-dessus de la page et se déplace où tu veux. Un appui, et tu es de retour dans UnSwipe.',
    at: 'middle',
  },
  {
    mark: '⚙️',
    title: 'Les réglages sont juste dessous',
    body: 'Sous les icônes, tu règles chaque app ligne par ligne : reels, stories, publicités, fil.',
    at: 'bottom',
  },
  {
    mark: '🛡️',
    title: 'L’onglet Blocage met les apps d’origine en pause',
    body: 'C’est lui qui ferme la porte de derrière. Sans ça, un réflexe suffit à tout relancer.',
    at: 'bottom',
  },
];
