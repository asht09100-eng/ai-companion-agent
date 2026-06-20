# 微信聊天接入

这个项目走微信公众平台/测试号的官方 webhook 模式。建议先用测试号跑通，再迁到服务号或企业微信。

## 1. 准备公网地址

本地开发时需要把 `http://localhost:8787` 暴露成 HTTPS 公网地址，例如：

- ngrok
- Cloudflare Tunnel
- frp
- 一台自己的云服务器

最终你需要得到类似这样的地址：

```text
https://your-domain.example
```

## 2. 配置环境变量

复制 `.env.example` 为 `.env`，至少填：

```env
PORT=8787
PUBLIC_BASE_URL=https://your-domain.example
WECHAT_TOKEN=change-me-to-a-random-token
WECHAT_APP_ID=你的测试号 AppID
WECHAT_APP_SECRET=你的测试号 AppSecret
WECHAT_PROACTIVE_ENABLED=true
WECHAT_PROACTIVE_MIN_MINUTES=45
WECHAT_PROACTIVE_MAX_MINUTES=180
ADMIN_TOKEN=换成一串只有你知道的随机字符
OPENAI_API_KEY=你的 OpenAI Key
```

没有 `OPENAI_API_KEY` 也能测试链路，但回复会使用本地占位文案。

## 3. 配置微信测试号

在微信公众平台测试号里配置：

```text
URL: https://your-domain.example/webhooks/wechat
Token: 和 .env 里的 WECHAT_TOKEN 完全一致
EncodingAESKey: 先不填或使用明文模式
消息加解密方式: 明文模式
```

保存时，微信会用 `GET /webhooks/wechat` 做签名验证。通过后，用户发消息会进入 `POST /webhooks/wechat`。

## 4. 启动服务

```bash
npm start
```

然后在测试号二维码里关注，并直接给测试号发消息。小河豚会用微信私聊场景的语气回复。

## 5. 当前支持

- 文本消息：直接进入 AI
- 语音消息：如果微信提供 `Recognition`，会作为文字进入 AI
- 图片消息：会用文字提示 AI 当前收到图片
- 关注事件：会自动触发欢迎式回复
- 回复超时：4.5 秒内模型没返回，会先给微信一个兜底回复，避免微信重试
- 主动消息：记录最近发过消息的 OpenID，并用客服消息接口偶尔主动发短句

## 6. 主动发消息

微信被动回复只能“你发一句，她回一句”。想让小河豚主动找你，需要使用微信客服消息接口。

你需要在 `.env` 填：

```env
WECHAT_APP_ID=测试号里的 appID
WECHAT_APP_SECRET=测试号里的 appsecret
WECHAT_PROACTIVE_ENABLED=true
WECHAT_PROACTIVE_MIN_MINUTES=45
WECHAT_PROACTIVE_MAX_MINUTES=180
ADMIN_TOKEN=换成一串只有你知道的随机字符
```

然后你先在微信里给测试号发一条消息，项目会记住你的 OpenID。之后小河豚会在 `WECHAT_PROACTIVE_MIN_MINUTES` 到 `WECHAT_PROACTIVE_MAX_MINUTES` 之间随机挑时间主动发短句。

也可以手动触发一次：

```bash
curl -X POST https://你的公网地址/api/wechat/proactive/send \
  -H "Authorization: Bearer 你的 ADMIN_TOKEN"
```

注意：微信客服消息不是无限制私聊。通常需要用户最近和公众号互动过，超出平台允许窗口后，需要你先发一条消息给她，她才能再次主动发。

## 7. 后续可升级

- 接入微信加密模式 AES 解密
- 接入稳定数据库保存长期记忆
- 接入客服消息接口，实现更长时间窗口的异步回复
- 接入企业微信，支持更接近私聊的体验
