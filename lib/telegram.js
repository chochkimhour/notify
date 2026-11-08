import { log } from './log.js';

export function getRecipients(value = process.env.TELEGRAM_CHAT_IDS ?? '') {
  return new Set(value.split(',').map((id) => id.trim()).filter(Boolean));
}

export async function sendMessage(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set.');

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', link_preview_options: { is_disabled: true } }),
  });
  if (!response.ok) {
    const { description } = await response.json().catch(() => ({}));
    throw new Error(`Telegram API ${response.status}: ${description ?? 'unknown error'}`);
  }
  log.debug('telegram.sent', { chatId });
}
