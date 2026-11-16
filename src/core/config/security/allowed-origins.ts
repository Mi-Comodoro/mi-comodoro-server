/**
 * Orígenes permitidos para CORS (HTTP y WebSocket).
 *
 * - `local`: permite cualquier origen (solo desarrollo en máquina del dev).
 * - Resto de entornos: lista blanca = FRONTEND_URL (separada por comas) + dominios productivos.
 *
 * Se evalúa en cada petición (no al importar el módulo) para no depender
 * del orden de carga de las variables de entorno.
 */
const PRODUCTION_ORIGINS = ['https://app.micomodoro.com', 'https://micomodoro.com'];

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
  if (process.env.NODE_ENV === 'local') return true;
  return getAllowedOrigins().includes(origin);
};

export const corsOriginResolver = (
  origin: string | undefined,
  callback: (error: Error | null, allow?: boolean) => void,
): void => {
  callback(null, isOriginAllowed(origin));
};
