# CLAUDE.md

Guidance for Claude Code when working on this repo.

## Project shape

- **Monorepo** (no workspaces): two sibling apps — [backend/](backend/) (Express 5 + Sequelize/MySQL, CommonJS) and [frontend/](frontend/) (React 19 + Vite + Tailwind, ESM).
- **Git repo** with `main` as the default branch.
- **Deployment:** root + per-app [vercel.json](vercel.json); [docker-compose.yml](docker-compose.yml) for local MySQL.
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
| [authroutes.js](backend/src/routes/authroutes.js) | `/api` | `POST /login` |
| [slotroutes.js](backend/src/routes/slotroutes.js) | `/api/slots` | `GET / POST / PUT` |
| [doctorroutes.js](backend/src/routes/doctorroutes.js) | `/api/doctor` | `GET /` |
| [chatroutes.js](backend/src/routes/chatroutes.js) | `/api/chat` | `POST /` |
| [appointmentroutes.js](backend/src/routes/appointmentroutes.js) | `/api/appointments` | `GET / POST` (called by n8n tools) |

Each route file delegates to its own controller: [authcontroller.js](backend/src/controllers/authcontroller.js), [slotcontroller.js](backend/src/controllers/slotcontroller.js), [doctorcontroller.js](backend/src/controllers/doctorcontroller.js).

### Service layer ([backend/src/services/](backend/src/services/))

[chatController.js](backend/src/controllers/chatController.js) is now a thin wrapper; the chat flow lives in [chat.service.js](backend/src/services/chat.service.js):

- [chat.service.js](backend/src/services/chat.service.js) — `handleChatMessage`: extracts patient name, pulls session memory, runs vector search, builds the n8n payload (`chatInput`, `doctor`, `allDoctors`, `availableSlots`, `memory`, `vectorContext`, `knownPatientName`, `knownSelectedTime`, `knownSelectedDate`), parses the agent reply, persists name/time/date stickily, and triggers booking.
- [n8n.service.js](backend/src/services/n8n.service.js) — webhook POST.
- [booking.service.js](backend/src/services/booking.service.js) — doctor/slot context builders + `createAppointmentIfRequested`.
- [chatMemory.service.js](backend/src/services/chatMemory.service.js) — in-memory `Map` keyed by `sessionId`. **NOT persisted** — restart wipes it. Serverless cold starts also wipe it.
- [vector.service.js](backend/src/services/vector.service.js) — Pinecone init + `searchContext(query)` returning concatenated `metadata.content` from top-K matches (`VECTOR_SEARCH_LIMIT`, default 2).

### Utils ([backend/src/utils/](backend/src/utils/))

- [nameExtractor.js](backend/src/utils/nameExtractor.js) — `extractPatientNameFromMessage`, `isLikelyName`. Owns the `NON_NAME_WORDS` stop-list that prevents confirmations ("ha", "yes", "ok", …) from being captured as patient names.
- [parseAgentReply.js](backend/src/utils/parseAgentReply.js) — unwraps ```` ```json ```` fences from `payload.output` returned by n8n.
- [indexPdf.js](backend/src/utils/indexPdf.js) — CLI: chunks a PDF (1000-char windows) and upserts embeddings to Pinecone.

### Frontend

- [frontend/src/doctor/DoctorSlotPage.jsx](frontend/src/doctor/DoctorSlotPage.jsx) — login persisted under `localStorage["doctorAuth"]`. Slot list grouped by date.
- [frontend/src/user/UserChatPage.jsx](frontend/src/user/UserChatPage.jsx) — chat UI; POSTs to `/api/chat`. Chat history persisted in `localStorage`.
- [frontend/src/lib/api.js](frontend/src/lib/api.js) — fetch wrapper using `VITE_API_BASE_URL`.

## Things that surprise

- **n8n cloud cannot reach `localhost`.** Run `cloudflared tunnel --url http://localhost:3000` and put the public URL into both n8n HTTP Request tool nodes. The URL changes on every restart of a quick tunnel.
- **Two n8n webhook URLs:** `/webhook-test/...` (active only while "Test workflow" is held), `/webhook/...` (active when workflow is **Published**). A 404 from n8n almost always means "not published".
- **Booking Agent prompt is custom**, not the default `{{ $json.chatInput }}`. It includes a `BOOKING CONTEXT` block with grouped slots (`availableSlots[*].date` + `times[]`) and `vectorContext` from Pinecone. If you change the backend payload shape, update the prompt expression too.
- **System message** must enforce: only use the listed doctor + slots, reply in user's language/script (English / Gujarati script / Latin-script Gujlish), output plain text (no JSON, no fences).
- **Sticky patient name:** the controller only fills the name slot if it's still empty *and* the candidate passes `isLikelyName`. Don't break this when refactoring [chat.service.js](backend/src/services/chat.service.js).
- **Slot uniqueness** is per `(date, time)` pair, not per `time` alone. The model previously had `unique: true` on `time`; removed.
- **Appointment storage:** `appointment_date` and `appointment_time` are separate columns. The agent must pass both to `saveAppointment`.
- **Cold-start init:** `app.use('/api', ...)` awaits `ensureDatabaseInitialized()` (DB sync + Pinecone). First request after a cold start can be slow; on failure it returns `500 { error: 'Database initialization failed' }` and resets the promise so the next request retries.

## Conventions

- Backend is CommonJS (`require`). Don't introduce ESM there.
- Frontend uses Tailwind utility classes — no separate stylesheets per component.
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
