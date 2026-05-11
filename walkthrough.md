# Walkthrough — EduNexuZ Codebase Audit & Fixes

## Summary

Performed a complete codebase audit of the EduNexuZ learning platform, identified **4 bugs**, fixed them all, verified the application runs correctly, and updated all documentation files.

## Bugs Found & Fixed

### 1. SSR Crash — `window is not defined` ⚠️ Critical

**File**: [TerminalWindow.tsx](file:///f:/edunexuz-personal-portfolio-main/frontend/src/components/desktop/windows/TerminalWindow.tsx#L72-L89)

The `NEOFETCH` constant used `window.innerWidth` and `performance.memory` at **module scope** (outside any component). During server-side rendering (TanStack Start uses SSR), `window` is undefined, crashing the entire frontend with:

```
ReferenceError: window is not defined
```

**Fix**: Converted the module-level constant to a `getNeofetch()` function that safely checks `typeof window` before accessing browser APIs.

---

### 2. Gemini API — Model Deprecated + Error Handling ⚠️ Critical

**Files**: [ai.js](file:///f:/edunexuz-personal-portfolio-main/backend/src/routes/ai.js), [config.js](file:///f:/edunexuz-personal-portfolio-main/backend/src/config.js), [.env](file:///f:/edunexuz-personal-portfolio-main/backend/.env)

Two compounding issues:

1. **Model `gemini-1.5-flash` has been deprecated** by Google — returns 404 Not Found
2. **Fallback retry wasn't try-caught** — if fallback model also failed, the error escaped to the global Express handler returning generic `server_error` instead of `gemini_unavailable`

**Fix**:
- Updated model to `gemini-2.5-flash` everywhere (env, config, fallbacks)
- Wrapped fallback retry in try-catch
- Added `console.error` logging for debugging
- Added `detail` field to error responses so root cause is visible

---

### 3. VSCode Window — Basic Textarea

**File**: [VSCodeWindow.tsx](file:///f:/edunexuz-personal-portfolio-main/frontend/src/components/desktop/windows/VSCodeWindow.tsx)

The previous VS Code window was a plain textarea with minimal styling. Complete rewrite with authentic VS Code UI:

- Activity bar (explorer, search, source control icons)
- File explorer sidebar (collapsible)
- Tab bar with close buttons
- Line numbers gutter
- Minimap (decorative code preview)
- Breadcrumb navigation
- Status bar (line/col, language, encoding)
- Tab key inserts spaces
- File icons per language

---

### 4. Document Summarizer — Raw Error Codes

**File**: [DocumentSummarizerWindow.tsx](file:///f:/edunexuz-personal-portfolio-main/frontend/src/components/desktop/windows/DocumentSummarizerWindow.tsx#L114-L126)

Users saw raw error codes like `gemini_unavailable` instead of helpful messages.

**Fix**: Added a friendly error message mapper that converts API error codes to human-readable descriptions.

## Files Modified

| File | Change |
|------|--------|
| `frontend/.../TerminalWindow.tsx` | SSR fix — `getNeofetch()` function |
| `frontend/.../VSCodeWindow.tsx` | Complete rewrite with proper VS Code UI |
| `frontend/.../DocumentSummarizerWindow.tsx` | User-friendly error messages |
| `backend/src/routes/ai.js` | Error handling + model updates |
| `backend/src/config.js` | Default model → `gemini-2.5-flash` |
| `backend/.env` | Model → `gemini-2.5-flash` |
| `backend/.env.example` | Model → `gemini-2.5-flash` |
| `README.md` | Updated features, model name, troubleshooting |
| `report.md` | Full report with bugs fixed, verification results |

## Verification Results

| Test | Result |
|------|--------|
| `GET /api/health` | ✅ OK |
| `GET /api/ai/health` | ✅ Gemini + OpenAI configured |
| `POST /api/ai/tutor` | ✅ Returns "2 plus 2 equals 4." |
| Frontend SSR | ✅ No "window is not defined" error |
| Desktop UI | ✅ All windows, dock, icons render |
| Terminal window | ✅ neofetch runs correctly |
| VS Code window | ✅ Line numbers, tabs, minimap visible |
| Document Summarizer | ✅ Shows friendly error messages |
