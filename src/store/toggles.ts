import { dict } from '@/i18n';
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
  label: string;
  /** Toujours actif, non debrayable. */
  locked?: boolean;
  /** Actif tant que l'utilisateur n'a rien touche. */
  on?: boolean;
};

export const APP_TOGGLES: Record<ClientId, AppToggle[]> = {
  instagram: [
    { key: 'reels', label: dict.toggles.igReels, locked: true },
    { key: 'stories', label: dict.toggles.igStories },
    { key: 'explore', label: dict.toggles.igExplore },
    { key: 'saved', label: dict.toggles.igSaved },
    { key: 'feed', label: dict.toggles.igFeed },
    { key: 'dmsOnly', label: dict.toggles.dmsOnly },
    { key: 'grayscale', label: dict.toggles.gray },
  ],
  tiktok: [
    { key: 'foryou', label: dict.toggles.ttForyou, locked: true },
    { key: 'explore', label: dict.toggles.ttExplore },
    { key: 'dmsOnly', label: dict.toggles.dmsOnly },
    { key: 'grayscale', label: dict.toggles.gray },
  ],
  twitter: [
    { key: 'foryou', label: dict.toggles.xForyou, locked: true },
    { key: 'trends', label: dict.toggles.xTrends, locked: true },
    { key: 'explore', label: dict.toggles.xExplore },
    { key: 'dmsOnly', label: dict.toggles.dmsOnly },
    { key: 'grayscale', label: dict.toggles.gray },
  ],
  youtube: [
    { key: 'shorts', label: dict.toggles.ytShorts, locked: true },
    { key: 'searchOnly', label: dict.toggles.ytSearchOnly },
    { key: 'ads', label: dict.toggles.ytAds, on: true },
    { key: 'comments', label: dict.toggles.ytComments },
    { key: 'recommended', label: dict.toggles.ytRecommended },
    { key: 'grayscale', label: dict.toggles.gray },
  ],
};
