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
4. Build: `npm run release -- --brand <id>` (or `--dry-run` first). The APK is written to `dist/app-<id>-<version>.apk`.

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

Then set the brand's `apiUrl` in `brand.json` to this deployment's URL and build the app.
