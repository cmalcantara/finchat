import { NextRequest, NextResponse } from 'next/server';
import { ensureInit } from '@/lib/db-init';
import { getDb } from '@/lib/db';
import { parseInput } from '@/lib/parser';
import { formatBotReply } from '@/lib/formatter';

function getAccountBalance(db: ReturnType<typeof getDb>, accountId: number): number {
  const account = db.prepare(`SELECT initial_balance FROM accounts WHERE id = ?`).get(accountId) as { initial_balance: number } | undefined;
  const initialBalance = account?.initial_balance ?? 0;

  const income = (db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type='income' AND account_id=?`).get(accountId) as { total: number }).total;
  const expense = (db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type='expense' AND account_id=?`).get(accountId) as { total: number }).total;
  const transferOut = (db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type='transfer' AND account_id=?`).get(accountId) as { total: number }).total;
  const transferIn = (db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type='transfer' AND to_account_id=?`).get(accountId) as { total: number }).total;

  return initialBalance + income - expense - transferOut + transferIn;
}

export async function GET() {
  await ensureInit();
  const db = getDb();
  const messages = db.prepare(`SELECT * FROM messages ORDER BY created_at ASC`).all();
  return NextResponse.json(messages);
}

export async function POST(req: NextRequest) {
  await ensureInit();
  const db = getDb();

  let content: string;
  let receiptFilename: string | null = null;

  const contentType = req.headers.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData();
    content = (form.get('content') as string) || '';
    receiptFilename = (form.get('receiptFilename') as string) || null;
  } else {
    const body = await req.json();
    content = body.content || '';
    receiptFilename = body.receiptFilename || null;
  }

  if (!content?.trim()) {
    return NextResponse.json({ error: 'Empty message' }, { status: 400 });
  }

  // Save user message
  const userMsg = db.prepare(`INSERT INTO messages (role, content) VALUES ('user', ?) RETURNING *`).get(content) as { id: number; role: string; content: string; metadata: string | null; created_at: string };

  // Load context
  const accounts = db.prepare(`SELECT * FROM accounts ORDER BY name`).all() as { id: number; name: string; currency: string; initial_balance: number; is_default: number }[];
  const categories = db.prepare(`SELECT * FROM categories ORDER BY name`).all() as { id: number; name: string; icon: string; color: string }[];
  const creditSources = db.prepare(`SELECT * FROM credit_sources ORDER BY name`).all() as { id: number; name: string }[];

  const defaultAccount = accounts.find(a => a.is_default === 1) || accounts[0];

  const ctx = {
    accounts: accounts.map(a => a.name),
    categories: categories.map(c => c.name),
    creditSources: creditSources.map(s => s.name),
    defaultAccount: defaultAccount?.name,
  };

  const parsed = parseInput(content, ctx);

  if (!parsed.success) {
    const botMsg = db.prepare(`INSERT INTO messages (role, content) VALUES ('bot', ?) RETURNING *`).get(`❌ ${parsed.error}`) as { id: number; role: string; content: string; metadata: string | null; created_at: string };
    return NextResponse.json({ userMessage: userMsg, botMessage: botMsg });
  }

  const today = new Date().toISOString().slice(0, 10);
  const yearMonth = today.slice(0, 7);
  const currencyRow = db.prepare(`SELECT value FROM settings WHERE key = 'currency_symbol'`).get() as { value: string } | undefined;
  const currencySymbol = currencyRow?.value || '₱';

  let txnId: number;
  let botReplyText: string;

  if (parsed.type === 'expense') {
    const account = parsed.accountName
      ? accounts.find(a => a.name.toLowerCase() === parsed.accountName.toLowerCase()) || defaultAccount
      : defaultAccount;
    const category = categories.find(c => c.name.toLowerCase() === parsed.categoryName.toLowerCase())!;

    const txn = db.prepare(`
      INSERT INTO transactions (type, account_id, category_id, amount, description, txn_date, year_month, receipt_filename)
      VALUES ('expense', ?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `).get(account.id, category.id, parsed.amount, parsed.description, today, yearMonth, receiptFilename ?? null) as { id: number };
    txnId = txn.id;

    const spentRow = db.prepare(`SELECT COALESCE(SUM(amount),0) as spent FROM transactions WHERE type='expense' AND category_id=? AND year_month=?`).get(category.id, yearMonth) as { spent: number };
    const limitRow = db.prepare(`SELECT amount FROM budget_limits WHERE category_id=? AND year_month=?`).get(category.id, yearMonth) as { amount: number } | undefined;
    const totalSpentRow = db.prepare(`SELECT COALESCE(SUM(amount),0) as spent FROM transactions WHERE type='expense' AND year_month=?`).get(yearMonth) as { spent: number };
    const totalBudgetRow = db.prepare(`SELECT value FROM settings WHERE key='total_monthly_budget'`).get() as { value: string } | undefined;
    const totalLimit = totalBudgetRow?.value ? (parseFloat(totalBudgetRow.value) || null) : null;

    botReplyText = formatBotReply({
      type: 'expense',
      description: parsed.description,
      amount: parsed.amount,
      categoryName: category.name,
      accountName: account.name,
      spent: spentRow.spent,
      limit: limitRow?.amount ?? null,
      accountBalance: getAccountBalance(db, account.id),
      totalSpent: totalSpentRow.spent,
      totalLimit: totalLimit === 0 ? null : totalLimit,
      currencySymbol,
    });

    const metadata = JSON.stringify({ transactionId: txnId, categoryId: category.id, accountId: account.id });
    const botMsg = db.prepare(`INSERT INTO messages (role, content, metadata) VALUES ('bot', ?, ?) RETURNING *`).get(botReplyText, metadata) as { id: number; role: string; content: string; metadata: string | null; created_at: string };
    setImmediate(() => scheduleGSheetSync().catch(console.error));
    return NextResponse.json({ userMessage: userMsg, botMessage: botMsg, transactionId: txnId });
  }

  if (parsed.type === 'income') {
    const account = parsed.accountName
      ? accounts.find(a => a.name.toLowerCase() === parsed.accountName.toLowerCase()) || defaultAccount
      : defaultAccount;
    const creditSource = parsed.creditSourceName
      ? creditSources.find(s => s.name.toLowerCase() === parsed.creditSourceName.toLowerCase())
      : null;

    const txn = db.prepare(`
      INSERT INTO transactions (type, account_id, credit_source_id, amount, description, txn_date, year_month, receipt_filename)
      VALUES ('income', ?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `).get(account.id, creditSource?.id ?? null, parsed.amount, parsed.description, today, yearMonth, receiptFilename ?? null) as { id: number };
    txnId = txn.id;

    botReplyText = formatBotReply({
      type: 'income',
      amount: parsed.amount,
      creditSourceName: parsed.creditSourceName,
      accountName: account.name,
      accountBalance: getAccountBalance(db, account.id),
      currencySymbol,
      description: parsed.description,
    });

    const metadata = JSON.stringify({ transactionId: txnId, accountId: account.id });
    const botMsg = db.prepare(`INSERT INTO messages (role, content, metadata) VALUES ('bot', ?, ?) RETURNING *`).get(botReplyText, metadata) as { id: number; role: string; content: string; metadata: string | null; created_at: string };
    setImmediate(() => scheduleGSheetSync().catch(console.error));
    return NextResponse.json({ userMessage: userMsg, botMessage: botMsg, transactionId: txnId });
  }

  // transfer
  const fromAccount = accounts.find(a => a.name.toLowerCase() === parsed.fromAccountName.toLowerCase()) || defaultAccount;
  const toAccount = accounts.find(a => a.name.toLowerCase() === parsed.toAccountName.toLowerCase()) || defaultAccount;

  const txn = db.prepare(`
    INSERT INTO transactions (type, account_id, to_account_id, amount, description, txn_date, year_month, receipt_filename)
    VALUES ('transfer', ?, ?, ?, ?, ?, ?, ?)
    RETURNING id
  `).get(fromAccount.id, toAccount.id, parsed.amount, parsed.description, today, yearMonth, receiptFilename ?? null) as { id: number };
  txnId = txn.id;

  botReplyText = formatBotReply({
    type: 'transfer',
    amount: parsed.amount,
    fromAccountName: fromAccount.name,
    toAccountName: toAccount.name,
    fromBalance: getAccountBalance(db, fromAccount.id),
    toBalance: getAccountBalance(db, toAccount.id),
    currencySymbol,
    description: parsed.description,
  });

  const metadata = JSON.stringify({ transactionId: txnId, fromAccountId: fromAccount.id, toAccountId: toAccount.id });
  const botMsg = db.prepare(`INSERT INTO messages (role, content, metadata) VALUES ('bot', ?, ?) RETURNING *`).get(botReplyText, metadata) as { id: number; role: string; content: string; metadata: string | null; created_at: string };
  setImmediate(() => scheduleGSheetSync().catch(console.error));
  return NextResponse.json({ userMessage: userMsg, botMessage: botMsg, transactionId: txnId });
}

async function scheduleGSheetSync() {
  // Trigger background sync - fire and forget via internal fetch
  try {
    await fetch(`http://localhost:${process.env.PORT || 3000}/api/gsheet-sync`, { method: 'POST' });
  } catch {
    // ignore - sync will happen on next scheduled run
  }
}
