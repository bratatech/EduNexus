# Report (May 11, 2026)

## Current architecture

```mermaid
flowchart LR
  U[User Browser]

  subgraph FE[Frontend (Vite + React + TS)]
    D[ctOS Desktop UI]
    WM[Window Manager]
    L[Login/Boot]
    P[Profile Window]
    C[Community Window]
    LC[Live Classroom Window]
    VS[VS Code Window]
    DS[Document Summarizer]
  end

  subgraph BE[Backend (Express)]
    API[REST API /api/*]
    RT[Socket.IO Realtime]
    DB[(Storage Adapter)]
    JSON[JSON fallback: backend/data/*.json]
    PG[(Postgres when DATABASE_URL set)]
    AI[AI Router /api/ai/*]
  end

  subgraph EXT[External Providers]
    G[Gemini API - gemini-2.5-flash]
    OA[OpenAI API]
    TURN[(STUN/TURN Servers)]
  end

  U -->|HTTP| FE
  FE -->|fetch() + JWT| API
  FE -->|Socket.IO| RT

  API --> DB
  DB --> JSON
  DB --> PG

  AI --> G
  AI --> OA

  LC -->|WebRTC ICE| TURN
```

### Key flows

- **Auth/session**
  - Frontend stores JWT in `localStorage` (`edunexuz-token`).
  - When entering the desktop state, frontend validates auth via `GET /api/me`.
  - Global logout is triggered from the TopBar power button.

- **Realtime classroom**
  - `GET /api/realtime/config` provides `socketPath` and `iceServers`.
  - Frontend connects via Socket.IO for:
    - presence
    - chat history + messages
    - WebRTC signaling relay (offer/answer/ICE)
  - Actual audio/video flows peer-to-peer via WebRTC.

- **AI Tutor**
  - `POST /api/ai/tutor` sends prompt → Gemini API → returns answer
  - Fallback model: `gemini-2.5-flash`
  - Retry logic: 2 retries with backoff for 429/503 errors
  - Model auto-fallback on 404

- **Document Summarizer**
  - `POST /api/ai/documents/summarize` (multipart upload)
  - Gemini generates structured JSON: title, summary, highlighted notes
  - Persisted to `document_summaries.json`
  - `GET /api/ai/documents` returns user's summaries

## Verification (local run)

Validated locally with:

- Backend: `npm run dev` (port `8080`)
- Frontend: `npm run dev` (port `5173`)

Smoke checks:

- `GET /api/health` ✅ OK
- `GET /api/realtime/config` ✅ OK
- `GET /api/ai/health` ✅ shows providers configured (gemini + openai)
- Register → `/api/me` → `/api/ai/tutor` ✅ successful (AI returned "2 plus 2 equals 4.")
- Frontend SSR ✅ no "window is not defined" error
- Desktop loads ✅ all windows, dock, icons render correctly
- Terminal window ✅ neofetch runs without SSR crash
- VS Code window ✅ renders with line numbers, tabs, minimap
- Document Summarizer ✅ submits + displays results with user-friendly errors

## Bugs fixed in this session

### 1. SSR crash — `window is not defined`
- **Root cause**: `TerminalWindow.tsx` used `window.innerWidth` and `performance.memory` in a module-level template literal (`NEOFETCH`). During server-side rendering, `window` is undefined.
- **Fix**: Converted `NEOFETCH` from a module-level constant to a `getNeofetch()` function that is called only at runtime inside the component.

### 2. Gemini API — `gemini_unavailable` / `server_error`
- **Root cause (model)**: The default Gemini model `gemini-1.5-flash` has been deprecated by Google and returns 404 Not Found.
- **Fix (model)**: Updated to `gemini-2.5-flash` in `.env`, `.env.example`, `config.js`, and all fallback references in `ai.js`.
- **Root cause (error handling)**: The fallback retry in the tutor endpoint was not wrapped in try-catch, causing unhandled errors to reach the global Express error handler (returning generic `server_error` instead of `gemini_unavailable`).
- **Fix (error handling)**: Wrapped fallback retry in try-catch. Added `console.error` logging. Added `detail` field to all `gemini_unavailable` responses so the root cause is visible.

### 3. VSCode window — basic textarea
- **Issue**: The VS Code window was a plain textarea without line numbers, tabs, or VS Code styling.
- **Fix**: Complete rewrite with: activity bar, file explorer sidebar, tab bar with close buttons, line numbers gutter, minimap, breadcrumbs, proper status bar with line/column info, Tab key inserts spaces, file icons, and authentic VS Code dark color scheme.

### 4. Document Summarizer — raw error codes
- **Issue**: Frontend showed raw error codes like `gemini_unavailable` to users.
- **Fix**: Added a friendly error message mapper that converts API error codes to human-readable messages.

## Implemented features (as of now)

### Platform / UX

- ctOS desktop UI with a window manager + theming
- Boot sequence
- Global logout from TopBar power button
- In-app VS Code workspace window:
  - per-user workspace (`<user_name> workspace`)
  - activity bar with explorer, search, source control icons
  - file explorer sidebar (collapsible)
  - tab bar with close buttons and active tab highlighting
  - line numbers gutter with active line highlighting
  - minimap (decorative code preview)
  - breadcrumb navigation
  - status bar with line/column, language, encoding info
  - Tab key inserts 2 spaces
  - file icons per language type
  - local persisted files + common languages by file extension
  - file create/rename/delete

