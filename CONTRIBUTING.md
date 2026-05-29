# Contributing to Automata Studio

Thank you for your interest in contributing to Automata Studio! This document outlines guidelines, workflows, and standards for developers working on this project.

## Code of Conduct

By participating in this project, you agree to abide by our Contributor Covenant [Code of Conduct](CODE_OF_CONDUCT.md).

## Local Development Setup

To set up a local development environment:

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/hamzaabdulwahab/automata-dfa.git
   cd automata-dfa
   ```

2. **Install Dependencies**:
   Ensure you have Node.js (v20+ recommended) installed, then run:

   ```bash
   npm ci
   ```

3. **Configure Environment Variables**:
   Copy the example environment template:

   ```bash
   cp .env.example .env.local
   ```

   Add your Firebase configuration details to `.env.local`. If you do not have Firebase keys, local development will fallback to a dev-user shim in DEV mode (except on `/auth.html` which tests the sign-in layout).

4. **Run Dev Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

## Git Guidelines

### Branch Naming Conventions

All changes must be made on feature or fix branches branched off `main`:

- **Features**: `feature/short-description` or `feature/JIRA-123-short-description`
- **Bug Fixes**: `fix/short-description` or `fix/GH-123-short-description`
- **Maintenance / Tooling**: `chore/short-description`
- **Documentation**: `docs/short-description`

### Commit Message Format

We strictly follow the **Conventional Commits** specification. Commit messages must be structured as follows:

```
<type>(<scope>): <subject>

<body>

<footer>
```

- **Types**:
  - `feat`: A new feature (corresponds to a minor release)
  - `fix`: A bug fix (corresponds to a patch release)
  - `docs`: Documentation-only changes
  - `style`: Code style changes (whitespace, formatting, missing semi-colons, etc.)
  - `refactor`: A code change that neither fixes a bug nor adds a feature
  - `test`: Adding missing tests or correcting existing tests
  - `chore`: Changes to the build process, tooling, or auxiliary libraries
  - `ci`: Changes to CI/CD files and scripts
- **Subject**: Present imperative tense, max 50 characters, lowercase, no ending period (e.g., `add search filter for DFA states`).

### Atomic Commits

Keep commits focused. Each commit should represent one logical, self-contained change. Review your changes with `git diff` or interactive staging `git add -p` before committing.

## Coding Standards

### Project Architecture & Conventions

- **Pure Engine Code**: All files in `src/engine/` must remain pure JS/TS logic. **Do NOT reference `window`, `document`, or DOM APIs** in this folder. Doing so will break our plain Node environment test runs.
- **State Separators**: Subset-construction names must use `+` as a separator (e.g., `q0+q1`), not commas, as the UI relies on commas to parse list inputs.
- **Auto-Formatting**: We use Prettier for code formatting. Verify files are correctly formatted:
  ```bash
  npm run format:check
  ```
  Or auto-format before committing:
  ```bash
  npm run format
  ```

## Testing Requirements

We use **Vitest** for testing. All PRs must pass the test suite.

- **Run all tests**:
  ```bash
  npm test
  ```
- **Watch mode for active development**:
  ```bash
  npm run test:watch
  ```

If you add logic in `src/engine/`, you **must** write unit tests mirroring the file structure inside `tests/` or in the same folder as `<file>.test.js`.

## Pull Request Process

1. Keep PRs small and focused (preferably under 400 lines of code).
2. Ensure all tests pass (`npm test`) and styling checks pass (`npm run format:check`) locally.
3. Open a Pull Request on GitHub. Use the provided PR template and fill in all details, including a summary of changes, motivation, test validation, and screenshots if the UI changed.
4. Obtain code review approval before merging.
