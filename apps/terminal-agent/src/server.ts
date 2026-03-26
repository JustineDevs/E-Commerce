import http from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  encodeEscPosReceipt,
  drawerOpenPulse,
  type ReceiptPayload,
} from "@apparel-commerce/printer-core";
import {
  fetchDeviceByName,
  heartbeatDeviceByName,
  type AgentPosDevice,
} from "./supabase-device.js";
import { listAdapterCapabilities } from "./adapters.js";
import { sendTcpRaw } from "./tcp-send.js";
import { postOctetStreamPrint } from "./relay-post.js";
import {
  dequeueStarCloudPrnt,
  enqueueStarCloudPrnt,
  starCloudPrntQueueLength,
} from "./star-cloudprnt-queue.js";
import {
  basePrinterFromEnv,
  resolvedDefaultAdapter,
  resolvedEpsonEposUrl,
  resolvedHttpRelayUrl,
  resolvedPrinterTcp,
  resolvedQzTrayRelayUrl,
} from "./device-profile.js";

type AgentState = {
  lastError: string | null;
  lastPrintAt: string | null;
};

const state: AgentState = { lastError: null, lastPrintAt: null };

let cachedDevice: AgentPosDevice | null = null;

function readEnvPort(): number {
  const raw = process.env.TERMINAL_AGENT_PORT ?? "17711";
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 17711;
}

async function refreshDeviceFromSupabase(): Promise<void> {
  const name = process.env.TERMINAL_DEVICE_NAME?.trim();
  if (!name) return;
  const row = await fetchDeviceByName(name);
  cachedDevice = row;
}

async function sendHeartbeat(): Promise<void> {
  const name = process.env.TERMINAL_DEVICE_NAME?.trim();
  if (!name) return;
  await heartbeatDeviceByName(name);
}

function mutatingPostAllowed(req: http.IncomingMessage): boolean {
  const secret = process.env.TERMINAL_AGENT_SECRET?.trim();
  if (!secret) return true;
  return req.headers["x-terminal-agent-secret"] === secret;
}

async function printWithAdapter(
  payload: ReceiptPayload,
  adapter: string,
  override?: { host: string; port: number },
): Promise<void> {
  const bytes = encodeEscPosReceipt(payload);
  const device = cachedDevice;

  if (adapter === "mock") {
    if (
      process.env.NODE_ENV === "production" &&
      process.env.ALLOW_MOCK_TERMINAL_ADAPTER !== "true"
    ) {
      throw new Error(
        "Mock adapter is disabled in production. Configure a real printer adapter or set ALLOW_MOCK_TERMINAL_ADAPTER=true only for emergencies.",
      );
    }
    const outDir = process.env.TERMINAL_AGENT_MOCK_DIR?.trim();
    if (outDir) {
      await mkdir(outDir, { recursive: true });
      const f = path.join(outDir, `receipt-${Date.now()}.bin`);
      await writeFile(f, Buffer.from(bytes));
      return;
    }
    process.stdout.write(`[terminal-agent mock print ${bytes.length} bytes]\n`);
    return;
  }

  if (adapter === "escpos-tcp") {
    const { host, port } = override ?? resolvedPrinterTcp(device);
    await sendTcpRaw(host, port, bytes);
    return;
  }

  if (adapter === "http-relay") {
    const url = resolvedHttpRelayUrl(device);
    if (!url) {
      throw new Error(
        "http-relay: set TERMINAL_HTTP_RELAY_URL or device config httpRelayUrl",
      );
    }
    await postOctetStreamPrint(url, bytes);
    return;
  }

  if (adapter === "qz-tray") {
    const url = resolvedQzTrayRelayUrl(device);
    if (!url) {
      throw new Error(
        "qz-tray: set QZ_TRAY_RELAY_URL or device config qzTrayRelayUrl",
      );
    }
    await postOctetStreamPrint(url, bytes);
    return;
  }

  if (adapter === "epson-epos") {
    const url = resolvedEpsonEposUrl(device);
    if (!url) {
      throw new Error(
        "epson-epos: set EPSON_EPOS_PRINT_URL or device config epsonEposUrl",
      );
    }
    await postOctetStreamPrint(url, bytes);
    return;
  }

  if (adapter === "star-cloudprnt") {
    enqueueStarCloudPrnt(bytes);
    return;
  }

  throw new Error(`Adapter "${adapter}" is not implemented in this agent build`);
}

async function openDrawerWithAdapter(
  adapter: string,
  override?: { host: string; port: number },
): Promise<void> {
  const device = cachedDevice;
  const pulse = drawerOpenPulse();

  if (adapter === "mock") {
    if (
      process.env.NODE_ENV === "production" &&
      process.env.ALLOW_MOCK_TERMINAL_ADAPTER !== "true"
    ) {
      throw new Error(
        "Mock adapter is disabled in production. Configure a real adapter or set ALLOW_MOCK_TERMINAL_ADAPTER=true only for emergencies.",
      );
    }
    process.stdout.write("[terminal-agent mock open-drawer]\n");
    return;
  }

  if (adapter === "http-relay") {
    const url = resolvedHttpRelayUrl(device);
    if (!url) {
      throw new Error(
        "http-relay: set TERMINAL_HTTP_RELAY_URL or device config httpRelayUrl",
      );
    }
    await postOctetStreamPrint(url, pulse);
    return;
  }

  if (adapter === "qz-tray") {
    const url = resolvedQzTrayRelayUrl(device);
    if (!url) {
      throw new Error(
        "qz-tray: set QZ_TRAY_RELAY_URL or device config qzTrayRelayUrl",
      );
    }
    await postOctetStreamPrint(url, pulse);
    return;
  }

  if (adapter === "epson-epos") {
    const url = resolvedEpsonEposUrl(device);
    if (!url) {
      throw new Error(
        "epson-epos: set EPSON_EPOS_PRINT_URL or device config epsonEposUrl",
      );
    }
    await postOctetStreamPrint(url, pulse);
    return;
  }

  if (adapter === "star-cloudprnt") {
    enqueueStarCloudPrnt(pulse);
    return;
  }

  const { host, port } = override ?? resolvedPrinterTcp(device);
  await sendTcpRaw(host, port, pulse);
}

