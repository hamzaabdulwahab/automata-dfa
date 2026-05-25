# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Automata Studio** — a single-page web app for building, testing, converting and minimizing finite automata (DFA, NFA, ε-NFA). Two pages: `auth.html` (Google sign-in via Clerk) and `index.html` (the workspace).

Deployed to Vercel as a static Vite build.

## Stack

- **Vite 6** — build tool + dev server. Multi-page input (`index.html`, `auth.html`).
- **Tailwind CSS v4** — via `@tailwindcss/vite`. Design tokens in `@theme` block at the top of `src/styles/main.css`.
- **Vitest 2 + happy-dom** — test runner. Test-setup at `src/test-setup.js` installs a Map-backed `localStorage` shim because Node 26's experimental built-in `localStorage` is gated on a CLI flag and shadows happy-dom's.
- **Clerk** (`@clerk/clerk-js`) — auth. Google OAuth only. Publishable key in `VITE_CLERK_PUBLISHABLE_KEY`.
- **Lucide icons** — imported by name in `src/ui/icons.js` and rendered via `data-lucide` attributes.

## Module layout

```
src/
  engine/         Pure logic — no DOM, fully tested
    errors.js     AutomatonError / ValidationError / EvaluationError
    dfa.js        DFA class (construction, validation, accepts, trace)
    nfa.js        NFA class (supports ε via the ε symbol on transitions)
    convert.js    nfaToDfa (subset construction), minimizeDfa (partition refinement)
    index.js      Barrel re-export
  auth/
    clerk.js      Clerk wrapper + dev-mode fake user (DEV builds only)
  storage/
    local.js      localStorageAdapter — implements { list, save, get, remove }, user-scoped
  ui/
    icons.js      Lucide renderIcons(root)
    parse.js      parseList / parseTargets + built-in EXAMPLES
    workspace.js  createWorkspace({ storage, user, onSignOut }) — owns all DOM wiring
  styles/main.css Tailwind + design tokens
  auth.entry.js   Bundle entry for auth.html
  main.entry.js   Bundle entry for index.html
  test-setup.js   localStorage shim (see Stack)
```

## Conventions

- **No DOM in `src/engine/`**. The engine modules are pure and run in plain Node — that's how their tests pass without a DOM. Adding any `window`/`document` reference there would break the tests.
- **Subset-construction labels use `+` as separator**, not `,` — because the UI parses comma-separated lists for the states input. `{q0,q1}` would round-trip wrong; `{q0+q1}` survives. Don't switch back to commas.
- **Automaton type → setType()**: always call `setType(type, { resetTransitions: false })` from `loadFromDefinition`, because it sets `state.type` BEFORE transitions and the function used to early-return when types matched.
- **Save handlers are wired in `workspace.js`** via direct `addEventListener`. The library list is re-rendered (and re-wired) after every save/delete via `refreshLibrary()`.
- All state names must be non-empty strings. Validation errors throw `ValidationError`; evaluation errors throw `EvaluationError`. Catch both at the UI boundary in `workspace.js`.

## Running

- `npm run dev` — Vite dev server on 5173 (5174 also OK).
- `npm run build` — production build → `dist/`.
- `npm test` — full Vitest run (75+ tests). All must pass before commit.
- `npm run format` / `format:check` — Prettier.

## Auth dev shim

`src/auth/clerk.js` short-circuits to a fake `dev-user` when `import.meta.env.DEV && !VITE_CLERK_PUBLISHABLE_KEY`. The shim is tree-shaken in production builds. The fake user is suppressed on `/auth.html` so the sign-in UI is still viewable in dev.

## Environment variables

- `VITE_CLERK_PUBLISHABLE_KEY` — Clerk publishable key (safe to expose, public client identifier). Set this in Vercel project env for prod. See `.env.example`.
