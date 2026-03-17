import { NextRequest, NextResponse } from 'next/server';
import { ensureInit } from '@/lib/db-init';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  await ensureInit();
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);

  const categories = db.prepare(`
    SELECT
      c.id as category_id,
      c.name as category_name,
      c.icon,
      c.color,
      COALESCE(SUM(CASE WHEN t.type='expense' THEN t.amount ELSE 0 END), 0) as spent,
      bl.amount as limit_amount
    FROM categories c
    LEFT JOIN transactions t ON t.category_id = c.id AND t.year_month = ?
    LEFT JOIN budget_limits bl ON bl.category_id = c.id AND bl.year_month = ?
    GROUP BY c.id, c.name, c.icon, c.color, bl.amount
    ORDER BY c.name
  `).all(month, month) as { category_id: number; category_name: string; icon: string; color: string; spent: number; limit_amount: number | null }[];

  // Account balances
  const accounts = db.prepare(`SELECT * FROM accounts ORDER BY is_default DESC, name`).all() as { id: number; name: string; currency: string; initial_balance: number; is_default: number }[];
  const accountBalances = accounts.map(a => {
    const income = (db.prepare(`SELECT COALESCE(SUM(amount),0) as t FROM transactions WHERE type='income' AND account_id=?`).get(a.id) as { t: number }).t;
    const expense = (db.prepare(`SELECT COALESCE(SUM(amount),0) as t FROM transactions WHERE type='expense' AND account_id=?`).get(a.id) as { t: number }).t;
    const out = (db.prepare(`SELECT COALESCE(SUM(amount),0) as t FROM transactions WHERE type='transfer' AND account_id=?`).get(a.id) as { t: number }).t;
    const inc = (db.prepare(`SELECT COALESCE(SUM(amount),0) as t FROM transactions WHERE type='transfer' AND to_account_id=?`).get(a.id) as { t: number }).t;
    return { ...a, balance: a.initial_balance + income - expense - out + inc };
  });

  const totalSpent = categories.reduce((sum, c) => sum + c.spent, 0);
  const totalBudgetRow = db.prepare(`SELECT value FROM settings WHERE key = 'total_monthly_budget'`).get() as { value: string } | undefined;
  const totalLimit = totalBudgetRow?.value ? (parseFloat(totalBudgetRow.value) || null) : null;

  return NextResponse.json({
    month,
    categories: categories.map(c => ({
      category_id: c.category_id,
      category_name: c.category_name,
      icon: c.icon,
      color: c.color,
      spent: c.spent,
      limit: c.limit_amount,
      pct: c.limit_amount ? Math.round((c.spent / c.limit_amount) * 100) : null,
    })),
    accountBalances,
    totalSpent,
    totalLimit: totalLimit === 0 ? null : totalLimit,
    totalRemaining: totalLimit ? totalLimit - totalSpent : null,
  });
}
