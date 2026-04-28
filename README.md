# Doctor Appointment Chatbot

A bilingual (English / Gujarati / Hinglish) doctor-appointment booking chatbot powered by an n8n AI workflow, with a React frontend and an Express + MySQL backend.

## UI Screenshot

![Doctor Appointment Chatbot UI](./frontend/src/assets/hero.png)

## Architecture

```
┌──────────────┐        ┌──────────────┐        ┌────────────────┐
│  React (Vite)│  POST  │ Express API  │  POST  │ n8n Booking    │
│  /           │ ─────▶ │ /api/chat    │ ─────▶ │ Agent (LLM)    │
│  /doctor     │        │ /api/slots   │ ◀───── │ HTTP tools     │
└──────────────┘        │ /api/...     │        │  → /api/...    │
                        └──────┬───────┘        └────────────────┘
                               │
                          MySQL (Sequelize)
                          doctors / slots / appointments
```

- **Frontend** (`frontend/`) — React 19 + Vite + Tailwind. Two routes:
  - `/` → user chatbot
  - `/doctor` → doctor login + slot management (date + time, persisted via `localStorage`)
- **Backend** (`backend/`) — Express 5 + Sequelize + MySQL. Proxies user messages to an n8n webhook, persists doctors/slots/appointments.
- **n8n workflow** — Booking Agent (LLM) with two HTTP Request tools that call the backend's `/api/appointments` endpoints.

## Setup

### 1. MySQL
Create a database (default name in [`backend/src/config/db.js`](backend/src/config/db.js)).

### 2. Backend
```bash
cd backend
npm install
npm run dev          # nodemon, port 3000
```
On first run, Sequelize syncs the schema (`sync({ alter: true })`) and seeds a default doctor (`username: doctor`).

### 3. Frontend
```bash
cd frontend
npm install
npm run dev          # vite, port 5174
```

### 4. n8n
- Open the **Doctor Appointment Chatbot** workflow.
- The Booking Agent's **Prompt** field reads `{{ $json.chatInput }}` plus `BOOKING CONTEXT` (doctor + grouped slots).
- Two HTTP Request tools point at `<backend>/api/appointments` (GET = `getAppointments`, POST = `saveAppointment`) — each field set to "Defined by AI".
- For local development, expose the backend with cloudflared / ngrok so n8n cloud can reach it:
  ```bash
  cloudflared tunnel --url http://localhost:3000
  ```
  Replace the tool URLs and the backend `FALLBACK_WEBHOOK_URL` accordingly.
- Click **Publish** in n8n so the production webhook is live.

## How AI Booking Works

1. User sends a message from `/` (chat UI), for example: "Book appointment for 8 May at 5 PM".
2. Frontend calls backend `POST /api/chat` with `message` + `sessionId`.
3. Backend builds `BOOKING CONTEXT`:
   - doctor info
   - only currently available slots
   - session memory (known patient name, selected date/time)
4. Backend sends that payload to the n8n Booking Agent webhook.
5. Booking Agent decides:
   - ask missing details (name/time/date), or
   - call `saveAppointment` tool when details are complete.
6. On booking, backend validates slot availability and creates appointment.
7. Booked slot is marked unavailable and removed from future available-slot responses.
8. Backend returns final reply to frontend in user language (English / Gujarati / Hinglish).

### Important Booking Rule

- If a slot is already booked for a date+time, it is not shown again to new users.
- Duplicate confirmed booking on same date+time is blocked.

## API

| Method | Path                  | Purpose                                |
|--------|-----------------------|----------------------------------------|
| POST   | `/api/login`          | Doctor login                           |
| GET    | `/api/slots`          | List slots                             |
| POST   | `/api/slots`          | Add slot (`date`, `time`)              |
| PUT    | `/api/slots`          | Update slot availability               |
| GET    | `/api/doctor`         | Default doctor info                    |
| POST   | `/api/chat`           | User → n8n → reply                     |
| GET    | `/api/appointments`   | List appointments (called by n8n tool) |
| POST   | `/api/appointments`   | Save appointment (called by n8n tool)  |

## Data model

- **doctors** — `id, name, username, password, specialization`
- **slots** — `id, date, time, available`
- **appointments** — `id, patient_name, doctor_id, appointment_date, appointment_time, status`

## Notes

- n8n cloud quick-tunnels (`trycloudflare.com`) get a new URL each restart — update n8n nodes when it changes.
- The chat agent auto-detects user language and replies in the same script (English / Gujarati / Latin-script Gujlish).
