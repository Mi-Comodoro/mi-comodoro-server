import { getMoneyStrategy } from '../money.strategy';

const round = (value: number) => getMoneyStrategy('COP').round(value);
const allocate = (total: number, weights: number[]) =>
  getMoneyStrategy('COP').allocate(total, weights);

describe('getMoneyStrategy', () => {
  it.each(['COP', 'USD', 'EUR'])('returns the %s strategy with 2 decimals', (currency) => {
    const strategy = getMoneyStrategy(currency);
    expect(strategy.currency).toBe(currency);
    expect(strategy.decimals).toBe(2);
  });

  it.each([undefined, null, '', 'XXX'])('falls back to COP for %p', (currency) => {
    expect(getMoneyStrategy(currency).currency).toBe('COP');
  });

  describe('round', () => {
    it.each([
      [10.075, 10.08],
      [1.005, 1.01],
      [1000.005, 1000.01],
      [1234567.005, 1234567.01],
      [-10.075, -10.08],
      [0.1 + 0.2, 0.3],
      [1e-7, 0],
    ])('round(%p) = %p', (input, expected) => {
      expect(round(input)).toBe(expected);
    });

    it.each([
      [0, 4],
      [10, 100],
      [1000, 1100],
      [1234500, 1234600],
    ])('rounds every half cent up between %p and %p', (from, to) => {
      const wrong: number[] = [];
      for (let cents = from * 100; cents < to * 100; cents++) {
        const half = Number(`${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}5`);
        if (Math.round(round(half) * 100) !== cents + 1) wrong.push(half);
      }
      expect(wrong).toEqual([]);
    });
  });

  describe('allocate', () => {
    it.each([
      [100, [1, 1, 1], [33.34, 33.33, 33.33]],
      [200, [1, 1, 1], [66.67, 66.67, 66.66]],
      [100.5, [1, 99], [1.01, 99.49]],
      [100, [99, 1], [99, 1]],
      [0.01, [1, 1], [0.01, 0]],
      [1000, [40, 30, 30], [400, 300, 300]],
      [-100, [1, 1, 1], [-33.34, -33.33, -33.33]],
    ])('allocate(%p, %p) = %p', (total, weights, expected) => {
      expect(allocate(total, weights)).toEqual(expected);
    });

    it('always adds up to the total', () => {
      for (let cents = 1; cents <= 5000; cents++) {
        const parts = allocate(cents / 100, [33.33, 33.33, 33.34]);
        expect(parts.reduce((sum, p) => sum + Math.round(p * 100), 0)).toBe(cents);
      }
    });

    it('returns zeros when there is nothing to weigh by', () => {
      expect(allocate(100, [0, 0])).toEqual([0, 0]);
      expect(allocate(100, [])).toEqual([]);
    });
  });
});
