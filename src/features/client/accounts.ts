import type { ClientId } from './blockers';

/**
 * Changer de compte, par la porte du site lui-meme.
 *
 * Isoler deux sessions cote app demanderait un magasin de cookies par
 * compte, et WKWebView n'en expose qu'un seul a react-native-webview. Mais
 * Instagram, X et TikTok savent deja tenir plusieurs comptes a la fois :
 * se connecter depuis leur page ajoute le compte a LEUR selecteur sans
 * chasser le premier. On y mene, plutot que d'imiter mal.
 */
export const ACCOUNT: Record<ClientId, { add: string; out: string; note?: string }> = {
  instagram: {
    add: 'https://www.instagram.com/accounts/login/',
    out: 'https://www.instagram.com/accounts/logout/',
  },
  twitter: {
    add: 'https://x.com/i/flow/login',
    out: 'https://x.com/logout',
  },
  tiktok: {
    add: 'https://www.tiktok.com/login',
    out: 'https://www.tiktok.com/logout',
  },
  youtube: {
    add: 'https://accounts.google.com/AccountChooser?continue=https://m.youtube.com/',
    out: 'https://accounts.google.com/Logout',
    // Google refuse souvent la connexion depuis un navigateur integre. On
    // le dit ici plutot que de laisser son message d'erreur passer pour une
    // panne de notre cote.
    note: 'Google refuse parfois la connexion depuis un navigateur intégré.',
  },
};
