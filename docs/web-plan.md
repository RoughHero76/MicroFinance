# EviFinance web: working checklist

The web version runs the phone app in the browser with `react-native-web`, admin first. Plan and mocks: `.lavish/web-implementation.html`. Branch: `feat/web` (from `main`), not released, not deployed, no web files in the backend repo.

> **Status:** built and unit-tested, **not yet built or opened in a browser** (the machine this was written on can't run a bundler). The first thing to do on a dev machine is the spike below.

## First run (on a dev machine, not the low-end box)

1. `yarn install` (or `npm install`): adds `react-native-web`, `react-dom`, `vite`, `@vitejs/plugin-react`, `@types/react-dom`. The lockfiles are not updated yet.
2. `npm run web`, then open the printed address. Expect a few bundler fixes; likely places are listed under "Known unknowns".
3. `npm run typecheck:web` and `npm run typecheck` must both stay clean; `npx jest -w 1`.
4. `npm run web:build` writes the static site to `dist-web/` (host it anywhere; the backend serves nothing).

## How it fits together

- `web/vite.config.ts` aliases `react-native` to react-native-web and native-only libraries to `web/shims/*`. A file `thing.web.ts(x)` beside `thing.ts(x)` wins in the web build; Metro and Jest never load it.
- `tsconfig.json` (phone) excludes `*.web.*` and `web/`; `tsconfig.web.json` checks everything with `moduleSuffixes: [".web", ""]`.
- Code that only runs on the web and touches the DOM lives in `*.web.ts(x)`, `src/web/` or `web/`. Pure logic that can be unit-tested lives in plain `.ts` files (`lib/cropMath.ts`, `lib/sealedSession.ts`, `navigation/splitNav.ts`).

## Done

- [x] **W-1** Build setup: Vite config, `web/index.html`, `web/main.tsx`, manifest, minimal service worker, `npm run web`, `web:build`, `typecheck:web`.
- [x] **W-2** Stand-ins: `session.web` (token in sessionStorage), `lock.web` + `LockScreen.web` (PIN), `files.web` (downloads + IndexedDB history), `image.web` + `CropDialog.web` + `WebcamDialog.web` (file upload, webcam (or the phone camera in a mobile browser), crop with the phone's rules), `messaging.web`, `imageCache.web`, `push.web`, `permissions.web`, `haptics.web`, `motion.web`, `updates.web`; shims for device-info, linear-gradient, bottom-sheet, datetimepicker, clipboard.
- [x] **W-3** Sheets: `@gorhom/bottom-sheet` shim (bottom sheet on narrow windows, centred dialog on wide ones).
- [x] **W-4** URLs: `navigation/linking.web.ts` (bookmarkable customer, loan, lead… addresses), browser tab titles.
- [x] **W-5** Shell: sidebar (`WebShell.web`) from the same entries as the tabs (`navItems.ts`), tab bar hidden when wide, screens centred in a 960px column.
- [x] **W-6** Wide layouts: `SplitView.web` shows Customers, Loans, Leads and Employees lists beside their detail screen (the phone screens themselves).
- [x] **W-7** Tests: `web.cropMath`, `web.sealedSession`, `web.splitNav`.
- [x] **W-8** PIN unlock: 6 digits, token encrypted with PBKDF2 + AES-GCM, wiped after 5 wrong tries.
- [x] **BE** Backend CORS allow-list (env `WEB_ORIGINS`, unset = any origin as before), branch `feat/web` in MicroFinance-backend (from `feat/revamp`, which is not in its `main` yet). Not deployed.

## Known unknowns (need a browser)

- Reanimated on web (20 files): if entrance animations misbehave, switch them off on web.
- `react-native-screens` / native-stack on web, and deep `react-native/Libraries/*` imports (stubbed in `web/shims/rn-internal.ts`).
- Photo re-crop (`recropImage`) fetches the stored picture; the picture storage must send CORS headers or the canvas can't read it.
- Hindi strings in tables and the sidebar at 1024px.
- Pages not yet given a wide layout (Payments, Reports, Loan schedule) simply use the centred column.
