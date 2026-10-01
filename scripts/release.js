#!/usr/bin/env node
// npm run release [patch|minor|major] [options]
//
// Options are plain words so they pass through npm in every shell
// (PowerShell drops the `--` that npm needs for --flags):
//   npm run release patch upload notes="Faster lists; Fix rounding"
//   npm run release upload-only
// `node scripts/release.js --upload --notes "…"` works too.
//
// Works on Windows, macOS and Linux, from any developer machine:
//
// 1. switches the app to the brand (same as `npm run brand <id>`)
// 2. bumps package.json and android/app/build.gradle together
//    (versionName, and versionCode + 1); undone if the build fails
// 3. builds the signed release APK for the brand
// 4. copies it to dist/app-<brand>-<version>.apk and prints its checksum
// 5. with --upload, sends it to the brand's server, which offers it to
//    phones on their next update check (POST /api/shared/app/release)
//
// Options (each also works as --name or --name value):
//   brand=<id>         brand to release (default: the current one)
//   dry-run            only print the next version
//   upload             upload after building
//   upload-only        upload dist/app-<brand>-<version>.apk without building
//                      (e.g. a retry); version=<x.y.z> picks another build
//   mandatory          phones on older versions must update
//   notes="a; b"       "what's new", items separated by ; or new lines
//   replace            overwrite a release with the same version
//
// The upload key (the server's RELEASE_UPLOAD_KEY) comes from the
// RELEASE_UPLOAD_KEY environment variable or release.local.json (not in
// git):  { "evi": { "key": "…", "url": "https://…" } }
// "url" is optional and defaults to the brand's apiUrl.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {spawn} = require('child_process');

const root = path.resolve(__dirname, '..');

// Accepts `upload`, `--upload`, `notes=x`, `--notes x` and `--notes=x`. Older
// npm versions keep unknown --flags to themselves as npm_config_* settings,
// so those are read too.
const VALUE_OPTIONS = ['brand', 'notes', 'version'];
const options = {};
const words = [];
const raw = process.argv.slice(2);
for (let i = 0; i < raw.length; i++) {
  const token = raw[i].replace(/^--?/, '');
  const eq = token.indexOf('=');
  if (eq > 0) {
    options[token.slice(0, eq)] = token.slice(eq + 1);
  } else if (raw[i].startsWith('-') && VALUE_OPTIONS.includes(token) && raw[i + 1] && !raw[i + 1].startsWith('-')) {
    options[token] = raw[++i];
  } else if (raw[i].startsWith('-')) {
    options[token] = true;
  } else {
    words.push(token);
  }
}
const npmSetting = name => {
  const v = process.env[`npm_config_${name.replace(/-/g, '_')}`];
  return v === undefined || v === '' || v === 'false' ? undefined : v;
};
const has = name => !!options[name] || words.includes(name) || !!npmSetting(name);
const value = name => {
  const v = typeof options[name] === 'string' ? options[name] : npmSetting(name);
  return v && v !== 'true' ? v : undefined;
};

const dryRun = has('dry-run');
const uploadOnly = has('upload-only');
const upload = has('upload') || uploadOnly;
const bump = words.find(a => ['patch', 'minor', 'major'].includes(a)) || 'patch';

const known = new Set(['patch', 'minor', 'major', 'dry-run', 'upload', 'upload-only', 'mandatory', 'replace']);
const unknown = [
  ...words.filter(w => !known.has(w)),
  ...Object.keys(options).filter(k => !known.has(k) && !VALUE_OPTIONS.includes(k)),
];
if (unknown.length) {
  console.error(`✖ Unknown option: ${unknown.join(', ')}. See the top of scripts/release.js.`);
  process.exit(1);
}

function fail(message) {
  console.error(`\n✖ ${message}`);
  process.exit(1);
}

// Asynchronous so Ctrl+C can still put the version back (see main).
function run(command, commandArgs, cwd, {shell = false} = {}) {
  return new Promise(resolve => {
    const child = spawn(command, commandArgs, {cwd, stdio: 'inherit', shell});
    child.on('error', () => resolve(false));
    child.on('exit', code => resolve(code === 0));
  });
}

