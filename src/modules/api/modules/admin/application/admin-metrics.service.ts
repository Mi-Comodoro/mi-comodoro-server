import { Injectable } from '@nestjs/common';
import {
  addDays,
  addMonths,
  addWeeks,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from 'date-fns';
import { DataSource } from 'typeorm';

import { LoggerProviderService } from '@/core/providers';

type Period = '30d' | '90d' | '12m';

@Injectable()
export class AdminMetricsService {
  private readonly context = AdminMetricsService.name;

  constructor(
    private readonly dataSource: DataSource,
    private readonly logger: LoggerProviderService,
  ) {}

  async getUserGrowth(period: Period) {
    this.logger.info(this.context, `Obteniendo crecimiento de usuarios para el período ${period}`);

    const now = new Date();
    let interval: string;
    let start: Date;
    let previousStart: Date;

    if (period === '30d') {
      interval = 'day';
      start = subDays(now, 30);
      previousStart = subDays(now, 60);
    } else if (period === '90d') {
      interval = 'week';
      start = subDays(now, 90);
      previousStart = subDays(now, 180);
    } else {
      interval = 'month';
      start = subMonths(now, 12);
      previousStart = subMonths(now, 24);
    }

    const [rows, prevResult, baseResult] = await Promise.all([
      this.dataSource.query<{ bucket: string; count: string }[]>(
        `SELECT DATE_TRUNC($1, u."created_at") AS bucket, COUNT(*) AS count
         FROM users u
         WHERE u."created_at" >= $2 AND u.nulled_at IS NULL
         GROUP BY bucket
         ORDER BY bucket ASC`,
        [interval, start],
      ),
      this.dataSource.query<[{ count: string }]>(
        `SELECT COUNT(*) AS count FROM users
         WHERE "created_at" >= $1 AND "created_at" < $2 AND nulled_at IS NULL`,
        [previousStart, start],
      ),
      this.dataSource.query<[{ count: string }]>(
        `SELECT COUNT(*) AS count FROM users
         WHERE "created_at" < $1 AND nulled_at IS NULL`,
        [start],
      ),
    ]);

    const rowMap = new Map<string, number>();
    for (const row of rows) {
      rowMap.set(this.bucketKey(new Date(row.bucket), interval), Number(row.count));
    }

    const buckets = this.generateBuckets(period, start, now, interval);
    let cumulative = Number(baseResult[0].count);
    const data = buckets.map((date) => {
      const newUsers = rowMap.get(this.bucketKey(date, interval)) ?? 0;
      cumulative += newUsers;
      return { date: date.toISOString(), newUsers, cumulative };
    });

    const total = data.reduce((acc, d) => acc + d.newUsers, 0);
    const prevTotal = Number(prevResult[0].count);
    const growthRate =
      prevTotal === 0 ? 100 : Math.round(((total - prevTotal) / prevTotal) * 10000) / 100;

    return {
      period,
      data,
      summary: {
        total,
        periodStart: start.toISOString(),
        periodEnd: now.toISOString(),
        growthRate,
      },
    };
  }

  async getSummary() {
    this.logger.info(this.context, 'Obteniendo resumen de métricas admin');

    const now = new Date();
    const startOfCurrentMonth = startOfMonth(now);
    const startOfLastMonth = subMonths(startOfCurrentMonth, 1);

    const [
      totalResult,
      activeThisMonthResult,
      activeLastMonthResult,
      accountTypesResult,
      activeBudgetsResult,
      newThisMonthResult,
      newLastMonthResult,
      newPayingThisMonthResult,
      newPayingLastMonthResult,
    ] = await Promise.all([
      this.dataSource.query<[{ count: string }]>(
        `SELECT COUNT(*) AS count FROM users WHERE nulled_at IS NULL`,
      ),
      this.dataSource.query<[{ count: string }]>(
        `SELECT COUNT(DISTINCT user_id) AS count FROM transactions
         WHERE "created_at" >= $1 AND nulled_at IS NULL`,
        [startOfCurrentMonth],
      ),
      this.dataSource.query<[{ count: string }]>(
        `SELECT COUNT(DISTINCT user_id) AS count FROM transactions
         WHERE "created_at" >= $1 AND "created_at" < $2 AND nulled_at IS NULL`,
        [startOfLastMonth, startOfCurrentMonth],
      ),
      this.dataSource.query<{ type: string; count: string }[]>(
        `SELECT up.type, COUNT(*) AS count
         FROM user_profile up
         JOIN users u ON u.id = up.user_id
         WHERE u.nulled_at IS NULL
         GROUP BY up.type`,
      ),
      this.dataSource.query<[{ count: string }]>(
        `SELECT COUNT(*) AS count FROM budgets WHERE nulled_at IS NULL`,
      ),
      this.dataSource.query<[{ count: string }]>(
        `SELECT COUNT(*) AS count FROM users
         WHERE "created_at" >= $1 AND nulled_at IS NULL`,
        [startOfCurrentMonth],
      ),
      this.dataSource.query<[{ count: string }]>(
        `SELECT COUNT(*) AS count FROM users
         WHERE "created_at" >= $1 AND "created_at" < $2 AND nulled_at IS NULL`,
        [startOfLastMonth, startOfCurrentMonth],
      ),
      this.dataSource.query<[{ count: string }]>(
        `SELECT COUNT(*) AS count
         FROM user_profile up JOIN users u ON u.id = up.user_id
         WHERE up.type IN ('PLUS', 'PRO', 'PARTNER')
           AND u."created_at" >= $1 AND u.nulled_at IS NULL`,
        [startOfCurrentMonth],
      ),
      this.dataSource.query<[{ count: string }]>(
        `SELECT COUNT(*) AS count
         FROM user_profile up JOIN users u ON u.id = up.user_id
         WHERE up.type IN ('PLUS', 'PRO', 'PARTNER')
           AND u."created_at" >= $1 AND u."created_at" < $2 AND u.nulled_at IS NULL`,
        [startOfLastMonth, startOfCurrentMonth],
      ),
    ]);

    const totalUsers = Number(totalResult[0].count);
    const activeThisMonth = Number(activeThisMonthResult[0].count);
    const activeLastMonth = Number(activeLastMonthResult[0].count);
    const activeBudgets = Number(activeBudgetsResult[0].count);
    const newThisMonth = Number(newThisMonthResult[0].count);
    const newLastMonth = Number(newLastMonthResult[0].count);
    const newPayingThisMonth = Number(newPayingThisMonthResult[0].count);
    const newPayingLastMonth = Number(newPayingLastMonthResult[0].count);

    const accountTypeMap = new Map(accountTypesResult.map((r) => [r.type, Number(r.count)]));
    const trialUsers = accountTypeMap.get('TRIAL') ?? 0;
    const payingUsers =
      (accountTypeMap.get('PLUS') ?? 0) +
      (accountTypeMap.get('PRO') ?? 0) +
      (accountTypeMap.get('PARTNER') ?? 0);

    const conversionRate =
      trialUsers + payingUsers === 0
        ? 0
        : Math.round((payingUsers / (trialUsers + payingUsers)) * 10000) / 100;

    return {
      totalUsers,
      activeThisMonth,
      trialUsers,
      payingUsers,
      conversionRate,
      activeBudgets,
      deltas: {
        totalUsers: newThisMonth - newLastMonth,
        activeThisMonth: activeThisMonth - activeLastMonth,
        trialUsers: newThisMonth - newLastMonth,
        payingUsers: newPayingThisMonth - newPayingLastMonth,
      },
    };
  }

  private generateBuckets(period: Period, start: Date, end: Date, interval: string): Date[] {
    const buckets: Date[] = [];
    let current: Date;

    if (interval === 'day') {
      current = startOfDay(start);
      while (current <= end) {
        buckets.push(new Date(current));
        current = addDays(current, 1);
      }
    } else if (interval === 'week') {
      current = startOfWeek(start, { weekStartsOn: 1 });
      while (current <= end) {
        buckets.push(new Date(current));
        current = addWeeks(current, 1);
      }
    } else {
      current = startOfMonth(start);
      while (current <= end) {
        buckets.push(new Date(current));
        current = addMonths(current, 1);
      }
    }

    return buckets;
  }

  private bucketKey(date: Date, interval: string): string {
    if (interval === 'week') return format(date, "yyyy-'W'ww");
    if (interval === 'month') return format(date, 'yyyy-MM');
    return format(date, 'yyyy-MM-dd');
  }
}
