# Report (Apr 28, 2026)

## What changed today

### Repo organization

- Split the project into:
  - `frontend/` (existing Vite + React app moved here)
  - `backend/` (new Express API created)

### Backend added

- Implemented REST API in `backend/src/index.js` with routes:
  - `users`, `classes`, `attendance`, `tokens`, `ai` (stub), `enroll`, `content`, `health`
- Implemented **JSON fallback persistence** using `backend/data/*.json`
- Implemented **Postgres primary mode** when `DATABASE_URL` is set
- Added schema migrations (`backend/src/db/migrate.js`)
- Added optional JSON → Postgres seeding (`SEED_FROM_JSON=1`) so pgAdmin-backed DB can become authoritative when connected

### Frontend wiring

- Added `frontend/src/lib/api.ts` and wired:
  - login/signup to backend (`/api/users/login`, `/api/users/register`)
  - enroll form to backend (`/api/enroll`)
  - programs/tutors/posts/courses/community/wallpapers/subjects now fetched from backend content endpoints
  - token balance displayed in Courses window when authenticated

### Remaining de-hardcoding

- Moved remaining demo datasets into backend JSON + content endpoints:
  - Terminal filesystem + fortunes
  - default profile
  - mobile programs list
  - Firefox bookmarks

### Deployment helpers

- Added `backend/render.yaml` + `backend/Dockerfile`
- Added root `netlify.toml`
- Added env templates:
  - `backend/.env.example`
  - `frontend/.env.example`

### Realtime + persistence + AI

- Added Socket.IO realtime server:
  - classroom presence
  - classroom chat history + messages
  - WebRTC signaling relay (server-side)
- Wired Live Classroom chat + participant count to realtime server.
- Implemented full WebRTC media negotiation in `LiveClassroomWindow`:
  - getUserMedia (mic/camera)
  - RTCPeerConnection per peer
  - SDP/ICE exchange over Socket.IO
  - renders remote video tiles
- Fixed realtime config wiring so `/api/realtime/config` ICE servers are applied before RTCPeerConnections are created.
- Added a main viewport media panel (local + remote tiles) in the Live Classroom, toggleable via the monitor button.
- Added community persistence endpoints (`/api/community/*`) and frontend now persists messages/reactions when authenticated.
- Added Gemini integration for `/api/ai/tutor` when `GOOGLE_AI_API_KEY` is configured.
- Added AI panel in Live Classroom chat sidebar:
  - `/api/ai/tutor` prompt + response
  - `/api/ai/voice` STT recording + optional TTS playback

### Session + user-specific data

- Desktop session now validates authentication against `/api/me` when entering the desktop.
- Added a TopBar power action that triggers a global logout.

### CI

- Added GitHub Actions workflow to build frontend and run backend smoke tests.

## What remains / suggested improvements

- Improve WebRTC UX (tiles, mute indicators, camera preview) and add TURN for strict NATs.
- Add Google STT/TTS option if you prefer GCP over OpenAI.
- Add richer moderation/auth roles for community and classroom.
