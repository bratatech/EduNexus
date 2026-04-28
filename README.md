# EduNexuZ

## Structure

- `frontend/`
  - Vite + React + TypeScript UI (ctOS-style desktop)
- `backend/`
  - Node.js (Express) REST API
  - JSON storage fallback (`backend/data/*.json`)
  - Postgres primary when `DATABASE_URL` is configured (pgAdmin)

## Backend

### Setup

1. Copy env

- `backend/.env.example` -> `backend/.env`

2. Install + run

- `npm install` (inside `backend/`)
- `npm run dev`

### Health

- `GET /api/health`
- `GET /api/health/db`

### Core API (from EduNexus_Architecture.pdf)

- `POST /api/users/register`
- `POST /api/users/login`
- `GET /api/users/:wallet`

- `POST /api/classes/create`
- `GET /api/classes`

- `POST /api/attendance/mark`
- `GET /api/attendance/:classId`

- `POST /api/ai/tutor` (stub)
- `POST /api/ai/voice` (stub)
- `POST /api/ai/focus` (stub)
- `POST /api/ai/quiz` (stub)

- `POST /api/tokens/reward`
- `GET /api/tokens/balance`

### Content API (JSON-backed)

- `GET /api/content/programs`
- `GET /api/content/tutors`
- `GET /api/content/posts`
- `GET /api/content/courses`
- `GET /api/content/community_channels`
- `GET /api/content/community_users`
- `GET /api/content/community_messages`
- `GET /api/content/wallpapers`
- `GET /api/content/subjects`

## Frontend

### Setup

1. Copy env

- `frontend/.env.example` -> `frontend/.env`

2. Install + run

- `npm install` (inside `frontend/`)
- `npm run dev`

Frontend reads API base URL from `VITE_API_BASE_URL`.

## Deployment

### Backend (Render)

- `backend/render.yaml` is included.
- Set env vars in Render:
  - `JWT_SECRET`
  - `DATABASE_URL` (optional)

### Frontend (Netlify)

- `netlify.toml` is included at repo root.
- Configure env var:
  - `VITE_API_BASE_URL` = your Render backend URL
