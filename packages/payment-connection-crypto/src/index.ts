import crypto from "node:crypto";
import {
  DecryptCommand,
  GenerateDataKeyCommand,
  KMSClient,
} from "@aws-sdk/client-kms";

export type CryptoScheme = "v1-direct" | "aws-kms-envelope" | "local-kek-envelope";

export type EncryptedPayloadV1 = {
  v: 1;
  alg: "aes-256-gcm";
  iv: string;
  tag: string;
  data: string;
};

export type EncryptedPayloadKms = {
  v: 2;
  scheme: "aws-kms-envelope";
  alg: "aes-256-gcm";
  kmsKeyId: string;
  encryptedDataKey: string;
  iv: string;
  tag: string;
  data: string;
};

export type EncryptedPayloadLocal = {
  v: 2;
  scheme: "local-kek-envelope";
  alg: "aes-256-gcm";
  wrappedDek: string;
  iv: string;
  tag: string;
  data: string;
};

export type EncryptedPayload = EncryptedPayloadV1 | EncryptedPayloadKms | EncryptedPayloadLocal;

function localKek(): Buffer {
  const raw = process.env.PAYMENT_CONNECTIONS_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new Error("PAYMENT_CONNECTIONS_ENCRYPTION_KEY is required.");
  }
  const fromB64 = Buffer.from(raw, "base64");
  if (fromB64.length === 32) return fromB64;
  if (raw.length === 64 && /^[0-9a-fA-F]+$/.test(raw)) {
    const fromHex = Buffer.from(raw, "hex");
    if (fromHex.length === 32) return fromHex;
  }
  throw new Error(
    "PAYMENT_CONNECTIONS_ENCRYPTION_KEY must be base64(32 bytes) or 64-char hex.",
  );
}

function aesGcmEncrypt(plaintext: Buffer, key: Buffer): { iv: Buffer; tag: Buffer; data: Buffer } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { iv, tag, data: encrypted };
}

function aesGcmDecrypt(
  key: Buffer,
  iv: Buffer,
  tag: Buffer,
  data: Buffer,
): Buffer {
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

export function encryptJsonV1Direct(value: unknown): string {
  const plain = Buffer.from(JSON.stringify(value), "utf8");
  const key = localKek();
  const { iv, tag, data } = aesGcmEncrypt(plain, key);
  const payload: EncryptedPayloadV1 = {
    v: 1,
    alg: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: data.toString("base64"),
  };
  return JSON.stringify(payload);
}

function kmsClient(): KMSClient {
  const region =
    process.env.AWS_REGION?.trim() ||
    process.env.AWS_DEFAULT_REGION?.trim() ||
    "us-east-1";
  return new KMSClient({ region });
}

function kmsKeyId(): string {
  const id = process.env.PAYMENT_CONNECTIONS_KMS_KEY_ID?.trim();
  if (!id) throw new Error("PAYMENT_CONNECTIONS_KMS_KEY_ID is not set.");
  return id;
}

export async function encryptJsonEnvelope(value: unknown): Promise<{
  ciphertext: string;
  scheme: CryptoScheme;
  kekKeyId: string | null;
  keyVersion: number;
}> {
  const plain = Buffer.from(JSON.stringify(value), "utf8");
  const useKms = Boolean(process.env.PAYMENT_CONNECTIONS_KMS_KEY_ID?.trim());

  if (useKms) {
    const keyId = kmsKeyId();
    const gen = await kmsClient().send(
      new GenerateDataKeyCommand({
        KeyId: keyId,
        KeySpec: "AES_256",
      }),
    );
    const plaintextDek = gen.Plaintext;
    const encryptedDek = gen.CiphertextBlob;
    if (!plaintextDek || !encryptedDek) {
      throw new Error("KMS GenerateDataKey returned empty key material.");
    }
    const dekBuf = Buffer.from(plaintextDek);
    try {
      const { iv, tag, data } = aesGcmEncrypt(plain, dekBuf);
      const payload: EncryptedPayloadKms = {
        v: 2,
        scheme: "aws-kms-envelope",
        alg: "aes-256-gcm",
        kmsKeyId: keyId,
        encryptedDataKey: Buffer.from(encryptedDek).toString("base64"),
        iv: iv.toString("base64"),
        tag: tag.toString("base64"),
        data: data.toString("base64"),
      };
      return {
        ciphertext: JSON.stringify(payload),
        scheme: "aws-kms-envelope",
        kekKeyId: keyId,
        keyVersion: 2,
      };
    } finally {
      dekBuf.fill(0);
    }
  }

  const dataKey = crypto.randomBytes(32);
  const kek = localKek();
  const { iv, tag, data } = aesGcmEncrypt(plain, dataKey);
  const wrap = aesGcmEncrypt(dataKey, kek);
  dataKey.fill(0);
  const payload: EncryptedPayloadLocal = {
    v: 2,
    scheme: "local-kek-envelope",
    alg: "aes-256-gcm",
    wrappedDek: Buffer.concat([wrap.iv, wrap.tag, wrap.data]).toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: data.toString("base64"),
  };
  return {
    ciphertext: JSON.stringify(payload),
    scheme: "local-kek-envelope",
    kekKeyId: null,
    keyVersion: 2,
  };
}

export async function decryptJsonEnvelope(ciphertext: string): Promise<unknown> {
  const parsed = JSON.parse(ciphertext) as EncryptedPayload;

  if ((parsed as EncryptedPayloadV1).v === 1) {
    const p = parsed as EncryptedPayloadV1;
    if (p.alg !== "aes-256-gcm" || !p.iv || !p.tag || !p.data) {
      throw new Error("Invalid encrypted secret payload.");
    }
    const key = localKek();
    const out = aesGcmDecrypt(
      key,
      Buffer.from(p.iv, "base64"),
      Buffer.from(p.tag, "base64"),
      Buffer.from(p.data, "base64"),
    );
    return JSON.parse(out.toString("utf8"));
  }

  if ((parsed as EncryptedPayloadKms).scheme === "aws-kms-envelope") {
    const p = parsed as EncryptedPayloadKms;
    const dec = await kmsClient().send(
      new DecryptCommand({
        CiphertextBlob: Buffer.from(p.encryptedDataKey, "base64"),
      }),
    );
    const pt = dec.Plaintext;
    if (!pt) throw new Error("KMS Decrypt returned empty plaintext.");
    let dek = Buffer.from(pt);
    try {
      const out = aesGcmDecrypt(
        dek,
        Buffer.from(p.iv, "base64"),
        Buffer.from(p.tag, "base64"),
        Buffer.from(p.data, "base64"),
      );
      return JSON.parse(out.toString("utf8"));
    } finally {
      dek.fill(0);
    }
  }

  if ((parsed as EncryptedPayloadLocal).scheme === "local-kek-envelope") {
    const p = parsed as EncryptedPayloadLocal;
    const wrapBlob = Buffer.from(p.wrappedDek, "base64");
    const wIv = wrapBlob.subarray(0, 12);
    const wTag = wrapBlob.subarray(12, 28);
    const wData = wrapBlob.subarray(28);
    const kek = localKek();
    const dek = aesGcmDecrypt(kek, wIv, wTag, wData);
    try {
      const out = aesGcmDecrypt(
        dek,
        Buffer.from(p.iv, "base64"),
        Buffer.from(p.tag, "base64"),
        Buffer.from(p.data, "base64"),
      );
      return JSON.parse(out.toString("utf8"));
    } finally {
      dek.fill(0);
    }
  }

  throw new Error("Unsupported encrypted payload format.");
}
