'use client';
import { useState, useEffect, useRef } from 'react';

interface SyncLogEntry {
  ts: string;
  message: string;
  ok: boolean;
}

interface Props {
  initialUrl: string;
  initialSecret: string;
  initialEnabled: boolean;
  onSave: (url: string, secret: string, enabled: boolean) => Promise<void>;
  onSyncNow: () => Promise<{ synced: number; pending: number; error?: string }>;
  onReset: () => Promise<{ reset: number }>;
}

const LOG_KEY = 'finchat_gsheet_log';
const MAX_LOG = 50;

function loadLog(): SyncLogEntry[] {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLog(entries: SyncLogEntry[]) {
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(entries.slice(-MAX_LOG)));
  } catch {}
}

export default function GSheetConfig({ initialUrl, initialSecret, initialEnabled, onSave, onSyncNow, onReset }: Props) {
  const [url, setUrl] = useState(initialUrl);
  const [secret, setSecret] = useState(initialSecret);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saved, setSaved] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pending, setPending] = useState<number | null>(null);
  const [log, setLog] = useState<SyncLogEntry[]>([]);
  const [copied, setCopied] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  // Load log from localStorage on mount + fetch pending count
  useEffect(() => {
    setLog(loadLog());
    fetch('/api/gsheet-sync')
      .then(r => r.json())
      .then(d => setPending(d.pending ?? null))
      .catch(() => {});
  }, []);

  // Auto-scroll log to bottom on new entries
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  function appendLog(message: string, ok: boolean) {
    const entry: SyncLogEntry = {
      ts: new Date().toLocaleString('en-PH', { hour12: false }),
      message,
      ok,
    };
    setLog(prev => {
      const next = [...prev, entry].slice(-MAX_LOG);
      saveLog(next);
      return next;
    });
  }

  async function handleSave() {
    await onSave(url, secret, enabled);
    setSaved(true);
    appendLog('Config saved', true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleSync() {
    setSyncing(true);
    appendLog('Sync started', true);
    try {
      const result = await onSyncNow();
      setPending(result.pending ?? null);
      if (result.error) {
        appendLog(`Error: ${result.error}`, false);
      } else {
        appendLog(`Synced ${result.synced} rows — ${result.pending} pending`, true);
      }
    } catch (e) {
      appendLog(`Fetch failed: ${String(e)}`, false);
    } finally {
      setSyncing(false);
    }
  }

  async function handleReset() {
    if (!confirm('Mark all transactions as unsynced? They will all be pushed on the next sync.')) return;
    try {
      const result = await onReset();
      setPending(result.reset);
      appendLog(`Reset ${result.reset} rows to unsynced`, true);
    } catch (e) {
      appendLog(`Reset failed: ${String(e)}`, false);
    }
  }

  function handleClearLog() {
    setLog([]);
    saveLog([]);
  }

  function handleCopyLog() {
    const text = log.map(e => `[${e.ts}] ${e.message}`).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div>
      <h2 className="text-[#444] text-xs uppercase tracking-wider mb-3">Google Sheets (Apps Script)</h2>
      <div className="space-y-2">

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} className="rounded" />
          <span className="text-sm text-[#888]">Enable GSheet sync</span>
        </label>

        <input
          className="w-full bg-[#141414] border border-[#1E1E1E] text-white placeholder:text-[#444] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00C853]"
          placeholder="Apps Script web app URL"
          value={url}
          onChange={e => setUrl(e.target.value)}
          disabled={!enabled}
        />
        <input
          className="w-full bg-[#141414] border border-[#1E1E1E] text-white placeholder:text-[#444] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00C853]"
          placeholder="Secret token (optional)"
          value={secret}
          onChange={e => setSecret(e.target.value)}
          disabled={!enabled}
        />

        {/* Pending badge */}
        {pending !== null && (
          <p className="text-xs text-[#555]">
            <span className={`font-medium ${pending > 0 ? 'text-[#FFB300]' : 'text-[#00C853]'}`}>
              {pending > 0 ? `${pending} rows pending sync` : 'All rows synced'}
            </span>
          </p>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 bg-[#00C853] text-black font-semibold rounded-lg px-3 py-2 text-sm hover:bg-[#00E676] transition-colors"
          >
            {saved ? 'Saved' : 'Save Config'}
          </button>
          <button
            onClick={handleSync}
            disabled={!enabled || !url || syncing}
            className="flex-1 bg-[#141414] border border-[#1E1E1E] text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-[#1A1A1A] disabled:opacity-30 transition-colors"
          >
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>

        {/* Reset button */}
        <button
          onClick={handleReset}
          className="w-full border border-[#FFB300]/30 text-[#FFB300] rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-[#FFB300]/5 transition-colors"
        >
          Reset sync flags (re-push all rows)
        </button>

        <p className="text-xs text-[#333]">Auto-sync via cron every 2h — see SETUP.md.</p>

        {/* Sync log */}
        <div className="mt-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[#444] uppercase tracking-wider">Sync Log</span>
            <div className="flex gap-2">
              <button
                onClick={handleCopyLog}
                disabled={log.length === 0}
                className="text-xs text-[#00C853] hover:text-[#00E676] disabled:opacity-30 px-2 py-0.5 border border-[#1E1E1E] rounded"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={handleClearLog}
                disabled={log.length === 0}
                className="text-xs text-[#555] hover:text-[#FF5252] disabled:opacity-30 px-2 py-0.5 border border-[#1E1E1E] rounded"
              >
                Clear
              </button>
            </div>
          </div>

          <div
            ref={logRef}
            className="bg-[#050505] rounded-lg p-2 h-36 overflow-y-auto font-mono text-xs border border-[#1E1E1E]"
          >
            {log.length === 0 ? (
              <p className="text-[#333] italic">No log entries yet.</p>
            ) : (
              log.map((entry, i) => (
                <div key={i} className={`leading-5 ${entry.ok ? 'text-[#555]' : 'text-[#FF5252]'}`}>
                  <span className="text-[#333] mr-2">{entry.ts}</span>
                  <span className="break-all">{entry.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
