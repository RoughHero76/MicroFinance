// Dev-only syntax checker. Uses the project's real @babel/core (7.x, same as
// Metro) and its babel.config.js, so it reflects what the app actually compiles.
// Usage: node _syntax_check.js <file> [more files...]
const path = require('path');
const babel = require('@babel/core');

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('pass at least one file path');
  process.exit(2);
}

let failed = 0;
for (const f of files) {
  const abs = path.resolve(f);
  try {
    babel.transformFileSync(abs, { configFile: path.resolve('babel.config.js') });
    console.log('OK   ' + f);
  } catch (e) {
    failed++;
    console.log('FAIL ' + f);
    console.log('     ' + (e.message || e).toString().split('\n').slice(0, 8).join('\n     '));
  }
}
process.exit(failed ? 1 : 0);
