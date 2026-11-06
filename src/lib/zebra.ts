/**
 * Talks to Zebra Browser Print (free desktop app from Zebra) which exposes the
 * USB/network-attached GK420d over a local HTTP(S) service:
 *   http://127.0.0.1:9100   https://127.0.0.1:9101
 * Requests use text/plain bodies (same as Zebra's own SDK) to avoid CORS preflights.
 */
export interface ZebraDevice {
  name: string;
  uid: string;
  connection: string;
  deviceType: string;
  version?: number;
  provider?: string;
  manufacturer?: string;
}

const BASES =
  typeof location !== 'undefined' && location.protocol === 'https:'
    ? ['https://127.0.0.1:9101', 'http://127.0.0.1:9100']
    : ['http://127.0.0.1:9100', 'https://127.0.0.1:9101'];

let workingBase: string | null = null;

async function call(path: string, init?: RequestInit, timeoutMs = 4000): Promise<Response> {
  const tryBases = workingBase ? [workingBase, ...BASES.filter((b) => b !== workingBase)] : BASES;
  let lastErr: unknown;
  for (const base of tryBases) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(base + path, { ...init, signal: ctrl.signal });
      clearTimeout(t);
      workingBase = base;
      return res;
    } catch (e) {
      clearTimeout(t);
      lastErr = e;
    }
  }
  throw new Error(
    'Could not reach Zebra Browser Print on this computer. Make sure it is installed and running' +
      (lastErr instanceof Error ? ` (${lastErr.message})` : ''),
  );
}

export async function listPrinters(): Promise<ZebraDevice[]> {
  const res = await call('/available');
  const json = await res.json().catch(() => ({}));
  const list: ZebraDevice[] = json.printer ?? [];
  return list.filter((d) => !d.deviceType || d.deviceType === 'printer');
}

export async function defaultPrinter(): Promise<ZebraDevice | null> {
  const res = await call('/default?type=printer');
  const txt = await res.text();
  if (!txt.trim()) return null;
  try {
    return JSON.parse(txt) as ZebraDevice;
  } catch {
    return null;
  }
}

export async function sendZpl(device: ZebraDevice, zpl: string): Promise<void> {
  const res = await call(
    '/write',
    { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify({ device, data: zpl }) },
    15000,
  );
  if (!res.ok) throw new Error(`Printer returned ${res.status}: ${await res.text()}`);
}

/** Ask the printer for its status (~HQES). Returns raw response text. */
export async function printerStatus(device: ZebraDevice): Promise<string> {
  await sendZpl(device, '~HQES');
  const res = await call('/read', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ device }) });
  return res.text();
}

const KEY = 'kb.zebra.device';
export const savedDevice = (): ZebraDevice | null => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ZebraDevice) : null;
  } catch {
    return null;
  }
};
export const saveDevice = (d: ZebraDevice | null) => {
  try {
    if (d) localStorage.setItem(KEY, JSON.stringify(d));
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
};

/** Fallback: download the ZPL so it can be sent with Zebra Setup Utilities / `lp -o raw`. */
export function downloadZpl(zpl: string, filename = 'label.zpl') {
  const blob = new Blob([zpl], { type: 'application/octet-stream' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
