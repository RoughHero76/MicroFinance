#!/usr/bin/env node
// App releases, from any machine (Windows, macOS, Linux). Three commands:
//
//   npm run release:build   [1.0.7]   build the signed APK into dist/
//   npm run release:publish [1.0.7]   build it and upload it to the server
//   npm run release:upload  [1.0.5]   upload an APK already in dist/
//
// Version: build and publish bump the patch number (1.0.4 → 1.0.5) unless
// you give one, which must be newer than the current version. Upload takes
// the current version unless you give one, and stops if
// dist/app-<brand>-<version>.apk doesn't exist.
//
// Extra words (any order, optional):
//   mandatory          phones on older versions must update
//   notes="a; b"       "what's new", items separated by ;
//   replace            overwrite a release with the same version on the server
//   brand=<id>         another brand than the current one
//
// Upload key: the server's RELEASE_UPLOAD_KEY, in release.local.json
// (not in git)  { "evi": { "key": "…" } }  or the RELEASE_UPLOAD_KEY
// environment variable. Optional "url" (or RELEASE_URL) overrides the
// brand's apiUrl.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {spawn} = require('child_process');

const root = path.resolve(__dirname, '..');
const MODES = ['build', 'publish', 'upload'];
const FLAGS = ['mandatory', 'replace'];
const VALUES = ['notes', 'brand'];
const VERSION = /^\d+\.\d+\.\d+$/;

function fail(message) {
  console.error(`\n✖ ${message}`);
  process.exit(1);
}

// Words only (npm passes them through in every shell); a leading -- is
// tolerated so `node scripts/release.js upload --mandatory` works too.
function parseArgs(argv) {
  const out = {mode: null, version: null, flags: new Set(), values: {}};
  for (const raw of argv) {
    const word = raw.replace(/^--?/, '');
    const eq = word.indexOf('=');
    if (eq > 0 && VALUES.includes(word.slice(0, eq))) out.values[word.slice(0, eq)] = word.slice(eq + 1);
    else if (MODES.includes(word) && !out.mode) out.mode = word;
    else if (FLAGS.includes(word)) out.flags.add(word);
    else if (VERSION.test(word.replace(/^v/i, '')) && !out.version) out.version = word.replace(/^v/i, '');
    else fail(`Don't understand "${raw}". See the top of scripts/release.js.`);
  }
  if (!out.mode) fail('Use npm run release:build, release:publish or release:upload.');
  return out;
}

function compare(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] > pb[i] ? 1 : -1;
  return 0;
}

function nextPatch(version) {
  const [major, minor, patch] = version.split('.').map(Number);
  return `${major}.${minor}.${patch + 1}`;
}

// Asynchronous so Ctrl+C can still put the version back.
function run(command, args, cwd, shell = false) {
  return new Promise(resolve => {
    const child = spawn(command, args, {cwd, stdio: 'inherit', shell});
    child.on('error', () => resolve(false));
    child.on('exit', code => resolve(code === 0));
  });
}

function currentBrand() {
  const current = fs.readFileSync(path.join(root, 'src', 'brand', 'current.ts'), 'utf8');
  const match = current.match(/@brands\/([\w-]+)\/brand\.json/);
  return match ? match[1] : null;
}

const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const apkPath = (brandId, version) => path.join(root, 'dist', `app-${brandId}-${version}.apk`);

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
  if (!key)
    fail(`No upload key. Create release.local.json: { "${brandId}": { "key": "<the server's RELEASE_UPLOAD_KEY>" } }`);
  if (key.startsWith('PASTE_') || key.length < 32) fail('The key in release.local.json is still the placeholder.');
  if (!base) fail(`No server URL for ${brandId} (brand.json apiUrl)`);
  return {key, url: `${base}/api/shared/app/release`};
}

