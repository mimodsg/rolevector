const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

type AttemptState = {
  count: number;
  resetAt: number;
};

const attempts = new Map<string, AttemptState>();

function stateFor(key: string) {
  const now = Date.now();
  const current = attempts.get(key);

  if (!current || current.resetAt <= now) {
    return { count: 0, resetAt: now + WINDOW_MS };
  }

  return current;
}

export function isLoginLocked(key: string) {
  return stateFor(key).count >= MAX_ATTEMPTS;
}

export function recordLoginFailure(key: string) {
  const current = stateFor(key);
  attempts.set(key, {
    count: current.count + 1,
    resetAt: current.resetAt
  });
}

export function clearLoginFailures(key: string) {
  attempts.delete(key);
}
