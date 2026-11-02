# Telegram Workday Alerts

Weekday attendance reminders built on Telegram Serverless (`tgcloud`). Telegram runs the bot handlers and hosts the subscriber database. GitHub Actions provides the external schedule because Telegram Serverless does not currently run cron jobs.


## Schedule

Times are in Phnom Penh time (UTC+7). GitHub Actions schedules use UTC.

| Phnom Penh | Alert | UTC schedule |
| --- | --- | --- |
| Mon–Fri, 08:00 | Morning check-in | `0 1 * * 1-5` |
| Mon–Fri, 12:00 | Morning check-out | `0 5 * * 1-5` |
| Mon–Fri, 13:30 | Afternoon check-in | `30 6 * * 1-5` |
| Mon–Fri, 17:30 | Afternoon check-out | `30 10 * * 1-5` |

GitHub Actions may start scheduled runs late during busy periods, so delivery is not guaranteed to the exact minute.

## Requirements and access

- Node.js 20 or newer and npm
- Telegram Serverless enabled for your bot in [@BotFather](https://t.me/BotFather). Telegram currently offers this as a beta feature and access may need to be requested.
- The bot's **Serverless → CLI Access** token. This `app…` token is different from the Bot API token; never commit it or share it in chat.
- A GitHub repository with Actions enabled

## Set up and deploy

1. Install the project dependencies: `npm install`.
2. In @BotFather, enable Serverless for the bot and request access if prompted.
3. Get the separate CLI Access token from **BotFather → your bot → Serverless → CLI Access → Access token**.
4. Authenticate from this project directory with `npx tgcloud login`, then paste the CLI token into its prompt.
5. Check the pending changes with `npx tgcloud status`.
6. Deploy the bot modules with `npm run deploy` (`npx tgcloud push`).
7. Create the subscriber database table with `npm run migrate` (`npx tgcloud migrate`) and confirm the proposed table creation.
8. Check the managed webhook using `npx tgcloud webhook`. Telegram Serverless manages the webhook; do not set it manually.
9. In the GitHub repository, add an Actions secret named `TGCLOUD_TOKEN` with the Serverless CLI Access token. Push to `main` to activate automated deployments and scheduled reminders.
10. Message your bot with `/start` to subscribe.

The `.tgcloud/` folder stores local CLI credentials and state and is excluded from Git.

## Commands

| Telegram command | Action |
| --- | --- |
| `/start` | Subscribe and display the schedule |
| `/status` | Show subscription status and reminder times |
| `/stop` | Unsubscribe |
| `/help` | Show command help |

## Development and checks

- `npm install` installs the CLI and development tools.
- `npm run check` checks JavaScript module syntax.
- `npm test` runs offline command-handler tests with a fake subscriber store and message sender. These tests do not need Telegram Serverless access and do not send messages.
- `npx tgcloud run handlers/message '{ chat: { id: 123, type: "private" }, text: "/help" }'` invokes the handler on Telegram Serverless with a sample update.
- `npx tgcloud status` compares local modules with the deployed copy.
- `npm run deploy` deploys changed modules.

## GitHub Actions

The workflow at `.github/workflows/ci-cd.yml` checks changes on pull requests, deploys pushes to `main`, and invokes the alert endpoint on the four weekday UTC schedules. Set the repository Actions secret `TGCLOUD_TOKEN` before relying on deployment or scheduled deliveries. Scheduled reminders run on the default branch and require the bot modules and database schema to have been deployed and migrated first.

Released under the [MIT License](LICENSE).

Copyright (c) 2026.
