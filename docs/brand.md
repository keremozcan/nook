# Nook brand

**v1.0 · 31 Oct 2026** · tokens `brand/tokens.json` v1.0 · public page: none yet (GitHub Pages, no brand page)

<!-- Standard: hq/standards/brand-book.md. Nook's scope there: chapters 0-5 and 11-14. Chapters 6-10 (shape and
     space, components, motion, imagery, signature artefact) are left out on purpose; the games' own look lives
     in docs/games.md and ui/. -->

- v1.0 (CDO, 31 Oct): first book, written from `ui/app.css` and `docs/games.md`. Nothing about the look changed;
  the values moved unchanged into `brand/tokens.json`.

The one reference for anything that carries the Nook brand. The code is the source of truth: `brand/tokens.json`
(colour, type, tap size) and, until the site reads it, `ui/app.css`, which holds the same values. When one of them
changes, this page and the version change in the same commit.

## 1. Idea

Nook is nine calm puzzles Kerem and his son can play on a phone or a laptop, instead of ad-filled games: no ads, no
accounts, nothing to buy, no tracking (`docs/games.md`, "What Nook is for"). The picture behind the brand is a quiet
corner with a puzzle in it: light, plain, one teal accent, nothing asking for attention.

Design principles:

- **Quiet and readable.** A light, readable interface, always-visible short instructions, controls beneath the
  board, clear given / selected / error states (Game repair, 25 Oct 2026, Kerem's rework brief).
- **The rule is always on screen.** Nothing is judged by a rule the page doesn't show (`docs/games.md`, contract 1,
  Nook PM, 26 Oct 2026).
- **Colour is never the only cue,** and light and dark both follow the system (contract 7; dark mode follows the
  system, Nook PM, 26 Oct 2026).
- **A child plays too.** Word games accept the broad answer a child would type (Nook PM, 26 Oct 2026).

## 2. Name and voice

- Written **Nook**: one word, capital N, in running text and at a sentence start. Logotype: the word "Nook" set in
  `--display` (Fraunces 620, `--track-display`, `--fs-display`); it is the page `h1` in `ui/shell.js`. No mark yet
  (chapter 3). Address: https://keremozcan.github.io/nook/ (GitHub Pages; no domain of its own).
- Line: "No ads. Nothing to buy. Just a quiet puzzle or two." (`COPY.lede` in `ui/shell.js`). Meta description:
  "Nook. Nine puzzles, no ads, no accounts." English only.
- The main thing is a **puzzle** (or **game** for the nine kinds); the day's set is **Tonight**. Avoid "level
  pack", "challenge", "streak": nothing here keeps score against the player.
- Text typography: whatever `COPY` in `ui/shell.js` and each `ui/games/<id>.js` says; every string sits in a
  `COPY` object for the copy reviewer. Times are `m:ss` in tabular figures.
- **Voice and words:** no `docs/voice.md` yet; to be written by Ceyda (CCO). Until then the `COPY` objects and the
  CCO's wording calls (Nook DECISIONS) are the voice. Space Island's company tone sits under it:
  `spaceisland/marka/ses-ve-ton.md`. This book does not repeat them.

## 3. Logo

