/**
 * Une pub se reconnait a son mot, et la marque se retire des que le mot
 * n'y est plus : c'est ce qui empeche le fil de rester noir quand Instagram
 * recycle une carte.
 */
import { CLIENTS } from './blockers';

function adFns() {
  const src = CLIENTS.instagram.script;
  const from = src.indexOf('const AD_WORD = ');
  if (from < 0) throw new Error('AD_WORD introuvable');
  const tail = "else if (art.hasAttribute('data-nr-ad')) art.removeAttribute('data-nr-ad');\n    }\n  };";
  const end = src.indexOf(tail, from);
  if (end < 0) throw new Error('fin de __adMark introuvable');
  const body = src.slice(from, end + tail.length);
  const make = new Function('document', 'innerHeight', `${body}\nreturn { __isAd, __adMark };`);
  return make;
}

type Fake = { spans: string[]; top?: number; attrs: Record<string, string> };
const article = (spans: string[], top = 0): Fake & { querySelectorAll: (s: string) => unknown[]; getBoundingClientRect: () => { top: number; bottom: number }; setAttribute: (k: string, v: string) => void; hasAttribute: (k: string) => boolean; removeAttribute: (k: string) => void } => {
  const a = {
    spans, top, attrs: {} as Record<string, string>,
    querySelectorAll: (s: string) => (s === 'span' ? a.spans.map((t) => ({ textContent: t })) : []),
    getBoundingClientRect: () => ({ top: a.top, bottom: a.top + 600 }),
    setAttribute: (k: string, v: string) => { a.attrs[k] = v; },
    hasAttribute: (k: string) => k in a.attrs,
    removeAttribute: (k: string) => { delete a.attrs[k]; },
  };
  return a;
};

it('reconnait le mot seul, pas une legende qui le contient', () => {
  const { __isAd } = adFns()({ querySelectorAll: () => [] }, 900);
  expect(__isAd(article(['lea.mrn', 'Sponsorisé', 'En savoir plus']))).toBe(true);
  expect(__isAd(article(['shreddedsages', 'Sponsored']))).toBe(true);
  expect(__isAd(article(['max', 'Je suis sponsorisé par personne, 12 likes']))).toBe(false);
  expect(__isAd(article(['max', 'Morning lifts']))).toBe(false);
});

it('marque, puis demarque quand la carte change de contenu', () => {
  const ad = article(['Sponsorisé']);
  const post = article(['Audio d’origine']);
  const far = article(['Sponsored'], 9000);
  const document = { querySelectorAll: () => [ad, post, far] };
  const { __adMark } = adFns()(document, 900);
  __adMark();
  expect(ad.attrs['data-nr-ad']).toBe('1');
  expect(post.attrs['data-nr-ad']).toBeUndefined();
  // Hors de portee d'ecran : pas lu, pas marque.
  expect(far.attrs['data-nr-ad']).toBeUndefined();
  // La carte est recyclee pour un vrai post : la marque part a la passe suivante.
  ad.spans = ['thomas_b', 'regarde ça'];
  __adMark();
  expect(ad.attrs['data-nr-ad']).toBeUndefined();
});
