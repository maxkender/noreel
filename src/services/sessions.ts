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

const WEBKIT = Platform.OS === 'ios';

/** Tous les cookies du site, tels qu'ils sont maintenant. */
export async function snapshot(id: ClientId): Promise<Cookies> {
  const out: Cookies = {};
  for (const url of ORIGIN[id]) {
    try {
      const got = await CookieManager.get(url, WEBKIT);
      Object.assign(out, got);
    } catch { /* un domaine sans cookies */ }
  }
  return out;
}

/** Retire les cookies du site — et seulement les siens. Pas de /logout :
 *  la session reste valable chez eux, on la remettra plus tard. */
export async function forget(id: ClientId): Promise<void> {
  const now = await snapshot(id);
  for (const url of ORIGIN[id]) {
    for (const name of Object.keys(now)) {
      try {
        if (WEBKIT) await CookieManager.clearByName(url, name, true);
        else await CookieManager.set(url, { name, value: '', expires: new Date(0).toISOString() });
      } catch { /* deja parti */ }
    }
  }
}

/** Remet la session d'un compte : ses cookies a la place de ceux du site. */
export async function restore(id: ClientId, cookies: Cookies): Promise<boolean> {
  await forget(id);
  let ok = true;
  const url = ORIGIN[id][0];
  for (const c of Object.values(cookies)) {
    try {
      // Le domaine et le chemin du cookie d'origine, sinon WebKit le range
      // sous www. seulement et la moitie des requetes partent sans lui.
      await CookieManager.set(url, {
        name: c.name, value: c.value, domain: c.domain, path: c.path ?? '/',
        expires: c.expires, secure: c.secure, httpOnly: c.httpOnly,
      }, WEBKIT);
    } catch { ok = false; }
  }
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
