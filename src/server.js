import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { replyToUser } from "./agent.js";
import { handleWechat } from "./channels/wechat.js";
import { handleSendWechatProactive, handleWechatUsers, startWechatProactiveScheduler } from "./channels/wechatProactive.js";
import { createOutboundCall, handleTwilioSpeech, handleTwilioVoice } from "./channels/phone.js";
import { parseJson, sendJson, sendText } from "./utils/http.js";
import { publicHistory } from "./storage/memoryStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");
const PORT = Number(process.env.PORT || 8787);

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    if (req.method === "GET" && url.pathname === "/health") {
      return sendJson(res, 200, { ok: true, at: new Date().toISOString() });
    }

    if (req.method === "POST" && url.pathname === "/api/chat") {
      const { userId = "web:default", message } = await parseJson(req);
      const reply = await replyToUser({ userId, message, channel: "web" });
      return sendJson(res, 200, { reply, history: publicHistory(userId) });
    }

    if (req.method === "POST" && url.pathname === "/api/calls") {
      return createOutboundCall(req, res);
    }

    if (req.method === "GET" && url.pathname === "/api/wechat/users") {
      return handleWechatUsers(req, res);
    }

    if (req.method === "POST" && url.pathname === "/api/wechat/proactive/send") {
      return handleSendWechatProactive(req, res);
    }

    if (url.pathname === "/webhooks/wechat") {
      return handleWechat(req, res, url);
    }

    if (req.method === "POST" && url.pathname === "/webhooks/twilio/voice") {
      return handleTwilioVoice(req, res);
    }

    if (req.method === "POST" && url.pathname === "/webhooks/twilio/speech") {
      return handleTwilioSpeech(req, res);
    }

    if (req.method === "GET") {
      return serveStatic(url.pathname, res);
    }

    return sendText(res, 404, "Not Found");
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, {
      error: "Internal Server Error",
      message: error.message
    });
  }
});

server.listen(PORT, () => {
  console.log(`AI companion agent running at http://localhost:${PORT}`);
  startWechatProactiveScheduler();
});

async function serveStatic(routePath, res) {
  const normalized = routePath === "/" ? "/index.html" : routePath;
  const filePath = path.resolve(publicDir, `.${normalized}`);

  if (!filePath.startsWith(publicDir)) {
    return sendText(res, 403, "Forbidden");
  }

  try {
    const body = await fs.readFile(filePath);
    const type = contentType(filePath);
    res.writeHead(200, {
      "Content-Type": type,
      "Content-Length": body.length
    });
    res.end(body);
  } catch {
    return sendText(res, 404, "Not Found");
  }
}

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".js")) return "application/javascript; charset=utf-8";
  return "application/octet-stream";
}
