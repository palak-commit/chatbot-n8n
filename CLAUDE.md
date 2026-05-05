# CLAUDE.md

Guidance for Claude Code when working on this repo.

## Project shape

- **Monorepo** (no workspaces): two sibling apps — [backend/](backend/) (Express 5 + Sequelize/MySQL, CommonJS) and [frontend/](frontend/) (React 19 + Vite + Tailwind, ESM).
- **Git repo** with `main` as the default branch.
- **Deployment:** root + per-app [vercel.json](vercel.json). Local MySQL is expected to be running on the host (no docker-compose in repo).
- **External dependencies:**
  - **n8n cloud** workflow *Doctor Appointment Chatbot* (see [doctor_appointment_workflow.json](doctor_appointment_workflow.json)). Backend forwards user messages to its webhook; the workflow's HTTP tool nodes call back into the backend via a tunnel URL (cloudflared / ngrok).
  - **Pinecone** vector DB + **OpenRouter** embeddings (`text-embedding-3-small`, 1024 dims) for RAG over the medicine knowledge base in [backend/src/data/knowledge_base/](backend/src/data/knowledge_base/).

## Run / dev

```bash
# backend
cd backend && npm run dev    # nodemon on :3000

# frontend
cd frontend && npm run dev   # vite on :5174

# index a knowledge-base PDF into Pinecone
cd backend && node src/utils/indexPdf.js src/data/knowledge_base/<file>.pdf
```

[backend/src/models/index.js](backend/src/models/index.js) runs `sequelize.sync({ alter: true })` on boot — schema changes propagate automatically. Seeds a default doctor (`username: doctor`). On startup, [backend/src/server.js](backend/src/server.js) also lazily initializes the Pinecone index via `vectorService.initializeVectorStore()`; `/api/*` requests await this init on cold start.

Required env (see [backend/.env.example](backend/.env.example)): `PORT`, `DB_*`, `N8N_WEBHOOK_URL`, `OPENROUTER_API_KEY`, `PINECONE_API_KEY`, `PINECONE_INDEX`, `VECTOR_DIMENSION`. Frontend uses `VITE_API_BASE_URL`.

## Layout

### Routes ([backend/src/routes/](backend/src/routes/))

Routes are split per resource and aggregated by [routes/index.js](backend/src/routes/index.js), all mounted under `/api`:

| File | Mount | Endpoints |
|---|---|---|
| [authRoutes.js](backend/src/routes/authRoutes.js) | `/api` | `POST /login` |
| [slotRoutes.js](backend/src/routes/slotRoutes.js) | `/api/slots` | `GET / POST / PUT` |
| [doctorRoutes.js](backend/src/routes/doctorRoutes.js) | `/api/doctor` | `GET /` |
| [chatRoutes.js](backend/src/routes/chatRoutes.js) | `/api/chat` | `POST /` |
| [appointmentRoutes.js](backend/src/routes/appointmentRoutes.js) | `/api/appointments` | `GET / POST` (called by n8n tools) |

Each route file delegates to its own controller: [authController.js](backend/src/controllers/authController.js), [slotController.js](backend/src/controllers/slotController.js), [doctorController.js](backend/src/controllers/doctorController.js), [chatController.js](backend/src/controllers/chatController.js), [appointmentController.js](backend/src/controllers/appointmentController.js). Routes and controllers both use camelCase (`*Routes.js` / `*Controller.js`) — match the convention when adding new files.

### Service layer ([backend/src/services/](backend/src/services/))

[chatController.js](backend/src/controllers/chatController.js) is now a thin wrapper; the chat flow lives in [chat.service.js](backend/src/services/chat.service.js):

- [chat.service.js](backend/src/services/chat.service.js) — `handleChatMessage`: extracts patient name, pulls session memory, runs vector search, builds the n8n payload (`chatInput`, `doctor`, `allDoctors`, `availableSlots`, `memory`, `vectorContext`, `knownPatientName`, `knownSelectedTime`, `knownSelectedDate`), parses the agent reply, persists name/time/date stickily, and triggers booking.
- [n8n.service.js](backend/src/services/n8n.service.js) — webhook POST.
- [booking.service.js](backend/src/services/booking.service.js) — doctor/slot context builders + `createAppointmentIfRequested`.
- [chatMemory.service.js](backend/src/services/chatMemory.service.js) — in-memory `Map` keyed by `sessionId`. **NOT persisted** — restart wipes it. Serverless cold starts also wipe it.
- [vector.service.js](backend/src/services/vector.service.js) — Pinecone init + `searchContext(query)` returning concatenated `metadata.content` from top-K matches (`VECTOR_SEARCH_LIMIT`, default 2).
- [embedding.service.js](backend/src/services/embedding.service.js) — OpenRouter embedding wrapper used by `vector.service` and `indexPdf`.
- [appointment.service.js](backend/src/services/appointment.service.js) — appointment list/create logic used by [appointmentController.js](backend/src/controllers/appointmentController.js). On create it normalizes `appointmentTime` via `normalizeTime` (strips a leading `YYYY-MM-DD` prefix that n8n sometimes prepends, collapses spaces, uppercases AM/PM), resolves `doctorId` against the `doctors` table, and runs a post-insert `Slot.update({ available: false })` as a safety net so a slot can't stay `available=true` after a successful booking. `booking.service.createAppointmentIfRequested` does the same normalization + safety-net update.