None yet. Nook has no mark, favicon, app icon, profile picture or share image: the wordmark is the word "Nook" in
`--display` (chapter 2). Adding a mark is a brand change (Kerem's). When one exists it goes in `brand/logo/` and this
chapter gets the standard sections (versions, clear space, smallest sizes, grounds, single colour, favicon, profile).

## 4. Colour

Teal is the brand and the UI accent: it fills the one primary action (Tonight, primary button), marks saved and
selected, and nothing else is a brand colour. Every value comes from `brand/tokens.json`.

| Role | Token | Light | Dark |
|---|---|---|---|
| Accent (fills: primary button, Tonight, saved) | `--accent` | `#087f82` | `#3cbcb5` |
| Accent as text and link ink | `--accent-ink` | `#065b5f` | `#84dbd5` |
| Tint behind accent items | `--accent-soft` | `#dcf1ee` | `#15393a` |
| Text on accent | `--on-accent` | `#ffffff` | `#052120` |
| Ground | `--bg` | `#f4f7f7` | `#0e1517` |
| Card, tile, sheet | `--surface` | `#ffffff` | `#172124` |
| Inset row, input | `--surface-2` | `#eef3f3` | `#1f2b2f` |
| Text | `--text` | `#15232a` | `#e4edef` |
| Secondary text | `--text-2` | `#33474e` | `#c0d0d4` |
| Muted text | `--muted` | `#5a6c73` | `#92a5ab` |
| Lines | `--line`, `--line-2` | `#d5dfe1`, `#aebdc1` | `#2c3a3e`, `#46595e` |
| Focus ring | `--focus` | `#1d63c7` | `#7fb2ff` |

- **Accent as text:** `--accent` on `--bg` is 4.46:1 in light, just under 4.5, so text and links use `--accent-ink`
  (7.3:1 on `--bg`); `--accent` is for fills. `node ~/Developer/hq/templates/design/contrast.mjs brand/tokens.css`
  reports this one line as a fail because it tests `--accent` as a link; every other pair passes.
- **Functional colours** (state only, never decoration): `--danger` (`#c0392b` light, `#ff8577` dark; 5.44:1 on
  `--surface`) and `--danger-soft` for a broken rule or an error. Nook has no ok or warn colour: a solved board is
  said in words and the Solved panel, not green.
- **Extended palettes** (game pieces, not brand): board and grid (`--board`, `--board-edge`, `--grid-*`,
  `--wall-fill`), Zip path (`--path*`), givens and entries (`--given*`, `--entered-ink`, `--peer`, `--same`),
  Tango sun and moon, Queens gold, Murdoku victim and rooms (`--m0`-`--m5`), and twelve region colours
  (`--c0`-`--c11`) for coloured regions, pieces and rooms, each with a dark twin. They live in `brand/tokens.json` and are used on
  the boards only.

## 5. Type

- **Display and wordmark:** Fraunces 560-620 (`--display`), with Iowan Old Style, Georgia, serif as fallback. Used
  for the wordmark, Tonight title, tile names, "Solved" and board digits. Titles use weight 620 and negative
  tracking (`--track-display` for the wordmark, -0.02em for smaller titles).
- **UI text:** Avenir Next, Segoe UI, system-ui (`--sans`), weights 400 / 600 / 700. Numbers (clock, times) use
  `font-variant-numeric: tabular-nums`. No monospace face.
- **Scale** (whole pixels, `ui/app.css`): wordmark `clamp(40px, 7vw, 64px)` / 1 (`--fs-display`); Tonight title
  22-28; tile name 21; Solved title 30; lede 16; body and rules 15 / 1.45 (`--fs-base`, `--lh`); status 14; level
  note 13; captions 11-13; eyebrow 11 bold, +0.13em, uppercase.
- **Self-hosting:** not yet. Fraunces is loaded from Google Fonts (`index.html` is built by `build.mjs`; the same
  `<link>` is in `dev.html`), so a visit asks Google's servers. The standard is self-hosted WOFF2 in `brand/fonts/`
  with the OFL beside them; that is a change for the Nook PM and Tolga to make, and it belongs in this chapter
  when done. Fraunces is SIL OFL 1.1.

## 11. Applications

- **Share images:** none. The page has no `og:` tags; its description meta is the line in chapter 2.
- **Mail:** none (Nook sends none).
- **Social:** none.
- **Print and press kit:** none.
- **Browser chrome:** `theme-color` meta tags in `build.mjs` and `dev.html` carry the light and dark `--bg`
  (`#f4f7f7`, `#0e1517`) as copied hex; when the site adopts the tokens they should be read from
  `brand/tokens.json` instead.

## 12. Space Island signature

As set in hq/standards/brand-book.md §5, unchanged:

- Site footer: "Made by Space Island" (EN), plain text in the footer's type and muted colour, linked to
  https://spaceisland.ltd. No Space Island logo on product pages. **Not on the page yet:** Nook has no footer.
- Legal pages, mail footers, About: the full company line (hq/standards/legal-pages.md). Nook has none of these.
- Share images, app icons, profile pictures: Nook only.

## 13. Don'ts

- **A second accent.** Teal is the only brand colour; sun, moon, gold, rooms and regions are game pieces and stay on
  the boards.
- **`--accent` as small text on `--bg`.** 4.46:1 in light; use `--accent-ink`.
- **Colour as the only cue.** Every state is also a shape, a word or a line (contract 7).
- **Ads, accounts, purchases, tracking.** The reason Nook exists (chapter 1).
- **Hiding the rule,** or judging by a rule the page doesn't show.
- **Setting the wordmark in another face,** or retyping it in a font other than `--display` 620.
- **A shadow on anything but tiles, boards and the toast** (`--shadow`).
- **A hex value copied out of `brand/tokens.json`** into another file (the `theme-color` metas do it today; chapter 11).
- **Inventing a logo, icon or share image** without Kerem: brand changes are his.

## 14. Files

| What | Where | Built by |
|---|---|---|
| Tokens | `brand/tokens.json` → `brand/tokens.css` | `node brand/tokens-css.mjs` (`--check` fails when stale) |
| Served stylesheet | `ui/app.css` (same values, old names) | by hand, until it reads `brand/tokens.css` |
| Logo masters | none yet | |
| Icons | none yet | |
| Share images | none yet | |
| Fonts and licences | none yet (Fraunces from Google Fonts) | |
| Press kit | none | |
| Public brand page | none (GitHub Pages only) | |
| Visual book | none | |
| Standalone page | `index.html` | `node build.mjs` |

`brand/tokens.css` is generated and **not used yet**: the site still reads `ui/app.css`. Names follow the Space
Island kit; the game colours keep their own. To adopt, replace the `:root` blocks of `ui/app.css` with
`brand/tokens.css` (inlined by `build.mjs`) and rename in `ui/`:

| `ui/app.css` today | Token |
|---|---|
| `--ink`, `--ink-2` | `--text`, `--text-2` |
| `--line-strong` | `--line-2` |
| `--accent-strong` | `--accent-ink` |
| `--bad`, `--bad-soft` | `--danger`, `--danger-soft` |
| `--serif` | `--display` |

Check for the swap: computed colours on the live page before and after, light and dark, no difference. Two things
differ in the generated file on purpose: `--m0`-`--m5` are written as `color-mix(...)` for light (the served CSS
keeps the plain fallback for Safari before 16.2), and `color-scheme` is `light` / `dark` where the served CSS says
`light dark`. Both need a look at adoption.
