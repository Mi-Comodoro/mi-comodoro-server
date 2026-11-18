import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { MIGRATIONS } from '../migrations.registry';

describe('migrations.registry', () => {
  const files = readdirSync(join(__dirname, '../migrations'))
    .filter((file) => /^\d+-.+\.ts$/.test(file))
    .sort();

  it('registra todas las migraciones que hay en disco, en orden', () => {
    const expected = files.map(
      (file) => file.replace(/\.ts$/, '').split('-')[1] + file.split('-')[0],
    );
    const registered = MIGRATIONS.map((migration) => migration.name);

    expect(registered).toEqual(expected);
  });

  it('no repite migraciones', () => {
    const names = MIGRATIONS.map((migration) => migration.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
