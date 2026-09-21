import { useMemo } from 'react';
import { lang } from '@/lib/format';
import { en } from './en';
import { fr } from './fr';
import type { Dict } from './fr';

const dicts = { fr: fr as unknown as Dict, en };

export const dict: Dict = dicts[lang];

type Vars = Record<string, string | number>;

/** Remplace {clé} et le raccourci {nbsp}. */
export function interpolate(template: string, vars?: Vars): string {
  let out = template.replace(/\{nbsp\}/g, ' ');
  if (!vars) return out;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  }
  return out;
}

export function plural(n: number, forms: { one: string; other: string }): string {
  // fr : 0 et 1 au singulier. en : 1 seulement.
  const singular = lang === 'fr' ? Math.abs(n) < 2 : Math.abs(n) === 1;
  return singular ? forms.one : forms.other;
}

export function useT() {
  return useMemo(
    () => ({
      d: dict,
      t: (template: string, vars?: Vars) => interpolate(template, vars),
      plural,
      lang,
    }),
    []
  );
}
