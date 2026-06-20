import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const runtimeDir = path.resolve(__dirname, "../../.runtime");
const usersPath = path.join(runtimeDir, "wechat-users.json");

let users = new Map();
let loaded = false;

export async function rememberWechatUser(openId) {
  if (!openId) return;
  await loadUsers();

  const now = new Date().toISOString();
  const current = users.get(openId) ?? {};
  users.set(openId, {
    ...current,
    openId,
    lastSeenAt: now
  });

  await saveUsers();
}

export async function listWechatUsers() {
  await loadUsers();
  return [...users.values()].sort((a, b) => (b.lastSeenAt || "").localeCompare(a.lastSeenAt || ""));
}

export async function getLatestWechatUser() {
  const [latest] = await listWechatUsers();
  return latest ?? null;
}

export async function markWechatProactiveSent(openId) {
  if (!openId) return;
  await loadUsers();

  const current = users.get(openId) ?? { openId };
  users.set(openId, {
    ...current,
    lastProactiveAt: new Date().toISOString()
  });

  await saveUsers();
}

async function loadUsers() {
  if (loaded) return;
  loaded = true;

  try {
    const raw = await fs.readFile(usersPath, "utf8");
    const data = JSON.parse(raw);
    users = new Map((data.users ?? []).map((user) => [user.openId, user]));
  } catch {
    users = new Map();
  }
}

async function saveUsers() {
  await fs.mkdir(runtimeDir, { recursive: true });
  const body = JSON.stringify({ users: [...users.values()] }, null, 2);
  await fs.writeFile(usersPath, body, "utf8");
}
