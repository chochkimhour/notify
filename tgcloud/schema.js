import { integer, table } from 'sdk/db';

export const subscribers = table('subscribers', {
  chatId: integer('chat_id').primaryKey(),
});