function json(res: http.ServerResponse, code: number, body: unknown) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function parseBody<T>(raw: string): T {
  return JSON.parse(raw) as T;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Terminal-Agent-Secret",
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "127.0.0.1"}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  const corsJson = {
    ...corsHeaders,
    "Content-Type": "application/json; charset=utf-8",
  };

  if (req.method === "GET" && url.pathname === "/health") {
    res.writeHead(200, corsJson);
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.method === "GET" && url.pathname === "/status") {
    res.writeHead(200, { ...corsJson });
    const tcp = resolvedPrinterTcp(cachedDevice);
    res.end(
      JSON.stringify({
        online: true,
        lastError: state.lastError,
        lastPrintAt: state.lastPrintAt,
        adapters: listAdapterCapabilities(),
        defaultPrinter: tcp,
        defaultAdapter: resolvedDefaultAdapter(cachedDevice),
        deviceName: process.env.TERMINAL_DEVICE_NAME?.trim() ?? null,
        starCloudPrntQueue: starCloudPrntQueueLength(),
      }),
    );
    return;
  }

  if (req.method === "GET" && url.pathname.toLowerCase() === "/cloudprnt") {
    const expected = process.env.STAR_CLOUDPRNT_TOKEN?.trim();
    const token = url.searchParams.get("token") ?? "";
    if (expected && token !== expected) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Forbidden");
      return;
    }
    const job = dequeueStarCloudPrnt();
    if (!job) {
      res.writeHead(204);
      res.end();
      return;
    }
    res.writeHead(200, {
      "Content-Type": "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(Buffer.from(job));
    return;
  }

  if (req.method === "GET" && url.pathname === "/devices") {
    res.writeHead(200, { ...corsJson });
    const tcp = resolvedPrinterTcp(cachedDevice);
    res.end(
      JSON.stringify({
        devices: [
          {
            id: "default-receipt",
            kind: "printer",
            adapter: resolvedDefaultAdapter(cachedDevice),
            address: `${tcp.host}:${tcp.port}`,
          },
        ],
      }),
    );
    return;
  }

  if (req.method === "POST" && url.pathname === "/print-receipt") {
    if (!mutatingPostAllowed(req)) {
      json(res, 401, { error: "Unauthorized" });
      return;
    }
    let raw = "";
    req.on("data", (c) => {
      raw += c;
    });
    req.on("end", async () => {
      try {
        const body = parseBody<{
          receipt: ReceiptPayload;
          adapter?: string;
          printer?: { host: string; port: number };
        }>(raw || "{}");
        if (!body.receipt?.title) {
          json(res, 400, { error: "receipt required" });
          return;
        }
        const adapter =
          body.adapter ?? resolvedDefaultAdapter(cachedDevice);
        await printWithAdapter(body.receipt, adapter, body.printer);
        state.lastError = null;
        state.lastPrintAt = new Date().toISOString();
        json(res, 200, { ok: true });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        state.lastError = msg;
        json(res, 502, { error: msg });
      }
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/open-drawer") {
    if (!mutatingPostAllowed(req)) {
      json(res, 401, { error: "Unauthorized" });
      return;
    }
    let raw = "";
    req.on("data", (c) => {
      raw += c;
    });
    req.on("end", async () => {
      try {
        const body = parseBody<{
          printer?: { host: string; port: number };
          adapter?: string;
        }>(raw || "{}");
        const adapter =
          body.adapter ?? resolvedDefaultAdapter(cachedDevice);
        await openDrawerWithAdapter(adapter, body.printer);
        state.lastError = null;
        json(res, 200, { ok: true });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        state.lastError = msg;
        json(res, 502, { error: msg });
      }
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/scan/attach") {
    json(res, 501, {
      error:
        "Scanner pairing is handled in the browser (WebHID) or HID keyboard wedge mode. This agent does not expose USB scanner control.",
    });
    return;
  }

  json(res, 404, { error: "Not found" });
});

const port = readEnvPort();
server.listen(port, "127.0.0.1", () => {
  process.stdout.write(
    `[terminal-agent] listening on http://127.0.0.1:${port}\n`,
  );
  const name = process.env.TERMINAL_DEVICE_NAME?.trim();
  if (name) {
    void refreshDeviceFromSupabase();
    setInterval(() => void refreshDeviceFromSupabase(), 60_000);
    setInterval(() => void sendHeartbeat(), 60_000);
  }
  process.stdout.write(
    `[terminal-agent] default TCP printer ${basePrinterFromEnv().host}:${basePrinterFromEnv().port}\n`,
  );
});