function currentBrand() {
  const current = fs.readFileSync(path.join(root, 'src', 'brand', 'current.ts'), 'utf8');
  const match = current.match(/@brands\/([\w-]+)\/brand\.json/);
  return match ? match[1] : null;
}

function nextVersion(version, kind) {
  const [major, minor, patch] = version.split('.').map(Number);
  if (kind === 'major') return `${major + 1}.0.0`;
  if (kind === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function uploadConfig(brandId, brand) {
  let local = {};
  const localPath = path.join(root, 'release.local.json');
  if (fs.existsSync(localPath)) {
    try {
      local = JSON.parse(fs.readFileSync(localPath, 'utf8'))[brandId] || {};
    } catch {
      fail('release.local.json is not valid JSON');
    }
  }
  const key = process.env.RELEASE_UPLOAD_KEY || local.key;
  const base = (process.env.RELEASE_URL || local.url || brand.apiUrl || '').replace(/\/+$/, '');
  if (!key) {
    fail(
      'No upload key. Set RELEASE_UPLOAD_KEY, or create release.local.json:\n' +
        `  { "${brandId}": { "key": "<the server's RELEASE_UPLOAD_KEY>" } }`,
    );
  }
  if (key.startsWith('PASTE_') || key.length < 32) {
    fail(`The upload key for ${brandId} in release.local.json is still the placeholder (or too short).`);
  }
  if (!base) fail(`No server URL for ${brandId} (brand.json apiUrl or release.local.json "url")`);
  return {key, url: `${base}/api/shared/app/release`};
}

async function uploadApk({file, version, brandId, brand}) {
  if (typeof fetch !== 'function' || typeof FormData !== 'function') {
    fail('Uploading needs Node 18 or newer');
  }
  const {key, url} = uploadConfig(brandId, brand);
  const checksum = sha256(file);
  const notes = (value('notes') || '')
    .split(/;|\n/)
    .map(n => n.trim())
    .filter(Boolean)
    .join('\n');

  // openAsBlob streams from disk (Node 20+); older Node reads it into memory.
  const blob = fs.openAsBlob
    ? await fs.openAsBlob(file, {type: 'application/vnd.android.package-archive'})
    : new Blob([fs.readFileSync(file)], {type: 'application/vnd.android.package-archive'});
  const form = new FormData();
  form.append('version', version);
  form.append('brand', brandId);
  form.append('sha256', checksum);
  if (notes) form.append('notes', notes);
  if (has('mandatory')) form.append('mandatory', 'true');
  if (has('replace')) form.append('replace', 'true');
  form.append('apk', blob, path.basename(file));

  const sizeMb = (fs.statSync(file).size / (1024 * 1024)).toFixed(1);
  console.log(`\nUploading ${path.basename(file)} (${sizeMb} MB) to ${new URL(url).host}…`);
  let res;
  try {
    res = await fetch(url, {method: 'POST', headers: {'X-Release-Key': key}, body: form});
  } catch (error) {
    fail(`Upload failed: ${error.message}. The APK is still in dist/; retry with --upload-only.`);
  }
  const body = await res.json().catch(() => ({}));
  if (res.status === 404) fail('The server has no release endpoint, or RELEASE_UPLOAD_KEY is not set there.');
  if (res.status === 413) fail('The server (or its proxy) refused the file size. Raise the proxy upload limit.');
  if (!res.ok) fail(`Server said ${res.status}: ${body.message || 'unknown error'}`);

  const d = body.data || {};
  console.log(`✔ Published ${d.fileName} (${d.mandatory ? 'mandatory' : 'optional'} update)`);
  if (d.sha256 !== checksum) console.warn('! The server reports a different checksum. Check the upload.');
}

async function main() {
  const brandId = value('brand') || currentBrand();
  if (!brandId) fail('No brand chosen. Run `npm run brand <id>` or pass --brand <id>.');
  const brandPath = path.join(root, 'brands', brandId, 'brand.json');
  if (!fs.existsSync(brandPath)) fail(`Unknown brand "${brandId}"`);
  const brand = JSON.parse(fs.readFileSync(brandPath, 'utf8'));

  const pkgPath = path.join(root, 'package.json');
  const gradlePath = path.join(root, 'android', 'app', 'build.gradle');
  const pkgText = fs.readFileSync(pkgPath, 'utf8');
  const gradleText = fs.readFileSync(gradlePath, 'utf8');
  const pkg = JSON.parse(pkgText);
  const distDir = path.join(root, 'dist');

  if (uploadOnly) {
    const version = value('version') || pkg.version;
    const out = path.join(distDir, `app-${brandId}-${version}.apk`);
    if (!fs.existsSync(out)) {
      const built = fs.existsSync(distDir) ? fs.readdirSync(distDir).filter(f => f.startsWith(`app-${brandId}-`)) : [];
      fail(
        `${path.relative(root, out)} not found.` +
          (built.length ? ` Built: ${built.join(', ')}. Pick one with version=<x.y.z>.` : ' Build it first.'),
      );
    }
    await uploadApk({file: out, version, brandId, brand});
    return;
  }

  const gradleName = gradleText.match(/versionName "([\d.]+)"/)[1];
  const gradleCode = Number(gradleText.match(/versionCode (\d+)/)[1]);
  // Start from the higher of the two, so they can't drift apart again (R-03).
  const base = [pkg.version, gradleName].sort((a, b) => a.localeCompare(b, undefined, {numeric: true})).pop();
  const version = nextVersion(base, bump);
  const code = gradleCode + 1;

  console.log(`Brand ${brandId}: ${base} → ${version} (versionCode ${code})`);
  if (dryRun) return;
  if (upload) uploadConfig(brandId, brand); // fail early, before a long build

  // The JS bundle must carry the same brand as the flavor.
  if (currentBrand() !== brandId && !(await run(process.execPath, [path.join(__dirname, 'brand.js'), brandId], root))) {
    fail(`Could not switch to brand ${brandId}`);
  }

  const restore = () => {
    fs.writeFileSync(pkgPath, pkgText);
    fs.writeFileSync(gradlePath, gradleText);
  };
  // Ctrl+C during the build puts the version back too.
  const onInterrupt = () => {
    restore();
    console.error('\n✖ Stopped; the version was put back.');
    process.exit(130);
  };
  process.on('SIGINT', onInterrupt);
  process.on('SIGTERM', onInterrupt);

  pkg.version = version;
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  fs.writeFileSync(
    gradlePath,
    gradleText
      .replace(/versionName "[\d.]+"/, `versionName "${version}"`)
      .replace(/versionCode \d+/, `versionCode ${code}`),
  );

  const flavor = brandId.charAt(0).toUpperCase() + brandId.slice(1);
  const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
  // Windows runs gradlew.bat through the shell; the path has no spaces to quote.
  const built = await run(gradlew, [`assemble${flavor}Release`], path.join(root, 'android'), {
    shell: process.platform === 'win32',
  });
  process.off('SIGINT', onInterrupt);
  process.off('SIGTERM', onInterrupt);
  if (!built) {
    // Put the version back, so a failed build doesn't skip a number.
    restore();
    fail('The build failed; the version was put back.');
  }

  const apk = path.join(
    root,
    'android',
    'app',
    'build',
    'outputs',
    'apk',
    brandId,
    'release',
    `app-${brandId}-release.apk`,
  );
  if (!fs.existsSync(apk)) fail(`Build finished but ${path.relative(root, apk)} is missing`);
  fs.mkdirSync(distDir, {recursive: true});
  const out = path.join(distDir, `app-${brandId}-${version}.apk`);
  fs.copyFileSync(apk, out);
  console.log(`\n${path.relative(root, out)}\nsha256 ${sha256(out)}`);

  if (upload) await uploadApk({file: out, version, brandId, brand});
  else console.log('Upload it with: npm run release upload-only');
}

main().catch(error => fail(error.message));
