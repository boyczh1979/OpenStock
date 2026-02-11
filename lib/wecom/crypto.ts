import {createCipheriv, createDecipheriv, createHash, randomBytes} from "node:crypto";

type WeComMessage = {
  toUserName: string;
  fromUserName: string;
  createTime: string;
  msgType: string;
  content?: string;
  msgId?: string;
};

const PKCS7_BLOCK_SIZE = 32;

function sha1(input: string): string {
  return createHash("sha1").update(input).digest("hex");
}

function getAesKey(encodingAESKey: string): Buffer {
  return Buffer.from(`${encodingAESKey}=`, "base64");
}

function pkcs7Encode(buffer: Buffer): Buffer {
  const amountToPad = PKCS7_BLOCK_SIZE - (buffer.length % PKCS7_BLOCK_SIZE || PKCS7_BLOCK_SIZE);
  const pad = Buffer.alloc(amountToPad, amountToPad);
  return Buffer.concat([buffer, pad]);
}

function pkcs7Decode(buffer: Buffer): Buffer {
  const pad = buffer[buffer.length - 1];
  if (pad < 1 || pad > PKCS7_BLOCK_SIZE) {
    return buffer;
  }
  return buffer.subarray(0, buffer.length - pad);
}

export function verifySignature(signature: string, token: string, timestamp: string, nonce: string, encrypted: string): boolean {
  const sorted = [token, timestamp, nonce, encrypted].sort().join("");
  return sha1(sorted) === signature;
}

export function decryptMessage(encrypted: string, encodingAESKey: string, corpId: string): string {
  const aesKey = getAesKey(encodingAESKey);
  const iv = aesKey.subarray(0, 16);
  const decipher = createDecipheriv("aes-256-cbc", aesKey, iv);
  decipher.setAutoPadding(false);

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64")),
    decipher.final(),
  ]);

  const content = pkcs7Decode(decrypted);
  const msgLength = content.readUInt32BE(16);
  const xmlStart = 20;
  const xmlEnd = xmlStart + msgLength;
  const xml = content.subarray(xmlStart, xmlEnd).toString("utf8");
  const receivedCorpId = content.subarray(xmlEnd).toString("utf8");

  if (receivedCorpId !== corpId) {
    throw new Error("CorpId mismatch");
  }

  return xml;
}

export function encryptMessage(xml: string, encodingAESKey: string, corpId: string): string {
  const aesKey = getAesKey(encodingAESKey);
  const iv = aesKey.subarray(0, 16);

  const random16 = randomBytes(16);
  const xmlBuffer = Buffer.from(xml, "utf8");
  const msgLength = Buffer.alloc(4);
  msgLength.writeUInt32BE(xmlBuffer.length, 0);
  const corpIdBuffer = Buffer.from(corpId, "utf8");

  const raw = Buffer.concat([random16, msgLength, xmlBuffer, corpIdBuffer]);
  const padded = pkcs7Encode(raw);

  const cipher = createCipheriv("aes-256-cbc", aesKey, iv);
  cipher.setAutoPadding(false);

  return Buffer.concat([cipher.update(padded), cipher.final()]).toString("base64");
}

function pickTag(xml: string, tag: string): string {
  const cdataMatch = xml.match(new RegExp(`<${tag}><!\\[CDATA\\[(.*?)]]><\\/${tag}>`));
  if (cdataMatch?.[1]) {
    return cdataMatch[1];
  }

  const textMatch = xml.match(new RegExp(`<${tag}>(.*?)<\\/${tag}>`));
  return textMatch?.[1]?.trim() ?? "";
}

export function parseEncryptedXml(xml: string): string {
  const encrypted = pickTag(xml, "Encrypt");
  if (!encrypted) {
    throw new Error("Missing Encrypt in xml");
  }

  return encrypted;
}

export function parseWeComMessage(xml: string): WeComMessage {
  return {
    toUserName: pickTag(xml, "ToUserName"),
    fromUserName: pickTag(xml, "FromUserName"),
    createTime: pickTag(xml, "CreateTime"),
    msgType: pickTag(xml, "MsgType"),
    content: pickTag(xml, "Content"),
    msgId: pickTag(xml, "MsgId"),
  };
}

export function buildTextReplyXml(toUser: string, fromUser: string, content: string): string {
  const now = Math.floor(Date.now() / 1000);
  return `<xml>
<ToUserName><![CDATA[${toUser}]]></ToUserName>
<FromUserName><![CDATA[${fromUser}]]></FromUserName>
<CreateTime>${now}</CreateTime>
<MsgType><![CDATA[text]]></MsgType>
<Content><![CDATA[${content}]]></Content>
</xml>`;
}

export function buildEncryptedReply(params: {
  token: string;
  encodingAESKey: string;
  corpId: string;
  nonce: string;
  timestamp: string;
  replyXml: string;
}): string {
  const encrypted = encryptMessage(params.replyXml, params.encodingAESKey, params.corpId);
  const signature = sha1([params.token, params.timestamp, params.nonce, encrypted].sort().join(""));

  return `<xml>
<Encrypt><![CDATA[${encrypted}]]></Encrypt>
<MsgSignature><![CDATA[${signature}]]></MsgSignature>
<TimeStamp>${params.timestamp}</TimeStamp>
<Nonce><![CDATA[${params.nonce}]]></Nonce>
</xml>`;
}
