import { readFileSync } from 'fs';

export function readFixtureSync(path: string) {
  return readFileSync(`./fixtures/${path}`, { encoding: 'utf8' });
}
