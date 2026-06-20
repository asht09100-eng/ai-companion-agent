# 长期部署到 Render

这个方案的目标是让小河豚一直在线，不再依赖你电脑上的两个终端，也不再每天更换 Cloudflare 临时地址。

## 你需要准备

- 一个 GitHub 仓库
- 一个 Render 账号
- 微信测试号或服务号的 `AppID` 和 `AppSecret`
- OpenAI API Key

## 部署步骤

1. 把 `ai-companion-agent` 项目上传到 GitHub。
2. 在 Render 新建 `Web Service`，连接这个 GitHub 仓库。
3. Start Command 填：

```bash
npm start
```

4. Health Check Path 填：

```text
/health
```

5. 在 Render 的 Environment 里填这些变量：

```env
PUBLIC_BASE_URL=https://你的-render域名.onrender.com
OPENAI_API_KEY=你的 OpenAI Key
OPENAI_MODEL=gpt-4.1-mini
WECHAT_TOKEN=666
WECHAT_APP_ID=你的微信 AppID
WECHAT_APP_SECRET=你的微信 AppSecret
WECHAT_FAST_REPLY=true
WECHAT_PROACTIVE_ENABLED=true
WECHAT_PROACTIVE_MIN_MINUTES=45
WECHAT_PROACTIVE_MAX_MINUTES=180
ADMIN_TOKEN=换成一串只有你知道的随机字符
```

6. Render 部署成功后，微信后台改成：

```text
URL: https://你的-render域名.onrender.com/webhooks/wechat
Token: 666
消息加解密方式: 明文模式
```

## 主动消息

小河豚会在你最近给公众号发过消息后，在 `WECHAT_PROACTIVE_MIN_MINUTES` 到 `WECHAT_PROACTIVE_MAX_MINUTES` 之间随机挑一个时间尝试主动发消息。

微信客服消息有平台窗口限制。超出允许窗口后，你需要先给她发一句，她才能再次主动发。

## 更稳定的生产版

当前项目用本地 JSON 文件记住微信用户。长期生产建议换成数据库，比如 Postgres、SQLite 持久磁盘或 Redis。这样服务重启、迁移、扩容时不容易丢 OpenID 记录。
