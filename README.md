# Automata Studio

A clean, modern web studio for designing, testing, converting and minimizing finite automata.

- **DFA, NFA, ε-NFA** — define states, alphabet, transitions and accept states; test input strings instantly with a step-by-step state trace.
- **NFA → DFA** via subset construction (handles ε-closures correctly).
- **DFA minimization** via partition refinement (also removes unreachable states).
- **Google & GitHub sign-in** via Firebase Authentication; saved automata are scoped per user in local storage.
- Built with **Vite**, **Tailwind CSS v4**, **Vitest** and **Lucide** icons.

## Quick start

```bash
npm install
cp .env.example .env.local
# Add your Firebase configuration keys to .env.local
npm run dev
```

Then open <http://localhost:5173>. In dev, if no Firebase key is set, the app falls back to a local dev user so you can play with the workspace without configuring auth.

## Commands

| Command           | What it does                       |
| ----------------- | ---------------------------------- |
| `npm run dev`     | Start the Vite dev server          |
| `npm run build`   | Production build to `dist/`        |
| `npm run preview` | Serve the production build locally |
| `npm test`        | Run the full test suite (Vitest)   |
| `npm run format`  | Prettier write                     |

## Project layout

```
src/
  engine/    Pure automaton logic (DFA, NFA, conversion, minimization) — no DOM
  auth/      Firebase wrapper (Google & GitHub OAuth)
  storage/   Local-storage adapter (user-scoped)
  ui/        Workspace controller, icons, parse helpers, built-in examples
  styles/    Tailwind + design tokens
```

## Tech stack

- **Frontend** — vanilla TypeScript-style ES modules, Vite, Tailwind v4
- **Auth** — Firebase Authentication (Google & GitHub OAuth)
- **Persistence** — browser local storage (swap-in DB ready via `src/storage/`)
- **Tests** — Vitest with happy-dom
- **Deployment** — Vercel
