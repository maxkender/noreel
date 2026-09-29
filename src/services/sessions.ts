import { Platform } from 'react-native';
import CookieManager, { type Cookies } from '@react-native-cookies/cookies';
import type { ClientId } from '@/features/client/blockers';

/**
 * Les cookies d'un site, lus et remis dans le magasin de la WebView.
 *
 * Sur iOS, la WebView lit le magasin WebKit ; c'est donc celui-la qu'on
 * manipule (`useWebKit`). On ne touche JAMAIS aux cookies des autres sites :
 * vider tout le magasin deconnecterait TikTok, X et YouTube en meme temps.
 */
const ORIGIN: Record<ClientId, string[]> = {
  instagram: ['https://www.instagram.com', 'https://instagram.com'],
  tiktok: ['https://www.tiktok.com', 'https://tiktok.com'],
  twitter: ['https://x.com', 'https://twitter.com'],
  youtube: ['https://m.youtube.com', 'https://www.youtube.com', 'https://accounts.google.com', 'https://google.com'],
};

/*
 * DEUX magasins, pas un.
 *
 * La WebView lit le magasin WebKit, mais avec `sharedCookiesEnabled` elle
 * recopie aussi ses cookies dans le magasin partage de l'app, et remet ceux
 * du magasin partage dans WebKit a chaque chargement. Retirer une session du
 * seul magasin WebKit ne suffisait donc pas : l'ancienne revenait par le
 * magasin partage au rechargement, se melait a la nouvelle, et Instagram,
 * devant deux sessions contradictoires, redemandait de se connecter. On
 * traite les deux, dans le meme ordre.
 */
const STORES: boolean[] = Platform.OS === 'ios' ? [true, false] : [false];

/** Tous les cookies du site, tels qu'ils sont maintenant (magasin WebKit d'abord). */
export async function snapshot(id: ClientId): Promise<Cookies> {
  const out: Cookies = {};
  for (const useWebKit of [...STORES].reverse()) {
    for (const url of ORIGIN[id]) {
      try {
        const got = await CookieManager.get(url, useWebKit);
        Object.assign(out, got);
      } catch { /* un domaine sans cookies */ }
    }
  }
  return out;
}

/** Retire les cookies du site — et seulement les siens — des deux magasins.
 *  Pas de /logout : la session reste valable chez eux, on la remettra plus tard. */
export async function forget(id: ClientId): Promise<void> {
  const now = await snapshot(id);
  for (const useWebKit of STORES) {
    for (const url of ORIGIN[id]) {
      for (const name of Object.keys(now)) {
        try {
          if (Platform.OS === 'ios') await CookieManager.clearByName(url, name, useWebKit);
          else await CookieManager.set(url, { name, value: '', expires: new Date(0).toISOString() });
        } catch { /* deja parti */ }
      }
    }
  }
}

/** Remet la session d'un compte : ses cookies a la place de ceux du site, dans les deux magasins. */
export async function restore(id: ClientId, cookies: Cookies): Promise<boolean> {
  await forget(id);
  let ok = true;
  const url = ORIGIN[id][0];
  for (const useWebKit of STORES) {
    for (const c of Object.values(cookies)) {
      try {
        // Le domaine et le chemin du cookie d'origine, sinon WebKit le range
        // sous www. seulement et la moitie des requetes partent sans lui.
        await CookieManager.set(url, {
          name: c.name, value: c.value, domain: c.domain, path: c.path ?? '/',
          expires: c.expires, secure: c.secure, httpOnly: c.httpOnly,
        }, useWebKit);
      } catch { ok = false; }
    }
  }
  // WebKit met un instant a passer les cookies au processus de la page :
  // recharger tout de suite partait parfois avec les anciens.
  await new Promise((r) => setTimeout(r, 450));
  // On verifie que la session est bien en place avant de dire oui.
  const after = await snapshot(id);
  const key = id === 'twitter' ? 'auth_token' : 'sessionid';
  if (cookies[key] && after[key]?.value !== cookies[key].value) ok = false;
  return ok;
}

/** Une session vaut quelque chose si elle porte de quoi etre connecte. */
export function looksLoggedIn(id: ClientId, cookies: Cookies): boolean {
  const names = Object.keys(cookies);
  if (id === 'instagram') return names.includes('sessionid') && names.includes('ds_user_id');
  if (id === 'twitter') return names.includes('auth_token');
  if (id === 'tiktok') return names.includes('sessionid');
  return names.some((n) => /^(SID|__Secure-1PSID|SAPISID)$/.test(n));
}
