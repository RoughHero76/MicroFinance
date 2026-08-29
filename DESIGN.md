# EVI — Frontend Design System

One brand, one status language, one component kit. Every screen in the app
renders through this system so it feels like a single product, not a pile of
admin pages.

## 1. Identity — "Field Green"

MicroFinance is used by field agents with real hands, on mid-range Android
phones, often in bright sun. The design therefore optimises for:

- **Trust** — deep evergreen, not tech-blue. Money + growth, not cold SaaS.
- **Clarity** — one accent color (brand green); status is always semantic.
- **Reach** — 48 px minimum touch targets, large type, high contrast.

Brand palette:

| Token | Hex | Use |
| --- | --- | --- |
| `brand` | `#0E5A3A` | primary action, identity, active states |
| `brandDark` | `#0A472E` | pressed states, gradient end |
| `brandTint` | `#E8F3EE` | icon chips, selected surfaces |
| `brandSoft` | `#CFE8DC` | borders on tinted surfaces |

Neutrals are warm green-grey (ink `#12241C`, surface `#F5F8F6`, line `#E3EAE6`).
Auth screens run on the dark "night" set (`night #0A1F16`, `nightSoft #123227`).

## 2. Tokens — the only source of truth

`src/theme/tokens.js` is the **single source of truth** for every visual value.

> **Rule: never hardcode a color, radius, or spacing scale in a screen.**
> Import from `src/theme/tokens.js`. If a value is missing, add it to tokens
> first, then use it.

- `colors` — raw palette (brand, neutrals, semantic, dark).
- `tones` — `{ fg, bg }` pairs: `brand | success | warning | orange | danger | info | neutral`. Use for icon chips, badges, tints.
- `getStatusTone(status)` — maps any loan/portfolio status string → tone. Add new statuses **here**, never in screens.
- `spacing` — `xs 4 · sm 8 · md 12 · lg 16 · xl 24 · xxl 32`
- `radii` — `sm 8 · md 12 · lg 16 · xl 24 · pill 999`
- `type.sizes` — `xs 11 · sm 13 · md 15 · lg 17 · xl 20 · xxl 24 · display 32`
- `type.weights` — `regular 400 · medium 500 · semibold 600 · bold 700`
- `shadow.card` — the one soft card shadow (low-opacity evergreen).
- `touchTarget` — 48. Use for anything tappable.

## 3. Status language (strict)

| Meaning | Tone | Examples |
| --- | --- | --- |
| Good / done | `success` | active, approved, paid |
| Info / finished | `info` | completed |
| Waiting | `warning` | pending, pending approval, review, sma0 |
| Attention | `orange` | sma1 |
| Bad / risk | `danger` | overdue, default, npa, sma2 |
| Neutral | `neutral` | closed, unknown |

**Never** pick a status color per-screen. Render with `<StatusBadge>` or
`getStatusTone(status)` + `tones[...]`.

## 4. Component kit — `src/components/ui/`

| Component | Purpose |
| --- | --- |
| `EviCard` | The base surface. All "boxes" flow through it. `onPress` → tap feedback. `elevated={false}` for flat rows. |
| `EviButton` | The app button. `variant: primary \| secondary \| ghost \| danger`, `size: lg \| md`, `loading`, `icon`. |
| `EviTextField` | Paper `TextInput` pre-styled. All inputs use this (or paper's with the app theme). |
| `StatusBadge` | Status string → pill. The only place status colors are decided. |
| `StatCard` | Dashboard metric tile (label, value, icon, tone, trend). |
| `EviAvatar` | Initials or photo circle. |
| `SegmentedControl` | Pill segmented toggle (All \| Active \| Overdue). |
| `EmptyState` / `ErrorState` | List placeholders. Empty = neutral/brand; error = danger + retry. |
| `Skeleton` / `SkeletonList` | Loading shimmer placeholders. |
| `SectionHeader` | List-section heading with optional action. |
| `EviProgress` | Deterministic progress bar. |

### Composition recipe (list screens)

```
View (surface bg, padding xl)
  → SectionHeader
  → loading ? <SkeletonList/>
  : error   ? <ErrorState onRetry={reload}/>
  : empty   ? <EmptyState actionLabel="…"/>
  : List → row = <EviCard elevated={false} onPress={…}> avatar + text + StatusBadge
```

## 5. Paper theme

`src/theme/paperTheme.js` exposes `eviPaperTheme` (already mounted in
`App.tsx`). Any react-native-paper component (Dialog, TextInput, Chip,
BottomSheet…) inherits the brand automatically — don't re-color it per screen.

## 6. Rules of the road

1. **No raw hex in screens.** Tokens only.
2. **Status → `StatusBadge` / `getStatusTone`.** One mapping, everywhere.
3. **Buttons → `EviButton`.** One height (52/42), one radius (12), one font.
4. **Cards → `EviCard`.** One radius (16), one shadow.
5. **Touch targets ≥ 48 px** for primary actions.
6. **Loading = skeleton, error = ErrorState, empty = EmptyState.** Never a blank white screen.
7. **Icons:** MaterialCommunityIcons, size 18–24, paired with a `tone` chip when decorative.
8. Keep screens **deterministic**: no `Math.random()`, no `Date.now()` in render.

## 7. What is intentionally NOT here

- No images in the UI kit (assets stay in `src/assets`, referenced by screens).
- No node_modules, obviously.
- Dark mode is not a first-class theme yet — the night palette is reserved for
  auth surfaces. Add a full dark theme by extending `paperTheme.js` + tokens.
