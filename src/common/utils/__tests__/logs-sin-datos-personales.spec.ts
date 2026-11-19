import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Los logs no deben contener datos personales directos (correo, teléfono, nombre, usuario, contraseñas,
 * tokens ni búsquedas). El identificador interno (UUID) sí se permite: no identifica a nadie por sí solo.
 * Esta prueba revisa el código fuente para que un log nuevo con esos datos falle en el CI.
 */
const SRC = join(__dirname, '../../..');

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return entry === '__tests__' ? [] : sourceFiles(path);
    return path.endsWith('.ts') && !path.endsWith('.spec.ts') ? [path] : [];
  });

// Llamadas al logger: logger.info( ... ); incluso en varias líneas
const LOGGER_CALL = /\blogger\.(?:info|log|warn|error|debug|verbose)\(([\s\S]*?)\);/g;
// Interpolaciones ${...} que mencionan un dato personal, o un literal como "email=..."
const PERSONAL_IN_TEMPLATE =
  /\$\{[^}]*\b(email|phone|telefono|handle|displayName|password|passwordHash|refreshToken|idToken|query)\b[^}]*\}/i;
const PERSONAL_LITERAL = /\b(email|phone|password|token)=/i;

describe('logs sin datos personales', () => {
  const offenders: string[] = [];

  for (const file of sourceFiles(SRC)) {
    const content = readFileSync(file, 'utf8');
    for (const match of content.matchAll(LOGGER_CALL)) {
      const call = match[1];
      if (PERSONAL_IN_TEMPLATE.test(call) || PERSONAL_LITERAL.test(call)) {
        const line = content.slice(0, match.index).split('\n').length;
        offenders.push(`${file.replace(SRC, 'src')}:${line}`);
      }
    }
  }

  it('ningún log interpola correo, teléfono, usuario, contraseñas, tokens ni búsquedas', () => {
    expect(offenders).toEqual([]);
  });
});
