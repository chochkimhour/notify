const schedule = [
  '08:00 — Morning check-in',
  '12:00 — Morning check-out',
  '13:30 — Afternoon check-in',
  '17:30 — Afternoon check-out',
];

const scheduleText = schedule.join('\n');

export async function handleMessage(message, store, sendMessage) {
  const chatId = message.chat.id;
  const command = (message.text ?? '').trim().split(/\s+/, 1)[0].toLowerCase();

  if (command === '/start' || command.startsWith('/start@')) {
    await store.subscribe(chatId);
    await sendMessage(chatId,
      `✅ You’re subscribed to weekday attendance reminders.\n\nTimezone: Phnom Penh (UTC+7)\n${scheduleText}\n\nUse /status to check your subscription or /stop to unsubscribe.`,
    );
    return;
  }

  if (command === '/stop' || command.startsWith('/stop@')) {
    await store.unsubscribe(chatId);
    await sendMessage(chatId,
      'You’re unsubscribed and will no longer receive reminders. Send /start to subscribe again.',
    );
    return;
  }

  if (command === '/status' || command.startsWith('/status@')) {
    const subscribed = await store.isSubscribed(chatId);
    await sendMessage(chatId, subscribed
      ? `📋 Subscription status: Active\n\nWeekdays · Phnom Penh time (UTC+7)\n${scheduleText}\n\nSend /stop to unsubscribe.`
      : '📋 Subscription status: Inactive\n\nSend /start to subscribe to weekday attendance reminders.',
    );
    return;
  }

  if (command === '/help' || command.startsWith('/help@')) {
    await sendMessage(chatId,
      'I send weekday attendance reminders in Phnom Penh time (UTC+7).\n\n/start — Subscribe\n/status — View your subscription and schedule\n/stop — Unsubscribe\n/help — Show these commands',
    );
  }
}
