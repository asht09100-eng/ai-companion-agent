let cachedToken = null;

export async function sendWechatCustomerText(openId, content) {
  const accessToken = await getWechatAccessToken();
  const response = await fetch(`https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=${accessToken}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      touser: openId,
      msgtype: "text",
      text: { content }
    })
  });

  const data = await response.json();
  if (!response.ok || data.errcode) {
    throw new Error(`WeChat customer message failed: ${JSON.stringify(data)}`);
  }

  return data;
}

async function getWechatAccessToken() {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.value;
  }

  const appId = process.env.WECHAT_APP_ID;
  const appSecret = process.env.WECHAT_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error("Missing WECHAT_APP_ID or WECHAT_APP_SECRET");
  }

  const url = new URL("https://api.weixin.qq.com/cgi-bin/token");
  url.searchParams.set("grant_type", "client_credential");
  url.searchParams.set("appid", appId);
  url.searchParams.set("secret", appSecret);

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok || !data.access_token) {
    throw new Error(`WeChat access_token failed: ${JSON.stringify(data)}`);
  }

  cachedToken = {
    value: data.access_token,
    expiresAt: now + Number(data.expires_in || 7200) * 1000
  };

  return cachedToken.value;
}
