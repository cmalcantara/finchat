export interface ExpenseFormatArgs {
  type: 'expense';
  description: string;
  amount: number;
  categoryName: string;
  accountName: string;
  spent: number;
  limit: number | null;
  accountBalance: number;
  totalSpent: number;
  totalLimit: number | null;
  currencySymbol: string;
}

export interface IncomeFormatArgs {
  type: 'income';
  amount: number;
  creditSourceName: string;
  accountName: string;
  accountBalance: number;
  currencySymbol: string;
  description: string;
}

export interface TransferFormatArgs {
  type: 'transfer';
  amount: number;
  fromAccountName: string;
  toAccountName: string;
  fromBalance: number;
  toBalance: number;
  currencySymbol: string;
  description: string;
}

export type FormatArgs = ExpenseFormatArgs | IncomeFormatArgs | TransferFormatArgs;

export function formatBotReply(args: FormatArgs): string {
  const c = args.currencySymbol;
  const fmt = (n: number) =>
    `${c}${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (args.type === 'transfer') {
    const desc = args.description ? ` · ${args.description}` : '';
    return [
      `Transferred ${fmt(args.amount)} — ${args.fromAccountName} to ${args.toAccountName}${desc}`,
      `${args.fromAccountName}: ${fmt(args.fromBalance)}`,
      `${args.toAccountName}: ${fmt(args.toBalance)}`,
    ].join('\n');
  }

  if (args.type === 'income') {
    const source = args.creditSourceName ? ` from ${args.creditSourceName}` : '';
    const desc = args.description ? ` · ${args.description}` : '';
    return [
      `${fmt(args.amount)} received${source} — ${args.accountName}${desc}`,
      `Balance: ${fmt(args.accountBalance)}`,
    ].join('\n');
  }

  // expense
  const label = args.description || args.categoryName;
  const pct = args.limit ? Math.round((args.spent / args.limit) * 100) : null;
  const catLine = args.limit !== null
    ? `${args.categoryName}: ${fmt(args.spent)} / ${fmt(args.limit)} (${pct}%)`
    : `${args.categoryName}: ${fmt(args.spent)} — no limit set`;

  const remaining = args.totalLimit !== null ? args.totalLimit - args.totalSpent : null;
  const overBudget = remaining !== null && remaining < 0;
  const totalLine = remaining === null
    ? `Total: ${fmt(args.totalSpent)}`
    : overBudget
    ? `Total: ${fmt(args.totalSpent)} — over by ${fmt(Math.abs(remaining))}`
    : `Total: ${fmt(args.totalSpent)} · ${fmt(remaining)} left`;

  return [
    `${label} ${fmt(args.amount)} — ${args.accountName}`,
    catLine,
    totalLine,
    `Balance: ${fmt(args.accountBalance)}`,
  ].join('\n');
}
