# Telegram Workday Alerts

Weekday attendance reminders for Telegram, deployed on [Vercel](https://vercel.com). There's no database: the chats that receive reminders are listed in the `TELEGRAM_CHAT_IDS` environment variable. [cron-job.org](https://cron-job.org) triggers each reminder on schedule by calling the Vercel endpoint.

## Schedule

Times are in Phnom Penh time (UTC+7). Four cron-job.org jobs, each set to timezone `Asia/Phnom_Penh`, send a `POST` to `$APP_URL/api/send-alert` with the headers `Authorization: Bearer <ALERT_SECRET>` and `Content-Type: application/json`.

| Time (Mon–Fri) | Alert | Request body |
| --- | --- | --- |
| 08:00 AM | Morning check-in | `{"alert":"morning-in"}` |
| 12:00 PM | Morning check-out | `{"alert":"morning-out"}` |
| 01:30 PM | Afternoon check-in | `{"alert":"afternoon-in"}` |
| 05:30 PM | Afternoon check-out | `{"alert":"afternoon-out"}` |

## Messages

Reminders are sent as plain, formal text with a bold title, the Phnom Penh date and the scheduled time:

> **Morning Check-in Reminder**
> Monday, 9 November 2026 · 08:00 AM
>
> Good morning. Please remember to check in for the morning session.

The time shown is the scheduled time, not the send time, so a late run still shows the correct time. To change the wording, edit the title, time or body of each alert in [`lib/alerts.js`](lib/alerts.js); command replies are in [`lib/commands.js`](lib/commands.js). Alert text is HTML-escaped automatically, so `&`, `<` and `>` are safe to use. If you change a time, also change its job in the cron-job.org console.

Reminders are sent one chat at a time (about 25 per second, under Telegram's limit). If Telegram still answers "Too Many Requests", the send waits the time Telegram asks for and retries up to twice.

## How it works

| Path | Purpose |
| --- | --- |
| `api/webhook.js` | Telegram webhook. Answers `/start`, `/status`, `/stop` and `/help`. |
| `api/send-alert.js` | `POST { "alert": "morning-in" }` with `Authorization: Bearer <ALERT_SECRET>` sends that alert to every chat in `TELEGRAM_CHAT_IDS`. |
| `lib/alerts.js` | Alert wording, schedule times and delivery to every chat. |
| `lib/commands.js` | Replies to `/start`, `/status`, `/stop` and `/help`. |
| `lib/telegram.js` | Telegram Bot API client and `TELEGRAM_CHAT_IDS` parsing. |
| `lib/log.js` | JSON logger (see [Logs](#logs)). |
| `scripts/dev-server.js`, `scripts/test-loop.js` | Local server and the reminder test loop. Not deployed as routes. |
| `.github/workflows/ci-cd.yml` | Runs checks on pull requests and pushes, and can send one alert manually. Scheduling is done by cron-job.org. |

Alert names: `morning-in`, `morning-out`, `afternoon-in`, `afternoon-out`.

## Environment variables

See [`.env.example`](.env.example).

| Variable | Where | Value |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | Vercel | Bot API token from [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_CHAT_IDS` | Vercel | Comma-separated chat IDs to remind, e.g. `123456789,-1001234567890` |
| `TELEGRAM_WEBHOOK_SECRET` | Vercel | Random string; Telegram sends it with each webhook call |
| `ALERT_SECRET` | Vercel and GitHub secret | Random string that authorizes `/api/send-alert` |
| `APP_URL` | GitHub secret | Your deployment URL, e.g. `https://notify.vercel.app` (no trailing slash) |

Generate random secrets with `openssl rand -hex 32`. Telegram webhook secrets may only contain `A-Z`, `a-z`, `0-9`, `_` and `-`.

## Deploy

1. Create the bot with @BotFather and copy its token.
2. Import this GitHub repository in Vercel (**Add New → Project**). No build settings are needed. Vercel redeploys on every push to `main`.
3. In **Vercel → Project → Settings → Environment Variables**, add `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `ALERT_SECRET` and `TELEGRAM_CHAT_IDS` (it can be empty at first), then redeploy.
4. Register the webhook once:

   ```bash
   curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
     -d "url=https://<your-app>.vercel.app/api/webhook" \
     -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>" \
     -d "allowed_updates=[\"message\"]"
   ```

5. Send `/start` to the bot (or in a group with the bot). It replies with the chat ID. Add that ID to `TELEGRAM_CHAT_IDS` in Vercel and redeploy.
6. In **GitHub → Settings → Secrets and variables → Actions**, add `APP_URL` and `ALERT_SECRET`.
7. Test delivery once:

   ```bash
   curl -X POST "https://<your-app>.vercel.app/api/send-alert" \
     -H "Authorization: Bearer <ALERT_SECRET>" \
     -H "Content-Type: application/json" \
     -d '{"alert":"morning-in"}'
   ```

   In PowerShell:

   ```powershell
   Invoke-RestMethod -Method Post -Uri "https://<your-app>.vercel.app/api/send-alert" -Headers @{ Authorization = "Bearer <ALERT_SECRET>" } -ContentType 'application/json' -Body '{"alert":"morning-in"}'
   ```

To stop reminders for a chat, remove its ID from `TELEGRAM_CHAT_IDS` and redeploy.

## Commands

| Telegram command | Action |
| --- | --- |
| `/start` | Show the chat ID and whether this chat receives reminders |
| `/status` | Show reminder status and schedule |
| `/stop` | Explain how to stop reminders |
| `/help` | Show command help |

## Logs

Every route writes one JSON line per event, for example:

```json
{"time":"2026-11-09T01:00:02.114Z","level":"info","event":"alert.done","alert":"morning-in","delivered":12,"failed":0}
```

| Event | Level | Meaning |
| --- | --- | --- |
| `alert.start` / `alert.done` | info (warn if any failed) | A reminder run and its delivery counts |
| `alert.delivery_failed` | error | One chat could not be reached, with Telegram's reason |
| `webhook.message` | info | A chat sent a command |
| `webhook.failed` | error | Replying to a command failed |
| `webhook.unauthorized`, `send_alert.unauthorized` | warn | A request arrived without the right secret |
| `send_alert.rejected` | warn | An unknown alert name was requested |

On Vercel, view them under **Project → Logs** (filter by `level` or `event`). Locally they print in the terminal. Set `LOG_LEVEL` to `debug`, `info` (default), `warn`, `error` or `silent`.

## Development

Use Node.js 26 LTS, the same version as Vercel and CI (`engines` in `package.json` is `26.x`). Vercel applies Node patch and security updates itself; locally, update with the Node.js installer or `winget upgrade OpenJS.NodeJS.LTS`.

- `npm run check` checks the syntax of every `.js` file in `api/`, `lib/`, `scripts/` and `tests/`.
- To send a reminder manually, open **Actions → CI and reminders → Run workflow** and pick the alert.
- `npm run test:loop` sends all four reminders to `TELEGRAM_CHAT_IDS`, one per minute. Pass `-- <count> <seconds>` to change it, e.g. `npm run test:loop -- 1 0` sends one now.
- `npm test` runs offline tests with a fake message sender. They don't contact Telegram.
- `npm run dev` serves the API routes at `http://localhost:3000` with variables from `.env.local`, without needing a Vercel login. Telegram can't reach `localhost`, so the webhook only receives messages through a tunnel such as `cloudflared tunnel --url http://localhost:3000`.

Released under the [MIT License](LICENSE).

Copyright (c) 2026.
