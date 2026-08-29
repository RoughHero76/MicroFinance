/* One-off dev helper: point every `react-native-vector-icons` import at our
 * design-system Icon (default export) while preserving the local binding name.
 * Deleted before handoff. */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const ICON_TARGET = path.join(ROOT, 'src', 'design', 'Icon');

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) yield full;
  }
}

const RE = /import\s+([A-Za-z_$][\w$]*)\s+from\s+['"]react-native-vector-icons\/(MaterialCommunityIcons|MaterialIcons)['"]/;

let changed = 0;
for (const file of walk(path.join(ROOT, 'src'))) {
  const src = fs.readFileSync(file, 'utf8');
  if (!src.includes('react-native-vector-icons')) continue;
  const m = src.match(RE);
  if (!m) {
    console.log('SKIP (non-import ref):', path.relative(ROOT, file));
    continue;
  }
  const binding = m[1];
  const rel = path.relative(path.dirname(file), ICON_TARGET).split(path.sep).join('/');
  const next = src.replace(RE, `import ${binding} from '${rel}';`);
  if (next !== src) {
    fs.writeFileSync(file, next);
    console.log(`OK   ${path.relative(ROOT, file)}  ->  import ${binding} from '${rel}'`);
    changed++;
  }
}
console.log(`\nDone. ${changed} file(s) updated.`);
