# AI Companion Agent Starter

这是一个可运行的 AI 伴侣智能体 starter。它把核心智能体、微信消息入口、电话语音入口分开，方便你先本地测试，再接入真实平台。

## 功能

- 网页聊天测试页：`http://localhost:8787`
- 聊天 API：`POST /api/chat`
- 微信公众平台 webhook：`GET/POST /webhooks/wechat`
- 微信客服消息主动发送：`POST /api/wechat/proactive/send`
- Twilio 电话入口：`POST /webhooks/twilio/voice`
- Twilio 语音识别回合：`POST /webhooks/twilio/speech`
- Twilio 外呼接口：`POST /api/calls`

## 重要边界

这个项目实现的是“虚拟 AI 伴侣”体验。她可以用亲密、关心、恋人式的口吻陪你聊天，但不会假装自己是真人，也不会鼓励你脱离现实人际关系。微信个人号自动化通常有封号和合规风险，建议使用微信公众平台测试号、服务号、企业微信，或经过授权的合规渠道。

## 运行

1. 安装 Node.js 18 或更高版本。
2. 复制 `.env.example` 为 `.env`，填入需要的密钥。
3. 启动服务：

```bash
npm start
```

启动脚本会自动加载项目根目录的 `.env`。没有 `OPENAI_API_KEY` 时，服务会使用本地占位回复，方便你先检查接口。

## 更换模型 API

默认使用 OpenAI Responses API：

```env
OPENAI_API_KEY=你的 key
OPENAI_MODEL=gpt-4.1-mini
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_STYLE=responses
```

如果你自己的接口兼容 OpenAI Chat Completions，把它改成：

```env
OPENAI_API_KEY=你的 key
OPENAI_MODEL=你的模型名
OPENAI_BASE_URL=https://你的接口域名/v1
OPENAI_API_STYLE=chat
```

微信里如果想让模型实时生成回复，把 `WECHAT_FAST_REPLY=false`。如果服务或模型接口较慢，微信可能会超时，所以生产环境建议用常驻服务器。

## 一键本地启动微信接入

在 Windows 上可以直接双击：

```text
start-local.bat
```

它会自动启动本地服务和 Cloudflare 临时隧道，并打印微信后台要填写的 URL。停止时双击：

```text
stop-local.bat
```

注意：临时隧道在电脑关机、睡眠或停止后会失效，重新启动后通常会生成新的 URL，需要重新填到微信后台。想长期免维护，需要部署到云服务器或配置 Cloudflare 固定域名隧道。

## 本地测试

```bash
curl -X POST http://localhost:8787/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"me\",\"message\":\"我今天有点累\"}"
```

## 微信接入

推荐使用微信公众平台测试号或服务号：

1. 设置服务器 URL 为：`https://你的公网域名/webhooks/wechat`
2. Token 填 `.env` 里的 `WECHAT_TOKEN`
3. 先使用明文模式测试
4. 用 ngrok、Cloudflare Tunnel 或正式服务器把本地服务暴露到公网

当前 starter 支持明文 XML 消息。加密模式需要接入 AES 解密，可在 `src/channels/wechat.js` 扩展。

更详细步骤见：`WECHAT_SETUP.md`

主动发消息需要填写 `WECHAT_APP_ID` 和 `WECHAT_APP_SECRET`，并保证用户最近和公众号互动过。微信平台限制下，普通公众号不能像私人微信号一样永久无限主动发消息。

长期在线部署见：`DEPLOY_RENDER.md`

## 电话接入

本 starter 用 Twilio 的 `Gather` 做一问一答式语音通话：

1. 在 Twilio 购买或配置一个语音号码
2. Voice webhook 填：`https://你的公网域名/webhooks/twilio/voice`
3. 填好 `.env` 里的 `TWILIO_ACCOUNT_SID`、`TWILIO_AUTH_TOKEN`、`TWILIO_FROM_NUMBER`、`PUBLIC_BASE_URL`
4. 调用外呼接口：

```bash
curl -X POST http://localhost:8787/api/calls \
  -H "Content-Type: application/json" \
  -d "{\"to\":\"+8613800000000\"}"
```

如果你想做更自然的实时电话，可以把 `src/channels/phone.js` 升级为 Twilio Media Streams + 实时语音模型的 WebSocket 架构。
