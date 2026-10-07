import { Linking, Share } from 'react-native';
import { dict } from '@/i18n';

/** La page de l'app sur l'App Store : ce qu'on partage. */
export const STORE_URL = 'https://apps.apple.com/fr/app/unswipe-r%C3%A9seau-anti-addiction/id6814633088';

const message = () => `${dict.ui.shareText} ${STORE_URL}`;

/** La feuille de partage d'iOS, avec le lien. */
export function shareApp(): Promise<unknown> {
  return Share.share({ message: message(), url: STORE_URL }).catch(() => undefined);
}

/*
 * WhatsApp directement : c'est la que ca se raconte. Sans WhatsApp sur le
 * telephone, l'ouverture echoue et on retombe sur la feuille de partage.
 */
export function shareOnWhatsApp(): Promise<unknown> {
  const url = `whatsapp://send?text=${encodeURIComponent(message())}`;
  return Linking.openURL(url).catch(() => shareApp());
}
