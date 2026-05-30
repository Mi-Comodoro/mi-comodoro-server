import { resolve } from 'path';

export function getEnvironmentPath(): string {
  // Ahora siempre resuelve el .env en la raíz del proyecto
  return resolve(process.cwd(), '.env');
}
