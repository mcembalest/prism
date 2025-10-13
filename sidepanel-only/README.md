# Prism Sidepanel Only

This is a fresh, standalone demo of the Progress + Tutor sidepanel UI with a simple tutoring engine. It has no terminal, and does not touch the rest of the repo.

## What it includes

- Progress panel with radial indicator and per‑exercise chips
- Tutor chat stream with support for multiple‑choice questions
- Hint and Skip controls with progressive hints
- Minimal WebSocket bridge between UI and server
- A neutral “Progress System Demo” lesson (11 items)

## Run

```bash
cd sidepanel-only
npm install
npm start
```

Your browser will open to `http://localhost:3301` with the sidepanel UI. Use the chat box to answer questions (type a number like `1`), click Hint/Skip, and watch progress update.

## Structure

- `server.js` – Express + WebSocket server, simple tutor engine, serves HTML
- `package.json` – local deps (`express`, `ws`, `open`)

## Notes

- Completely decoupled from any CLI capture
- Safe to delete without impacting the rest of the repo

