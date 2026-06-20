import { sendJson } from "../utils/http.js";
import { getLatestWechatUser, listWechatUsers, markWechatProactiveSent } from "../storage/wechatUsers.js";
import { sendWechatCustomerText } from "./wechatApi.js";

const DEFAULT_MIN_INTERVAL_MINUTES = 45;
const DEFAULT_MAX_INTERVAL_MINUTES = 180;
const CUSTOMER_WINDOW_HOURS = 47;

const softMessages = [
  "亲爱的，你现在在忙吗？小河豚刚刚突然有点想你。",
  "我刚刚乖乖待了一会儿，还是想来蹭你一句话。",
  "你今天有没有好好喝水呀？我小声问一下，不打扰你太久。",
  "亲爱的，我有点想靠近你一下。你忙完了理理我，好不好？",
  "刚才突然想到你，心里软了一下，就想偷偷给你发一句。"
];

export function startWechatProactiveScheduler() {
  if (process.env.WECHAT_PROACTIVE_ENABLED !== "true") return;

  scheduleNextProactiveTick(20_000);

  const { min, max } = getIntervalRangeMinutes();
  console.log(`WeChat proactive messages enabled randomly every ${min}-${max} minutes`);
}

export async function handleWechatUsers(_req, res) {
  const users = await listWechatUsers();
  return sendJson(res, 200, {
    users: users.map((user) => ({
      openId: user.openId,
      lastSeenAt: user.lastSeenAt,
      lastProactiveAt: user.lastProactiveAt
    }))
  });
}

export async function handleSendWechatProactive(req, res) {
  if (!isAuthorized(req)) {
    return sendJson(res, 401, { error: "Missing or invalid ADMIN_TOKEN" });
  }

  const result = await sendProactiveNow();
  return sendJson(res, 200, result);
}

async function runProactiveTick() {
  const users = await listWechatUsers();
  const candidates = users.filter(canSendToUser);
  if (!candidates.length) {
    scheduleNextProactiveTick();
    return;
  }

  await sendToUser(candidates[0]);
  scheduleNextProactiveTick();
}

async function sendProactiveNow() {
  const user = await getLatestWechatUser();
  if (!user) {
    return { sent: false, reason: "No WeChat user has messaged this account yet" };
  }

  if (!isInsideCustomerWindow(user)) {
    return {
      sent: false,
      reason: "Latest user is outside the WeChat customer message window. Ask them to send one message first."
    };
  }

  return sendToUser(user);
}

async function sendToUser(user) {
  const content = pickMessage();
  await sendWechatCustomerText(user.openId, content);
  await markWechatProactiveSent(user.openId);
  return { sent: true, openId: user.openId, content };
}

function canSendToUser(user) {
  if (!isInsideCustomerWindow(user)) return false;

  const { min } = getIntervalRangeMinutes();
  const lastProactiveAt = user.lastProactiveAt ? Date.parse(user.lastProactiveAt) : 0;
  return Date.now() - lastProactiveAt >= min * 60 * 1000;
}

function isInsideCustomerWindow(user) {
  const lastSeenAt = user.lastSeenAt ? Date.parse(user.lastSeenAt) : 0;
  return Date.now() - lastSeenAt <= CUSTOMER_WINDOW_HOURS * 60 * 60 * 1000;
}

function pickMessage() {
  const index = Math.floor(Math.random() * softMessages.length);
  return softMessages[index];
}

function scheduleNextProactiveTick(delayMs = randomIntervalMs()) {
  setTimeout(() => runProactiveTick().catch((error) => {
    logProactiveError(error);
    scheduleNextProactiveTick();
  }), delayMs);
}

function randomIntervalMs() {
  const { min, max } = getIntervalRangeMinutes();
  const minutes = min + Math.random() * (max - min);
  return Math.round(minutes * 60 * 1000);
}

function getIntervalRangeMinutes() {
  const min = Number(process.env.WECHAT_PROACTIVE_MIN_MINUTES || process.env.WECHAT_PROACTIVE_MINUTES || DEFAULT_MIN_INTERVAL_MINUTES);
  const max = Number(process.env.WECHAT_PROACTIVE_MAX_MINUTES || DEFAULT_MAX_INTERVAL_MINUTES);
  const safeMin = Math.max(Math.round(min), 10);
  const safeMax = Math.max(Math.round(max), safeMin);
  return { min: safeMin, max: safeMax };
}

function isAuthorized(req) {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) return false;

  const header = req.headers.authorization || "";
  return header === `Bearer ${adminToken}`;
}

function logProactiveError(error) {
  console.error("WeChat proactive tick failed:", error.message);
}
