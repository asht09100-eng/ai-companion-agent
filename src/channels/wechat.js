import crypto from "node:crypto";
import { localFallbackReply, replyToUser } from "../agent.js";
import { rememberWechatUser } from "../storage/wechatUsers.js";
import { readBody, sendText } from "../utils/http.js";
import { tag, wechatTextMessage } from "../utils/xml.js";

const WECHAT_TOKEN = process.env.WECHAT_TOKEN || "change-me";
const WECHAT_REPLY_TIMEOUT_MS = 4500;
const WECHAT_FALLBACK_REPLY = "亲爱的，小河豚刚刚有点紧张，回复慢了一点。你再跟我说一句好不好，我会乖乖听着。";

export async function handleWechat(req, res, url) {
  if (req.method === "GET") {
    return verifyWechatServer(res, url);
  }

  if (req.method !== "POST") {
    return sendText(res, 405, "Method Not Allowed");
  }

  if (!isValidWechatSignature(url)) {
    return sendText(res, 403, "invalid signature");
  }

  const xml = await readBody(req);
  const fromUser = tag(xml, "FromUserName");
  const toUser = tag(xml, "ToUserName");
  const msgType = tag(xml, "MsgType");
  const content = normalizeWechatMessage(xml, msgType);
  await rememberWechatUser(fromUser);

  const reply = await fastWechatReply({
    userId: `wechat:${fromUser}`,
    message: content
  });

  return sendText(
    res,
    200,
    wechatTextMessage({ toUser: fromUser, fromUser: toUser, content: reply }),
    "application/xml; charset=utf-8"
  );
}

function normalizeWechatMessage(xml, msgType) {
  if (msgType === "text") return tag(xml, "Content");
  if (msgType === "voice") return tag(xml, "Recognition") || "我发了一段语音，你先温柔地回应我。";
  if (msgType === "image") return "我给你发了一张图片，但你现在只能用文字陪我回应。";
  if (msgType === "event") return normalizeWechatEvent(xml);
  return `我发来了一条${msgType || "未知"}消息，你先用文字陪我聊。`;
}

function normalizeWechatEvent(xml) {
  const event = tag(xml, "Event");
  if (event.toLowerCase() === "subscribe") {
    return "我刚刚关注了你，跟我打个招呼。";
  }
  return `微信事件：${event || "unknown"}`;
}

async function withTimeout(promise, ms, fallback) {
  let timeoutId;
  const timeout = new Promise((resolve) => {
    timeoutId = setTimeout(() => resolve(fallback), ms);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fastWechatReply({ userId, message }) {
  if (process.env.WECHAT_FAST_REPLY !== "false") {
    return localFallbackReply(message);
  }

  return withTimeout(
    replyToUser({
      userId,
      message,
      channel: "wechat private chat"
    }),
    WECHAT_REPLY_TIMEOUT_MS,
    WECHAT_FALLBACK_REPLY
  );
}

function verifyWechatServer(res, url) {
  if (!isValidWechatSignature(url)) {
    return sendText(res, 403, "invalid signature");
  }
  return sendText(res, 200, url.searchParams.get("echostr") || "");
}

function isValidWechatSignature(url) {
  const signature = url.searchParams.get("signature");
  const timestamp = url.searchParams.get("timestamp");
  const nonce = url.searchParams.get("nonce");

  if (!signature || !timestamp || !nonce) return false;

  const digest = [WECHAT_TOKEN, timestamp, nonce]
    .sort()
    .join("")
    .trim();

  const sha1 = crypto.createHash("sha1").update(digest).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(sha1), Buffer.from(signature));
}
