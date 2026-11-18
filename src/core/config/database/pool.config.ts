/**
 * Pool de conexiones y tiempos límite de PostgreSQL, ajustables por variables de entorno.
 *
 * Regla de dimensionamiento: instancias × DB_POOL_MAX ≤ ~80 % de max_connections de Postgres
 * (el resto lo usan migraciones, respaldos y administración). Con una instancia y el valor por
 * defecto (10) sobra margen; al escalar a varias instancias o a un Postgres administrado conviene
 * poner PgBouncer delante en modo transacción.
 */
export interface PoolEnvironment {
  [key: string]: string | undefined;
}

const intFrom = (value: string | undefined, fallback: number, min: number, max: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return fallback;
  return parsed;
};

const boolFrom = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined || value.trim() === '') return fallback;
  return ['true', '1', 'yes'].includes(value.trim().toLowerCase());
};

export const buildPoolOptions = (env: PoolEnvironment = process.env) => {
  const isProduction = env.NODE_ENV === 'production';

  return {
    extra: {
      // Conexiones máximas por proceso (node-postgres usa 10 por defecto; aquí queda explícito)
      max: intFrom(env.DB_POOL_MAX, 10, 1, 200),
      // Cierra conexiones ociosas y falla rápido si no hay conexión libre, en vez de colgar la petición
      idleTimeoutMillis: intFrom(env.DB_POOL_IDLE_TIMEOUT_MS, 30_000, 1_000, 600_000),
      connectionTimeoutMillis: intFrom(env.DB_CONNECTION_TIMEOUT_MS, 5_000, 500, 60_000),
      keepAlive: true,
      application_name: 'mi-comodoro-server',
      // Una consulta que tarda más de esto se cancela (consulta desbocada, falta de índice, etc.)
      statement_timeout: intFrom(env.DB_STATEMENT_TIMEOUT_MS, 30_000, 1_000, 600_000),
      // Espera máxima por un bloqueo (p. ej. el del presupuesto en gastos y aportes simultáneos)
      lock_timeout: intFrom(env.DB_LOCK_TIMEOUT_MS, 10_000, 500, 120_000),
      // Libera conexiones que quedaron dentro de una transacción abierta sin actividad
      idle_in_transaction_session_timeout: intFrom(
        env.DB_IDLE_IN_TRANSACTION_TIMEOUT_MS,
        30_000,
        1_000,
        600_000,
      ),
    },
    // Registra en el log las consultas más lentas que este umbral
    maxQueryExecutionTime: intFrom(env.DB_SLOW_QUERY_MS, 1_000, 50, 60_000),
    ssl: boolFrom(env.DB_SSL, false)
      ? { rejectUnauthorized: boolFrom(env.DB_SSL_REJECT_UNAUTHORIZED, true) }
      : false,
    // En producción las migraciones se aplican en el despliegue (pnpm migration:run), no al arrancar:
    // con varias instancias o reinicios simultáneos competirían entre sí. En local sigue siendo automático.
    migrationsRun: boolFrom(env.DB_MIGRATIONS_RUN, !isProduction),
  };
};
