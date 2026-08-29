const fs = require('fs'), path = require('path');
function walk(d, out) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const f = path.join(d, e.name);
        if (e.isDirectory()) { if (e.name !== 'node_modules') walk(f, out); }
        else if (e.name.endsWith('.js') || e.name.endsWith('.jsx')) out.push(f);
    }
}
const files = []; walk('src', files); files.push('App.tsx');
const TOKENS = ['colors', 'tones', 'getStatusTone', 'spacing', 'radii', 'type', 'shadow', 'touchTarget'];
let issues = 0;
for (const f of files) {
    const s = fs.readFileSync(f, 'utf8');
    // strip comments crudely
    const code = s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const t of TOKENS) {
        const used = new RegExp('(?<![\\w$])' + t + '(?=\\s*\\.)').test(code)
            || new RegExp('(?<![\\w$])' + t + '(?=\\s*[},\\)]).*(?=)'.source.slice(0, 0)) !== undefined;
        // simpler: used if identifier appears followed by '.'  (all token usages are member accesses, except imports themselves)
        const usedReal = new RegExp('(?<![\\w$])' + t + '\\s*\\.(?!\\s*\\w*\\s*from)').test(code);
        if (!usedReal) continue;
        const imported =
            /import\s*\{[^}]*\b' + t + '\b[^}]*\}\s*from/.test(code) ||
            /import\s*\*\s*as\s*\b' + t + '\b/.test(code) ||
            /(?:const|let|var)\s*\{[^}]*\b' + t + '\b/.test(code);
        if (!imported) { console.log('MISSING IMPORT: ' + f + ' -> ' + t); issues++; }
    }
}
console.log(issues === 0 ? 'NO MISSING TOKEN IMPORTS' : issues + ' issues');
