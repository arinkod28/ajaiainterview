# AI Workflow Note

## Tools Used

- **Claude (Anthropic)** — Primary AI assistant for architecture planning, code generation, and documentation. Used via chat interface throughout the project.

- **Codex (OpenAI)** — Secondary AI assistant for backend development.

## Where AI Materially Sped Up Work

**Boilerplate and wiring:** The Express route handlers, SQLite schema, API client, and React component scaffolding were generated with AI assistance. This saved roughly 1–2 hours of typing repetitive CRUD patterns, letting me focus on product decisions and UX.

**Markdown-to-HTML converter:** The basic markdown parser in the file upload route was AI-generated. For the scope of this project, a lightweight regex-based approach was sufficient — a production app would use a proper library like `marked` or `remark`.

**HTML-to-Markdown export:** The `htmlToMarkdown` function in `Editor.jsx` was AI-generated. It walks the TipTap DOM output and maps each node type to its Markdown equivalent. I verified the output against the editor's formatting options (headings, inline marks, lists, blockquotes, HR) rather than testing against arbitrary HTML.

**CSS design system:** AI helped draft the initial CSS variables and component styles. I iterated on the color palette, typography pairing (DM Sans + DM Serif Display), and spacing to get the editorial feel I wanted.

**Test scaffolding:** The integration test file structure and assertion patterns were AI-assisted, though I defined what scenarios to test based on the product requirements.

## What I Changed or Rejected

- **Initial suggestion of better-sqlite3:** AI suggested this first but it requires native compilation (node-gyp), which fails in restricted environments. I switched to sql.js (pure JS SQLite) after the build error.

- **Over-engineered auth:** Early suggestions included JWT with refresh tokens and role-based middleware. I simplified to express-session with seeded accounts — appropriate for the scope and faster to implement.

- **Tailwind CSS:** AI defaulted to Tailwind. I opted for vanilla CSS with custom properties to keep the design intentional and avoid configuration overhead.

- **Generated component structure:** AI initially created a more fragmented component tree. I consolidated to fewer, more cohesive components (Dashboard handles the sidebar + layout, Editor handles toolbar + content + auto-save) to reduce prop drilling and keep the codebase navigable.

- **WebSocket for real-time sync:** AI's first suggestion for live collaboration was a full WebSocket + Yjs setup. I opted for a simpler polling approach (5-second interval with idle/save guards) to avoid adding socket infrastructure for this scope. The tradeoff is latency, but the implementation is self-contained in `Editor.jsx`.

## How I Verified Correctness

- **Manual testing:** Ran through complete user flows — login, create document, edit with formatting, import files, share between users, verify access control.
- **Build verification:** Confirmed `vite build` produces a working production bundle and the Express server serves it correctly.
- **Code review:** Read through every generated file before committing. Checked SQL queries for injection safety (parameterized), verified session middleware guards all protected routes, and confirmed the sharing permission model enforces owner-only operations (delete, share management).
- **Edge cases:** Tested sharing a document with yourself (blocked), accessing an unshared document (403), deleting as non-owner (403), and importing each file type.
