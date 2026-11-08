const levels = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };

function write(level, event, details = {}) {
  const threshold = levels[process.env.LOG_LEVEL ?? 'info'] ?? levels.info;
  if (levels[level] < threshold) return;
  const line = JSON.stringify({ time: new Date().toISOString(), level, event, ...details });
  (level === 'error' || level === 'warn' ? console.error : console.log)(line);
}

export const log = {
  debug: (event, details) => write('debug', event, details),
  info: (event, details) => write('info', event, details),
  warn: (event, details) => write('warn', event, details),
  error: (event, details) => write('error', event, details),
};
