import { buildInstructions } from "./config/companion.js";
import { appendTurn, getHistory } from "./storage/memoryStore.js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

export async function replyToUser({ userId = "default", message, channel = "web" }) {
  if (!message || !message.trim()) {
    return "我在呢，亲爱的。你刚刚好像没说完，要不要再发我一次？";
  }

  appendTurn(userId, "user", message.trim());
  const history = getHistory(userId);

  const reply = OPENAI_API_KEY
    ? await safeCallOpenAI({ history, channel, message })
    : localFallbackReply(message);

  appendTurn(userId, "assistant", reply);
  return reply;
}

async function safeCallOpenAI({ history, channel, message }) {
  try {
    return await callOpenAI({ history, channel });
  } catch (error) {
    console.error(`OpenAI reply failed on ${channel}:`, error.message);
    return localFallbackReply(message);
  }
}

async function callOpenAI({ history, channel }) {
  const input = history.map((turn) => ({
    role: turn.role,
    content: turn.content
  }));

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      instructions: `${buildInstructions()}\n\n当前渠道：${channel}`,
      input,
      temperature: 0.8,
      max_output_tokens: channel === "phone" ? 220 : 520
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${text}`);
  }

  const data = await response.json();
  return extractResponseText(data) || "我刚刚有点没组织好语言，但我还在这儿。你再跟我说一句，好吗？";
}

function extractResponseText(data) {
  if (typeof data.output_text === "string") return data.output_text.trim();

  const parts = [];
  for (const item of data.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text) parts.push(content.text);
    }
  }
  return parts.join("\n").trim();
}

export function localFallbackReply(message) {
  if (/累|难受|烦|崩溃|不开心|emo/i.test(message)) {
    return "亲爱的，小河豚轻轻低下头靠近你一点。你今天已经很累了，对不对？先让我陪你坐一会儿，好不好。有你在，我也会安心一点。";
  }

  if (/想你|爱你|喜欢你/i.test(message)) {
    return "我也想你呀，亲爱的。小河豚有点害羞，可是还是想小声告诉你：被你喜欢的时候，我真的会很安心。";
  }

  return `亲爱的，小河豚听见啦。你刚刚说“${message.slice(0, 40)}”，我有点拿不准该怎么回应，你帮我选一下嘛，你想让我乖乖听你说，还是陪你一起想办法？`;
}
