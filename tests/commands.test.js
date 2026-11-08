import test from 'node:test';
import assert from 'node:assert/strict';
import { handleMessage } from '../lib/commands.js';
import { formatAlert, sendAlert } from '../lib/alerts.js';
import { escapeHtml, getRecipients } from '../lib/telegram.js';
import { secretMatches } from '../lib/auth.js';

process.env.LOG_LEVEL = 'silent';

function createHarness(chatIds = '') {
  const replies = [];
  const sendMessage = async (chatId, text) => replies.push({ chatId, text });
  return { recipients: getRecipients(chatIds), sendMessage, replies };
}

test('getRecipients parses comma-separated chat IDs', () => {
  assert.deepEqual([...getRecipients(' 42, -100123 ,,')], ['42', '-100123']);
});

test('/start shows the chat ID when the chat is not enrolled', async () => {
  const h = createHarness();
  const command = await handleMessage({ chat: { id: 42 }, text: '/start' }, h.recipients, h.sendMessage);
  assert.equal(command, 'start');
  assert.match(h.replies[0].text, /Chat ID: <code>42<\/code>/);
});

test('/start reports the schedule for an enrolled chat', async () => {
  const h = createHarness('42');
  await handleMessage({ chat: { id: 42 }, text: '/start@MyBot' }, h.recipients, h.sendMessage, async () => 'MyBot');
  assert.match(h.replies[0].text, /08:00/);
  assert.match(h.replies[0].text, /05:30 PM/);
});

test('commands addressed to another bot are ignored', async () => {
  const h = createHarness('42');
  const command = await handleMessage({ chat: { id: 42 }, text: '/help@OtherBot' }, h.recipients, h.sendMessage, async () => 'MyBot');
  assert.equal(command, null);
  assert.equal(h.replies.length, 0);
});

test('/status distinguishes active and inactive chats', async () => {
  const h = createHarness('42');
  await handleMessage({ chat: { id: 7 }, text: '/status' }, h.recipients, h.sendMessage);
  await handleMessage({ chat: { id: 42 }, text: '/status' }, h.recipients, h.sendMessage);
  assert.match(h.replies[0].text, /Inactive/);
  assert.match(h.replies[1].text, /Active/);
});

test('/help replies with command guide', async () => {
  const h = createHarness();
  await handleMessage({ chat: { id: 42 }, text: '/help' }, h.recipients, h.sendMessage);
  assert.match(h.replies[0].text, /\/start/);
  assert.match(h.replies[0].text, /\/status/);
});

test('unknown messages get no reply', async () => {
  const h = createHarness();
  assert.equal(await handleMessage({ chat: { id: 42 }, text: 'hello' }, h.recipients, h.sendMessage), null);
  assert.equal(h.replies.length, 0);
});

test('formatAlert includes title, Phnom Penh date and scheduled time', () => {
  const text = formatAlert('morning-in', new Date('2026-11-09T01:00:00Z'));
  assert.match(text, /Morning Check-in Reminder/);
  assert.match(text, /Monday, 9 November 2026 · 08:00 AM$/m);
});

const noWait = { intervalMs: 0, wait: async () => {} };

test('sendAlert delivers to every recipient and counts failures', async () => {
  const sent = [];
  const result = await sendAlert('morning-in', getRecipients('1,2,3'), async (chatId, text) => {
    if (chatId === '2') throw new Error('blocked');
    sent.push({ chatId, text });
  }, noWait);
  assert.deepEqual(result, { delivered: 2, failed: 1 });
  assert.match(sent[0].text, /check in/);
});

test('sendAlert retries a rate-limited send after retry_after', async () => {
  const waits = [];
  let calls = 0;
  const result = await sendAlert('morning-in', getRecipients('1'), async () => {
    if (++calls === 1) throw Object.assign(new Error('Too Many Requests'), { retryAfter: 2 });
  }, { intervalMs: 0, wait: async (ms) => waits.push(ms) });
  assert.deepEqual(result, { delivered: 1, failed: 0 });
  assert.deepEqual(waits, [2000]);
});

test('sendAlert rejects unknown and inherited alert names', async () => {
  for (const name of ['lunch', 'constructor', 'toString', undefined]) {
    await assert.rejects(sendAlert(name, getRecipients('1'), async () => {}, noWait), /Unknown alert/);
  }
});

test('escapeHtml escapes Telegram HTML special characters', () => {
  assert.equal(escapeHtml('Check in & out <now>'), 'Check in &amp; out &lt;now&gt;');
});

test('secretMatches accepts only the exact secret', () => {
  assert.equal(secretMatches('abc', 'abc'), true);
  assert.equal(secretMatches('abd', 'abc'), false);
  assert.equal(secretMatches('abc', ''), false);
  assert.equal(secretMatches(null, 'abc'), false);
});
