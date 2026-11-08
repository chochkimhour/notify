import { handleMessage } from '../lib/commands.js';
import { log } from '../lib/log.js';
import { getRecipients, sendMessage } from '../lib/telegram.js';

export async function POST(request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || request.headers.get('x-telegram-bot-api-secret-token') !== secret) {
    log.warn('webhook.unauthorized');
    return new Response('Unauthorized', { status: 401 });
  }

  const update = await request.json().catch(() => ({}));
  const message = update.message;
  if (!message?.chat) return new Response('OK');

  try {
    const command = await handleMessage(message, getRecipients(), sendMessage);
    log.info('webhook.message', { chatId: message.chat.id, chatType: message.chat.type, command });
  } catch (error) {
    // Still answer 200 so Telegram does not keep retrying the same update.
    log.error('webhook.failed', { chatId: message.chat.id, error: error.message });
  }
  return new Response('OK');
}
