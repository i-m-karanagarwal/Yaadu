# Yaadu

Hinglish bill reminders — type a bill in Hindi/English/Hinglish, confirm the parse, get email nudges before due.

## Stack

- Next.js 14 (App Router) on Vercel
- MongoDB Atlas (`yaadu` / `bills`)
- NVIDIA NIM (OpenAI-compatible) for free-text parsing
- Resend + Vercel Cron for daily reminders
- Passcode gate (`APP_PASSCODE`)

## Local setup

1. Copy `.env.example` → `.env.local` and fill values.
2. `npm install && npm run dev`

## Env vars

See `.env.example`. Never commit `.env.local`.
