/**
 * Lightweight structured logs for alpha/beta (grep-friendly; swap for Axiom/Datadog later).
 */
type LogLevel = 'info' | 'warn' | 'error';

function line(level: LogLevel, component: string, message: string, extra?: Record<string, unknown>) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    component,
    message,
    ...extra,
  };
  const s = JSON.stringify(payload);
  if (level === 'error') console.error(s);
  else if (level === 'warn') console.warn(s);
  else console.log(s);
}

export const log = {
  info(component: string, message: string, extra?: Record<string, unknown>) {
    line('info', component, message, extra);
  },
  warn(component: string, message: string, extra?: Record<string, unknown>) {
    line('warn', component, message, extra);
  },
  error(component: string, message: string, extra?: Record<string, unknown>) {
    line('error', component, message, extra);
  },
};
