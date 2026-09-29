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
    { key: 'reels', label: 'Bloquer les Reels', locked: true },
    { key: 'explore', label: 'Masquer la grille Explorer (la recherche reste)' },
    { key: 'ads', label: 'Masquer les publicités', on: true },
    { key: 'suggested', label: 'Masquer les posts suggérés', on: true },
    { key: 'storyAds', label: 'Masquer les pubs dans les stories', on: true },
    { key: 'stories', label: 'Bloquer les stories' },
    { key: 'saved', label: 'Bloquer les publications enregistrées' },
    { key: 'feed', label: 'Bloquer le fil' },
    { key: 'dmsOnly', label: 'Messages uniquement' },
    { key: 'grayscale', label: 'Noir et blanc' },
  ],
  tiktok: [
    { key: 'foryou', label: 'Bloquer le fil Pour toi', locked: true },
    { key: 'explore', label: 'Bloquer la recherche et Découvrir' },
    { key: 'dmsOnly', label: 'Messages uniquement' },
    { key: 'grayscale', label: 'Noir et blanc' },
  ],
  twitter: [
    { key: 'foryou', label: 'Bloquer « Pour vous »', locked: true },
    { key: 'trends', label: 'Masquer les tendances', locked: true },
    { key: 'explore', label: 'Bloquer Explorer' },
    { key: 'dmsOnly', label: 'Messages uniquement' },
    { key: 'grayscale', label: 'Noir et blanc' },
  ],
  youtube: [
    { key: 'shorts', label: 'Bloquer les Shorts', locked: true },
    { key: 'searchOnly', label: 'Recherche uniquement' },
    { key: 'ads', label: 'Bloquer les publicités', on: true },
    { key: 'home', label: 'Bloquer la page d’accueil' },
    { key: 'comments', label: 'Bloquer les commentaires' },
    { key: 'recommended', label: 'Masquer les suggestions' },
    { key: 'grayscale', label: 'Noir et blanc' },
  ],
};
