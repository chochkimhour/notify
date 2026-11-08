# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Telegram bot that sends four weekday check-in/check-out reminders (Phnom Penh time, UTC+7). It runs as two Vercel serverless functions with **no database and no npm dependencies** (Node 26 LTS, ES modules, built-in `fetch` and `node:test`).

## Commands

```bash
npm run check                 # node --check on every .js in api/ lib/ scripts/ tests/ (CI runs this)
npm test                      # offline tests, no Telegram calls
node --test --test-name-pattern="formatAlert" tests/*.test.js   # run a single test by name
npm run dev                   # local server on :3000 using .env.local (no Vercel login needed)
npm run test:loop             # send all 4 real reminders to TELEGRAM_CHAT_IDS, 1/min
npm run test:loop -- 1 0      # send one real reminder now
```

`test:loop` and `dev` read `.env.local` (git-ignored; template in `.env.example`) and `test:loop` sends real Telegram messages.

The user works in PowerShell on Windows: give PowerShell commands (`Invoke-RestMethod`, not `curl`/`grep`) when they will run them.

## Architecture

**Scheduling lives in GitHub Actions, not Vercel.** `.github/workflows/ci-cd.yml` has four UTC crons; the `reminder` job maps the cron string to an alert name (`morning-in`, `morning-out`, `afternoon-in`, `afternoon-out`) and POSTs `{ "alert": name }` to `$APP_URL/api/send-alert` with `Authorization: Bearer $ALERT_SECRET`. Changing a reminder time means changing **both** the cron line (and its `case` arm) in the workflow **and** the display `time` in `lib/alerts.js`. The same workflow has a `workflow_dispatch` input for sending one alert manually and a monthly `keepalive` cron (`0 0 1 * *`) that re-enables the workflow so GitHub's 60-day inactivity rule doesn't stop the schedule; the `reminder` job must keep excluding that cron. Vercel deploys on push to `main` via its Git integration; there is no deploy job.

**Recipients are an env var, not a store.** `TELEGRAM_CHAT_IDS` (comma-separated) is the whole subscriber list. `/start`, `/status` and `/stop` can't subscribe anyone; they report whether the chat is in the list and show its chat ID for an admin to add. Changing the list requires a Vercel redeploy.

**Request flow:**
- `api/webhook.js` (Telegram → bot): checks `x-telegram-bot-api-secret-token` against `TELEGRAM_WEBHOOK_SECRET`, then `lib/commands.js#handleMessage`. Always returns 200 after auth so Telegram doesn't retry. `/cmd@name` is answered only when `name` is this bot (`getBotUsername()` calls `getMe` once per instance). The webhook is registered once with Telegram's `setWebhook` (see README) at `$APP_URL/api/webhook`.
- `api/send-alert.js` (GitHub Actions → bot): checks the bearer secret, then `lib/alerts.js#sendAlert`, which broadcasts to every chat and returns `{ delivered, failed }` (HTTP 502 if any failed, which fails the workflow run).

Handlers use Vercel's Web-standard signature (`export async function POST(request) → Response`). `scripts/dev-server.js` wraps the same handlers in `node:http` for local use, so keep handlers framework-free.

**Dependency injection for tests.** `handleMessage(message, recipients, sendMessage)` and `sendAlert(name, recipients, sendMessage)` take the recipient `Set` and a send function as arguments; only the `api/` routes wire in the real `lib/telegram.js`. Tests pass fakes and set `LOG_LEVEL=silent`.

## Message conventions

- All messages are sent with `parse_mode: 'HTML'`. `formatAlert` escapes alert text with `escapeHtml`; use it too for any non-static text added to command replies.
- The user wants plain, formal wording: **no emoji and no footer/sign-off line**. Times are shown 12-hour with leading zero (`08:00 AM`, `01:30 PM`); the alert shows the *scheduled* time, not the send time, since GitHub crons can run late.
- Alert wording lives in the `alerts` map in `lib/alerts.js`; command replies are in `lib/commands.js`.

## Logging

`lib/log.js` writes one JSON line per event (`{time, level, event, ...}`) to stdout/stderr; on Vercel these appear under Project → Logs. Use `log.info/warn/error('area.event', {...})` with dotted event names (`alert.done`, `webhook.unauthorized`, …) and never log tokens or secrets. `LOG_LEVEL` = `debug | info | warn | error | silent`.

## Environment

| Variable | Used by |
| --- | --- |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_IDS`, `TELEGRAM_WEBHOOK_SECRET`, `ALERT_SECRET` | Vercel (and `.env.local` locally) |
| `APP_URL` (no trailing slash), `ALERT_SECRET` | GitHub Actions secrets |
