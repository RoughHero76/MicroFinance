#!/usr/bin/env node
// npm run release [patch|minor|major] [--brand <id>] [--dry-run]
//
// 1. bumps package.json and android/app/build.gradle together
//    (versionName, and versionCode + 1)
// 2. assembles the signed release APK for the brand
// 3. copies it to dist/app-<brand>-<version>.apk and prints the path

const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');

const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const bump = args.find(a => ['patch', 'minor', 'major'].includes(a)) || 'patch';
const brandFlag = args.indexOf('--brand');

function currentBrand() {
  if (brandFlag !== -1 && args[brandFlag + 1]) return args[brandFlag + 1];
  const current = fs.readFileSync(path.join(root, 'src', 'brand', 'current.ts'), 'utf8');
  const match = current.match(/@brands\/([\w-]+)\/brand\.json/);
  if (!match) throw new Error('Run `npm run brand <id>` first');
  return match[1];
}

function nextVersion(version, kind) {
  const [major, minor, patch] = version.split('.').map(Number);
  if (kind === 'major') return `${major + 1}.0.0`;
  if (kind === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

const brand = currentBrand();
if (!fs.existsSync(path.join(root, 'brands', brand, 'brand.json'))) {
  console.error(`Unknown brand "${brand}"`);
  process.exit(1);
}

const pkgPath = path.join(root, 'package.json');
const gradlePath = path.join(root, 'android', 'app', 'build.gradle');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
let gradle = fs.readFileSync(gradlePath, 'utf8');

const gradleName = gradle.match(/versionName "([\d.]+)"/)[1];
const gradleCode = Number(gradle.match(/versionCode (\d+)/)[1]);
// Start from the higher of the two, so they can't drift apart again (R-03).
const base = [pkg.version, gradleName].sort((a, b) => a.localeCompare(b, undefined, {numeric: true})).pop();
const version = nextVersion(base, bump);
const code = gradleCode + 1;

console.log(`Brand ${brand}: ${base} → ${version} (versionCode ${code})`);
if (dryRun) process.exit(0);

pkg.version = version;
fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
gradle = gradle
  .replace(/versionName "[\d.]+"/, `versionName "${version}"`)
  .replace(/versionCode \d+/, `versionCode ${code}`);
fs.writeFileSync(gradlePath, gradle);

const flavor = brand.charAt(0).toUpperCase() + brand.slice(1);
const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
execSync(`${gradlew} assemble${flavor}Release`, {cwd: path.join(root, 'android'), stdio: 'inherit'});

const apk = path.join(root, 'android', 'app', 'build', 'outputs', 'apk', brand, 'release', `app-${brand}-release.apk`);
const distDir = path.join(root, 'dist');
fs.mkdirSync(distDir, {recursive: true});
const out = path.join(distDir, `app-${brand}-${version}.apk`);
fs.copyFileSync(apk, out);
console.log(`\n${path.relative(root, out)} → upload to the update server`);
