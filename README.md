# DocEdit

A lightweight collaborative document editor built as a full-stack web application. Create, edit, and share rich-text documents with other users.

**Live Demo:** _[deployed URL here]_

## Features

- **Rich-text editing** — Bold, italic, underline, strikethrough, headings (H1–H3), bullet/numbered lists, blockquotes, horizontal rules. Powered by TipTap/ProseMirror.
- **Auto-save** — Content saves automatically after 800ms of inactivity. Save status indicator shows current state.
- **File import** — Upload `.txt`, `.md`, or `.docx` files to create new editable documents. Markdown is converted to HTML; DOCX uses Mammoth for clean conversion.
- **Sharing** — Share documents with other users by email. Grant edit or view-only access. Shared documents appear in a separate sidebar section.
- **Persistence** — Documents, sharing permissions, and formatting are stored in SQLite and survive page refresh.
- **Multi-user support** — Three seeded demo accounts to test sharing flows end-to-end.

## Demo Accounts

| Email             | Password      | Name  |
|-------------------|---------------|-------|
| alice@demo.com    | password123   | Alice |
| bob@demo.com      | password123   | Bob   |
| carol@demo.com    | password123   | Carol |

## Quick Start (Local)

```bash
# Clone the repo
git clone <repo-url> && cd docedit

# Install dependencies
npm install

# Run in development mode (starts backend + frontend concurrently)
npm run dev
```

The app will be available at `http://localhost:5173` with the API at `http://localhost:3001`.

### Production Build

```bash
npm run build    # Build the frontend
npm start        # Start the production server (serves frontend + API)
```

The production server runs on `PORT` (default 3001).

## Tech Stack

| Layer      | Choice                  | Rationale                                              |
|------------|-------------------------|--------------------------------------------------------|
| Frontend   | React + Vite            | Fast dev/build, simple SPA setup                       |
| Editor     | TipTap (ProseMirror)    | Best-in-class rich text with extensible architecture   |
| Styling    | Vanilla CSS + CSS vars  | Full control, no build overhead, cohesive design system|
| Backend    | Express.js              | Lightweight, well-understood, fast to ship             |
| Database   | SQLite via sql.js       | Zero-config, portable, no external service required    |
| Auth       | express-session + bcrypt| Simple session-based auth, seeded accounts             |
| DOCX parse | Mammoth                 | Clean DOCX-to-HTML conversion                         |
| Deploy     | Railway                 | Single-command deploy, free tier, familiar stack       |

## Project Structure

```
docedit/
├── src/
│   ├── client/           # React frontend
│   │   ├── App.jsx       # Root component, auth state
│   │   ├── LoginPage.jsx # Login form
│   │   ├── Dashboard.jsx # Sidebar + document list + layout
│   │   ├── Editor.jsx    # TipTap editor + toolbar + auto-save
│   │   ├── ShareModal.jsx# Sharing UI
│   │   ├── api.js        # API client helper
│   │   └── styles.css    # Design system
│   ├── server/           # Express backend
│   │   ├── index.js      # Server entry, middleware
│   │   ├── db.js         # SQLite init, seed data, query helpers
│   │   ├── routes/
│   │   │   ├── auth.js   # Login/logout/session
│   │   │   ├── documents.js # CRUD + sharing
│   │   │   └── upload.js # File import
│   │   └── middleware/
│   │       └── auth.js   # Session guard
│   └── tests/
│       └── api.test.js   # Integration tests (Node test runner)
├── index.html            # Vite entry
├── vite.config.js
├── railway.toml
└── package.json
```

## API Endpoints

| Method | Endpoint                         | Description              |
|--------|----------------------------------|--------------------------|
| POST   | `/api/auth/login`                | Login                    |
| POST   | `/api/auth/logout`               | Logout                   |
| GET    | `/api/auth/me`                   | Get current session user |
| GET    | `/api/auth/users`                | List users (for share UI)|
| GET    | `/api/documents`                 | List owned + shared docs |
| POST   | `/api/documents`                 | Create document          |
| GET    | `/api/documents/:id`             | Get document + shares    |
| PUT    | `/api/documents/:id`             | Update title/content     |
| DELETE | `/api/documents/:id`             | Delete (owner only)      |
| POST   | `/api/documents/:id/share`       | Share with user          |
| DELETE | `/api/documents/:id/share/:sid`  | Remove share             |
| POST   | `/api/files/import`              | Import file as new doc   |

## Running Tests

```bash
# Start the server first
npm run dev:server

# In another terminal
npm test
```

Tests cover auth flows, document CRUD, permission checks, and sharing logic.
