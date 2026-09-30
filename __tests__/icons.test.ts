// Every icon name used in new code must exist in the icon font, or the
// icon silently renders as "?" on the phone.
import fs from 'fs';
import path from 'path';
import { expect, it } from '@jest/globals';
import glyphs from 'react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json';

const DIRS = ['src/ui', 'src/features', 'src/navigation', 'src/dev', 'src/app'];

function files(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return files(full);
    return /\.(tsx?)$/.test(entry.name) ? [full] : [];
  });
}

it('uses only icon names that exist', () => {
  const missing: string[] = [];
  const pattern = /\b(?:icon|name)[=:]\s*\{?\s*['"]([a-z0-9-]+)['"]/g;
  for (const file of DIRS.flatMap(d => files(path.join(__dirname, '..', d)))) {
    const text = fs.readFileSync(file, 'utf8');
    for (const match of text.matchAll(pattern)) {
      const name = match[1];
      // `name:` also matches object keys like name: 'Cash'; only check icon-like ones.
      if (/-/.test(name) || name in glyphs) continue;
      if (/^[a-z]+$/.test(name) && !(name in glyphs) && /icon[=:]/.test(match[0])) missing.push(`${path.relative(process.cwd(), file)}: ${name}`);
    }
    for (const match of text.matchAll(/\bicon[=:]\s*\{?\s*['"]([a-z0-9-]+)['"]/g)) {
      if (!(match[1] in glyphs)) missing.push(`${path.relative(process.cwd(), file)}: ${match[1]}`);
    }
    for (const match of text.matchAll(/<Icon\s+name=["']([a-z0-9-]+)["']/g)) {
      if (!(match[1] in glyphs)) missing.push(`${path.relative(process.cwd(), file)}: ${match[1]}`);
    }
  }
  expect([...new Set(missing)]).toEqual([]);
});