### Backend

- Express REST API under `/api/*`
- Storage adapter:
  - JSON persistence fallback (`backend/data/*.json`)
  - Postgres primary when `DATABASE_URL` is set
- Rate limiting + Helmet + CORS
- Realtime Socket.IO server attached to the same HTTP server

### Auth + user data

- Register/login endpoints (`/api/users/*`)
- `/api/me` returns user + profile + stats
- Profile updates via `/api/me/profile`

### Content

- JSON-backed content endpoints (`/api/content/*`) used by frontend windows (programs, wallpapers, etc.)

### Browser

- Firefox window:
  - uses DuckDuckGo when input is a search query
  - supports opening the current page externally for sites that block iframe embedding

### Community

- Persisted community messages + reactions (`/api/community/*`) when authenticated

### Live Classroom

- 3D classroom scene (react-three-fiber)
- Presence + chat (Socket.IO)
- WebRTC video:
  - local camera preview
  - remote tiles
  - ICE servers are fetched from `/api/realtime/config` and applied to RTCPeerConnection creation
- Main "viewport media panel" toggle so video isn't only inside the chat sidebar

### AI

- AI Tutor (`POST /api/ai/tutor`)
  - provider: Gemini (cloud, default model `gemini-1.5-flash`) or Ollama (local)
  - retry logic with backoff for 429/503
  - auto-fallback on 404 model errors
  - detailed error responses with `detail` field
- Voice:
  - STT: `POST /api/ai/voice/stt` (multipart)
  - TTS: `POST /api/ai/voice/tts`
  - provider: OpenAI
- Document Summarizer:
  - `POST /api/ai/documents/summarize` — upload text file, get structured summary
  - `GET /api/ai/documents` — list user's saved summaries
  - `GET /api/ai/documents/:id` — get a specific summary
  - Returns: title, summary (5-12 sentences), highlighted notes with importance levels
  - User-friendly error messages on frontend

### Terminal

- Ubuntu-style shell with 30+ commands
- neofetch (SSR-safe), cowsay, fortune, hack, matrix
- theme switching via `theme <name>` command
- window management via `open <app>` / `exit` commands
- Tab completion, command history (arrow keys)

## Suggested improvements / backlog

### WebRTC / Realtime

- Add TURN by default for strict NATs (`WEBRTC_ICE_SERVERS_JSON` + production TURN service)
- Improve WebRTC UX:
  - mute/camera indicators per tile
  - active speaker detection
  - reconnection/backoff + better error messages

### Security / Auth

- Use HttpOnly cookies instead of localStorage JWT (optional)
  - Issue a short-lived access token as an HttpOnly cookie (e.g., `edunexuz_access`) with:
    - `HttpOnly`, `Secure` (in prod), `SameSite=Lax` (or `Strict` if UX allows)
    - `Path=/` and a reasonable `Max-Age`
  - Update frontend `apiFetch` to send credentials (`credentials: "include"`) and remove token storage from `localStorage`.
  - Add CSRF protection if using cookies cross-site:
    - double-submit cookie, or per-request CSRF token header.

- Add refresh tokens / session rotation
  - Add `POST /api/auth/refresh`:
    - refresh token stored as HttpOnly cookie (`edunexuz_refresh`) with longer TTL
    - rotate refresh token on every refresh (store hash server-side)
    - revoke token family on suspicious reuse
  - Add `POST /api/auth/logout` to clear cookies + revoke refresh token.

- More granular roles (student/tutor/admin) + moderation
  - Add `role` column to users and enforce RBAC in backend middleware.
  - Protect routes:
    - community moderation (delete message, ban user)
    - classroom creation/management
    - admin-only content management
  - Add basic audit logging (who did what, when) for moderation actions.

### AI

- Add optional Google STT/TTS provider
  - Add `AI_VOICE_PROVIDER=google` mode (parallel to OpenAI)
  - Implement endpoints compatible with current frontend:
    - STT: accept audio and return `{ transcript }`
    - TTS: accept `{ text }` and return `{ audioBase64, audioMime }`
  - Keep provider selection behind env vars so deployments can choose cost/latency.

- Add usage quotas + per-user rate limits
  - Add per-user limits for:
    - tutor prompts per minute/day
    - STT minutes per day
    - TTS characters per day
    - document pages/bytes per day
  - Persist counters in Postgres when available; JSON fallback otherwise.
  - Return friendly `429 { error: "rate_limited" }` so the frontend can show upgrade/wait messaging.

- Document summarizer precision improvements
  - PDF/DOCX parsing:
    - extract text with `pdf-parse` / `mammoth`
    - handle empty/garbled extraction with a clear `document_text_unreadable`
  - Prompting:
    - add a short "reading level" target (student-friendly)
    - explicitly request definitions + formulas + common pitfalls
  - Validation:
    - if model returns invalid JSON, retry once with a stricter "fix JSON" prompt
    - enforce `highlightedNotes` length bounds
  - Optional: chunk long documents + summarize per section, then merge.

### Data model

- Add validation + migrations for community + classroom entities
- Add analytics dashboards (usage, engagement)

### Testing / CI

- Add frontend smoke tests and Playwright E2E flows
- Add API contract tests
