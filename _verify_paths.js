/* temp verify: ensure no vector-icons imports remain + every design/Icon path resolves */
const fs = require('fs');
const path = require('path');
function* walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const f = path.join(d, e.name);
    if (e.isDirectory()) yield* walk(f);
    else if (/\.(js|jsx|ts|tsx)$/.test(e.name)) yield f;
  }
}
let leftover = [];
let bad = 0;
let checked = 0;
for (const f of walk('src')) {
  const s = fs.readFileSync(f, 'utf8');
  if (/from\s+['"]react-native-vector-icons/.test(s)) leftover.push(f);
  const m = s.match(/import\s+[A-Za-z_$][\w$]*\s+from\s+['"]([^'"]*design\/Icon)['"]/);
  if (!m) continue;
  checked++;
  const target = path.resolve(path.dirname(f), m[1]);
  if (!fs.existsSync(target)) {
    console.log('MISSING:', f, '->', m[1]);
    bad++;
  }
}
console.log('leftover vector-icons imports:', leftover.length ? leftover : 'none');
console.log(`checked ${checked} design/Icon imports; ${bad} broken path(s).`);
