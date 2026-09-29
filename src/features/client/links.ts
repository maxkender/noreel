import type { ClientId } from './blockers';

/*
 * Un lien qu'on a copie ailleurs — un message, un mail — et qu'on veut
 * ouvrir ICI, dans la version filtree, plutot que dans l'app d'origine.
 * On ne prend que les liens du site concerne, et ses raccourcisseurs.
 */
const HOSTS: Record<ClientId, string[]> = {
  instagram: ['instagram.com', 'instagr.am'],
  tiktok: ['tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com'],
  twitter: ['x.com', 'twitter.com', 't.co'],
  youtube: ['youtube.com', 'youtu.be', 'm.youtube.com'],
};

/** Le premier lien du texte qui appartient a ce site, ou rien. */
export function linkFor(id: ClientId, text: string | null | undefined): string | null {
  if (!text) return null;
  const m = text.match(/https?:\/\/[^\s<>"']+/i);
  if (!m) return null;
  try {
    const u = new URL(m[0]);
    const host = u.hostname.toLowerCase();
    const ok = HOSTS[id].some((h) => host === h || host.endsWith(`.${h}`));
    if (!ok) return null;
    // X garde son ancienne adresse : on la ramene a celle qu'on filtre.
    if (id === 'twitter' && host.endsWith('twitter.com')) u.hostname = 'x.com';
    return u.toString();
  } catch {
    return null;
  }
}
