import type { ReceiptPayload } from "./receipt.js";

const ESC = 0x1b;
const GS = 0x1d;

function concat(chunks: Uint8Array[]): Uint8Array {
  const len = chunks.reduce((a, c) => a + c.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

function u8(...bytes: number[]): Uint8Array {
  return new Uint8Array(bytes);
}

/** ESC/POS: initialize printer */
function init(): Uint8Array {
  return u8(ESC, 0x40);
}

/** Text to bytes (ASCII subset; non-ASCII stripped for thermal reliability). */
function textBytes(s: string): Uint8Array {
  const safe = s.replace(/[^\x20-\x7e\n]/g, "?");
  const enc = new TextEncoder();
  return enc.encode(safe);
}

function lineFeed(): Uint8Array {
  return u8(0x0a);
}

/** Bold on/off */
function bold(on: boolean): Uint8Array {
  return on ? u8(ESC, 0x45, 1) : u8(ESC, 0x45, 0);
}

function separator(): Uint8Array {
  return textBytes("--------------------------------\n");
}

/** Partial cut */
function cutPartial(): Uint8Array {
  return u8(GS, 0x56, 66, 0);
}

/**
 * Standard drawer kick (ESC p m t1 t2) — common on Epson-compatible thermal printers.
 */
export function drawerOpenPulse(): Uint8Array {
  return u8(ESC, 0x70, 0, 25, 250);
}

/**
 * Encode a receipt as ESC/POS bytes for generic thermal printers via raw TCP or bridge.
 */
export function encodeEscPosReceipt(payload: ReceiptPayload): Uint8Array {
  const parts: Uint8Array[] = [init(), bold(true)];

  const title = payload.offline ? payload.title + " (OFFLINE)" : payload.title;
  parts.push(textBytes(title + "\n"));
  parts.push(bold(false));
  parts.push(textBytes(payload.orderRef + "\n"));
  parts.push(lineFeed());

  for (const row of payload.lines) {
    if (row.kind === "separator") {
      parts.push(separator());
    } else if (row.kind === "keyValue") {
      parts.push(textBytes(row.key + "  " + row.value + "\n"));
    } else {
      if (row.bold) parts.push(bold(true));
      parts.push(textBytes(row.value + "\n"));
      if (row.bold) parts.push(bold(false));
    }
  }

  parts.push(separator());
  const sub = payload.subtotalLabel ?? "Subtotal";
  const tx = payload.taxLabel ?? "Tax";
  const tot = payload.totalLabel ?? "TOTAL";
  parts.push(textBytes(sub + "  " + payload.subtotal + "\n"));
  parts.push(textBytes(tx + "  " + payload.tax + "\n"));
  parts.push(bold(true));
  parts.push(textBytes(tot + "  " + payload.total + "\n"));
  parts.push(bold(false));
  if (payload.footer?.trim()) {
    parts.push(lineFeed());
    parts.push(textBytes(payload.footer.trim() + "\n"));
  }
  parts.push(lineFeed(), lineFeed(), cutPartial());

  return concat(parts);
}
