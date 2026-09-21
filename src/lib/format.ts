import { getLocales } from 'expo-localization';

export const locale = getLocales()[0]?.languageTag ?? 'en';
export const lang: 'fr' | 'en' = locale.toLowerCase().startsWith('fr') ? 'fr' : 'en';

const NBSP = ' ';

export const formatNumber = (n: number): string =>
  new Intl.NumberFormat(locale).format(n);

/** 195 -> « 3 h 15 » (fr) / « 3h 15m » (en). Les minutes nulles sont omises. */
export function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (lang === 'fr') {
    if (h === 0) return `${m}${NBSP}min`;
    return m === 0 ? `${h}${NBSP}h` : `${h}${NBSP}h${NBSP}${m}`;
  }
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** 91 -> « 7 ans et 7 mois ». Jamais « et 0 mois ». */
export function formatLifeDuration(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (months <= 0) return lang === 'fr' ? `moins d'un mois` : 'less than a month';
  if (y === 0) {
    return lang === 'fr'
      ? `${m}${NBSP}mois`
      : `${m} month${m > 1 ? 's' : ''}`;
  }
  const plural = y > 1 ? 's' : '';
  if (m === 0) {
    return lang === 'fr' ? `${y}${NBSP}an${plural}` : `${y} year${plural}`;
  }
  return lang === 'fr'
    ? `${y}${NBSP}an${plural} et ${m}${NBSP}mois`
    : `${y} year${plural} and ${m} month${m > 1 ? 's' : ''}`;
}

export const formatPercent = (ratio: number): string => `${Math.round(ratio * 100)}`;
