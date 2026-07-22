# PawTrack

A mobile-first pet health tracker for dog and cat owners. Type what happened in plain English — *"Bella ate half her food at 7am"* — and Gemini parses it into a structured event, shows an editable preview, and saves it to MongoDB. Built for SEG2105 at the University of Ottawa.

**Live app → [https://pawtrack-pink.vercel.app](https://pawtrack-pink.vercel.app)**

## Features

- **Natural language logging** — describe an event in plain text; Gemini extracts type, time, quantity, and notes into an editable preview before saving
- **7 event types** — meal, medication, activity, bathroom, treats, weight, and litter *(cats only — dogs don't see litter in the picker)*
- **Multi-pet support** — register dogs and cats, each with their own event history and profile photo
- **Prescription tracking** — log active meds with dose, frequency, and duration; quick-select chips pre-fill the log form
- **Edit and delete events** — inline edit form and delete confirmation on every logged event
- **Delete pet with cascade** — removing a pet also deletes all its events, prescriptions, and vaccines
- **Analytics** — appetite breakdown, weight trend, activity bar chart, bathroom consistency donut (Recharts)
- **AI health insights** — Gemini summarizes 30 days of events and flags patterns worth a vet visit
- **Vet report PDF** — one-tap download of a clinical summary (30/60/90-day window) formatted for vet appointments
- **Vaccine records** — track vaccinations with next-due dates per pet
- **Desktop-responsive layout** — sidebar nav and multi-column grids on large screens; bottom nav on mobile
- **Streak tracking** — consecutive days with at least one logged event

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS v4, Recharts |
| Backend | Node.js 22, Express 5, Mongoose 9, MongoDB Atlas |
| AI | Google Gemini API (`gemini-3.6-flash`) |
| PDF | PDFKit |
| Auth | JWT (`jsonwebtoken`), `bcryptjs` (cost factor 12) |
| Security | Helmet, `express-rate-limit` |

## Repository layout

```
client/   React 19 + Vite frontend (deployed on Vercel)
server/   Express 5 + Mongoose API (deployed on Render)
postman/  Postman for VS Code workspace files
```

## Running locally

### Server

```bash
cd server
cp .env.example .env        # fill in MONGODB_URI, JWT_SECRET, GEMINI_API_KEY
npm install
npm run dev                 # starts on http://localhost:5050
```

`GET http://localhost:5050/health` → `{"status":"ok"}`

### Client

```bash
cd client
cp .env.example .env        # set VITE_API_URL=http://localhost:5050
npm install
npm run dev                 # starts on http://localhost:5173
```

### Seed fake data (optional)

```bash
cd server
node scripts/seed-events.js          # seeds 14 days of events for two demo pets
node scripts/seed-events.js --clear  # clears seeded events first
```

## Environment variables

### Server (`server/.env`)

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `JWT_SECRET` | Yes | Secret for signing auth tokens (min 32 chars) |
| `GEMINI_API_KEY` | Yes | Google Gemini API key (free tier works for development) |
| `PORT` | No | Server port (default: 5050) |
| `CLIENT_ORIGIN` | No | CORS allowed origin — set to your Vercel URL in production, **no trailing slash or path** |

### Client (`client/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Yes | Base URL of the API server (e.g. `http://localhost:5050` or your Render URL) |

## Tests

```bash
cd server
npm test    # runs 30 tests across 4 files with Vitest + mongodb-memory-server
```

| File | Tests | Coverage |
|---|---|---|
| `auth.test.js` | 9 | register, login, duplicate user, wrong password |
| `pets.test.js` | 6 | create, list, ownership scoping |
| `events.test.js` | 7 | CRUD, date filtering, ownership |
| `vaccines.test.js` | 8 | CRUD, next-due date, pet scoping |

## Deployment

| Service | URL |
|---|---|
| Frontend | [https://pawtrack-pink.vercel.app](https://pawtrack-pink.vercel.app) |
| Backend | Render — set `VITE_API_URL` in Vercel to your Render service URL |

**Important:** in Render's environment variables, set `CLIENT_ORIGIN` to the bare Vercel domain with no trailing slash or path (e.g. `https://pawtrack-pink.vercel.app`).

## Rate limits

| Endpoint | Limit |
|---|---|
| `POST /api/users/login` | 20 requests / 15 min |
| `POST /api/users/register` | 10 requests / hour |
| `POST /api/events/parse` (AI) | 10 requests / min |
| `GET /api/pets/:id/insights` (AI) | 5 requests / min |

## API documentation

Swagger UI is served at `/api/docs` when the server is running.

- **Local:** http://localhost:5050/api/docs
- **Production:** https://pawtrack-92is.onrender.com/api/docs *(available after redeployment)*

All 14 endpoints are documented with method, path, parameters, and request/response descriptions. The `Authorize` button in the UI accepts a JWT from `/api/users/login` so you can try authenticated endpoints directly in the browser.

## AI usage

Prompt-engineering decisions and AI-assisted code generation are documented per SEG2105's AI-usage requirement.
