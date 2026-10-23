/**
 * @jest-environment jsdom
 */
/**
 * L'ecran noir des notifications d'Instagram (iPhone, octobre 2026).
 *
 * La regle qui retire le bandeau « Use the app » cachait tout bloc au texte
 * court qui contenait ces mots. Pendant que la liste des notifications
 * charge, le bloc qui porte TOUTE la page n'a pour texte que la barre et le
 * bandeau — 58 caracteres : la page entiere etait cachee, pour de bon.
 * Releve sur instagram.com connecte, en vue telephone ; on rejoue ici sa
 * structure : la page, sa barre, la liste encore vide, le bandeau.
 */
import { CLIENTS, buildScript } from './blockers';

beforeEach(() => {
  jest.useFakeTimers();
  // Sans espaces entre les balises, comme Instagram les rend : c'est ce qui
  // fait tomber le texte du cadre sous les 60 caracteres.
  document.body.innerHTML = [
    '<div id="page"><div id="frame">',
    '<nav><a href="/">Home</a><a href="/explore/">Explore</a><a href="/reels/">Reels</a><a href="/direct/inbox/">Messages</a><span>4</span></nav>',
    '<main><div><a>Back</a><h1>Notifications</h1></div><div class="skeleton"></div></main>',
    '<div id="banner"><div><button>Close</button><span>Use the app</span></div></div>',
    '</div></div>',
  ].join('');
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

it('cache le bandeau « Use the app », jamais la page qui charge', () => {
  new Function(buildScript(CLIENTS.instagram.script, { reels: true }))();
  jest.advanceTimersByTime(1000);

  const hidden = (id: string) => (document.getElementById(id) as HTMLElement).style.display === 'none';
  // La page et son cadre restent : c'est eux qui devenaient noirs.
  expect(hidden('page')).toBe(false);
  expect(hidden('frame')).toBe(false);
  expect((document.querySelector('main') as HTMLElement).style.display).not.toBe('none');
  // Le bandeau, lui, part.
  expect(hidden('banner')).toBe(true);
});
