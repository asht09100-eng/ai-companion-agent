const conversations = new Map();
const MAX_TURNS = 20;

export function getHistory(userId) {
  return conversations.get(userId) ?? [];
}

export function appendTurn(userId, role, content) {
  const current = getHistory(userId);
  const next = [...current, { role, content, at: new Date().toISOString() }].slice(-MAX_TURNS);
  conversations.set(userId, next);
  return next;
}

export function publicHistory(userId) {
  return getHistory(userId).map(({ role, content, at }) => ({ role, content, at }));
}
