# AGENTS.md

## Project Overview

**Automata Studio** is a clean, modern single-page web application for designing, testing, converting, and minimizing finite automata (DFA, NFA, and ε-NFA). The application comprises two main pages:

1. `index.html` (the workspace)
2. `auth.html` (user sign-in with Google, GitHub, and Microsoft via Firebase Authentication)

The app is built as a static multi-page project, bundled with Vite, and deployed to Vercel.

## Stack

- **Vite 6** — Build tool and dev server configured for multi-page routing.
- **Tailwind CSS v4** — Styling via `@tailwindcss/vite`. Design tokens are defined in the `@theme` block at the top of `src/styles/main.css`.
- **Vitest 2 + happy-dom** — Test runner. A custom `localStorage` shim is installed in `src/test-setup.js` to override Node 26's experimental built-in `localStorage` which shadows happy-dom's.
- **Firebase Authentication** — For Google and GitHub sign-in, configured via `VITE_FIREBASE_*` environment variables.
- **Lucide Icons** — Rendered on elements with `data-lucide` attributes using `src/ui/icons.js`.

## Architecture & Module Layout

- `src/engine/` — Pure logic (automaton classes, validations, conversions, minimizations). **NO DOM references allowed here** (must remain purely testable in plain Node).
  - `errors.js` — Custom error types (`AutomatonError`, `ValidationError`, `EvaluationError`).
  - `dfa.js` — DFA class (construction, validation, trace execution).
  - `nfa.js` — NFA class (supports ε transitions via the empty symbol `ε`).
  - `convert.js` — `nfaToDfa` (subset construction) and `minimizeDfa` (partition refinement).
  - `index.js` — Barrel export for the engine.
- `src/auth/`
  - `firebase.js` — Firebase Authentication integration and local development credentials shim.
- `src/storage/`
  - `local.js` — User-scoped `localStorage` adapter.
- `src/ui/`
  - `icons.js` — Rendering icons via Lucide.
  - `parse.js` — Helpers for parsing list inputs and pre-built automaton examples.
  - `workspace.js` — Workspace controller owning DOM setup and interaction wiring.
- `src/styles/`
  - `main.css` — Tailwind v4 CSS directives and design tokens.
- Root entries:
  - `src/main.entry.js` — Entry point for `index.html`.
  - `src/auth.entry.js` — Entry point for `auth.html`.
  - `src/sso-callback.entry.js` — Entry point for `sso-callback.html`.

## Git & Workflow Conventions

- **Commit format**: Conventional Commits specification. Prefix commits with types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`, `perf`, `revert`, `build`.
- **Branch naming**:
  - `feature/<description>` or `feature/<ticket-id>-description`
  - `fix/<description>` or `fix/<ticket-id>-description`
- Every commit must be atomic representing one logical, complete change.
- Run `npm run format:check` and `npm test` before pushing or creating pull requests.

## Code Style & Rules

- **No DOM in `src/engine/`**: Keep engine modules pure and Node-compatible to prevent breaking tests.
- **State separators**: Subset-construction labels must use `+` as a separator (e.g., `{q0+q1}`), not commas. The UI uses commas to parse lists of states, so commas in subset names will break parsing.
- **Automaton Type changes**: Always call `setType(type, { resetTransitions: false })` from `loadFromDefinition` to set state type correctly before processing transitions.
- **Save Event Handlers**: Wired inside `src/ui/workspace.js` via direct event listeners. The library list is re-rendered and re-wired via `refreshLibrary()` on saves/deletions.
- **Error Boundaries**: Validate inputs at the UI boundary. State names must be non-empty strings. Catch `ValidationError` and `EvaluationError` in `workspace.js` and report them to the UI.

## Auth Dev Shim

`src/auth/firebase.js` falls back to a fake `dev-user` in local development if `import.meta.env.DEV` is true and `VITE_FIREBASE_API_KEY` is not defined. The shim is stripped out of production builds. The fake user is bypassed on `/auth.html` to allow previewing the sign-in layout.

## Environment Variables

- `VITE_FIREBASE_API_KEY` — Firebase API configuration key.
- `VITE_FIREBASE_AUTH_DOMAIN` — Firebase Auth Domain.
- `VITE_FIREBASE_PROJECT_ID` — Firebase Project ID.
- `VITE_FIREBASE_STORAGE_BUCKET` — Firebase Storage Bucket.
- `VITE_FIREBASE_MESSAGING_SENDER_ID` — Firebase Messaging Sender ID.
- `VITE_FIREBASE_APP_ID` — Firebase App ID.

## Commands

- **Install dependencies**: `npm ci`
- **Development server**: `npm run dev`
- **Production build**: `npm run build`
- **Preview build locally**: `npm run preview`
- **Run tests**: `npm test`
- **Watch tests**: `npm run test:watch`
- **Auto-format code**: `npm run format`
- **Check formatting**: `npm run format:check`
