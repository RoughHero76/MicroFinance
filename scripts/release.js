#!/usr/bin/env node
// npm run release -- [patch|minor|major] [options]
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
// Options:
//   --brand <id>       brand to release (default: the current one)
//   --dry-run          only print the next version
//   --upload           upload after building
//   --upload-only      upload dist/app-<brand>-<version>.apk for the current
//                      version without building (e.g. a retry)
//   --mandatory        phones on older versions must update
//   --notes "a; b"     "what's new", items separated by ; or new lines
//   --replace          overwrite a release with the same version
//
// The upload key (the server's RELEASE_UPLOAD_KEY) comes from the
// RELEASE_UPLOAD_KEY environment variable or release.local.json (not in
// git):  { "evi": { "key": "…", "url": "https://…" } }
// "url" is optional and defaults to the brand's apiUrl.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {spawnSync} = require('child_process');

const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const has = flag => args.includes(flag);
const value = flag => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : undefined;
};

const dryRun = has('--dry-run');
const uploadOnly = has('--upload-only');
const upload = has('--upload') || uploadOnly;
const bump = args.find(a => ['patch', 'minor', 'major'].includes(a)) || 'patch';

function fail(message) {
  console.error(`\n✖ ${message}`);
  process.exit(1);
}

function run(command, commandArgs, cwd, {shell = false} = {}) {
  const result = spawnSync(command, commandArgs, {cwd, stdio: 'inherit', shell});
  return result.status === 0;
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
  const notes = (value('--notes') || '')
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
  if (has('--mandatory')) form.append('mandatory', 'true');
  if (has('--replace')) form.append('replace', 'true');
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
  const brandId = value('--brand') || currentBrand();
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
    const out = path.join(distDir, `app-${brandId}-${pkg.version}.apk`);
    if (!fs.existsSync(out)) fail(`${path.relative(root, out)} not found. Build it first (without --upload-only).`);
    await uploadApk({file: out, version: pkg.version, brandId, brand});
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
  if (currentBrand() !== brandId && !run(process.execPath, [path.join(__dirname, 'brand.js'), brandId], root)) {
    fail(`Could not switch to brand ${brandId}`);
  }

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
  if (!run(gradlew, [`assemble${flavor}Release`], path.join(root, 'android'), {shell: process.platform === 'win32'})) {
    // Put the version back, so a failed build doesn't skip a number.
    fs.writeFileSync(pkgPath, pkgText);
    fs.writeFileSync(gradlePath, gradleText);
    fail('The build failed; the version was put back.');
  }

  const apk = path.join(root, 'android', 'app', 'build', 'outputs', 'apk', brandId, 'release', `app-${brandId}-release.apk`);
  if (!fs.existsSync(apk)) fail(`Build finished but ${path.relative(root, apk)} is missing`);
  fs.mkdirSync(distDir, {recursive: true});
  const out = path.join(distDir, `app-${brandId}-${version}.apk`);
  fs.copyFileSync(apk, out);
  console.log(`\n${path.relative(root, out)}\nsha256 ${sha256(out)}`);

  if (upload) await uploadApk({file: out, version, brandId, brand});
  else console.log('Upload it with: npm run release -- --upload-only');
}

main().catch(error => fail(error.message));
