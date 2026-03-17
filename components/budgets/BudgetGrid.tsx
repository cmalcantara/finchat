'use client';
import BudgetCard from './BudgetCard';

interface CategoryStats {
  category_id: number;
  category_name: string;
  icon: string;
  color: string;
  spent: number;
  limit: number | null;
  pct: number | null;
}

interface Props {
  categories: CategoryStats[];
  totalSpent: number;
  totalLimit: number | null;
  currencySymbol: string;
}

export default function BudgetGrid({ categories, totalSpent, totalLimit, currencySymbol }: Props) {
  const remaining = totalLimit ? totalLimit - totalSpent : null;
  const overBudget = remaining !== null && remaining < 0;
  const totalPct = totalLimit ? Math.round((totalSpent / totalLimit) * 100) : null;

  return (
    <div>
      {/* Total summary */}
      <div className="bg-[#0D0D0D] border border-[#1E1E1E] rounded-2xl p-4 mb-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs text-[#555] uppercase tracking-wider mb-1">Total Spent</p>
            <p className="text-2xl font-bold text-white">{currencySymbol}{totalSpent.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
          </div>
          {totalLimit && (
            <div className="text-right">
              <p className="text-xs text-[#555] uppercase tracking-wider mb-1">Budget</p>
              <p className="text-lg font-semibold text-[#888]">{currencySymbol}{totalLimit.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
              {remaining !== null && (
                <p className={`text-sm font-medium mt-0.5 ${overBudget ? 'text-[#FF5252]' : 'text-[#00C853]'}`}>
                  {overBudget
                    ? `over by ${currencySymbol}${Math.abs(remaining).toFixed(2)}`
                    : `${currencySymbol}${remaining.toFixed(2)} left`}
                </p>
              )}
              {totalPct !== null && <p className="text-xs text-[#444] mt-0.5">{totalPct}% used</p>}
            </div>
          )}
        </div>
      </div>

      {/* Category grid */}
      <div className="grid grid-cols-3 gap-2">
        {categories.map(cat => (
          <BudgetCard
            key={cat.category_id}
            categoryName={cat.category_name}
            icon={cat.icon}
            color={cat.color}
            spent={cat.spent}
            limit={cat.limit}
            pct={cat.pct}
            currencySymbol={currencySymbol}
          />
        ))}
      </div>
    </div>
  );
}
