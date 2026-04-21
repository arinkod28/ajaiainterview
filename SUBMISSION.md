# Submission Contents

## Files Included

| File/Directory            | Description                                              |
|---------------------------|----------------------------------------------------------|
| `README.md`               | Setup instructions, tech stack, API docs                 |
| `ARCHITECTURE.md`         | Architecture decisions and tradeoff rationale             |
| `AI_WORKFLOW.md`          | AI tool usage, what was changed/rejected, verification   |
| `SUBMISSION.md`           | This file — submission manifest                          |
| `VIDEO_URL.txt`           | Walkthrough video link                                   |
| `src/`                    | Full source code (client + server + tests)               |
| `package.json`            | Dependencies and scripts                                 |
| `vite.config.js`          | Frontend build configuration                             |
| `railway.toml`            | Deployment configuration                                 |
| `index.html`              | Vite entry point                                         |

## Live Deployment

**URL:** _[insert Railway URL]_

## Test Accounts

| Email           | Password    |
|-----------------|-------------|
| alice@demo.com  | password123 |
| bob@demo.com    | password123 |
| carol@demo.com  | password123 |

## Feature Status

| Feature                     | Status      | Notes                                              |
|-----------------------------|-------------|-----------------------------------------------------|
| Document creation           | ✅ Complete | Create, rename, delete                              |
| Rich-text editing           | ✅ Complete | Bold, italic, underline, strike, H1-H3, lists, quotes, HR |
| Auto-save                   | ✅ Complete | 800ms debounce with status indicator                |
| File import (.txt, .md, .docx)| ✅ Complete | Converts to HTML, creates editable document         |
| User auth                   | ✅ Complete | Session-based with seeded accounts                  |
| Document sharing            | ✅ Complete | Owner shares by email, edit/view permissions        |
| Owned vs shared distinction | ✅ Complete | Separate sidebar sections, shared badges            |
| Persistence                 | ✅ Complete | SQLite — documents survive refresh                  |
| Automated tests             | ✅ Complete | 14 integration tests covering auth, CRUD, sharing   |
| Deployment                  | ✅ Complete | Railway single-service deploy                       |

## What I Would Build Next (2–4 hours)

1. Real-time collaboration via WebSockets + Yjs
2. Document version history with restore
3. PDF/Markdown export
4. Server-side HTML sanitization (DOMPurify)
5. Mobile-responsive sidebar
