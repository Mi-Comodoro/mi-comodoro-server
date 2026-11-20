import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';

import { LoggerProviderService } from '@/core/providers';

import { AdminMetricsService } from '../admin-metrics.service';

const mockDataSource = { query: jest.fn() };
const mockLogger = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

describe('AdminMetricsService', () => {
  let service: AdminMetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminMetricsService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: LoggerProviderService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<AdminMetricsService>(AdminMetricsService);
    jest.clearAllMocks();
  });

  // ─── getUserGrowth ─────────────────────────────────────────────────────────
  describe('getUserGrowth', () => {
    const mockQueryResults = (rowData: { bucket: string; count: string }[]) => {
      mockDataSource.query
        .mockResolvedValueOnce(rowData) // rows
        .mockResolvedValueOnce([{ count: '5' }]) // prevResult
        .mockResolvedValueOnce([{ count: '10' }]); // baseResult
    };

    it('returns growth data for 30d period', async () => {
      mockQueryResults([]);
      const result = await service.getUserGrowth('30d');
      expect(result.period).toBe('30d');
      expect(result.data).toBeDefined();
      expect(result.summary.growthRate).toBeDefined();
    });

    it('returns growth data for 90d period', async () => {
      mockQueryResults([]);
      const result = await service.getUserGrowth('90d');
      expect(result.period).toBe('90d');
    });

    it('returns growth data for 12m period', async () => {
      mockQueryResults([]);
      const result = await service.getUserGrowth('12m');
      expect(result.period).toBe('12m');
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('calculates cumulative from baseResult', async () => {
      mockQueryResults([]);
      const result = await service.getUserGrowth('30d');
      expect(result.summary.total).toBeGreaterThanOrEqual(0);
    });

    it('sets growthRate to 100 when prevTotal is 0', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([]) // rows
        .mockResolvedValueOnce([{ count: '0' }]) // prevResult = 0
        .mockResolvedValueOnce([{ count: '0' }]); // baseResult
      const result = await service.getUserGrowth('30d');
      expect(result.summary.growthRate).toBe(100);
    });
  });

  // ─── getSummary ────────────────────────────────────────────────────────────
  describe('getSummary', () => {
    it('returns summary with correct calculations', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([{ count: '100' }]) // totalResult
        .mockResolvedValueOnce([{ count: '50' }]) // activeThisMonth
        .mockResolvedValueOnce([{ count: '40' }]) // activeLastMonth
        .mockResolvedValueOnce([
          // accountTypesResult
          { type: 'TRIAL', count: '20' },
          { type: 'PLUS', count: '10' },
          { type: 'PRO', count: '5' },
        ])
        .mockResolvedValueOnce([{ count: '80' }]) // activeBudgets
        .mockResolvedValueOnce([{ count: '15' }]) // newThisMonth
        .mockResolvedValueOnce([{ count: '12' }]) // newLastMonth
        .mockResolvedValueOnce([{ count: '3' }]) // newPayingThisMonth
        .mockResolvedValueOnce([{ count: '2' }]); // newPayingLastMonth

      const result = await service.getSummary();

      expect(result.totalUsers).toBe(100);
      expect(result.activeThisMonth).toBe(50);
      expect(result.trialUsers).toBe(20);
      expect(result.payingUsers).toBe(15); // PLUS + PRO = 10 + 5
      expect(result.activeBudgets).toBe(80);
      expect(result.deltas.totalUsers).toBe(3); // 15 - 12
    });

    it('sets conversionRate to 0 when no trial or paying users', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([{ count: '0' }])
        .mockResolvedValueOnce([{ count: '0' }])
        .mockResolvedValueOnce([{ count: '0' }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: '0' }])
        .mockResolvedValueOnce([{ count: '0' }])
        .mockResolvedValueOnce([{ count: '0' }])
        .mockResolvedValueOnce([{ count: '0' }])
        .mockResolvedValueOnce([{ count: '0' }]);

      const result = await service.getSummary();
      expect(result.conversionRate).toBe(0);
    });
  });
});
