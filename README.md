# PawTrack

A mobile-first web app for logging pet care routines — meals, medications, activity, weight, litter, bathroom, and treats. Type in plain language, Google Gemini parses it into a structured event, you confirm an editable preview, and it saves to MongoDB. Includes AI health insights, analytics charts, vet report PDF export, and pet profile photos. Built for SEG2105 at the University of Ottawa.

## Repository layout

```
client/   React 19 + Vite + Tailwind CSS v4 frontend
server/   Express 5 + Mongoose API, Gemini integration
docs/     Requirements spec, prompt-engineering log, test plan, Postman collection
```

## Features

- **Natural language logging** — describe an event in plain text, Gemini extracts type, quantity, time, and notes
- **Multi-pet support** — register and switch between pets, each with their own event history
- **Analytics** — meal appetite breakdown, weight trend chart, activity bar chart, bathroom consistency donut
- **AI health insights** — Gemini summarizes patterns and flags anything worth a vet visit
- **Vet report PDF** — one-tap download of a formatted summary (30/60/90-day window) ready to share at an appointment
- **Pet profile photos** — upload an avatar that appears across the app
- **Prescription tracking** — log active medications with dose, interval, and compliance tracking in the PDF report
- **Streak tracking** — consecutive days with at least one logged event

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS v4, Recharts |
| Backend | Node.js, Express 5, Mongoose 9, MongoDB Atlas |
| AI | Google Gemini API |
| PDF | PDFKit |
| Auth | JWT (jsonwebtoken) |

## Running locally

### Server

```bash
cd server
cp .env.example .env        # fill in MONGODB_URI, JWT_SECRET, GEMINI_API_KEY
npm install
npm run dev                 # starts on http://localhost:5000
```

`GET http://localhost:5000/health` → `{"status":"ok"}`

### Client

```bash
cd client
npm install
npm run dev                 # starts on http://localhost:5173
```

### Seed fake data (optional)

```bash
cd server
node scripts/seed-events.js          # seeds 14 days of events for all pets
node scripts/seed-events.js --clear  # clears seeded events first
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `JWT_SECRET` | Yes | Secret for signing auth tokens |
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `PORT` | No | Server port (default: 5000) |
| `CLIENT_ORIGIN` | No | CORS origin (default: http://localhost:5173) |

## API docs

Swagger UI is planned for `/api/docs` in a future phase. A Postman collection will live at `docs/pawtrack.postman_collection.json`.

## AI usage

Prompt-engineering decisions and AI-assisted code generation are documented per SEG2105's AI-usage requirement.
