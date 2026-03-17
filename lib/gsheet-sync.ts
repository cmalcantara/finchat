import { getDb } from './db';

export interface GSheetRow {
  timestamp: string;       // full ISO timestamp from DB (e.g. "2025-11-01 14:32:00")
  debit: number | '';
  debitCategory: string;
  credit: number | '';
  creditCategory: string;
  account: string;
  description: string;
  receipt: string;
}

export async function pushUnsyncedToGSheet(): Promise<{ synced: number; error?: string }> {
  const db = getDb();

  const urlRow = db.prepare(`SELECT value FROM settings WHERE key = 'gsheet_apps_script_url'`).get() as { value: string } | undefined;
  const enabledRow = db.prepare(`SELECT value FROM settings WHERE key = 'gsheet_enabled'`).get() as { value: string } | undefined;
  const secretRow = db.prepare(`SELECT value FROM settings WHERE key = 'gsheet_secret'`).get() as { value: string } | undefined;

  if (enabledRow?.value !== 'true' || !urlRow?.value) {
    return { synced: 0 };
  }

  const url = urlRow.value;
  const secret = secretRow?.value || '';

  const unsynced = db.prepare(`
    SELECT t.id, t.type, t.amount, t.description, t.created_at, t.receipt_filename,
      a.name as account_name,
      ta.name as to_account_name,
      c.name as category_name,
      cs.name as credit_source_name
    FROM transactions t
    JOIN accounts a ON a.id = t.account_id
    LEFT JOIN accounts ta ON ta.id = t.to_account_id
    LEFT JOIN categories c ON c.id = t.category_id
    LEFT JOIN credit_sources cs ON cs.id = t.credit_source_id
    WHERE t.synced_to_gsheet = 0
    ORDER BY t.created_at ASC
    LIMIT 100
  `).all() as {
    id: number; type: string; amount: number; description: string; created_at: string;
    receipt_filename: string | null; account_name: string; to_account_name: string | null;
    category_name: string | null; credit_source_name: string | null;
  }[];

  if (unsynced.length === 0) return { synced: 0 };

  const rows: GSheetRow[] = unsynced.map(t => {
    const base = {
      timestamp: t.created_at,
      account: t.account_name,
      description: t.description,
      receipt: t.receipt_filename || '',
    };
    if (t.type === 'expense') {
      return { ...base, debit: '', debitCategory: '', credit: -t.amount, creditCategory: t.category_name || '' };
    }
    if (t.type === 'income') {
      return { ...base, debit: t.amount, debitCategory: t.credit_source_name || '', credit: '', creditCategory: '' };
    }
    // transfer: credit (outflow) from source account, debit (inflow) to destination
    return { ...base, debit: t.amount, debitCategory: t.to_account_name || '', credit: -t.amount, creditCategory: t.account_name };
  });

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, transactions: rows }),
    });

    // Always read the body first — Apps Script returns HTTP 200 even on errors
    const rawText = await res.text();

    if (!res.ok) {
      return { synced: 0, error: `HTTP ${res.status}: ${rawText.slice(0, 300)}` };
    }

    // Validate that the response is JSON with ok:true
    // If Apps Script access is wrong, it returns HTML (200) — detect that here
    let parsed: { ok?: boolean; error?: string; added?: number };
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const preview = rawText.slice(0, 120).replace(/\s+/g, ' ');
      return {
        synced: 0,
        error: `Apps Script returned non-JSON (likely HTML access-denied page). Check deployment access is set to "Anyone". Preview: ${preview}`,
      };
    }

    if (!parsed.ok) {
      return { synced: 0, error: `Apps Script error: ${parsed.error || JSON.stringify(parsed)}` };
    }

    // Only mark synced after confirmed success
    const ids = unsynced.map(t => t.id);
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`UPDATE transactions SET synced_to_gsheet = 1 WHERE id IN (${placeholders})`).run(...ids);

    return { synced: ids.length };
  } catch (err) {
    return { synced: 0, error: String(err) };
  }
}
