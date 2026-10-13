import { getLocales } from 'expo-localization';

/*
 * Les langues de l'app. L'anglais est la langue de base : un telephone dans
 * une langue qu'on n'a pas lit l'app en anglais, pas en francais.
 */
export type Lang =
  | 'en' | 'fr' | 'de' | 'tr' | 'it' | 'es' | 'pt' | 'nl' | 'pl' | 'ru' | 'sv' | 'no' | 'fi'
  | 'cs' | 'sk' | 'hu' | 'ro' | 'el' | 'hr' | 'sl' | 'sr' | 'bg' | 'et' | 'he' | 'ar';
export const LANGS: Lang[] = [
  'en', 'fr', 'de', 'tr', 'it', 'es', 'pt', 'nl', 'pl', 'ru', 'sv', 'no', 'fi',
  'cs', 'sk', 'hu', 'ro', 'el', 'hr', 'sl', 'sr', 'bg', 'et', 'he', 'ar',
];

/** Les langues qui s'ecrivent de droite a gauche : la mise en page se retourne. */
export const RTL: Lang[] = ['he', 'ar'];
export const isRtl = (l: Lang): boolean => RTL.includes(l);

export const locale = getLocales()[0]?.languageTag ?? 'en';

/** La langue que le telephone suggere : la sienne si on l'a, sinon l'anglais. */
export function deviceLang(): Lang {
  const code = locale.toLowerCase().slice(0, 2);
  // Le norvegien s'ecrit nb ou nn sur un iPhone ; chez nous c'est « no ».
  if (code === 'nb' || code === 'nn') return 'no';
  // L'hebreu s'ecrit encore « iw » sur certains appareils.
  if (code === 'iw') return 'he';
  return (LANGS as string[]).includes(code) ? (code as Lang) : 'en';
}

/*
 * La langue COURANTE, lue a chaque appel et non figee a l'import.
 *
 * Elle etait une constante calculee au demarrage : choisir une autre langue
 * dans le parcours n'aurait rien change avant un redemarrage. C'est une
 * variable vivante, posee par le magasin de langue au reveil et a chaque
 * choix. Les modules qui l'importent voient la valeur du moment.
 */
export let lang: Lang = deviceLang();
export function setLang(next: Lang) { lang = next; }

const NBSP = ' ';

export const formatNumber = (n: number): string =>
  new Intl.NumberFormat(locale).format(n);

/** 195 -> « 3 h 15 » (fr) / « 3h 15m » (en) / « 3 Std. 15 Min. » (de) / « 3 sa 15 dk » (tr) / « 3 ч 15 мин » (ru)… */
export function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  switch (lang) {
    case 'en':
      if (h === 0) return `${m}m`;
      return m === 0 ? `${h}h` : `${h}h ${m}m`;
    case 'de':
      if (h === 0) return `${m}${NBSP}Min.`;
      return m === 0 ? `${h}${NBSP}Std.` : `${h}${NBSP}Std.${NBSP}${m}${NBSP}Min.`;
    case 'tr':
      if (h === 0) return `${m}${NBSP}dk`;
      return m === 0 ? `${h}${NBSP}sa` : `${h}${NBSP}sa${NBSP}${m}${NBSP}dk`;
    case 'ru':
    case 'bg':
    case 'sr':
      if (h === 0) return `${m}${NBSP}мин`;
      return m === 0 ? `${h}${NBSP}ч` : `${h}${NBSP}ч${NBSP}${m}${NBSP}мин`;
    case 'he':
      if (h === 0) return `${m}${NBSP}דק׳`;
      return m === 0 ? `${h}${NBSP}ש׳` : `${h}${NBSP}ש׳${NBSP}${m}${NBSP}דק׳`;
    case 'ar':
      if (h === 0) return `${m}${NBSP}د`;
      return m === 0 ? `${h}${NBSP}س` : `${h}${NBSP}س${NBSP}${m}${NBSP}د`;
    case 'el':
      if (h === 0) return `${m}${NBSP}λ`;
      return m === 0 ? `${h}${NBSP}ώ` : `${h}${NBSP}ώ${NBSP}${m}${NBSP}λ`;
    case 'nl':
      if (h === 0) return `${m}${NBSP}min`;
      return m === 0 ? `${h}${NBSP}u` : `${h}${NBSP}u${NBSP}${m}`;
    case 'sv':
    case 'no':
    case 'fi':
    case 'et':
    case 'pl':
    case 'cs':
    case 'sk':
    case 'hu':
    case 'ro':
    case 'hr':
    case 'sl':
    case 'pt':
      if (h === 0) return `${m}${NBSP}min`;
      return m === 0 ? `${h}${NBSP}h` : `${h}${NBSP}h${NBSP}${m}${NBSP}min`;
    default:
      // fr, it, es : la meme ecriture « 3 h 15 ».
      if (h === 0) return `${m}${NBSP}min`;
      return m === 0 ? `${h}${NBSP}h` : `${h}${NBSP}h${NBSP}${m}`;
  }
}

export const formatPercent = (ratio: number): string => `${Math.round(ratio * 100)}`;
