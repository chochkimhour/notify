import { alerts } from './alerts.js';

const scheduleText = Object.values(alerts)
  .map(({ time, title }) => `• <b>${time}</b> — ${title}`)
  .join('\n');

function isCommand(command, name) {
  return command === name;
}

function notEnrolled(chatId) {
  return [
    'This chat is not yet enrolled for reminders.',
    '',
    `Chat ID: <code>${chatId}</code>`,
    'Please share this ID with your administrator to be added.',
  ].join('\n');
}

// getBotUsername is only called for "/command@botname", so commands addressed to other bots in a group are ignored.
export async function handleMessage(message, recipients, sendMessage, getBotUsername) {
  const chatId = message.chat.id;
  const [command, target] = (message.text ?? '').trim().split(/\s+/, 1)[0].toLowerCase().split('@', 2);
  if (target !== undefined && (!getBotUsername || target !== (await getBotUsername()).toLowerCase())) {
    return null;
  }
  const subscribed = recipients.has(String(chatId));

  if (isCommand(command, '/start')) {
    await sendMessage(chatId, [
      '<b>Welcome</b>',
      '',
      subscribed
        ? `This chat is enrolled. You will receive reminders every weekday (Monday–Friday), Phnom Penh time (UTC+7):\n\n${scheduleText}`
        : notEnrolled(chatId),
      '',
      'Send /help to see available commands.',
    ].join('\n'));
    return 'start';
  }

  if (isCommand(command, '/status')) {
    await sendMessage(chatId, [
      '<b>Reminder Status</b>',
      '',
      subscribed
        ? `Status: <b>Active</b>\n\nWeekdays · Phnom Penh time (UTC+7)\n${scheduleText}`
        : `Status: <b>Inactive</b>\n\n${notEnrolled(chatId)}`,
    ].join('\n'));
    return 'status';
  }

  if (isCommand(command, '/stop')) {
    await sendMessage(chatId, [
      '<b>Stop Reminders</b>',
      '',
      subscribed
        ? `Reminders are managed by your administrator. To stop them, please ask to have chat ID <code>${chatId}</code> removed.`
        : 'This chat is not receiving reminders, so no action is needed.',
    ].join('\n'));
    return 'stop';
  }

  if (isCommand(command, '/help')) {
    await sendMessage(chatId, [
      '<b>Help</b>',
      '',
      'I send weekday check-in and check-out reminders in Phnom Penh time (UTC+7).',
      '',
      '/start — Welcome message and enrollment status',
      '/status — Your reminder status and schedule',
      '/stop — How to stop reminders',
      '/help — Show this list of commands',
    ].join('\n'));
    return 'help';
  }

  return null;
}
