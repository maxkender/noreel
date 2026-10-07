import { getLocales } from 'expo-localization';

/*
 * Les langues de l'app. L'anglais est la langue de base : un telephone dans
 * une langue qu'on n'a pas lit l'app en anglais, pas en francais.
 */
export type Lang = 'en' | 'fr' | 'de' | 'tr' | 'it' | 'es';
export const LANGS: Lang[] = ['en', 'fr', 'de', 'tr', 'it', 'es'];

export const locale = getLocales()[0]?.languageTag ?? 'en';

/** La langue que le telephone suggere : la sienne si on l'a, sinon l'anglais. */
export function deviceLang(): Lang {
  const code = locale.toLowerCase().slice(0, 2);
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

/** 195 -> « 3 h 15 » (fr) / « 3h 15m » (en) / « 3 Std. 15 Min. » (de) / « 3 sa 15 dk » (tr). */
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
    default:
      // fr, it, es : la meme ecriture « 3 h 15 ».
      if (h === 0) return `${m}${NBSP}min`;
      return m === 0 ? `${h}${NBSP}h` : `${h}${NBSP}h${NBSP}${m}`;
  }
}

export const formatPercent = (ratio: number): string => `${Math.round(ratio * 100)}`;
