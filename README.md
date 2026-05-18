# EduNexuZ (EduNexus)

<<<<<<< HEAD
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
=======
EduNexuZ is a full-stack tutoring and learning platform built around a cyber-desktop experience. It combines student onboarding, tutor/program discovery, live classroom collaboration, community chat, AI study support, document summarization, attendance tracking, and token-style learning rewards into one interactive web application.

The project is split into a React/Vite frontend and a Node.js/Express backend. The backend can run with lightweight JSON file storage for local development or PostgreSQL for production-style persistence.

## Table of Contents

- [Business Overview](#business-overview)
- [Core Product Capabilities](#core-product-capabilities)
- [User Roles and Workflows](#user-roles-and-workflows)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Repository Structure](#repository-structure)
- [Backend](#backend)
- [Frontend](#frontend)
- [API Surface](#api-surface)
- [Data and Persistence](#data-and-persistence)
- [Realtime Classroom](#realtime-classroom)
- [AI Features](#ai-features)
- [Security and Validation](#security-and-validation)
- [Local Setup](#local-setup)
- [Environment Variables](#environment-variables)
- [Testing and Quality](#testing-and-quality)
- [Deployment](#deployment)
- [Business Roadmap](#business-roadmap)

## Business Overview

EduNexuZ is designed for a digital tutoring business that needs to convert prospective learners, match students with tutors, host live learning sessions, and keep learners engaged after enrollment.

The business model represented in the product includes:

- Student acquisition through program pages and enrollment requests.
- Subject-based tutoring across math, sciences, languages, computer science, and test preparation.
- Tutor discovery with instructor profiles and course/program browsing.
- Live online classrooms for remote tutoring sessions.
- Community channels that keep learners active between lessons.
- AI-assisted learning support for tutoring prompts, voice workflows, quizzes, focus logs, and document summaries.
- Token rewards that can support gamification, loyalty, progress incentives, or future Web3-style credentialing.

The interface intentionally uses a desktop metaphor rather than a standard marketing site. On larger screens, users enter a windowed workspace with apps such as Programs, Instructors, Courses, Live Classroom, Community, Profile, Terminal, Settings, and Document Summarizer. On mobile, the app presents a streamlined enrollment-oriented experience.

## Core Product Capabilities

- Authentication with wallet-style user identifiers, names, email addresses, passwords, and JWT sessions.
- Student enrollment form for collecting contact information, learning level, subjects, session format, and notes.
- Program, course, tutor, subject, post, wallpaper, bookmark, and profile content served through backend content endpoints.
- Desktop-style frontend with draggable app windows, dock navigation, top bar controls, boot/login flow, wallpapers, and themes.
- Live classroom with Socket.IO presence, classroom chat history, media panel, and WebRTC signaling.
- Community channels with persisted messages, media/code message types, and reactions.
- User profile and statistics dashboard, including token balance, attended classes, and community activity.
- Attendance tracking for class participation.
- EduV token reward balance and reward transaction records.
- AI tutor endpoint backed by Gemini or a local Ollama model.
- AI voice support using OpenAI speech-to-text and text-to-speech when configured.
- AI document summarization for student-uploaded text-readable documents.
- JSON fallback storage for local demos and PostgreSQL mode for production deployments.

## User Roles and Workflows

### Prospective Student

1. Opens EduNexuZ on desktop or mobile.
2. Browses programs, instructors, and courses.
3. Submits an enrollment request with preferred subjects and learning format.
4. Can register or log in to access the full desktop workspace.

### Registered Student

1. Logs in with wallet identifier and password.
2. Enters the EduNexuZ desktop after the boot sequence.
3. Views courses, community channels, profile stats, and token balance.
4. Joins live classroom rooms for lessons.
5. Uses AI tutor, voice, quiz, and document summary tools during study.

### Tutor or Instructor

1. Can create class records through authenticated class APIs.
2. Can use live classroom rooms for synchronous tutoring.
3. Can review attendance records and learner participation data.

### Platform Operator

1. Manages seeded content in JSON files or PostgreSQL.
2. Deploys the frontend to Netlify and backend to Render.
3. Configures AI providers, database mode, CORS, JWT secrets, and realtime/WebRTC settings.

## Architecture

```text
Browser
  |
  | Vite React app
  | TanStack Router routes
  | Socket.IO client
  | WebRTC peer connections
  v
Frontend
  |
  | REST API calls
  | JWT bearer auth
  | Realtime socket events
  v
Backend Express API
  |
  | Storage adapter
  +--> JSON files in backend/data for local fallback
  |
  +--> PostgreSQL when DATABASE_URL is configured
  |
  +--> Optional AI providers
       - Google Gemini for tutor and document summaries
       - Ollama for local tutor generation
       - OpenAI for speech-to-text and text-to-speech
```

The backend exposes REST routes under `/api/*` and attaches a Socket.IO server to the same HTTP server. The frontend reads the backend URL from `VITE_API_BASE_URL`.

## Technology Stack

### Frontend

- React 19
- TypeScript
- Vite 7
- TanStack Router
- TanStack React Query
- Tailwind CSS 4
- Radix UI primitives
- shadcn-style UI component structure
- Lucide React icons
- Socket.IO Client
- Three.js, React Three Fiber, and Drei
- Recharts
- React Hook Form
- Zod
- Sonner toast notifications
- Embla Carousel
- Vaul drawer primitives
- date-fns
- ESLint and Prettier

### Backend

- Node.js
- Express
- Socket.IO
- PostgreSQL with `pg`
- JSON file persistence fallback
- JWT authentication with `jsonwebtoken`
- Password hashing with `bcryptjs`
- Zod request validation
- Helmet security headers
- Express Rate Limit
- CORS
- Multer for document/audio uploads
- Google Generative AI SDK
- OpenAI SDK
- Native Node test runner

### Infrastructure and Deployment

- Netlify frontend deployment via root `netlify.toml`
- Render backend deployment via `backend/render.yaml`
- Docker backend image via `backend/Dockerfile`
- GitHub Actions CI for backend tests and frontend build
- Optional PostgreSQL database, manageable through pgAdmin or another database client

## Repository Structure

```text
.
|-- frontend/                  React, Vite, TypeScript web app
|   |-- src/
|   |   |-- components/desktop  Desktop shell, dock, top bar, windows
|   |   |-- components/ui       Reusable UI primitives
|   |   |-- lib                 API client, theme provider, window manager
|   |   |-- routes              TanStack Router pages
|   |   `-- styles.css          Global styles and theme tokens
|   |-- package.json
|   |-- vite.config.ts
|   `-- wrangler.jsonc
|
|-- backend/                   Express API and realtime server
|   |-- src/
|   |   |-- routes              REST API route modules
|   |   |-- db                  PostgreSQL migrations, adapter, seed logic
|   |   |-- realtime            Socket.IO classroom server
|   |   |-- storage             JSON storage helper
|   |   |-- auth.js             JWT auth middleware
|   |   |-- config.js           Environment-driven configuration
|   |   `-- index.js            App bootstrap
|   |-- data/                   Seed/demo JSON datasets
|   |-- test/                   Backend smoke tests
|   |-- Dockerfile
|   |-- render.yaml
|   `-- package.json
|
|-- .github/workflows/         CI workflow
|-- EduNexus_Architecture.pdf  Architecture reference
|-- report.md                  Implementation notes
|-- netlify.toml               Netlify config
`-- README.md
```
>>>>>>> b1f421ba69883ad1f5425b4116fcf443f49f3f92

## Prerequisites

<<<<<<< HEAD
- Node.js 18+ (recommended)
- npm
- Optional: Postgres (when running in `DB_MODE=auto` with `DATABASE_URL`)

## Quick start (local dev)

### 1) Backend

1. Create your env file:

   - Copy `backend/.env.example` to `backend/.env`
=======
The backend is an Express API with modular route files. It starts from `backend/src/index.js`, loads configuration from `backend/src/config.js`, prepares the selected database mode, mounts route modules, and attaches the realtime Socket.IO server.

Key backend responsibilities:

- Authenticate users and issue JWTs.
- Hash and verify passwords.
- Validate request payloads with Zod.
- Store users, classes, attendance, token rewards, profiles, community content, classroom messages, and document summaries.
- Serve content datasets to the frontend.
- Handle live classroom realtime events.
- Proxy optional AI workflows to Gemini, Ollama, or OpenAI.
- Apply rate limiting, CORS, and security headers.

## Frontend

The frontend is a React app using a custom desktop-style UI. It has a login screen, boot sequence, desktop shell, dock, top bar, window manager, and a collection of product windows.

Important frontend areas:

- `frontend/src/lib/api.ts` centralizes REST API access, token storage, authenticated requests, form uploads, and response typing.
- `frontend/src/lib/window-manager.tsx` manages open windows and window behavior.
- `frontend/src/lib/theme-provider.tsx` manages themes.
- `frontend/src/components/desktop/` contains the operating-system-like shell.
- `frontend/src/components/desktop/windows/` contains feature windows such as Programs, Courses, Community, Live Classroom, Profile, Settings, Terminal, and Document Summarizer.
- `frontend/src/routes/` provides public route entries through TanStack Router.

## API Surface
>>>>>>> b1f421ba69883ad1f5425b4116fcf443f49f3f92

2. Install + run:

   - `npm install` (inside `backend/`)
   - `npm run dev`

Backend runs on:

- `http://localhost:8080`

Useful endpoints:

- `GET /api/health`
<<<<<<< HEAD
- `GET /api/realtime/config`
- `GET /api/me` (requires auth)
- `GET /api/ai/health`

### 2) Frontend

1. Create your env file:

   - Copy `frontend/.env.example` to `frontend/.env`

2. Install + run:

   - `npm install` (inside `frontend/`)
   - `npm run dev`
=======
- `GET /api/health/db`
- `GET /api/ai/health`

### Users and Sessions

- `POST /api/users/register`
- `POST /api/users/login`
- `GET /api/users/:wallet`
- `PUT /api/users/:wallet`
- `GET /api/me`
- `PUT /api/me/profile`

### Enrollment

- `POST /api/enroll`

### Classes and Attendance

- `POST /api/classes/create`
- `GET /api/classes`
- `POST /api/attendance/mark`
- `GET /api/attendance/:classId`

### Tokens
>>>>>>> b1f421ba69883ad1f5425b4116fcf443f49f3f92

Frontend runs on:

<<<<<<< HEAD
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
=======
### Content

- `GET /api/content/programs`
- `GET /api/content/tutors`
- `GET /api/content/posts`
- `GET /api/content/courses`
- `GET /api/content/community_channels`
- `GET /api/content/community_users`
- `GET /api/content/community_messages`
- `GET /api/content/wallpapers`
- `GET /api/content/subjects`
- `GET /api/content/mobile_programs`
- `GET /api/content/default_profile`
- `GET /api/content/firefox_bookmarks`
- `GET /api/content/terminal_filesystem`
- `GET /api/content/terminal_fortunes`

### Community

- `GET /api/community/channels`
- `GET /api/community/users`
- `GET /api/community/messages/:channelId`
- `POST /api/community/messages/:channelId`
- `POST /api/community/reactions/:channelId/:messageId`

### Realtime

- `GET /api/realtime/config`
- Socket.IO path defaults to `/socket.io`

### AI

- `POST /api/ai/tutor`
- `POST /api/ai/voice`
- `POST /api/ai/voice/stt`
- `POST /api/ai/voice/tts`
- `POST /api/ai/focus`
- `POST /api/ai/quiz`
- `GET /api/ai/documents`
- `GET /api/ai/documents/:id`
- `POST /api/ai/documents/summarize`

## Data and Persistence

EduNexuZ supports two persistence modes:

### JSON Mode

JSON mode uses files in `backend/data/*.json`. This is useful for:

- Local development
- Demos
- Seed content
- Quick setup without a database

### PostgreSQL Mode

PostgreSQL mode is enabled when `DATABASE_URL` is configured or when `DB_MODE=pg` is explicitly set. The backend creates these tables when it starts:

- `users`
- `classes`
- `attendance`
- `tokens`
- `ai_memory`
- `focus_logs`
- `profiles`

When `SEED_FROM_JSON=1`, the backend can seed PostgreSQL from the JSON datasets so the database becomes the primary store while preserving demo content.

## Realtime Classroom

The live classroom feature uses Socket.IO for:

- Room join and leave events.
- Participant presence lists.
- Classroom chat.
- Persisted classroom chat history.
- WebRTC signaling relay.

The browser handles local microphone/camera access and peer connections. The backend relays SDP and ICE signaling data but does not process media streams directly.

For stricter NAT environments, configure TURN/STUN servers through `WEBRTC_ICE_SERVERS_JSON`.

## AI Features

EduNexuZ includes optional AI capabilities. They work only when the related provider keys or local services are configured.

### AI Tutor

The tutor endpoint supports:

- Google Gemini through `GOOGLE_AI_API_KEY`.
- Local Ollama through `AI_TUTOR_PROVIDER=ollama`.

### AI Voice

Voice features use OpenAI when configured:

- Speech-to-text through `OPENAI_STT_MODEL`.
- Text-to-speech through `OPENAI_TTS_MODEL` and `OPENAI_TTS_VOICE`.

### Document Summarizer

Authenticated users can upload text-readable documents. The backend extracts UTF-8 text from the uploaded file and asks Gemini to return:

- A title.
- A student-friendly summary.
- Highlighted notes with importance labels.

Summaries are stored per user in the configured persistence layer.

## Security and Validation

Implemented security measures include:

- JWT bearer authentication for protected routes.
- Password hashing with bcrypt.
- Zod schemas for request validation.
- Helmet middleware for HTTP security headers.
- Express rate limiting.
- Configurable CORS origin.
- Auth checks for user-specific profile, token, document, AI, class creation, and community write operations.
- Media URL validation for community messages.
- Upload size limits for AI document and voice routes.

## Local Setup

Recommended runtime:

- Node.js 22.12.0 or newer for the frontend.
- npm for dependency installation.
- Optional PostgreSQL if you want database-backed persistence.

### 1. Install backend dependencies

```bash
cd backend
npm install
```

### 2. Start the backend

```bash
npm run dev
```

By default, the backend starts on:

```text
http://localhost:8080
```

### 3. Install frontend dependencies

Open another terminal:

```bash
cd frontend
npm install
```

### 4. Start the frontend

```bash
npm run dev
```

The frontend reads the backend URL from `VITE_API_BASE_URL`. If that variable is not set, it defaults to:

```text
http://localhost:8080
```

## Environment Variables

### Backend

Create a backend `.env` file when you need custom configuration.

```env
PORT=8080
CORS_ORIGIN=*
JWT_SECRET=change-this-in-production

# Database
DB_MODE=auto
DATABASE_URL=
SEED_FROM_JSON=1

# Realtime
SOCKET_PATH=/socket.io
WEBRTC_ICE_SERVERS_JSON=

# Gemini / Google AI
GOOGLE_AI_API_KEY=
GOOGLE_AI_MODEL=gemini-1.5-flash
AI_TUTOR_PROVIDER=gemini

# Ollama local AI option
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=gemma2:2b

# OpenAI voice option
AI_VOICE_PROVIDER=openai
OPENAI_API_KEY=
OPENAI_STT_MODEL=whisper-1
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_TTS_VOICE=alloy
```

`DB_MODE` supports:

- `auto`: use PostgreSQL when `DATABASE_URL` exists, otherwise JSON storage.
- `pg`: require PostgreSQL.
- `json`: force JSON file storage.

### Frontend

Create a frontend `.env` file when the backend is not running at the default URL.

```env
VITE_API_BASE_URL=http://localhost:8080
```

## Testing and Quality

### Backend tests

```bash
cd backend
npm test
```

The current backend test starts the API in JSON mode and verifies health and content endpoints.

### Frontend build

```bash
cd frontend
npm run build
```

### Frontend lint

```bash
cd frontend
npm run lint
```

### CI

GitHub Actions runs:

- Backend dependency install.
- Backend tests.
- Frontend dependency install.
- Frontend production build.

## Deployment

### Backend on Render

The backend includes:

- `backend/render.yaml`
- `backend/Dockerfile`

Set production environment variables in Render:

- `JWT_SECRET`
- `CORS_ORIGIN`
- `DATABASE_URL` if using PostgreSQL
- AI provider keys if enabling AI features
- `WEBRTC_ICE_SERVERS_JSON` if using custom STUN/TURN servers

### Frontend on Netlify

The root `netlify.toml` configures:

- Base directory: `frontend`
- Build command: `npm ci && npm run build`
- Publish directory: `frontend/dist`
- SPA redirect to `index.html`

Set this frontend environment variable in Netlify:

```env
VITE_API_BASE_URL=https://your-render-backend-url
```

## Business Roadmap

Suggested business and product improvements:

- Tutor/admin roles with role-based permissions.
- Tutor availability, scheduling, and lesson booking.
- Payment integration for paid tutoring packages.
- CRM-style enrollment pipeline for leads and follow-ups.
- Parent/guardian accounts for younger students.
- Tutor performance dashboards.
- Student progress reports and weekly learning summaries.
- More granular course progress tracking.
- Moderation tools for community channels.
- Production TURN server for reliable WebRTC in strict networks.
- Richer AI lesson notes, quiz generation, and personalized study plans.
- Real token or points redemption system for business incentives.

## Project Status

EduNexuZ currently has the core foundation for a learning platform:

- A working full-stack architecture.
- Local JSON persistence and optional PostgreSQL persistence.
- Authenticated desktop experience.
- Content-driven tutoring pages.
- Realtime classroom collaboration.
- Community messaging.
- AI study support hooks.
- Deployment configuration for Render and Netlify.

The next major step is hardening the platform for real operations: admin tooling, role management, scheduling, payments, stronger observability, and production-grade realtime media infrastructure.
>>>>>>> b1f421ba69883ad1f5425b4116fcf443f49f3f92
