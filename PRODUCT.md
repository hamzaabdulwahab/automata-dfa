# Automata Studio

A workbench for finite automata. Design, test, convert and minimize DFA / NFA / ε-NFA.

## Register

product

## Users

Computer-science students and educators working through formal-language theory. Most are running this between problem-set deadlines, comparing a screen result to a notebook proof. Familiar with the mathematical notation `M = (Q, Σ, δ, q₀, F)`, not with marketing UIs.

A teaching assistant might open it during office hours to walk a student through subset construction. A student opens it because their textbook's example is wrong and they need to verify.

## Product purpose

A real tool, not a tutorial. The user already understands automata; they need a fast way to express one, test it against strings, and apply the standard transformations (NFA→DFA, minimize) without manual bookkeeping. Saved automata are a working library, not a portfolio.

## Tone

Editorial, restrained, technically literate. Sets terms before it labels controls. Trusts the user. Mathematical notation appears where it belongs (∅, ε, Σ, δ, q₀) — never decorative.

No "Welcome to". No "Get started". No "Build powerful". The product is a tool you sit down to.

## Anti-references

Avoid converging on any of these:

- Indigo / purple SaaS accent
- Stacked rounded white cards with shadow
- Inter as the only typeface
- Hero-with-CTA marketing layout
- Decorative grid backgrounds, gradient meshes, glassmorphism
- Trust icons (shields, locks) on the auth screen
- "Welcome" / "Sign in to your account" copy
- Lucide-icon-per-section section headers
- Three-equal-column feature grids
- The Vercel / Linear / Notion default "good taste" palette as-is — admired, but copying it makes us nameless

## Strategic principles

- **Notation first.** When the math has a symbol for it, use the symbol. `ε`, `δ(q, a) = q'`, `q₀`, `F ⊆ Q`. Plain English captions next to symbols, not in place of them.
- **The transition table is the document.** It's not a control inside a card — it's the central artifact of the page. Treat it like a typeset table, not a form.
- **Density over space.** A workbench, not a landing page. White space serves rhythm, not vibe.
- **One restrained accent, used as ink, not as decoration.** Think how a mathematics text uses a single second color for emphasis on a key term, not for "this button is important".
- **The brand is the typesetting.** No logomark beyond a wordmark and a small typographic glyph. No icons doing the work that letters should do.
