# Design system

## Typography

- **Display + section heads**: `Fraunces` variable (serif). Used for the masthead, the page title (`h1`), and section heads (`h2`). Optical-size and weight as features. Never below 16px.
- **UI body, labels, controls**: `Inter Tight` (sans). 14–15px for body, 12–13px for labels, all-caps eyebrows at 11px with 0.08em tracking.
- **Code, state names, symbols, transition table**: `JetBrains Mono`. Tabular figures. Used for any string the user types or that names a state.
- **Symbol set in copy**: ε, δ, Σ, Q, F, q₀, ∅, ⊆ — set inline in the same font that the surrounding text uses; no special styling required.

Type scale (rem, fixed):

| Role        | Size   | Weight | Tracking         |
| ----------- | ------ | ------ | ---------------- |
| Display     | 2.5    | 350    | -0.02em          |
| H1          | 1.875  | 450    | -0.015em         |
| H2          | 1.125  | 500    | -0.01em          |
| Body        | 0.9375 | 400    | 0                |
| Label small | 0.75   | 500    | 0.08em uppercase |
| Mono        | 0.875  | 450    | 0                |

## Color

Strategy: **Restrained**. Warm paper-toned light surface, near-ink text, one earthen accent used as ink, not decoration.

Tokens (OKLCH, all neutrals carry the warm tint):

| Token            | Value                   | Use                                        |
| ---------------- | ----------------------- | ------------------------------------------ |
| `--paper`        | `oklch(0.985 0.008 75)` | Page background — warm off-white           |
| `--paper-2`      | `oklch(0.97 0.012 75)`  | Sunken surfaces (input fields, code wells) |
| `--rule`         | `oklch(0.88 0.012 75)`  | Hairlines between sections                 |
| `--rule-strong`  | `oklch(0.78 0.015 75)`  | Borders on focused/hovered controls        |
| `--ink`          | `oklch(0.22 0.02 60)`   | Body type — warm near-black, never #000    |
| `--ink-muted`    | `oklch(0.46 0.02 60)`   | Captions, labels                           |
| `--ink-faint`    | `oklch(0.65 0.02 60)`   | Hints                                      |
| `--accent`       | `oklch(0.55 0.16 40)`   | Terracotta / vermilion. Sparse, ink-grade  |
| `--accent-hover` | `oklch(0.48 0.18 38)`   | Hover                                      |
| `--accent-quiet` | `oklch(0.94 0.04 50)`   | Soft fill behind accent text               |
| `--accept`       | `oklch(0.5 0.13 145)`   | Accepted-state mark (forest green)         |
| `--reject`       | `oklch(0.5 0.18 25)`    | Rejected-state mark (only on results)      |

Forbidden: indigo, purple, slate-blue gradients, anything with chroma > 0.04 at lightness < 0.2 (looks muddy on warm paper).

## Layout

- 24px baseline grid for vertical rhythm. Section spacing = 48 / 64 / 96 — never uniform.
- Page max-width: 1200px. Workspace and library set on a column ratio of `minmax(0, 1fr) 280px`, collapsing to single column under 960px.
- Hairlines (`1px solid var(--rule)`) instead of card chrome. Edges, not boxes.
- The transition table sits on a `--paper-2` wash with hairlines, no rounded box around it.

## Components

- **Buttons**: 32px tall, 1px hairline border in `--rule-strong`, no shadow, no rounded > 4px. Primary uses `--accent` text on `--paper`, secondary is ink on paper.
- **Inputs**: 36px tall, hairline border, 4px radius, mono font inside any state-name input. Focus: 1px solid `--ink`, no glow.
- **Pills / chips**: tiny (10px), uppercase, monospace, no background — just colored text + 1px hairline. Used for "start" / "accept" markers on state rows.
- **No card shadows anywhere.** Elevation is communicated through hairlines and shifts in surface tone.

## Motion

- 150 ms cubic-bezier(0.2, 0, 0, 1) on hover/focus state transitions.
- Result chip on test: fade in 200ms; the trace strip below renders instantly.
- No page-load orchestration.

## Imagery / iconography

- No section icons. Section heads carry their own meaning.
- Lucide reserved for utility affordances only: `log-out`, `trash`, `play`, `chevron`. Set at 14px, stroke-width 1.5, color always `currentColor`.
- The wordmark is the wordmark, set in Fraunces, with the glyph `δ` set in italic accent color immediately after.

## Empty / error / loading states

- Empty library: a single line of editorial body copy, no illustration, no icon.
- Form validation errors: inline, monospace, accent-colored, prefixed by the field name (e.g. `δ: q1 is not a declared state`).
- No loading spinners on save (operations are instant on localStorage). Auth uses a static "Redirecting…" line.
