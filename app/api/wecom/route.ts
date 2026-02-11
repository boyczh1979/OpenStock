import {NextRequest, NextResponse} from "next/server";
import {
  buildEncryptedReply,
  buildTextReplyXml,
  decryptMessage,
  parseEncryptedXml,
  parseWeComMessage,
  verifySignature,
} from "@/lib/wecom/crypto";

function readEnv() {
  const token = process.env.WECOM_TOKEN;
  const encodingAESKey = process.env.WECOM_ENCODING_AES_KEY;
  const corpId = process.env.WECOM_CORP_ID;
  const openClawWebhookUrl = process.env.OPENCLAW_WEBHOOK_URL;

  if (!token || !encodingAESKey || !corpId) {
    throw new Error("Missing WECOM_TOKEN / WECOM_ENCODING_AES_KEY / WECOM_CORP_ID");
  }

  return {token, encodingAESKey, corpId, openClawWebhookUrl};
}

export async function GET(req: NextRequest) {
  try {
    const {token, encodingAESKey, corpId} = readEnv();
    const {searchParams} = new URL(req.url);

    const msgSignature = searchParams.get("msg_signature") ?? "";
    const timestamp = searchParams.get("timestamp") ?? "";
    const nonce = searchParams.get("nonce") ?? "";
    const echostr = searchParams.get("echostr") ?? "";

    if (!msgSignature || !timestamp || !nonce || !echostr) {
      return new NextResponse("Missing wecom verify params", {status: 400});
    }

    const valid = verifySignature(msgSignature, token, timestamp, nonce, echostr);
    if (!valid) {
      return new NextResponse("Invalid signature", {status: 401});
    }

    const plainEcho = decryptMessage(echostr, encodingAESKey, corpId);
    return new NextResponse(plainEcho, {status: 200, headers: {"Content-Type": "text/plain"}});
  } catch (error) {
    return new NextResponse(`Verify failed: ${(error as Error).message}`, {status: 500});
  }
}

async function callOpenClaw(openClawWebhookUrl: string | undefined, content: string, userId: string) {
  if (!openClawWebhookUrl) {
    return "机器人已连接成功，但尚未配置 OPENCLAW_WEBHOOK_URL。";
  }

  const response = await fetch(openClawWebhookUrl, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      text: content,
      userId,
      source: "wecom",
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenClaw webhook failed with status ${response.status}`);
  }

  const payload = await response.json().catch(() => ({}));
  const reply = typeof payload?.reply === "string" ? payload.reply : "";
  return reply || "已收到消息，但 OpenClaw 未返回文本回复。";
}

export async function POST(req: NextRequest) {
  try {
    const {token, encodingAESKey, corpId, openClawWebhookUrl} = readEnv();
    const {searchParams} = new URL(req.url);

    const msgSignature = searchParams.get("msg_signature") ?? "";
    const timestamp = searchParams.get("timestamp") ?? `${Math.floor(Date.now() / 1000)}`;
    const nonce = searchParams.get("nonce") ?? "nonce";

    const encryptedBodyXml = await req.text();
    const encrypted = parseEncryptedXml(encryptedBodyXml);

    const valid = verifySignature(msgSignature, token, timestamp, nonce, encrypted);
    if (!valid) {
      return new NextResponse("Invalid signature", {status: 401});
    }

    const plainXml = decryptMessage(encrypted, encodingAESKey, corpId);
    const message = parseWeComMessage(plainXml);

    let replyContent = "仅支持文本消息。";
    if (message.msgType === "text" && message.content) {
      replyContent = await callOpenClaw(openClawWebhookUrl, message.content, message.fromUserName);
    }

    const replyXml = buildTextReplyXml(message.fromUserName, message.toUserName, replyContent);
    const finalEncryptedXml = buildEncryptedReply({
      token,
      encodingAESKey,
      corpId,
      nonce,
      timestamp,
      replyXml,
    });

    return new NextResponse(finalEncryptedXml, {
      status: 200,
      headers: {"Content-Type": "application/xml"},
    });
  } catch (error) {
    return new NextResponse(`POST failed: ${(error as Error).message}`, {status: 500});
  }
}
