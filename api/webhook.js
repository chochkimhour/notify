import { secretMatches } from '../lib/auth.js';
import { handleMessage } from '../lib/commands.js';
import { log } from '../lib/log.js';
import { getBotUsername, getRecipients, sendMessage } from '../lib/telegram.js';

export async function POST(request) {
  if (!secretMatches(request.headers.get('x-telegram-bot-api-secret-token'), process.env.TELEGRAM_WEBHOOK_SECRET)) {
    log.warn('webhook.unauthorized');
    return new Response('Unauthorized', { status: 401 });
  }

  const update = await request.json().catch(() => ({}));
  const message = update.message;
  if (!message?.chat) return new Response('OK');

  try {
    const command = await handleMessage(message, getRecipients(), sendMessage, getBotUsername);
    log.info('webhook.message', { chatId: message.chat.id, chatType: message.chat.type, command });
  } catch (error) {
    // Still answer 200 so Telegram does not keep retrying the same update.
    log.error('webhook.failed', { chatId: message.chat.id, error: error.message });
  }
  return new Response('OK');
}
