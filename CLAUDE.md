# CLAUDE.md

Guidance for Claude Code when working on this repo.

## Project shape

- **Monorepo** (no workspaces): two sibling apps — `backend/` (Express + Sequelize/MySQL, CommonJS) and `frontend/` (React 19 + Vite + Tailwind, ESM).
- **Not a git repo.** No commit/PR workflows.
- **External dependency:** an n8n cloud workflow named *Doctor Appointment Chatbot*. The backend forwards user messages to its webhook; the workflow's tool nodes call back into the backend via a tunnel URL (cloudflared / ngrok).

## Run / dev

```bash
# backend
cd backend && npm run dev    # nodemon on :3000

# frontend
cd frontend && npm run dev   # vite on :5174
```

`backend/src/models/index.js` runs `sequelize.sync({ alter: true })` on boot — schema changes propagate automatically. Seeds a default doctor (`username: doctor`).

## Key files

- [backend/src/server.js](backend/src/server.js) — entry; mounts `/api` routes.
- [backend/src/routes/slotRoutes.js](backend/src/routes/slotRoutes.js) — all routes live here despite the name.
- [backend/src/controllers/chatController.js](backend/src/controllers/chatController.js) — the heart of the chat flow:
  - Builds the request payload sent to n8n (`chatInput`, `doctor`, `availableSlots` grouped by date, `memory`, `knownPatientName`, `knownSelectedTime`).
  - Parses agent response, including unwrapping ```` ```json ```` fences from `payload.output`.
  - In-memory `chatMemoryStore` keyed by `sessionId` (NOT persisted — restart wipes it).
  - `NON_NAME_WORDS` stop-list prevents confirmations ("ha", "yes", "ok", …) being captured as patient names.
- [backend/src/controllers/appointmentController.js](backend/src/controllers/appointmentController.js) — called by n8n's `getAppointments` / `saveAppointment` HTTP tools.
- [frontend/src/doctor/DoctorSlotPage.jsx](frontend/src/doctor/DoctorSlotPage.jsx) — login persisted under `localStorage["doctorAuth"]`. Slot list grouped by date.
- [frontend/src/user/UserChatPage.jsx](frontend/src/user/UserChatPage.jsx) — chat UI; POSTs to `/api/chat`.

## Things that surprise

- **n8n cloud cannot reach `localhost`.** Run `cloudflared tunnel --url http://localhost:3000` and put the public URL into both n8n HTTP Request tool nodes. The URL changes on every restart of a quick tunnel.
- **Two n8n webhook URLs:** `/webhook-test/...` (active only while "Test workflow" is held), `/webhook/...` (active when workflow is **Published**). The 404 from n8n almost always means "not published".
- **Booking Agent prompt is custom**, not the default `{{ $json.chatInput }}`. It includes a `BOOKING CONTEXT` block with grouped slots (`availableSlots[*].date` + `times[]`). If you change the backend payload shape, update the prompt expression too.
- **System message** must enforce: only use the listed doctor + slots, reply in user's language/script (English / Gujarati script / Latin-script Gujlish), output plain text (no JSON, no fences).
- **Sticky patient name:** the agent's payload may try to overwrite the captured name with junk; the controller only fills the slot if it's still empty. Don't break this when refactoring.
- **Slot uniqueness** is per `(date, time)` pair, not per `time` alone. The model previously had `unique: true` on `time`; removed.
- **Appointment storage:** `appointment_date` and `appointment_time` are separate columns. The agent must pass both to `saveAppointment`.

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
5. Backend logs — is it returning a 502 from n8n, or a 200 with an empty `reply`?
