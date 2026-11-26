import { roundMoney } from '../money.helpers';

describe('roundMoney', () => {
  it.each([
    [1.005, 1.01],
    [2.675, 2.68],
    [-1.005, -1.01],
    [-2.675, -2.68],
    [0.1 + 0.2, 0.3],
    [100 / 3, 33.33],
    [200 / 3, 66.67],
    [10, 10],
    [0, 0],
  ])('roundMoney(%p) = %p', (input, expected) => {
    expect(roundMoney(input)).toBe(expected);
  });

  it('normalizes -0 to 0', () => {
    expect(Object.is(roundMoney(-0), 0)).toBe(true);
    expect(Object.is(roundMoney(-0.001), 0)).toBe(true);
  });

  it('returns NaN and Infinity unchanged', () => {
    expect(roundMoney(NaN)).toBeNaN();
    expect(roundMoney(Infinity)).toBe(Infinity);
    expect(roundMoney(-Infinity)).toBe(-Infinity);
  });
});
