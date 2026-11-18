#!/usr/bin/env node
/**
 * Copia (no enlaza) los agentes y skills de `.agents/` a `.claude/` para que
 * Claude Code los cargue. `.agents/` es la fuente de verdad versionada;
 * `.claude/agents` y `.claude/skills` están en .gitignore.
 *
 * Por qué copia y no junction/symlink: con un enlace, un checkout/rebase que
 * elimine archivos antiguos de `.claude/agents` borra los archivos reales de
 * `.agents/` a través del enlace.
 *
 * Es idempotente y nunca falla la instalación (siempre sale con código 0).
 */
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pairs = [
  ['.agents/agents', '.claude/agents'],
  ['.agents/skills', '.claude/skills'],
];

try {
  for (const [from, to] of pairs) {
    const source = join(root, from);
    if (!existsSync(source)) continue;
    const target = join(root, to);
    mkdirSync(target, { recursive: true });
    cpSync(source, target, { recursive: true, force: true });
    console.log(`[agents] ${from} -> ${to}`);
  }
} catch (error) {
  console.warn('[agents] No se pudo sincronizar con .claude:', error.message);
}
