import { linkFor } from './links';

it('prend un lien du bon site, dans du texte', () => {
  expect(linkFor('instagram', 'regarde https://www.instagram.com/p/Cx7/ 😭')).toBe('https://www.instagram.com/p/Cx7/');
  expect(linkFor('instagram', 'https://instagr.am/p/Cx7')).toBe('https://instagr.am/p/Cx7');
  expect(linkFor('youtube', 'https://youtu.be/abc')).toBe('https://youtu.be/abc');
});

it('refuse un lien d’un autre site, ou pas de lien', () => {
  expect(linkFor('instagram', 'https://www.tiktok.com/@x/video/1')).toBeNull();
  expect(linkFor('instagram', 'pas un lien')).toBeNull();
  expect(linkFor('instagram', null)).toBeNull();
});

it('ramene twitter.com sur x.com', () => {
  expect(linkFor('twitter', 'https://twitter.com/a/status/1')).toBe('https://x.com/a/status/1');
});
