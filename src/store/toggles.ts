import type { Dict } from '@/i18n/fr';
import type { ClientId } from '@/features/client/blockers';

/**
 * La table des reglages, seule.
 *
 * Elle vivait dans le magasin, qui importe le stockage sur disque : la
 * lire depuis un test tirait donc tout AsyncStorage derriere elle, et le
 * test ne pouvait pas tourner. Une table de donnees n'a rien a demander a
 * la persistance.
 */
/** Reglages par app. Les entrees `locked` sont toujours actives. */
export type AppToggle = {
  key: string;
  /** La cle du libelle dans `dict.toggles` : lue a l'affichage, dans la langue du moment. */
  label: keyof Dict['toggles'];
  /** Toujours actif, non debrayable. */
  locked?: boolean;
  /** Actif tant que l'utilisateur n'a rien touche. */
  on?: boolean;
  /** Encore en essai : on le dit a cote de l'interrupteur. */
  beta?: boolean;
};

export const APP_TOGGLES: Record<ClientId, AppToggle[]> = {
  instagram: [
    { key: 'reels', label: 'igReels', locked: true },
    { key: 'stories', label: 'igStories' },
    { key: 'explore', label: 'igExplore' },
    { key: 'saved', label: 'igSaved' },
    { key: 'feed', label: 'igFeed' },
    { key: 'ads', label: 'igAds', beta: true },
    { key: 'dmsOnly', label: 'dmsOnly' },
    { key: 'grayscale', label: 'gray' },
  ],
  tiktok: [
    { key: 'foryou', label: 'ttForyou', locked: true },
    { key: 'explore', label: 'ttExplore' },
    { key: 'dmsOnly', label: 'dmsOnly' },
    { key: 'grayscale', label: 'gray' },
  ],
  twitter: [
    { key: 'foryou', label: 'xForyou', locked: true },
    { key: 'trends', label: 'xTrends', locked: true },
    { key: 'explore', label: 'xExplore' },
    { key: 'dmsOnly', label: 'dmsOnly' },
    { key: 'grayscale', label: 'gray' },
  ],
  youtube: [
    { key: 'shorts', label: 'ytShorts', locked: true },
    { key: 'searchOnly', label: 'ytSearchOnly' },
    { key: 'ads', label: 'ytAds', on: true },
    { key: 'comments', label: 'ytComments' },
    { key: 'recommended', label: 'ytRecommended' },
    { key: 'grayscale', label: 'gray' },
  ],
};
