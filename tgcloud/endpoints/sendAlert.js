import { api, db } from 'sdk';
import { subscribers } from 'schema';

const messages = {
  'morning-in': '🌅 Morning check-in time. Please check in.',
  'morning-out': '☀️ Morning check-out time. Please check out.',
  'afternoon-in': '🌤️ Afternoon check-in time. Please check in.',
  'afternoon-out': '🌇 Afternoon check-out time. Please check out.',
};

export default async function sendAlert(input = {}) {
  const text = messages[input.alert];
  if (!text) throw new Error('Unknown alert name.');

  const chats = await db.select().from(subscribers).all();
  const results = await Promise.allSettled(chats.map(({ chatId }) =>
    api.sendMessage({ chat_id: chatId, text }),
  ));
  const failed = results.filter((result) => result.status === 'rejected').length;
  if (failed) throw new Error(`Failed to deliver to ${failed} of ${chats.length} subscribers.`);
  return { delivered: chats.length };
}
