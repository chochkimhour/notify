import test from 'node:test';
import assert from 'node:assert/strict';
import { handleMessage } from '../tgcloud/lib/commands.js';

function createHarness() {
  const subscriptions = new Set();
  const replies = [];
  const store = {
    async subscribe(chatId) { subscriptions.add(chatId); },
    async unsubscribe(chatId) { subscriptions.delete(chatId); },
    async isSubscribed(chatId) { return subscriptions.has(chatId); },
  };
  const sendMessage = async (chatId, text) => replies.push({ chatId, text });
  return { store, sendMessage, replies, subscriptions };
}

test('/start subscribes and reports schedule', async () => {
  const h = createHarness();
  await handleMessage({ chat: { id: 42 }, text: '/start' }, h.store, h.sendMessage);
  assert.equal(h.subscriptions.has(42), true);
  assert.match(h.replies[0].text, /08:00/);
  assert.match(h.replies[0].text, /17:30/);
});

test('/status distinguishes active and inactive subscriptions', async () => {
  const h = createHarness();
  await handleMessage({ chat: { id: 42 }, text: '/status' }, h.store, h.sendMessage);
  assert.match(h.replies[0].text, /Inactive/);
  await handleMessage({ chat: { id: 42 }, text: '/start' }, h.store, h.sendMessage);
  await handleMessage({ chat: { id: 42 }, text: '/status' }, h.store, h.sendMessage);
  assert.match(h.replies.at(-1).text, /Active/);
});

test('/stop unsubscribes', async () => {
  const h = createHarness();
  await handleMessage({ chat: { id: 42 }, text: '/start' }, h.store, h.sendMessage);
  await handleMessage({ chat: { id: 42 }, text: '/stop' }, h.store, h.sendMessage);
  assert.equal(h.subscriptions.has(42), false);
  assert.match(h.replies.at(-1).text, /unsubscribed/i);
});

test('/help replies with command guide', async () => {
  const h = createHarness();
  await handleMessage({ chat: { id: 42 }, text: '/help' }, h.store, h.sendMessage);
  assert.match(h.replies[0].text, /\/start/);
  assert.match(h.replies[0].text, /\/status/);
});
