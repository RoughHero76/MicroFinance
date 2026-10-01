# Brands (white-label)

Each client is a **brand**: its own app build, its own backend deployment and its own database. Nothing is shared between brands, which is how the single EviFinance deployment works today.

## Add a brand to the app

1. Copy `brands/evi/` to `brands/<id>/` and edit `brand.json`:
   - `id`, `name`, `shortName`, `tagline`
   - `apiUrl`: this brand's backend (see below)
   - `storageFolder`: folder name under the phone's Download folder
   - `palette` and `allowedPalettes`, `defaultMode`
   - `support` (phone, WhatsApp, email, hours) and `legal` links, shown in Help and About
   - `poweredBy` / `showPoweredBy`
   - `receipt` templates (SMS, WhatsApp, penalty) in English and Hindi
   - `features` (leads, calculator)
2. Replace `logo.png` and `logo-dark.png` (transparent PNG). Launcher icons are optional: put them in `brands/<id>/android/res/`.
3. `npm run brand <id>` points the JavaScript at the brand. The Android flavor is generated from `brand.json` automatically.
4. Build: `npm run release -- --brand <id>` (or `--dry-run` first). The APK is written to `dist/app-<id>-<version>.apk`. Works on Windows, macOS and Linux. Add `--upload` to publish it (see "Releasing an update" below).

Business rules that change per client (interest, grace, penalty rate, minimum payment, SMA thresholds, loan-number prefix, and the optional modules like Cash handover) are **not** in the brand file: an admin sets them in the app under More → Business settings, and they're stored in that brand's database.

## Deploy a brand's backend (BE-13)

One deployment of `MicroFinance-backend` per brand, with its own environment:

| Variable | What it is |
|---|---|
| `MONGODB_URI` | This brand's own database |
| `MONGODB_DUMP_URI` | Database used by the backup job (usually the same) |
| `JWT_SECRET_TOKEN`, `JWT_SECRET_TOKEN_EXPIRY` | Sign-in tokens; a different secret per brand |
| `ADMIN_TOKEN` | Secret for creating the first admin (`POST /api/admin/register`), server setup only |
| `STORAGE_PROVIDER`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_ROOT_FOLDER` | Photo and document storage; use a separate root folder (or account) per brand |
| `BRAND_NAME`, `BRAND_LOGO` | Name and logo path on server-made PDFs (reports, loan statements) |
| `BACKUP_DIR` | Where the nightly backup zips are kept (last 14) |
| `PORT`, `NODE_ENV` | Server basics |

App updates: put that brand's signed APK in the deployment's `storage/apk/` folder, named with its version (for example `app-<id>-1.2.0.apk`). The app's update check (`/api/shared/app/update/check`) offers the highest version found there, so each brand only ever gets its own APK.

Optional or mandatory: by default an update is **optional**. The app shows a "new version is ready" sheet, and "Later" asks again after 3 days. To make an update **mandatory**, put a `min-version.txt` file in the same folder containing the oldest version still allowed (for example `1.2.0`). Any app older than that shows a full "Update required" screen that can't be closed. Raise the number only for releases that must be installed, such as security fixes or server changes that old apps can't handle. Remove the file, or leave it at an old number, to keep updates optional. This only affects apps from this version onward: apps released before it don't know about mandatory updates and still show their old prompt.

Release notes: an optional `app-<id>-1.2.0.txt` next to the APK, with one line per item, is shown as "what's new".

Then set the brand's `apiUrl` in `brand.json` to this deployment's URL and build the app.

## Push notifications (Firebase)

Phone notifications go through Firebase Cloud Messaging. Each brand needs its own Firebase Android app:

1. In the Firebase console (any project; one per brand keeps data apart), add an Android app with the brand's `android.applicationId` from `brand.json`.
2. Download its `google-services.json` into `brands/<id>/`. The Android build copies it into place; a brand without one fails to build.
3. Backend: in Project settings → Service accounts, generate a private key. Save it on the server only, for example `secrets/firebase.json` (ignored by git), and set `FIREBASE_SERVICE_ACCOUNT=./secrets/firebase.json` in the backend's `.env`. Restart the backend. Without it, pushes are off and everything else works.

What gets pushed: every in-app notification except "nightly update failed", in the language the phone uses. "N payments need approval" is one notification, updated in place. People can turn pushes off in Settings → Phone notifications.

## Releasing an update (from any machine)

```
npm run release -- patch --brand evi --upload --notes "Faster lists; Fix rounding"
npm run release -- --upload-only            # retry the upload of the last build
npm run release -- minor --upload --mandatory   # phones on older versions must update
```

The script bumps the version, builds the signed APK, and uploads it to the brand's server over HTTPS. Phones see it on their next update check. If the build fails, the version number is put back.

One-time setup:

- **Server:** add `RELEASE_UPLOAD_KEY=<a long random string, 32+ characters>` to the backend's `.env` and restart. Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Without it, the upload endpoint doesn't exist.
- **Your machine:** put the same key in `release.local.json` at the app's root (ignored by git), or in the `RELEASE_UPLOAD_KEY` environment variable:
  ```json
  { "evi": { "key": "<the same key>" } }
  ```
  `"url"` is optional and defaults to the brand's `apiUrl`.
- **Proxy:** if nginx sits in front of the backend, allow large uploads on that path, e.g. `client_max_body_size 300m;`. nginx's default is 1 MB.

The server checks the key before accepting the file, then:
- accepts only a real APK with a newer version (use `--replace` to overwrite the same version)
- verifies the checksum
- saves the notes and, with `--mandatory`, sets `min-version.txt`
- keeps the newest 3 APKs

After 5 wrong keys, that address is locked out for 15 minutes.
