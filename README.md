# EduNexuZ (EduNexus)

ctOS-style "desktop" learning platform with:

- Auth (wallet-style username) + profile
- Community chat (persisted)
- Live Classroom with realtime presence/chat and WebRTC video
- AI Tutor (Gemini or Ollama) + Voice (OpenAI STT/TTS)
- Document Summarizer (Gemini-powered, with highlighted notes)
- In-app VS Code editor (per-user workspace, line numbers, tabs, minimap)

## Repo structure

- `frontend/`
  - Vite + React + TypeScript + TanStack Router
  - UI: desktop + window manager
- `backend/`
  - Express REST API + Socket.IO realtime server
  - Storage:
    - JSON fallback in `backend/data/*.json`
    - Postgres primary when `DATABASE_URL` is configured

## Prerequisites

- Node.js 18+ (recommended)
- npm
- Optional: Postgres (when running in `DB_MODE=auto` with `DATABASE_URL`)

## Quick start (local dev)

### 1) Backend

1. Create your env file:

   - Copy `backend/.env.example` to `backend/.env`

2. Install + run:

   - `npm install` (inside `backend/`)
   - `npm run dev`

Backend runs on:

- `http://localhost:8080`

Useful endpoints:

- `GET /api/health`
- `GET /api/realtime/config`
- `GET /api/me` (requires auth)
- `GET /api/ai/health`

### 2) Frontend

1. Create your env file:

   - Copy `frontend/.env.example` to `frontend/.env`

2. Install + run:

   - `npm install` (inside `frontend/`)
   - `npm run dev`

Frontend runs on:

- `http://localhost:5173`

The frontend reads the API base URL from:

- `VITE_API_BASE_URL` (example: `http://localhost:8080`)

## Environment variables

### Backend (`backend/.env`)

See `backend/.env.example` for the authoritative list. Key ones:

- `PORT`
- `CORS_ORIGIN`
- `JWT_SECRET`
- `DB_MODE` (`auto | pg | json`)
- `DATABASE_URL` (optional)
- `SEED_FROM_JSON` (optional)
- `SOCKET_PATH` (default `/socket.io`)
- `GOOGLE_AI_API_KEY`, `GOOGLE_AI_MODEL` (default `gemini-2.5-flash`)
- `AI_TUTOR_PROVIDER` (`gemini | ollama`)
- `OPENAI_API_KEY` (optional)
- `AI_VOICE_PROVIDER` (`openai`)
- `WEBRTC_ICE_SERVERS_JSON` (optional STUN/TURN list)

### Frontend (`frontend/.env`)

See `frontend/.env.example`:

- `VITE_API_BASE_URL`

## Implemented features (high level)

- Desktop login + boot sequence
- Window manager + themed ctOS UI
- Profile window uses `/api/me` and supports saving updates
- Community window persists messages/reactions (auth required)
- Live classroom:
  - realtime presence + chat via Socket.IO
  - WebRTC signaling relay
  - local camera preview + remote tiles
  - ICE servers fetched from `/api/realtime/config`
  - AI tutor panel + STT recording + optional TTS
- VSCode workspace:
  - in-app lightweight editor with per-user persisted files
  - activity bar, file explorer sidebar, tab bar with close buttons
  - line numbers gutter, minimap, breadcrumbs
  - Tab key inserts spaces, proper VS Code dark theme
  - common languages by extension (C/C++/Java/Python/JS/TS/HTML/CSS/Markdown/Rust/Go)
  - file create/rename/delete
- Document Summarizer:
  - upload text documents for AI summarization
  - returns structured title, summary, and highlighted notes with importance levels
  - user-friendly error messages for AI errors
- Firefox window:
  - URL/search bar (DuckDuckGo for search queries)
  - open current page externally when a site blocks iframe embedding
- Terminal:
  - Ubuntu-style shell with 30+ commands
  - neofetch, cowsay, fortune, hack, theme switching, window management
  - SSR-safe (no window references at module scope)
- Global logout (TopBar power button)

## Deployment

- Backend:
  - `backend/render.yaml` + `backend/Dockerfile`
- Frontend:
  - Root `netlify.toml`
  - Set `VITE_API_BASE_URL` to the deployed backend URL

## Troubleshooting

- If backend fails with `EADDRINUSE`:
  - Stop the other process using the port, or change `PORT` in `backend/.env`.
- If AI endpoints return `*_not_configured`:
  - Ensure the appropriate provider env vars are set (see `.env.example`).
- If AI returns `gemini_unavailable`:
  - The Gemini API key may be invalid or the model deprecated. Check the `detail` field in the response. The current default model is `gemini-2.5-flash`.
- If AI returns `gemini_busy`:
  - The Gemini API is rate-limited. Wait and retry.
- If WebRTC connects but you get no media across strict NAT:
  - Configure TURN via `WEBRTC_ICE_SERVERS_JSON`.
