# 企业微信机器人（OpenClaw）最短落地方案

这份文档用于把企业微信应用回调接入到本项目的 `/api/wecom`，并把文本消息转发到你的 OpenClaw。

## 1. 准备环境变量

在 `.env` 里新增：

```env
# 企业微信后台 > 应用 > 接收消息 > Token
WECOM_TOKEN=replace_me

# 企业微信后台 > 应用 > 接收消息 > EncodingAESKey
WECOM_ENCODING_AES_KEY=replace_me

# 企业 ID（CorpID）
WECOM_CORP_ID=wwxxxxxxxxxxxxxxxx

# 你的 OpenClaw 文本 webhook（需返回 JSON: {"reply":"..."}）
OPENCLAW_WEBHOOK_URL=http://127.0.0.1:18789/api/wecom/reply
```

> 如果暂时不填 `OPENCLAW_WEBHOOK_URL`，机器人也能通过企业微信校验，但回复会是固定提示。

## 2. 本地启动应用

```bash
pnpm dev
```

默认回调路径：

```text
http://127.0.0.1:3000/api/wecom
```

## 3. 暴露公网地址（Cloudflare Tunnel）

企业微信服务器不能访问 `127.0.0.1`，所以需要隧道。

```bash
cloudflared tunnel --url http://127.0.0.1:3000
```

得到类似地址：

```text
https://abc123.trycloudflare.com
```

则企业微信回调 URL 填：

```text
https://abc123.trycloudflare.com/api/wecom
```

## 4. 企业微信后台配置

进入企业微信管理后台：

1. 应用管理 -> 你的自建应用
2. 接收消息 -> 开启 API 接收
3. URL 填 `https://<公网域名>/api/wecom`
4. Token 填 `WECOM_TOKEN`
5. EncodingAESKey 填 `WECOM_ENCODING_AES_KEY`
6. 保存并校验

校验流程由 `GET /api/wecom` 自动完成（签名校验 + echostr 解密）。

## 5. OpenClaw 对接协议（本项目默认）

本项目在收到企业微信文本后，会 `POST` 到 `OPENCLAW_WEBHOOK_URL`：

```json
{
  "text": "用户文本",
  "userId": "企业微信用户ID",
  "source": "wecom"
}
```

期待 OpenClaw 返回：

```json
{
  "reply": "给企业微信用户的回复"
}
```

## 6. 快速排错

- 提示 `Invalid signature`
  - 检查企业微信后台 Token / AESKey 与 `.env` 是否一致。
- 校验失败但签名正确
  - 检查 `WECOM_CORP_ID` 是否是当前企业真实 CorpID。
- 企业微信收不到回复
  - 检查 `OPENCLAW_WEBHOOK_URL` 是否可从当前服务端访问。
  - 检查 OpenClaw 是否返回 JSON 且包含 `reply` 字段。

## 7. 安全建议

- 立即轮换你曾公开过的 Token 与 EncodingAESKey。
- 生产环境务必使用固定域名 + HTTPS。
- 给 OpenClaw webhook 增加来源校验（IP 白名单或签名）。
