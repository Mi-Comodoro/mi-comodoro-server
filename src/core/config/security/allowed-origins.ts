/**
 * Orígenes permitidos para CORS (HTTP y WebSocket).
 *
 * - `local` y `development`: se permite cualquier origen (por ahora el front de dev
 *   no tiene un dominio fijo). FRONTEND_URL no es obligatoria en estos entornos.
 * - `production`: lista blanca = FRONTEND_URL (separada por comas) + dominios productivos.
 *   FRONTEND_URL es obligatoria (se valida al arrancar, ver AppConfigModule).
 *
 * Se evalúa en cada petición (no al importar el módulo) para no depender
 * del orden de carga de las variables de entorno.
 */
const PRODUCTION_ORIGINS = ['https://app.micomodoro.com', 'https://micomodoro.com'];
const OPEN_ENVIRONMENTS = ['local', 'development'];

const getAllowedOrigins = (): string[] => {
  const fromEnv = (process.env.FRONTEND_URL ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return [...new Set([...fromEnv, ...PRODUCTION_ORIGINS])];
};

export const isOriginAllowed = (origin?: string): boolean => {
  // Peticiones sin cabecera Origin (server-to-server, curl, health checks)
  if (!origin) return true;
  if (OPEN_ENVIRONMENTS.includes(process.env.NODE_ENV ?? '')) return true;
  return getAllowedOrigins().includes(origin);
};

export const corsOriginResolver = (
  origin: string | undefined,
  callback: (error: Error | null, allow?: boolean) => void,
): void => {
  callback(null, isOriginAllowed(origin));
};
