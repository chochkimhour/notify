import { sendAlert } from '../lib/alerts.js';
import { log } from '../lib/log.js';
import { getRecipients, sendMessage } from '../lib/telegram.js';

export async function POST(request) {
  const secret = process.env.ALERT_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    log.warn('send_alert.unauthorized');
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { alert } = await request.json().catch(() => ({}));
  try {
    const result = await sendAlert(alert, getRecipients(), sendMessage);
    return Response.json(result, { status: result.failed ? 502 : 200 });
  } catch (error) {
    log.warn('send_alert.rejected', { alert, error: error.message });
    return Response.json({ error: error.message }, { status: 400 });
  }
}
