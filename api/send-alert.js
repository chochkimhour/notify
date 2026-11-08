import { isAlertName, sendAlert } from '../lib/alerts.js';
import { secretMatches } from '../lib/auth.js';
import { log } from '../lib/log.js';
import { getRecipients, sendMessage } from '../lib/telegram.js';

export async function POST(request) {
  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
  if (!secretMatches(token, process.env.ALERT_SECRET)) {
    log.warn('send_alert.unauthorized');
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { alert } = await request.json().catch(() => ({}));
  if (!isAlertName(alert)) {
    log.warn('send_alert.rejected', { alert, error: 'Unknown alert name.' });
    return Response.json({ error: 'Unknown alert name.' }, { status: 400 });
  }

  const result = await sendAlert(alert, getRecipients(), sendMessage);
  return Response.json(result, { status: result.failed ? 502 : 200 });
}
