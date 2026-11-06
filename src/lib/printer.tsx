import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { DEFAULT_LABEL_SETTINGS, type LabelSettings } from './zpl';
import { defaultPrinter, downloadZpl, listPrinters, saveDevice, savedDevice, sendZpl, type ZebraDevice } from './zebra';

const SETTINGS_KEY = 'kb.label.settings';

function loadSettings(): LabelSettings {
  try {
    return { ...DEFAULT_LABEL_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
  } catch {
    return DEFAULT_LABEL_SETTINGS;
  }
}

interface PrinterState {
  settings: LabelSettings;
  setSettings: (s: LabelSettings) => void;
  device: ZebraDevice | null;
  devices: ZebraDevice[];
  selectDevice: (uid: string) => void;
  discover: () => Promise<void>;
  discovering: boolean;
  status: string | null;
  print: (zpl: string, filename?: string) => Promise<boolean>;
}

const Ctx = createContext<PrinterState | null>(null);

export function PrinterProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState(loadSettings);
  const [device, setDevice] = useState<ZebraDevice | null>(savedDevice);
  const [devices, setDevices] = useState<ZebraDevice[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const setSettings = (s: LabelSettings) => {
    setSettingsState(s);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
  };

  const discover = useCallback(async () => {
    setDiscovering(true);
    setStatus(null);
    try {
      const [list, def] = await Promise.all([listPrinters(), defaultPrinter().catch(() => null)]);
      const all = def && !list.some((d) => d.uid === def.uid) ? [def, ...list] : list;
      setDevices(all);
      setDevice((cur) => {
        const keep = cur && all.find((d) => d.uid === cur.uid);
        const pick = keep || def || all.find((d) => /zebra|gk420/i.test(d.name)) || all[0] || null;
        saveDevice(pick);
        return pick;
      });
      setStatus(all.length ? `Found ${all.length} printer(s).` : 'Browser Print is running but no printers were found.');
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setDiscovering(false);
    }
  }, []);

  useEffect(() => {
    void discover();
  }, [discover]);

  const selectDevice = (uid: string) => {
    const d = devices.find((x) => x.uid === uid) ?? null;
    setDevice(d);
    saveDevice(d);
  };

  const print = async (zpl: string, filename = 'label.zpl') => {
    if (!device) {
      setStatus('No printer connected — downloaded the ZPL file instead.');
      downloadZpl(zpl, filename);
      return false;
    }
    try {
      setStatus('Sending to printer…');
      await sendZpl(device, zpl);
      setStatus(`Sent to ${device.name}.`);
      return true;
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
      return false;
    }
  };

  return (
    <Ctx.Provider value={{ settings, setSettings, device, devices, selectDevice, discover, discovering, status, print }}>
      {children}
    </Ctx.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePrinter() {
  const c = useContext(Ctx);
  if (!c) throw new Error('usePrinter must be used inside <PrinterProvider>');
  return c;
}
