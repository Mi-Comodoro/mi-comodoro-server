import { buildPoolOptions } from '../pool.config';

describe('buildPoolOptions', () => {
  it('usa valores seguros por defecto y deja el pool explícito', () => {
    const options = buildPoolOptions({});

    expect(options.extra).toMatchObject({
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      statement_timeout: 30_000,
      lock_timeout: 10_000,
      idle_in_transaction_session_timeout: 30_000,
      application_name: 'mi-comodoro-server',
      keepAlive: true,
    });
    expect(options.maxQueryExecutionTime).toBe(1_000);
    expect(options.ssl).toBe(false);
  });

  it('aplica los valores de las variables de entorno', () => {
    const options = buildPoolOptions({
      DB_POOL_MAX: '25',
      DB_STATEMENT_TIMEOUT_MS: '15000',
      DB_LOCK_TIMEOUT_MS: '3000',
      DB_CONNECTION_TIMEOUT_MS: '2000',
      DB_SLOW_QUERY_MS: '500',
    });

    expect(options.extra.max).toBe(25);
    expect(options.extra.statement_timeout).toBe(15_000);
    expect(options.extra.lock_timeout).toBe(3_000);
    expect(options.extra.connectionTimeoutMillis).toBe(2_000);
    expect(options.maxQueryExecutionTime).toBe(500);
  });

  it('ignora valores inválidos o fuera de rango y vuelve al valor por defecto', () => {
    const options = buildPoolOptions({
      DB_POOL_MAX: 'muchos',
      DB_STATEMENT_TIMEOUT_MS: '-5',
      DB_LOCK_TIMEOUT_MS: '99999999',
      DB_CONNECTION_TIMEOUT_MS: '',
    });

    expect(options.extra.max).toBe(10);
    expect(options.extra.statement_timeout).toBe(30_000);
    expect(options.extra.lock_timeout).toBe(10_000);
    expect(options.extra.connectionTimeoutMillis).toBe(5_000);
  });

  it('activa SSL con verificación de certificado por defecto', () => {
    expect(buildPoolOptions({ DB_SSL: 'true' }).ssl).toEqual({ rejectUnauthorized: true });
    expect(buildPoolOptions({ DB_SSL: 'true', DB_SSL_REJECT_UNAUTHORIZED: 'false' }).ssl).toEqual({
      rejectUnauthorized: false,
    });
  });

  it('las migraciones corren al arrancar solo fuera de producción, salvo que se indique otra cosa', () => {
    expect(buildPoolOptions({ NODE_ENV: 'development' }).migrationsRun).toBe(true);
    expect(buildPoolOptions({}).migrationsRun).toBe(true);
    expect(buildPoolOptions({ NODE_ENV: 'production' }).migrationsRun).toBe(false);
    expect(
      buildPoolOptions({ NODE_ENV: 'production', DB_MIGRATIONS_RUN: 'true' }).migrationsRun,
    ).toBe(true);
    expect(
      buildPoolOptions({ NODE_ENV: 'development', DB_MIGRATIONS_RUN: 'false' }).migrationsRun,
    ).toBe(false);
  });
});
