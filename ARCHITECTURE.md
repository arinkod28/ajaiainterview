# Architecture Note

## Overall Approach

I approached this as a product-first exercise: what's the strongest coherent experience I can ship in 4–6 hours? Rather than building thin slices of many features, I focused on making the core editing and sharing loops feel complete and polished.

## Key Decisions

### TipTap over building a custom editor

The editing experience is the product's center of gravity. Building a contenteditable-based editor from scratch would have consumed most of the timebox on low-level browser quirks. TipTap (built on ProseMirror) gives me a production-quality rich-text foundation — proper input handling, undo/redo, extensible formatting — so I could invest time in the product layer instead.

### SQLite (sql.js) over Postgres/Supabase

For a take-home, reviewer experience matters. SQLite means zero external dependencies: no database server to provision, no connection strings to configure. sql.js runs pure JavaScript so it works everywhere without native compilation. The tradeoff is that it's in-memory with manual file persistence (I write to disk after each mutation), which wouldn't scale, but it's appropriate for this scope.

### Vanilla CSS over Tailwind

The UI has a specific editorial aesthetic (DM Serif Display headings, muted greens, paper-like editor surface). CSS custom properties give me full control over the design system without adding build complexity. For a project this size, the overhead of configuring Tailwind wasn't justified.

### Session auth over JWT

Sessions with httpOnly cookies are simpler and more secure for a server-rendered single-origin app. JWTs would add complexity (token refresh, storage decisions) without benefit here. The seeded accounts with bcrypt-hashed passwords demonstrate the auth model without requiring OAuth setup.

### Single deploy target (Railway)

Deploying frontend and backend as a single service eliminates CORS configuration, cookie domain issues, and reduces the deployment surface. Vite builds to `dist/`, Express serves it statically in production. One `npm start` command runs everything.

## What I Prioritized

1. **Editor quality** — The TipTap integration supports bold, italic, underline, strikethrough, three heading levels, bullet and ordered lists, blockquotes, and horizontal rules. Auto-save with debounce and a visible status indicator.

2. **Sharing model** — Owner-based access control with per-user edit/view permissions. The sharing UI shows who has access and lets owners manage permissions. Access checks run server-side on every request.

3. **File import** — Three file types (.txt, .md, .docx) convert to HTML and create editable documents. DOCX conversion uses Mammoth for clean semantic HTML output.

4. **Persistence** — SQLite stores documents, users, shares, and attachments. Content is stored as HTML, preserving all formatting across sessions.

5. **Real-time sync (polling)** — The editor polls for remote changes every 5 seconds. The poll is skipped if the user has typed within the last 3 seconds or a save is in flight, avoiding conflicts without a WebSocket layer. This is a pragmatic middle ground: not as low-latency as Yjs/CRDT but zero additional infrastructure.

6. **Last edited by** — A `last_edited_by` column was added to the documents table (with a safe `ALTER TABLE` migration). Every `PUT /api/documents/:id` records the editor's user ID. The sidebar and document header surface this, making it easy to see who last touched a shared document.

7. **Markdown export** — A client-side `htmlToMarkdown` function walks the TipTap DOM output and converts headings, inline marks, lists, blockquotes, and HR elements to Markdown syntax. No server round-trip needed; the file downloads directly in the browser.

## What I'd Build Next (2–4 hours)

- **True real-time collaboration** — Replace the polling loop with a WebSocket layer + Yjs CRDT. TipTap has a first-party collaboration extension.
- **Document version history** — Store snapshots on save, let users view and restore previous versions.
- **PDF export** — Pair the existing HTML content with a headless renderer or a library like `puppeteer`.
- **Better mobile responsiveness** — The sidebar needs a collapsible mobile layout.
- **Rate limiting and input sanitization** — The HTML content should be sanitized server-side (DOMPurify) to prevent XSS via stored content.