### Utils ([backend/src/utils/](backend/src/utils/))

- [nameExtractor.js](backend/src/utils/nameExtractor.js) — `extractPatientNameFromMessage`, `isLikelyName`. Owns the `NON_NAME_WORDS` stop-list that prevents confirmations ("ha", "yes", "ok", …) from being captured as patient names.
- [parseAgentReply.js](backend/src/utils/parseAgentReply.js) — unwraps ```` ```json ```` fences from `payload.output` returned by n8n.
- [indexPdf.js](backend/src/utils/indexPdf.js) — CLI: chunks a PDF (1000-char windows) and upserts embeddings to Pinecone.

### Frontend

Feature-folder layout under [frontend/src/features/](frontend/src/features/):

- [features/chat/ChatPage.jsx](frontend/src/features/chat/ChatPage.jsx) — user chat UI; POSTs to `/api/chat`. Chat history + session id persisted in `localStorage` (`chat_history`, `chat_session_id`).
- [features/doctor/SlotPage.jsx](frontend/src/features/doctor/SlotPage.jsx) — doctor login + dashboard. Auth persisted under `localStorage["doctorAuth"]` (`{ token, doctorId, doctor }`). Tabs: `slots` / `appointments`.
- [features/doctor/layout/](frontend/src/features/doctor/layout/) — `Sidebar.jsx` (nav + theme toggle + logout), `Header.jsx` (greeting + doctor info).
- [features/doctor/components/](frontend/src/features/doctor/components/) — `SlotList.jsx`, `AppointmentList.jsx`.
- [lib/api.js](frontend/src/lib/api.js) — fetch wrapper (`apiFetch`) + `API_BASE_URL` (only place that reads `import.meta.env.VITE_API_BASE_URL`).
- [hooks/useTheme.js](frontend/src/hooks/useTheme.js) — light/dark toggle. Persists in `localStorage["theme"]`. Used directly by ChatPage; SlotPage has its own equivalent inline state passed into `Sidebar`. Both sync to the same `theme` key.

**Dark mode:** Tailwind v4 with `@custom-variant dark (&:where(.dark, .dark *));` declared in [index.css](frontend/src/index.css). Anti-flicker IIFE in [index.html](frontend/index.html) reads `localStorage["theme"]` (or system preference) before React mounts and adds `.dark` to `<html>`. Add `dark:` variants to any new components.

## Things that surprise

- **n8n cloud cannot reach `localhost`.** Run `cloudflared tunnel --url http://localhost:3000` and put the public URL into both n8n HTTP Request tool nodes. The URL changes on every restart of a quick tunnel.
- **Two n8n webhook URLs:** `/webhook-test/...` (active only while "Test workflow" is held), `/webhook/...` (active when workflow is **Published**). A 404 from n8n almost always means "not published".
- **Booking Agent prompt is custom**, not the default `{{ $json.chatInput }}`. It includes a `BOOKING CONTEXT` block with grouped slots (`availableSlots[*].date` + `times[]`) and `vectorContext` from Pinecone. If you change the backend payload shape, update the prompt expression too.
- **System message** must enforce: only use the listed doctor + slots, reply in user's language/script (English / Gujarati script / Latin-script Gujlish), output plain text (no JSON, no fences).
- **Sticky patient name:** the controller only fills the name slot if it's still empty *and* the candidate passes `isLikelyName`. Don't break this when refactoring [chat.service.js](backend/src/services/chat.service.js).
- **Slot uniqueness** is per `(date, time)` pair, not per `time` alone. The model previously had `unique: true` on `time`; removed.
- **Appointment storage:** `appointment_date` and `appointment_time` are separate columns. The agent must pass both to `saveAppointment`. n8n sometimes sends `appointmentTime` as the combined `"YYYY-MM-DD HH:MM AM/PM"` — `normalizeTime` strips the date prefix so slot lookups still match `slots.time` (`"HH:MM AM/PM"`).
- **Cold-start init:** `app.use('/api', ...)` awaits `ensureDatabaseInitialized()` (DB sync + Pinecone). First request after a cold start can be slow; on failure it returns `500 { error: 'Database initialization failed' }` and resets the promise so the next request retries.

## Conventions

- Backend is CommonJS (`require`). Don't introduce ESM there.
- Frontend uses Tailwind utility classes — no separate stylesheets per component.
- All new UI must include `dark:` variants for any color-bearing classes.
- `localStorage` keys in use: `chat_session_id`, `chat_history`, `doctorAuth`, `theme`. Don't string-duplicate — reuse the existing constants.
- Do **not** add comments explaining the obvious; only annotate non-obvious WHY (e.g., the stop-list rationale).
- No tests exist. Don't add a test framework unless asked.

## When the user reports "the chatbot doesn't work"

Check in this order:
1. Backend running on :3000? Tunnel up?
2. n8n workflow **Published** (not just saved)?
3. n8n tool nodes have **Send Body** ON and fields toggled to "Defined by AI"?
4. Booking Agent prompt still references `$json.chatInput` (not `$json.message`)?
5. `OPENROUTER_API_KEY` / `PINECONE_API_KEY` / `PINECONE_INDEX` set? Init log line `[VectorDB] Pinecone store initialized successfully`?
6. Backend logs — is it returning a 502 from n8n, or a 200 with an empty `reply`?
