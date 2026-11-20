import { fromZonedTime, toZonedTime } from 'date-fns-tz';

export function getUserMonth(date: Date, timezone: string): { year: number; month: number } {
  const local = toZonedTime(date, timezone);
  return { year: local.getFullYear(), month: local.getMonth() + 1 };
}

export function getMonthRangeUTC(
  year: number,
  month: number,
  timezone: string,
): { start: Date; end: Date } {
  return {
    start: fromZonedTime(new Date(year, month - 1, 1, 0, 0, 0), timezone),
    end: fromZonedTime(new Date(year, month, 0, 23, 59, 59, 999), timezone),
  };
}

export function getBillingDateUTC(
  billingDay: number,
  year: number,
  month: number,
  timezone: string,
): Date {
  const lastDay = new Date(year, month, 0).getDate();
  const day = Math.min(billingDay, lastDay);
  return fromZonedTime(new Date(year, month - 1, day, 9, 0, 0), timezone);
}
