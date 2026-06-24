# PawTrack

A mobile-first web app for logging pet routines (meals, medication, activity,
litter, bathroom events, treats) by typing plain language — Google Gemini
extracts a structured event, you confirm an editable preview, and it saves to
MongoDB. Built for SEG2105 at the University of Ottawa.

## Repository layout

```
client/   React 19 + Vite + Tailwind CSS v4 frontend
server/   Express 5 + Mongoose API, Gemini integration, Swagger docs
docs/     Requirements spec, prompt-engineering log, test plan, Postman collection
```

## Running the server (dev)

```
cd server
cp .env.example .env   # fill in MONGODB_URI (and later JWT_SECRET, GEMINI_API_KEY)
npm install
npm run dev
```

`GET http://localhost:5000/health` should return `{"status":"ok"}`.

## Running the client (dev)

Client setup lands in Phase 2 of the build. This section will be filled in
once `client/` exists.

## API docs

Once Phase 11 ships, live Swagger UI will be served at `/api/docs`, and a
ready-to-import Postman collection will live at
`docs/pawtrack.postman_collection.json`.

## AI usage

Prompt-engineering decisions and AI-assisted code generation are logged in
`docs/prompt-log.md`, per SEG2105's AI-usage documentation requirement.
