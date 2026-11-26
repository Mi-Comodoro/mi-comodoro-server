#!/usr/bin/env node
/**
 * Verifica la configuración de agentes:
 *  - `.claude/agents` es idéntico a `.agents/agents` (la copia la hace `pnpm agents:sync`).
 *  - Cada agente tiene `name` (igual al nombre del archivo) y `description` en el frontmatter.
 *  - Cada skill (si existe) vive en `<nombre>/SKILL.md` con `name` igual a su carpeta.
 *  - AGENTS.md no supera el tamaño máximo, para que se pueda cargar siempre en contexto.
 *
 * Sale con código 1 si algo falla. Uso: `pnpm agents:check`.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const MAX_AGENTS_MD_KB = 10;
const errors = [];

const frontmatter = (text) => {
  const match = text.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  return Object.fromEntries(
    match[1]
      .split('\n')
      .map((line) => line.match(/^([\w-]+):\s*(.*)$/))
      .filter(Boolean)
      .map(([, key, value]) => [key, value.trim()]),
  );
};

const normalized = (file) => readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const list = (dir) => (existsSync(dir) ? readdirSync(dir).sort() : []);

// Agentes: contenido y espejo
const agentsDir = join(root, '.agents/agents');
for (const file of list(agentsDir).filter((f) => f.endsWith('.md'))) {
  const data = frontmatter(normalized(join(agentsDir, file)));
  const expected = file.replace(/\.md$/, '');
  if (!data?.name || !data?.description) errors.push(`${file}: falta name o description`);
  else if (data.name !== expected)
    errors.push(`${file}: name "${data.name}" no coincide con el archivo`);
}

// Skills: carpeta con SKILL.md y name igual a la carpeta
const skillsDir = join(root, '.agents/skills');
for (const dir of list(skillsDir).filter((d) => statSync(join(skillsDir, d)).isDirectory())) {
  const skillFile = join(skillsDir, dir, 'SKILL.md');
  if (!existsSync(skillFile)) {
    errors.push(`skills/${dir}: falta SKILL.md`);
    continue;
  }
  const data = frontmatter(normalized(skillFile));
  if (data?.name !== dir)
    errors.push(`skills/${dir}: name "${data?.name}" no coincide con la carpeta`);
  if (!data?.description) errors.push(`skills/${dir}: falta description`);
}

// Espejo .agents -> .claude
for (const [from, to] of [
  ['.agents/agents', '.claude/agents'],
  ['.agents/skills', '.claude/skills'],
]) {
  if (!existsSync(join(root, from))) continue;
  if (!existsSync(join(root, to))) {
    errors.push(`${to} no existe: ejecutar pnpm agents:sync`);
    continue;
  }
  const walk = (dir, base = '') =>
    list(dir).flatMap((name) => {
      const rel = join(base, name);
      return statSync(join(dir, name)).isDirectory() ? walk(join(dir, name), rel) : [rel];
    });
  const source = walk(join(root, from));
  for (const rel of source) {
    const copy = join(root, to, rel);
    if (!existsSync(copy)) errors.push(`${to}/${rel} no existe: ejecutar pnpm agents:sync`);
    else if (normalized(copy) !== normalized(join(root, from, rel))) {
      errors.push(`${to}/${rel} difiere de ${from}/${rel}: ejecutar pnpm agents:sync`);
    }
  }
}

// Tamaño de AGENTS.md
const sizeKb = statSync(join(root, 'AGENTS.md')).size / 1024;
if (sizeKb > MAX_AGENTS_MD_KB) {
  errors.push(
    `AGENTS.md pesa ${sizeKb.toFixed(1)} KB (máximo ${MAX_AGENTS_MD_KB} KB): mover detalle a docs/`,
  );
}

if (errors.length) {
  console.error('[agents:check] Problemas encontrados:');
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`[agents:check] OK (AGENTS.md ${sizeKb.toFixed(1)} KB)`);
