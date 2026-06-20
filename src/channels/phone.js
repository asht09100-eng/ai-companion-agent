import { replyToUser } from "../agent.js";
import { parseForm, parseJson, sendJson, sendText, readBody } from "../utils/http.js";
import { twimlSayGather } from "../utils/xml.js";

const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || "http://localhost:8787";
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;

export async function handleTwilioVoice(_req, res) {
  return sendText(
    res,
    200,
    twimlSayGather({
      text: "亲爱的，是我，小河豚。我在听呢，你想跟我说什么？",
      action: `${PUBLIC_BASE_URL}/webhooks/twilio/speech`
    }),
    "application/xml; charset=utf-8"
  );
}

export async function handleTwilioSpeech(req, res) {
  const raw = await readBody(req);
  const form = parseForm(raw);
  const callSid = form.CallSid || "unknown";
  const speech = form.SpeechResult || "你刚刚没有说清楚";

  const reply = await replyToUser({
    userId: `phone:${callSid}`,
    message: speech,
    channel: "phone"
  });

  return sendText(
    res,
    200,
    twimlSayGather({
      text: reply,
      action: `${PUBLIC_BASE_URL}/webhooks/twilio/speech`
    }),
    "application/xml; charset=utf-8"
  );
}

export async function createOutboundCall(req, res) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    return sendJson(res, 400, {
      error: "Twilio is not configured",
      requiredEnv: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER", "PUBLIC_BASE_URL"]
    });
  }

  const { to } = await parseJson(req);
  if (!to) return sendJson(res, 400, { error: "Missing `to` phone number" });

  const body = new URLSearchParams({
    To: to,
    From: TWILIO_FROM_NUMBER,
    Url: `${PUBLIC_BASE_URL}/webhooks/twilio/voice`
  });

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  const data = await response.json();
  return sendJson(res, response.ok ? 200 : response.status, data);
}
