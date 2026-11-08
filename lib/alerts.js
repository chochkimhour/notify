import { log } from './log.js';
import { escapeHtml } from './telegram.js';

const TIME_ZONE = 'Asia/Phnom_Penh';
// Telegram allows about 30 messages per second across all chats.
const SEND_INTERVAL_MS = 40;
const MAX_ATTEMPTS = 3;
const MAX_RETRY_WAIT_MS = 10_000;

export const alerts = {
  'morning-in': {
    title: 'Morning Check-in',
    time: '08:00 AM',
    body: 'Good morning. Please remember to check in for the morning session.',
  },
  'morning-out': {
    title: 'Morning Check-out',
    time: '12:00 PM',
    body: 'The morning session has ended. Please remember to check out before your lunch break.',
  },
  'afternoon-in': {
    title: 'Afternoon Check-in',
    time: '01:30 PM',
    body: 'Welcome back. Please remember to check in for the afternoon session.',
  },
  'afternoon-out': {
    title: 'Afternoon Check-out',
    time: '05:30 PM',
    body: 'The workday has ended. Please remember to check out before you leave.\nThank you for your work today.',
  },
};

export function isAlertName(name) {
  return typeof name === 'string' && Object.hasOwn(alerts, name);
}

export function formatAlert(name, date = new Date()) {
  if (!isAlertName(name)) throw new Error('Unknown alert name.');
  const alert = alerts[name];

  const day = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: TIME_ZONE,
  }).format(date);

  return [
    `<b>${escapeHtml(alert.title)} Reminder</b>`,
    `${day} · ${escapeHtml(alert.time)}`,
    '',
    escapeHtml(alert.body),
  ].join('\n');
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function sendWithRetry(chatId, text, sendMessage, wait) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await sendMessage(chatId, text);
    } catch (error) {
      if (!error.retryAfter || attempt >= MAX_ATTEMPTS) throw error;
      const delayMs = Math.min(error.retryAfter * 1000, MAX_RETRY_WAIT_MS);
      log.warn('alert.rate_limited', { chatId, attempt, retryAfterMs: delayMs });
      await wait(delayMs);
    }
  }
}

export async function sendAlert(name, recipients, sendMessage, { date = new Date(), intervalMs = SEND_INTERVAL_MS, wait = sleep } = {}) {
  const text = formatAlert(name, date);
  const chatIds = [...recipients];
  log.info('alert.start', { alert: name, recipients: chatIds.length });

  let failed = 0;
  for (const [index, chatId] of chatIds.entries()) {
    if (index > 0 && intervalMs) await wait(intervalMs);
    try {
      await sendWithRetry(chatId, text, sendMessage, wait);
    } catch (error) {
      failed++;
      log.error('alert.delivery_failed', { alert: name, chatId, error: error.message });
    }
  }

  const summary = { delivered: chatIds.length - failed, failed };
  log[failed ? 'warn' : 'info']('alert.done', { alert: name, ...summary });
  return summary;
}
