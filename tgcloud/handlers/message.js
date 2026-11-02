import { api, db } from 'sdk';
import { eq } from 'sdk/db';
import { subscribers } from 'schema';
import { handleMessage } from 'lib/commands';

const store = {
  async subscribe(chatId) {
    await db.insert(subscribers).values({ chatId }).onConflictDoNothing().run();
  },
  async unsubscribe(chatId) {
    await db.delete(subscribers).where(eq(subscribers.chatId, chatId)).run();
  },
  async isSubscribed(chatId) {
    return Boolean(await db.select().from(subscribers)
      .where(eq(subscribers.chatId, chatId)).get());
  },
};

export default async function handleIncomingMessage(message) {
  await handleMessage(message, store, (chatId, text) =>
    api.sendMessage({ chat_id: chatId, text }),
  );
}
