import { log } from './log.js';

const TIME_ZONE = 'Asia/Phnom_Penh';

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

export function formatAlert(name, date = new Date()) {
  const alert = alerts[name];
  if (!alert) throw new Error('Unknown alert name.');

  const day = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: TIME_ZONE,
  }).format(date);

  return [
    `<b>${alert.title} Reminder</b>`,
    `${day} · ${alert.time}`,
    '',
    alert.body,
  ].join('\n');
}

export async function sendAlert(name, recipients, sendMessage, date = new Date()) {
  const text = formatAlert(name, date);
  const chatIds = [...recipients];
  log.info('alert.start', { alert: name, recipients: chatIds.length });

  const results = await Promise.allSettled(chatIds.map((chatId) => sendMessage(chatId, text)));
  let failed = 0;
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      failed++;
      log.error('alert.delivery_failed', { alert: name, chatId: chatIds[index], error: result.reason?.message });
    }
  });

  const summary = { delivered: chatIds.length - failed, failed };
  log[failed ? 'warn' : 'info']('alert.done', { alert: name, ...summary });
  return summary;
}
