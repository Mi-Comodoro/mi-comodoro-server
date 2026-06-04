import { getBillingDateUTC, getMonthRangeUTC, getUserMonth } from '../timezone.utils';

describe('getUserMonth', () => {
  it('returns correct year and month for UTC timezone', () => {
    const date = new Date('2024-06-15T12:00:00Z');
    expect(getUserMonth(date, 'UTC')).toEqual({ year: 2024, month: 6 });
  });

  it('shifts month back when UTC time is early morning and TZ is behind UTC', () => {
    // 2024-03-01T01:00:00Z is still Feb 29 in America/Bogota (UTC-5)
    const date = new Date('2024-03-01T01:00:00Z');
    expect(getUserMonth(date, 'America/Bogota')).toEqual({ year: 2024, month: 2 });
  });

  it('shifts month forward when UTC time is late night and TZ is ahead of UTC', () => {
    // 2024-03-31T22:30:00Z is April 1 in Asia/Tokyo (UTC+9 → 07:30 next day)
    const date = new Date('2024-03-31T22:30:00Z');
    expect(getUserMonth(date, 'Asia/Tokyo')).toEqual({ year: 2024, month: 4 });
  });

  it('returns month 1 for January', () => {
    const date = new Date('2024-01-15T10:00:00Z');
    expect(getUserMonth(date, 'UTC')).toEqual({ year: 2024, month: 1 });
  });

  it('returns month 12 for December', () => {
    const date = new Date('2024-12-20T10:00:00Z');
    expect(getUserMonth(date, 'UTC')).toEqual({ year: 2024, month: 12 });
  });
});

describe('getMonthRangeUTC', () => {
  it('returns the correct UTC start of month for UTC timezone', () => {
    const { start } = getMonthRangeUTC(2024, 3, 'UTC');
    expect(start.toISOString()).toBe('2024-03-01T00:00:00.000Z');
  });

  it('returns the correct UTC end of month for UTC timezone', () => {
    const { end } = getMonthRangeUTC(2024, 3, 'UTC');
    expect(end.toISOString()).toBe('2024-03-31T23:59:59.999Z');
  });

  it('offsets start to UTC+5 for America/Bogota (UTC-5) in January', () => {
    const { start } = getMonthRangeUTC(2024, 1, 'America/Bogota');
    // Midnight Jan 1 in Bogota (UTC-5) = 05:00 Jan 1 UTC
    expect(start.toISOString()).toBe('2024-01-01T05:00:00.000Z');
  });

  it('handles February correctly for leap year', () => {
    const { end } = getMonthRangeUTC(2024, 2, 'UTC');
    // 2024 is a leap year → Feb has 29 days
    expect(end.getUTCDate()).toBe(29);
  });

  it('handles February correctly for non-leap year', () => {
    const { end } = getMonthRangeUTC(2023, 2, 'UTC');
    expect(end.getUTCDate()).toBe(28);
  });
});

describe('getBillingDateUTC', () => {
  it('places billing date at 09:00 local time (UTC)', () => {
    const result = getBillingDateUTC(15, 2024, 3, 'UTC');
    expect(result.getUTCDate()).toBe(15);
    expect(result.getUTCHours()).toBe(9);
    expect(result.getUTCMonth()).toBe(2); // March = index 2
  });

  it('clamps billing day 31 to 29 for February in a leap year', () => {
    const result = getBillingDateUTC(31, 2024, 2, 'UTC');
    expect(result.getUTCDate()).toBe(29);
  });

  it('clamps billing day 31 to 28 for February in a non-leap year', () => {
    const result = getBillingDateUTC(31, 2023, 2, 'UTC');
    expect(result.getUTCDate()).toBe(28);
  });

  it('does not clamp when billing day is within the month', () => {
    const result = getBillingDateUTC(15, 2024, 4, 'UTC');
    expect(result.getUTCDate()).toBe(15);
  });

  it('clamps day 31 to 30 for April (30-day month)', () => {
    const result = getBillingDateUTC(31, 2024, 4, 'UTC');
    expect(result.getUTCDate()).toBe(30);
  });
});
