'use client';

interface Props {
  categoryName: string;
  icon: string;
  color: string;
  spent: number;
  limit: number | null;
  pct: number | null;
  currencySymbol: string;
}

export default function BudgetCard({ categoryName, icon, spent, limit, pct, currencySymbol }: Props) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const clampedPct = Math.min(pct ?? 0, 100) / 100;
  const strokeDashoffset = circumference * (1 - clampedPct);
  const isOver = (pct ?? 0) > 100;
  const arcColor = isOver ? '#FF5252' : '#00C853';

  return (
    <div className="bg-[#0D0D0D] rounded-2xl p-3 border border-[#1E1E1E] flex flex-col items-center gap-1.5">
      <div className="relative">
        <svg width="80" height="80" viewBox="0 0 90 90">
          <circle cx="45" cy="45" r={radius} fill="none" stroke="#1E1E1E" strokeWidth="6" />
          {limit !== null && (
            <circle
              cx="45" cy="45" r={radius}
              fill="none"
              stroke={arcColor}
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform="rotate(-90 45 45)"
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          <span className="text-xl leading-none">{icon}</span>
          <span className={`text-xs font-bold ${isOver ? 'text-[#FF5252]' : 'text-[#00C853]'}`}>
            {pct !== null ? `${pct}%` : '—'}
          </span>
        </div>
      </div>
      <div className="text-center w-full">
        <p className="text-xs text-[#888] truncate">{categoryName}</p>
        <p className={`text-sm font-semibold ${isOver ? 'text-[#FF5252]' : 'text-white'}`}>
          {currencySymbol}{spent.toFixed(0)}
        </p>
        {limit !== null ? (
          <p className="text-xs text-[#555]">/ {currencySymbol}{limit.toFixed(0)}</p>
        ) : (
          <p className="text-xs text-[#333]">no limit</p>
        )}
      </div>
    </div>
  );
}
