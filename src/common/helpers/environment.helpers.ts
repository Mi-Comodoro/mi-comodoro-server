import { resolve } from 'path';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Staging = 'staging',
  Test = 'test',
}

export function getEnvironmentPath(dest: string): string {
  const filename: string = resolve(`${dest}/.env`);
  return filename;
}
