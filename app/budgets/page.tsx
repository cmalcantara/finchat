'use client';
import { useState, useEffect } from 'react';
import BudgetGrid from '@/components/budgets/BudgetGrid';

interface AccountBalance {
  id: number;
  name: string;
  currency: string;
  balance: number;
  is_default: number;
}

interface BudgetData {
  month: string;
  categories: {
    category_id: number;
    category_name: string;
    icon: string;
    color: string;
    spent: number;
    limit: number | null;
    pct: number | null;
  }[];
  accountBalances: AccountBalance[];
  totalSpent: number;
  totalLimit: number | null;
  totalRemaining: number | null;
}

export default function BudgetsPage() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState<BudgetData | null>(null);
  const [currencySymbol, setCurrencySymbol] = useState('₱');

  useEffect(() => {
    fetch(`/api/budgets?month=${month}`).then(r => r.json()).then(setData).catch(console.error);
  }, [month]);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(s => setCurrencySymbol(s.currency_symbol || '₱')).catch(console.error);
  }, []);

  return (
    <div className="flex flex-col h-screen pb-16 bg-black">
      <header className="px-4 py-3 border-b border-[#1E1E1E] bg-black flex-shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-semibold tracking-wide text-white">Budget</h1>
          <input
            type="month"
            className="bg-[#141414] border border-[#1E1E1E] text-[#888] rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-[#00C853] [color-scheme:dark]"
            value={month}
            onChange={e => setMonth(e.target.value)}
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 bg-black">
        {data ? (
          <>
            {/* Account balances */}
            {data.accountBalances.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-[#444] uppercase tracking-wider mb-2">Accounts</p>
                <div className="grid grid-cols-2 gap-2">
                  {data.accountBalances.map(acc => (
                    <div key={acc.id} className={`rounded-xl px-3 py-2.5 border ${acc.is_default ? 'border-[#00C853]/30 bg-[#00C853]/5' : 'border-[#1E1E1E] bg-[#0D0D0D]'}`}>
                      <p className="text-xs text-[#555] truncate">{acc.name}</p>
                      <p className={`text-base font-bold mt-0.5 ${acc.balance < 0 ? 'text-[#FF5252]' : acc.is_default ? 'text-[#00C853]' : 'text-white'}`}>
                        {currencySymbol}{acc.balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-[#333]">{acc.currency}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <BudgetGrid
              categories={data.categories}
              totalSpent={data.totalSpent}
              totalLimit={data.totalLimit}
              currencySymbol={currencySymbol}
            />
          </>
        ) : (
          <div className="text-center text-[#333] mt-16 text-sm">Loading...</div>
        )}
      </div>
    </div>
  );
}
