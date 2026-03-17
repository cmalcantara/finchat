import { z } from 'zod';

export const AccountSchema = z.object({
  id: z.number(),
  name: z.string(),
  currency: z.string(),
  initial_balance: z.number(),
  is_default: z.number(),
  created_at: z.string(),
});
export type Account = z.infer<typeof AccountSchema>;

export const CreditSourceSchema = z.object({
  id: z.number(),
  name: z.string(),
  created_at: z.string(),
});
export type CreditSource = z.infer<typeof CreditSourceSchema>;

export const CategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  icon: z.string(),
  color: z.string(),
  created_at: z.string(),
});
export type Category = z.infer<typeof CategorySchema>;

export const BudgetLimitSchema = z.object({
  id: z.number(),
  category_id: z.number(),
  year_month: z.string(),
  amount: z.number(),
});
export type BudgetLimit = z.infer<typeof BudgetLimitSchema>;

export const TransactionSchema = z.object({
  id: z.number(),
  type: z.enum(['expense', 'income', 'transfer']),
  account_id: z.number(),
  to_account_id: z.number().nullable(),
  category_id: z.number().nullable(),
  credit_source_id: z.number().nullable(),
  amount: z.number(),
  description: z.string(),
  txn_date: z.string(),
  year_month: z.string(),
  receipt_filename: z.string().nullable(),
  synced_to_gsheet: z.number(),
  created_at: z.string(),
});
export type Transaction = z.infer<typeof TransactionSchema>;

export const MessageSchema = z.object({
  id: z.number(),
  role: z.enum(['user', 'bot']),
  content: z.string(),
  metadata: z.string().nullable(),
  created_at: z.string(),
});
export type Message = z.infer<typeof MessageSchema>;

export type ParseContext = {
  accounts: string[];
  categories: string[];
  creditSources: string[];
  defaultAccount?: string;
};

export type ParseResult =
  | { success: true; type: 'expense'; accountName: string; categoryName: string; amount: number; description: string }
  | { success: true; type: 'income'; accountName: string; creditSourceName: string; amount: number; description: string }
  | { success: true; type: 'transfer'; fromAccountName: string; toAccountName: string; amount: number; description: string }
  | { success: false; error: string };