async function upload({file, version, brandId, brand, args}) {
  if (typeof fetch !== 'function' || typeof FormData !== 'function') fail('Uploading needs Node 18 or newer');
  const {key, url} = uploadConfig(brandId, brand);
  const checksum = sha256(file);
  const notes = (args.values.notes || '')
    .split(';')
    .map(n => n.trim())
    .filter(Boolean)
    .join('\n');

  const type = 'application/vnd.android.package-archive';
  // openAsBlob streams from disk (Node 20+); older Node reads it into memory.
  const blob = fs.openAsBlob ? await fs.openAsBlob(file, {type}) : new Blob([fs.readFileSync(file)], {type});
  const form = new FormData();
  form.append('version', version);
  form.append('brand', brandId);
  form.append('sha256', checksum);
  if (notes) form.append('notes', notes);
  if (args.flags.has('mandatory')) form.append('mandatory', 'true');
  if (args.flags.has('replace')) form.append('replace', 'true');
  form.append('apk', blob, path.basename(file));

  const sizeMb = (fs.statSync(file).size / (1024 * 1024)).toFixed(1);
  console.log(`\nUploading ${path.basename(file)} (${sizeMb} MB) to ${new URL(url).host}…`);
  let res;
  try {
    res = await fetch(url, {method: 'POST', headers: {'X-Release-Key': key}, body: form});
  } catch (error) {
    fail(`Upload failed: ${error.message}. Retry with: npm run release:upload ${version}`);
  }
  const body = await res.json().catch(() => ({}));
  if (res.status === 404) fail('The server has no release endpoint, or RELEASE_UPLOAD_KEY is not set there.');
  if (res.status === 413) fail('The server (or its proxy) refused the file size. Raise the proxy upload limit.');
  if (res.status === 409) fail(`The server already has ${version} or newer. To overwrite: npm run release:upload ${version} replace`);
  if (!res.ok) fail(`Server said ${res.status}: ${body.message || 'unknown error'}`);

  const d = body.data || {};
  console.log(`✔ Published ${d.fileName} (${d.mandatory ? 'mandatory' : 'optional'} update)`);
  if (d.sha256 !== checksum) console.warn('! The server reports a different checksum. Check the upload.');
}

async function build({brandId, wanted}) {
  const pkgPath = path.join(root, 'package.json');
  const gradlePath = path.join(root, 'android', 'app', 'build.gradle');
  const pkgText = fs.readFileSync(pkgPath, 'utf8');
  const gradleText = fs.readFileSync(gradlePath, 'utf8');
  const pkg = JSON.parse(pkgText);

  const gradleName = gradleText.match(/versionName "([\d.]+)"/)[1];
  const gradleCode = Number(gradleText.match(/versionCode (\d+)/)[1]);
  // The higher of the two, so they can't drift apart (R-03).
  const current = compare(pkg.version, gradleName) >= 0 ? pkg.version : gradleName;
  const version = wanted || nextPatch(current);
  if (compare(version, current) <= 0) fail(`${version} is not newer than the current version ${current}.`);
  const code = gradleCode + 1;
  console.log(`Building ${brandId} ${version} (was ${current}, versionCode ${code})`);

  // The JS bundle must carry the same brand as the Android flavor.
  if (currentBrand() !== brandId && !(await run(process.execPath, [path.join(__dirname, 'brand.js'), brandId], root))) {
    fail(`Could not switch to brand ${brandId}`);
  }

  const restore = () => {
    fs.writeFileSync(pkgPath, pkgText);
    fs.writeFileSync(gradlePath, gradleText);
  };
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
  const windows = process.platform === 'win32';
  // Only Gradle goes through the shell (gradlew.bat on Windows).
  const ok = await run(
    windows ? 'gradlew.bat' : './gradlew',
    [`assemble${flavor}Release`],
    path.join(root, 'android'),
    windows,
  );
  process.off('SIGINT', onInterrupt);
  process.off('SIGTERM', onInterrupt);
  if (!ok) {
    restore();
    fail('The build failed; the version was put back.');
  }

  const built = path.join(
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
  if (!fs.existsSync(built)) fail(`Build finished but ${path.relative(root, built)} is missing`);
  const out = apkPath(brandId, version);
  fs.mkdirSync(path.dirname(out), {recursive: true});
  fs.copyFileSync(built, out);
  console.log(`\n✔ ${path.relative(root, out)}\n  sha256 ${sha256(out)}`);
  return {file: out, version};
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const brandId = args.values.brand || currentBrand();
  if (!brandId) fail('No brand set. Run `npm run brand <id>` or add brand=<id>.');
  const brandPath = path.join(root, 'brands', brandId, 'brand.json');
  if (!fs.existsSync(brandPath)) fail(`Unknown brand "${brandId}"`);
  const brand = JSON.parse(fs.readFileSync(brandPath, 'utf8'));

  if (args.mode === 'upload') {
    const version = args.version || JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
    const file = apkPath(brandId, version);
    if (!fs.existsSync(file)) {
      const dist = path.join(root, 'dist');
      const builds = fs.existsSync(dist) ? fs.readdirSync(dist).filter(f => f.startsWith(`app-${brandId}-`)) : [];
      fail(
        `Version ${version} has no build (dist/app-${brandId}-${version}.apk).${
          builds.length ? ` Builds: ${builds.join(', ')}` : ''
        }`,
      );
    }
    await upload({file, version, brandId, brand, args});
    return;
  }

  if (args.mode === 'publish') uploadConfig(brandId, brand); // fail before a long build
  const result = await build({brandId, wanted: args.version});
  if (args.mode === 'publish') await upload({...result, brandId, brand, args});
  else console.log(`  Upload it with: npm run release:upload ${result.version}`);
}

main().catch(error => fail(error.message));
