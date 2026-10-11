/**
 * Le reel recu en message se regarde ; le doigt vers le haut ne passe pas.
 *
 * Trois ou quatre glissements insistants arrivaient au reel suivant : la
 * sortie apres coup etait plafonnee et freinee. Le geste est maintenant
 * refuse pendant qu'il se fait, en capture. Ce test rejoue le code tel
 * qu'il part dans la page, avec de faux evenements.
 */
import { CLIENTS } from './blockers';

type Handler = (e: unknown) => void;
type Rect = { left: number; top: number; right: number; bottom: number; height: number };

function harness(opts: { shorts: boolean; player: Rect | null; open?: boolean }) {
  const src = CLIENTS.instagram.script;
  const from = src.indexOf('const __player = ');
  if (from < 0) throw new Error('__player introuvable dans le script injecte');
  const tail = "addEventListener(ev, __swipeEnd, { capture: true, passive: true });\n  }";
  const end = src.indexOf(tail, from);
  if (end < 0) throw new Error('fin du bloc de glissement introuvable');
  const body = src.slice(from, end + tail.length);
  const handlers = new Map<string, Handler[]>();
  const addEventListener = (ev: string, fn: Handler) => {
    handlers.set(ev, [...(handlers.get(ev) ?? []), fn]);
  };
  const video = opts.player
    ? { videoWidth: 540, videoHeight: 960, getBoundingClientRect: () => opts.player }
    : null;
  const document = { querySelectorAll: () => (video ? [video] : []) };
  const window = { __nrShorts: opts.shorts };
  const __open = () => !!opts.open;
  const __tall = (v: { videoWidth: number; videoHeight: number }) => v.videoWidth / v.videoHeight <= 0.65;
  const make = new Function('window', 'document', 'innerHeight', 'addEventListener', '__open', '__tall', body);
  make(window, document, 900, addEventListener, __open, __tall);
  const fire = (ev: string, e: Record<string, unknown>) => {
    const evt = {
      cancelable: true, prevented: false, stopped: false,
      preventDefault() { this.prevented = true; },
      stopPropagation() { this.stopped = true; },
      stopImmediatePropagation() { this.stopped = true; },
      ...e,
    };
    for (const h of handlers.get(ev) ?? []) h(evt);
    return evt;
  };
  return { fire };
}

const FULL: Rect = { left: 0, top: 0, right: 400, bottom: 900, height: 900 };
const touch = (x: number, y: number) => ({ touches: [{ clientX: x, clientY: y }] });

describe('le glissement vertical sur un lecteur plein ecran', () => {
  it('est avale avant la page', () => {
    const { fire } = harness({ shorts: true, player: FULL });
    fire('touchstart', touch(200, 600));
    const e = fire('touchmove', touch(200, 480));
    expect(e.prevented).toBe(true);
    expect(e.stopped).toBe(true);
    // Et il le reste jusqu'au bout du geste, meme si le doigt redevient horizontal.
    expect(fire('touchmove', touch(260, 470)).prevented).toBe(true);
    fire('touchend', {});
  });

  it('laisse passer un tap et un glissement horizontal', () => {
    const { fire } = harness({ shorts: true, player: FULL });
    fire('touchstart', touch(200, 600));
    expect(fire('touchmove', touch(203, 598)).prevented).toBe(false);
    expect(fire('touchmove', touch(320, 590)).prevented).toBe(false);
    // Une fois juge horizontal, le geste n'est plus suivi.
    expect(fire('touchmove', touch(320, 300)).prevented).toBe(false);
  });

  it('ne touche a rien sans lecteur plein ecran, ni la ou la sortie est coupee', () => {
    for (const h of [harness({ shorts: true, player: null }), harness({ shorts: false, player: FULL }), harness({ shorts: true, player: FULL, open: true })]) {
      h.fire('touchstart', touch(200, 600));
      expect(h.fire('touchmove', touch(200, 400)).prevented).toBe(false);
    }
  });

  it('ignore un doigt pose hors du lecteur', () => {
    const { fire } = harness({ shorts: true, player: { left: 0, top: 100, right: 400, bottom: 900, height: 800 } });
    fire('touchstart', touch(200, 40));
    expect(fire('touchmove', touch(200, 200)).prevented).toBe(false);
  });

  it('suit aussi le pointeur, que WebKit envoie en double', () => {
    const { fire } = harness({ shorts: true, player: FULL });
    fire('pointerdown', { clientX: 200, clientY: 600 });
    expect(fire('pointermove', { clientX: 200, clientY: 450 }).stopped).toBe(true);
  });
});
