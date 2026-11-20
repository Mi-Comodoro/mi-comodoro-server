import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';

import { LoggerProviderService } from '@/core/providers';

import { DataExportService } from '../data-export.service';

const mockDataSource = { query: jest.fn() };
const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };

describe('DataExportService', () => {
  let service: DataExportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataExportService,
        { provide: getDataSourceToken(), useValue: mockDataSource },
        { provide: LoggerProviderService, useValue: mockLogger },
      ],
    }).compile();
    service = module.get(DataExportService);
    jest.clearAllMocks();
    mockDataSource.query.mockResolvedValue([{ data: [] }]);
  });

  const allSql = () =>
    mockDataSource.query.mock.calls.map((call) => String(call[0]).replace(/\s+/g, ' ')).join('\n');

  it('devuelve todas las secciones con la información de la exportación', async () => {
    const result = await service.export('user-1');

    expect(result.info).toMatchObject({ formatVersion: 1 });
    expect(new Date(result.info.generatedAt).getTime()).not.toBeNaN();
    for (const key of [
      'account',
      'profile',
      'settings',
      'consents',
      'sessions',
      'accounts',
      'budgets',
      'transactions',
      'goals',
      'bills',
      'accountsPayable',
      'accountsReceivable',
      'friendships',
      'notifications',
      'groups',
      'groupExpenses',
      'groupContributions',
      'travelExpenses',
    ]) {
      expect(result).toHaveProperty(key);
    }
  });

  it('todas las consultas se limitan a la persona (parámetro $1) y ninguna es genérica', async () => {
    await service.export('user-1');

    for (const call of mockDataSource.query.mock.calls) {
      expect(String(call[0])).toContain('$1');
      expect(call[1]).toEqual(['user-1']);
    }
  });

  it('no incluye la contraseña ni los hash de los tokens de sesión', async () => {
    await service.export('user-1');

    const sql = allSql();
    // La cuenta se pide con columnas explícitas, sin password
    expect(sql).toMatch(/SELECT id, email, provider, handle, role, onboarding, timezone/);
    expect(sql).not.toMatch(/\bpassword\b/i);
    // Las sesiones no traen token_hash
    expect(sql).toContain(
      'SELECT id, user_agent, created_at, expires_at, revoked_at FROM refresh_tokens',
    );
    expect(sql).not.toMatch(/token_hash/i);
  });

  it('de otras personas solo expone el identificador interno, nunca el correo ni el nombre', async () => {
    await service.export('user-1');

    const friendships = mockDataSource.query.mock.calls
      .map((call) => String(call[0]).replace(/\s+/g, ' '))
      .find((sql) => sql.includes('FROM friendships'));
    expect(friendships).toContain('other_user_id');
    expect(friendships).not.toMatch(/email|display_name|name/i);
  });
});
