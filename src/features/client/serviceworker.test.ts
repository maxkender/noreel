/**
 * Le coeur d'Instagram (les notifications) restait blanc sur Android : la vue
 * web y expose les service workers sans notifications ni push, un melange
 * qu'aucun iPhone n'a. Le script les retire sur Android, et seulement la.
 */
import { INSTAGRAM_BLOCKER } from './blockers';

/** Rejoue le bloc avec la fenetre, le navigateur et sa classe donnes. */
function run(code: string, ctx: { window: unknown; navigator: unknown; Navigator: unknown }) {
  new Function('window', 'navigator', 'Navigator', code)(ctx.window, ctx.navigator, ctx.Navigator);
}

/** Le bloc decoupe du script, rejoue seul. */
function block(): string {
  const start = INSTAGRAM_BLOCKER.indexOf("    if (!window.webkit && navigator.serviceWorker)");
  const end = INSTAGRAM_BLOCKER.indexOf('} catch (e) { /* la page suit son chemin */ }', start);
  expect(start).toBeGreaterThan(0);
  return 'try {\n' + INSTAGRAM_BLOCKER.slice(start, end) + '} catch (e) { throw e; }';
}

function page(webkit: boolean) {
  const unregister = jest.fn();
  class Navigator {}
  Object.defineProperty(Navigator.prototype, 'serviceWorker', {
    configurable: true,
    get: () => ({ getRegistrations: () => Promise.resolve([{ unregister }]) }),
  });
  const navigator = new Navigator();
  const window: Record<string, unknown> = webkit ? { webkit: { messageHandlers: {} } } : {};
  return { ctx: { window, navigator, Navigator }, navigator, unregister };
}

describe('service workers sur Android', () => {
  it('les retire et desinscrit ceux deja poses', async () => {
    const p = page(false);
    run(block(), p.ctx);
    expect('serviceWorker' in (p.navigator as object)).toBe(false);
    await new Promise((r) => setTimeout(r, 0));
    expect(p.unregister).toHaveBeenCalled();
  });

  it("ne touche pas a l'iPhone", () => {
    const p = page(true);
    run(block(), p.ctx);
    expect((p.navigator as { serviceWorker?: unknown }).serviceWorker).toBeDefined();
    expect(p.unregister).not.toHaveBeenCalled();
  });
});
