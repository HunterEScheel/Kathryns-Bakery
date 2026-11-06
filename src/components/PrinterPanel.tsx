import { usePrinter } from '../lib/printer';
import { CALIBRATE_ZPL, CONFIG_LABEL_ZPL, LABEL_PRESETS } from '../lib/zpl';

export default function PrinterPanel() {
  const { settings, setSettings, device, devices, selectDevice, discover, discovering, status, print } = usePrinter();
  const preset = LABEL_PRESETS.find((p) => p.w === settings.widthIn && p.h === settings.heightIn);

  return (
    <section className="card printer-panel">
      <div className="row between wrap">
        <h2>Zebra GK420d</h2>
        <span className={`dot ${device ? 'on' : 'off'}`}>{device ? device.name : 'Not connected'}</span>
      </div>

      <div className="form grid-form">
        <label>
          Printer
          <div className="row">
            <select value={device?.uid ?? ''} onChange={(e) => selectDevice(e.target.value)}>
              {!devices.length && <option value="">{device ? device.name : '— none found —'}</option>}
              {devices.map((d) => (
                <option key={d.uid} value={d.uid}>
                  {d.name} ({d.connection})
                </option>
              ))}
            </select>
            <button type="button" className="btn small ghost" onClick={discover} disabled={discovering}>
              {discovering ? 'Searching…' : 'Find'}
            </button>
          </div>
        </label>

        <label>
          Label size
          <select
            value={preset ? preset.label : 'custom'}
            onChange={(e) => {
              const p = LABEL_PRESETS.find((x) => x.label === e.target.value);
              if (p) setSettings({ ...settings, widthIn: p.w, heightIn: p.h });
            }}
          >
            {LABEL_PRESETS.map((p) => (
              <option key={p.label}>{p.label}</option>
            ))}
            {!preset && <option value="custom">Custom</option>}
          </select>
        </label>
        <label>
          Width (in)
          <input
            type="number"
            step="0.05"
            min="0.75"
            max="4.09"
            value={settings.widthIn}
            onChange={(e) => setSettings({ ...settings, widthIn: Number(e.target.value) })}
          />
        </label>
        <label>
          Height (in)
          <input
            type="number"
            step="0.05"
            min="0.5"
            max="39"
            value={settings.heightIn}
            onChange={(e) => setSettings({ ...settings, heightIn: Number(e.target.value) })}
          />
        </label>
        <label>
          Media
          <select
            value={settings.mediaType}
            onChange={(e) => setSettings({ ...settings, mediaType: e.target.value as 'T' | 'D' })}
          >
            <option value="D">Direct thermal (no ribbon)</option>
            <option value="T">Thermal transfer (ribbon)</option>
          </select>
        </label>
        <label>
          Darkness ({settings.darkness})
          <input
            type="range"
            min="0"
            max="30"
            value={settings.darkness}
            onChange={(e) => setSettings({ ...settings, darkness: Number(e.target.value) })}
          />
        </label>
        <label>
          Speed (ips)
          <select value={settings.speed} onChange={(e) => setSettings({ ...settings, speed: Number(e.target.value) })}>
            {[2, 3, 4, 5].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Bakery name on label
          <input value={settings.bakeryName} onChange={(e) => setSettings({ ...settings, bakeryName: e.target.value })} />
        </label>
      </div>

      <div className="row wrap">
        <button type="button" className="btn small ghost" onClick={() => print(CALIBRATE_ZPL, 'calibrate.zpl')}>
          Calibrate media
        </button>
        <button type="button" className="btn small ghost" onClick={() => print(CONFIG_LABEL_ZPL, 'config.zpl')}>
          Print config label
        </button>
      </div>
      {status && <p className="muted small">{status}</p>}
      {!device && (
        <details className="help">
          <summary>How to connect the printer</summary>
          <ol>
            <li>
              Install the GK420d driver and{' '}
              <a href="https://www.zebra.com/us/en/support-downloads/software/printer-software/browser-print.html" target="_blank" rel="noreferrer">
                Zebra Browser Print
              </a>{' '}
              on the computer the printer is plugged into (USB or network).
            </li>
            <li>Start Browser Print and accept this site when it asks for permission.</li>
            <li>
              Open <a href="https://127.0.0.1:9101/ssl_support" target="_blank" rel="noreferrer">https://127.0.0.1:9101/ssl_support</a>{' '}
              once and accept the certificate (needed because the site is served over HTTPS).
            </li>
            <li>Click <em>Find</em>. Without a printer, labels download as <code>.zpl</code> files instead.</li>
          </ol>
        </details>
      )}
    </section>
  );
}
