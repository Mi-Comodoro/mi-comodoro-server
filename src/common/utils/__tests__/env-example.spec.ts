import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * `.env.example` es la fuente única de las variables de entorno (ver AGENTS.md). Esta prueba revisa el
 * código fuente para que una variable nueva sin documentar, o una documentada que ya nadie lee, falle en el CI.
 */
const SRC = join(__dirname, '../../..');
const ENV_EXAMPLE = join(SRC, '..', '.env.example');

// Variables que pone el entorno de ejecución y no se configuran a mano.
const PLATFORM_VARIABLES = new Set(['NODE_ENV']);

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return entry === '__tests__' ? [] : sourceFiles(path);
    return path.endsWith('.ts') && !path.endsWith('.spec.ts') ? [path] : [];
  });

// process.env.X, env.X (parámetro de las funciones de configuración), env['X'], Joi `X: Joi.…`
const CODE_PATTERNS = [
  /\b(?:process\.)?env\.([A-Z][A-Z0-9_]+)\b/g,
  /\benv\[['"]([A-Z][A-Z0-9_]+)['"]\]/g,
  /\b([A-Z][A-Z0-9_]+):\s*Joi\./g,
];

const variablesInCode = (): Set<string> => {
  const found = new Set<string>();
  for (const file of sourceFiles(SRC)) {
    const content = readFileSync(file, 'utf8');
    for (const pattern of CODE_PATTERNS) {
      for (const match of content.matchAll(pattern)) found.add(match[1]);
    }
  }
  return found;
};

// Líneas "VARIABLE=valor" o "# VARIABLE=valor" (las opcionales van comentadas)
const variablesInExample = (): Set<string> => {
  const names = new Set<string>();
  for (const line of readFileSync(ENV_EXAMPLE, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^#?\s*([A-Z][A-Z0-9_]+)=/);
    if (match) names.add(match[1]);
  }
  return names;
};

describe('.env.example', () => {
  it('existe', () => {
    expect(existsSync(ENV_EXAMPLE)).toBe(true);
  });

  it('documenta todas las variables que lee el código', () => {
    const documented = variablesInExample();
    const missing = [...variablesInCode()].filter(
      (name) => !PLATFORM_VARIABLES.has(name) && !documented.has(name),
    );
    expect(missing.sort()).toEqual([]);
  });

  it('no documenta variables que el código ya no lee', () => {
    const inCode = variablesInCode();
    const stale = [...variablesInExample()].filter((name) => !inCode.has(name));
    expect(stale.sort()).toEqual([]);
  });
});
