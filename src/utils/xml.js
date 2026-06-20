export function escapeXml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function tag(xml, name) {
  const match = xml.match(new RegExp(`<${name}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${name}>|<${name}>([\\s\\S]*?)<\\/${name}>`));
  return match ? (match[1] ?? match[2] ?? "").trim() : "";
}

export function wechatTextMessage({ toUser, fromUser, content }) {
  return [
    "<xml>",
    `<ToUserName><![CDATA[${toUser}]]></ToUserName>`,
    `<FromUserName><![CDATA[${fromUser}]]></FromUserName>`,
    `<CreateTime>${Math.floor(Date.now() / 1000)}</CreateTime>`,
    "<MsgType><![CDATA[text]]></MsgType>",
    `<Content><![CDATA[${content}]]></Content>`,
    "</xml>"
  ].join("");
}

export function twimlSayGather({ text, action }) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<Response>",
    `<Gather input="speech" language="zh-CN" speechTimeout="auto" action="${escapeXml(action)}" method="POST">`,
    `<Say language="zh-CN" voice="alice">${escapeXml(text)}</Say>`,
    "</Gather>",
    `<Say language="zh-CN" voice="alice">${escapeXml("我先挂啦，亲爱的。等你再打给我。")}</Say>`,
    "</Response>"
  ].join("");
}
