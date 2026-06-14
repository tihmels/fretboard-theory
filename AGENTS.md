# AGENTS.md — Fretboard Theory

Agent-facing guide for this codebase. Read this before making any changes.

## What this is

A pure-frontend guitar music theory visualizer. Users pick a root note, scale, and optionally a chord quality; the SVG fretboard highlights matching positions with degree-colored dots. No backend, no auth, no audio in v1.

## Commands

```bash
npm run dev        # dev server at localhost:5173
npm run test:run   # run all 63 unit tests once (fast, use this before committing)
npm test           # watch mode
npm run build      # tsc type-check + vite bundle (must pass before shipping)
npm run lint       # eslint
```

Always run `npm run test:run` and `npm run build` after any change to `src/theory/` or `src/store/`. Both must succeed with zero errors before you're done.

## Architecture

```
src/
  theory/          # Pure TypeScript — zero React. The domain model.
  store/           # Zustand slices (theory, fretboard, view)
  hooks/           # React hooks that bridge store → theory engine
  components/
    fretboard/     # SVG rendering (FretboardView, FretboardCell, NoteChips, …)
    theory/        # Selector UI (RootSelector, ScaleSelector, ChordQualitySelector)
    panels/        # TheoryPanel (sidebar wrapper)
    ui/            # Generic controls (LabelModeToggle)
  utils/           # URL encode/decode
```

### The theory engine (`src/theory/`)

The only place music math happens. All functions are pure — no side effects, no React.

- **`types.ts`** — canonical type definitions. `PitchClass = 0–11` is the core primitive.
- **`pitch.ts`** — `transpose`, `intervalBetween`, `getPitchName`, `parsePitchName`
- **`scales.ts`** — 28 scale definitions; `getScaleNotes`, `isInScale`, `getScaleDegreeLabel`
- **`chords.ts`** — 17 chord qualities; `getChordNotes`, `getChordToneRole`, `getDiatonicChords`
- **`fretboard.ts`** — `buildFretboardGrid(tuning, fretCount)` → `FretboardNote[][]`
- **`annotation.ts`** — `annotateGrid(grid, ctx)` → `NoteAnnotation[][]`. This is the composition point: every note on the neck gets a `role` and a display `label` based on the current root/scale/chord context.
- **`constants.ts`** — `SHARP_NAMES`, `FLAT_NAMES`, `ROOT_PREFERS_SHARPS`, `SEMITONE_TO_DEGREE`

When you add a scale or chord quality, add it here and add a test. Never import React in this folder.

### Stores (`src/store/`)

Three independent Zustand slices:

| Store | Key state |
|---|---|
| `theory.ts` | `root: PitchClass`, `scale: ScaleDef \| null`, `chordQualityId: string \| null` |
| `fretboard.ts` | `tuning: Tuning`, `fretCount: number` (default 15), `startFret: number` |
| `view.ts` | `labelMode: 'note' \| 'degree' \| 'interval'` |

The `chordQualityId` stores only the quality ID (not the full chord). The chord root always follows `root` — the `Chord` object is derived inside `useFretboardAnnotations` so they stay in sync automatically.

### The rendering pipeline

```
stores → useFretboardAnnotations (useMemo) → annotateGrid → NoteAnnotation[][]
                                                                     ↓
                                                            FretboardView → FretboardCell (per dot)
```

`NoteAnnotation` carries everything a cell needs to render: `role`, `label`, `highlighted`, `semitones` (from root), `degreeLabel`, `pitchName`.

### SVG coordinate system (`src/components/fretboard/layout.ts`)

- Origin: top-left of SVG
- High E (string index 5) is at the top; low E (string index 0) is at the bottom
- String 0 = low E = `stringY(0)` = largest Y value
- Fret 0 = open string, rendered in the open column left of the nut

Key layout constants (all in px):
```
paddingTop: 34, stringSpacing: 41, openColWidth: 58
nutWidth: 9, fretColWidth: 73, dotRadius: 15.5, neckPad: 20
```

Helper functions: `stringY(i)`, `cellX(fret)`, `fretWireX(n)`, `neckTop()`, `neckBottom()`, `neckMidY()`, `fretNumY()`, `svgWidth(fretCount)`, `svgHeight()`.

## Visual design

**Dark warm palette** — not neutral grey. Key values:

| Token | Value | Use |
|---|---|---|
| `--bg-app` | `#100d0b` | App background |
| `--bg-panel` | `#16120e` | Sidebar |
| `--border-subtle` | `#2a221b` | All dividers |
| `--text-primary` | `#ede6dd` | Main text |
| `--text-muted` | `#8a7f72` | Secondary text |
| `--text-dimmer` | `#6b6258` | Labels, counts |

**Fonts**: `Hanken Grotesk` for all UI text, `JetBrains Mono` for note names, fret numbers, and degree labels on dots.

**Degree color system** (use CSS vars or `DEGREE_FILLS` array in `colors.ts`):

| Degree | Color |
|---|---|
| 1 (root) | `#e0564f` |
| 2 | `#e07c30` |
| 3 | `#cbb02e` |
| 4 | `#54a64f` |
| 5 | `#3897d6` |
| 6 | `#7a57d6` |
| 7 | `#c23bb6` |

Root notes render with a white ring halo (`r = dotRadius + 3.5`, `stroke rgba(255,255,255,.92)`).

**Chord mode**: when `chordQualityId` is set, chord tones get role-specific colors (root=deg1, third=deg3, fifth=deg5, seventh=deg7). Non-chord scale tones render as small dimmed rings (`r=6, opacity=0.45`).

## URL state

`useShareUrl` (mounted in `App.tsx`) encodes `?root=G&scale=dorian&chord=min7&label=degree`. On mount it hydrates stores from the URL. On store change it calls `history.replaceState`. See `src/utils/url.ts` for encode/decode.

## Adding features

- **New scale**: add an entry to `SCALES` in `scales.ts` with `id`, `name`, `category`, `pattern` (semitone offsets from root), `degrees` (string labels). Add a test.
- **New chord quality**: add to `CHORD_QUALITIES` in `chords.ts`. Same shape.
- **New UI panel**: the sidebar is `TheoryPanel.tsx` — add sections in order inside the scrollable div. Match existing spacing tokens.
- **Fretboard visual change**: edit `layout.ts` (geometry) or `colors.ts` (fills). Never put magic numbers in component files.

## What to avoid

- Never import from `src/theory/` inside `src/theory/` across module boundaries except through `index.ts` re-exports.
- Never import React into `src/theory/`.
- Don't store derived data in stores — derive it in hooks or component render.
- Don't add `console.log` or debugging artifacts to committed code.
- `IntervalLegend.tsx` is currently unused (superseded by `NoteChips.tsx`). Don't reference it from new code.
