// Temporary test mode: sends one alert per interval, cycling through every alert type.
// Usage: npm run test:loop [-- <count> <intervalSeconds>]
import { alerts, sendAlert } from '../lib/alerts.js';
import { log } from '../lib/log.js';
import { getRecipients, sendMessage } from '../lib/telegram.js';

const names = Object.keys(alerts);
const count = Number(process.argv[2] ?? names.length);
const intervalMs = Number(process.argv[3] ?? 60) * 1000;
const recipients = getRecipients();

if (!recipients.size) {
  log.error('test_loop.no_recipients');
  process.exit(1);
}

for (let i = 0; i < count; i++) {
  await sendAlert(names[i % names.length], recipients, sendMessage);
  if (i < count - 1) await new Promise((resolve) => setTimeout(resolve, intervalMs));
}
