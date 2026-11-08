import { log } from './log.js';

let botUsername;

export function getRecipients(value = process.env.TELEGRAM_CHAT_IDS ?? '') {
  return new Set(value.split(',').map((id) => id.trim()).filter(Boolean));
}

export function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function callApi(method, payload) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set.');

  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) {
    const error = new Error(`Telegram API ${response.status}: ${data.description ?? 'unknown error'}`);
    error.retryAfter = data.parameters?.retry_after;
    throw error;
  }
  return data.result;
}

export async function sendMessage(chatId, text) {
  await callApi('sendMessage', {
    chat_id: chatId, text, parse_mode: 'HTML', link_preview_options: { is_disabled: true },
  });
  log.debug('telegram.sent', { chatId });
}

// Cached for the lifetime of the function instance; only fetched when a command carries an @suffix.
export async function getBotUsername() {
  botUsername ??= (await callApi('getMe', {})).username;
  return botUsername;
}
