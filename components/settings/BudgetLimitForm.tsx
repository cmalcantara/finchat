'use client';
import { useState, useEffect } from 'react';

interface Category {
  id: number;
  name: string;
  icon: string;
}

interface Props {
  categories: Category[];
  currentMonth: string;
  onSetLimit: (categoryId: number, yearMonth: string, amount: number) => Promise<void>;
}

export default function BudgetLimitForm({ categories, currentMonth, onSetLimit }: Props) {
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState(currentMonth);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (categoryId === '' && categories.length > 0) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  async function handleSubmit() {
    if (!categoryId || !amount) return;
    setError('');
    try {
      await onSetLimit(Number(categoryId), month, parseFloat(amount));
      setAmount('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div>
      <h2 className="text-[#444] text-xs uppercase tracking-wider mb-3">Set Budget Limit</h2>
      <div className="space-y-2">
        <select
          className="w-full bg-[#141414] border border-[#1E1E1E] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00C853] [color-scheme:dark]"
          value={categoryId}
          onChange={e => setCategoryId(Number(e.target.value))}
        >
          <option value="">Select category...</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
          ))}
        </select>
        <input
          type="month"
          className="w-full bg-[#141414] border border-[#1E1E1E] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00C853] [color-scheme:dark]"
          value={month}
          onChange={e => setMonth(e.target.value)}
        />
        <input
          type="number"
          className="w-full bg-[#141414] border border-[#1E1E1E] text-white placeholder:text-[#444] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00C853]"
          placeholder="Amount"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          min="0"
        />
        {error && <p className="text-xs text-[#FF5252]">{error}</p>}
        <button
          onClick={handleSubmit}
          disabled={!categoryId || !amount}
          className="w-full bg-[#00C853] text-black font-semibold rounded-lg px-3 py-2 text-sm hover:bg-[#00E676] disabled:opacity-30 transition-colors"
        >
          {success ? 'Saved' : 'Set Limit'}
        </button>
      </div>
    </div>
  );
}
