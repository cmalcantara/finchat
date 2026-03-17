import { getDb } from './db';

let initialized = false;
let initPromise: Promise<void> | null = null;

export async function ensureInit(): Promise<void> {
  if (initialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const db = getDb();

    db.exec(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE COLLATE NOCASE,
        currency TEXT NOT NULL DEFAULT 'PHP',
        initial_balance REAL NOT NULL DEFAULT 0,
        is_default INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS credit_sources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE COLLATE NOCASE,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE COLLATE NOCASE,
        icon TEXT NOT NULL DEFAULT 'default',
        color TEXT NOT NULL DEFAULT '#888888',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS budget_limits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        year_month TEXT NOT NULL,
        amount REAL NOT NULL DEFAULT 0,
        UNIQUE(category_id, year_month)
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL CHECK(type IN ('expense','income','transfer')),
        account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
        to_account_id INTEGER REFERENCES accounts(id) ON DELETE RESTRICT,
        category_id INTEGER REFERENCES categories(id) ON DELETE RESTRICT,
        credit_source_id INTEGER REFERENCES credit_sources(id) ON DELETE RESTRICT,
        amount REAL NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        txn_date TEXT NOT NULL,
        year_month TEXT NOT NULL,
        receipt_filename TEXT,
        synced_to_gsheet INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT NOT NULL CHECK(role IN ('user','bot')),
        content TEXT NOT NULL,
        metadata TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    // Seed default settings
    const insertSetting = db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`);
    insertSetting.run('gsheet_apps_script_url', '');
    insertSetting.run('gsheet_secret', '');
    insertSetting.run('gsheet_enabled', 'false');
    insertSetting.run('currency_symbol', '₱');
    insertSetting.run('total_monthly_budget', '0');

    // Seed default accounts
    const insertAccount = db.prepare(`INSERT OR IGNORE INTO accounts (name, currency, is_default) VALUES (?, ?, ?)`);
    insertAccount.run('Cash PHP', 'PHP', 1);
    insertAccount.run('GCash PHP', 'PHP', 0);
    insertAccount.run('Maya PHP', 'PHP', 0);
    insertAccount.run('Wise USD', 'USD', 0);
    insertAccount.run('Metrobank PHP', 'PHP', 0);

    // Seed default credit sources
    const insertCredit = db.prepare(`INSERT OR IGNORE INTO credit_sources (name) VALUES (?)`);
    ['Parents', 'Startup', 'Brods', 'Social', 'Salary', 'Freelance'].forEach(n => insertCredit.run(n));

    // Seed default categories
    const insertCategory = db.prepare(`INSERT OR IGNORE INTO categories (name, icon, color) VALUES (?, ?, ?)`);
    const defaultCategories = [
      ['Projects', '💼', '#6C63FF'],
      ['Health', '💊', '#96CEB4'],
      ['Food', '🍔', '#FF6B6B'],
      ['Social', '🎉', '#FFB347'],
      ['Transpo', '🚗', '#45B7D1'],
      ['Utilities', '💡', '#4ECDC4'],
      ['Entertainment', '🎮', '#FFEAA7'],
      ['Lend', '🤝', '#DDA0DD'],
    ];
    for (const [name, icon, color] of defaultCategories) {
      insertCategory.run(name, icon, color);
    }

    initialized = true;
  })();

  return initPromise;
}

export function resetInitForTesting() {
  initialized = false;
  initPromise = null;
}
