/**
 * Les alertes Instagram : on ne previent que pour ce qui MONTE, et jamais
 * sur un compteur qui baisse (des messages lus ailleurs).
 */
import { activityOf, newsLines } from './igAlerts';

jest.mock('expo-background-task', () => ({ BackgroundTaskResult: {}, BackgroundTaskStatus: {} }));
jest.mock('expo-task-manager', () => ({ defineTask: jest.fn() }));

const W = { title: 'Instagram', dm: 'Messages non lus : {n}', act: 'Nouvelle activité : {n}' };

describe("l'activite qui merite une alerte", () => {
  it("additionne ce qui vient des autres, pas les promotions", () => {
    expect(activityOf({ likes: 2, comments: 1, relationships: 1, campaign_notification: 5, promotional: 3 })).toBe(4);
  });
  it('vaut zero sans compteurs', () => {
    expect(activityOf(undefined)).toBe(0);
  });
});

describe('ce qui a change', () => {
  it('previent des nouveaux messages et de la nouvelle activite', () => {
    expect(newsLines({ dm: 1, act: 0 }, { dm: 3, act: 2 }, W)).toEqual(['Messages non lus : 3', 'Nouvelle activité : 2']);
  });
  it('se tait quand rien ne monte', () => {
    expect(newsLines({ dm: 3, act: 2 }, { dm: 3, act: 2 }, W)).toEqual([]);
  });
  it('se tait quand les messages ont ete lus ailleurs', () => {
    expect(newsLines({ dm: 3, act: 0 }, { dm: 0, act: 0 }, W)).toEqual([]);
  });
});
