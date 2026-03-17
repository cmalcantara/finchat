import { ParseContext, ParseResult } from './types';

// Match a single token against a list:
//   1. exact (case-insensitive)
//   2. full name starts with token
//   3. first word of name starts with token
function matchToken(token: string, list: string[]): string | null {
  const t = token.toLowerCase();
  const exact = list.find(s => s.toLowerCase() === t);
  if (exact) return exact;
  const byFull = list.filter(s => s.toLowerCase().startsWith(t));
  if (byFull.length === 1) return byFull[0];
  const byFirst = list.filter(s => s.split(/\s+/)[0].toLowerCase().startsWith(t));
  if (byFirst.length === 1) return byFirst[0];
  return null;
}

function parseAmount(str: string): number | null {
  const normalized = str.replace(/,/g, '').replace(/^[₱P]/, '');
  const n = parseFloat(normalized);
  return isNaN(n) || n <= 0 ? null : n;
}

// Find the first number token in the text.
// Returns the amount value and splits text into prefix (before) and suffix (after).
function findAmount(text: string): { amount: number; prefixPart: string; suffixPart: string } | null {
  const tokens = text.split(/\s+/);
  for (let i = 0; i < tokens.length; i++) {
    if (/^[₱P]?[\d,]+(?:\.\d{1,2})?$/.test(tokens[i])) {
      const amount = parseAmount(tokens[i]);
      if (amount !== null) {
        return {
          amount,
          prefixPart: tokens.slice(0, i).join(' '),
          suffixPart: tokens.slice(i + 1).join(' '),
        };
      }
    }
  }
  return null;
}

export function parseInput(rawText: string, ctx: ParseContext): ParseResult {
  const text = rawText.trim();
  if (!text) return { success: false, error: 'Empty input' };

  // --- Transfer: "{from} {amount} to {to} [description]" ---
  const transferMatch = text.match(/^(.+?)\s+([\d,₱P]+(?:\.\d{1,2})?)\s+to\s+(\S+(?:\s+\S+)?)\s*(.*)$/i);
  if (transferMatch) {
    const [, fromToken, amtStr, toToken, desc] = transferMatch;
    const fromAccount = matchToken(fromToken.trim(), ctx.accounts);
    const toAccount = matchToken(toToken.trim(), ctx.accounts);
    if (fromAccount && toAccount) {
      const amount = parseAmount(amtStr);
      if (!amount) return { success: false, error: `Invalid amount: ${amtStr}` };
      return { success: true, type: 'transfer', fromAccountName: fromAccount, toAccountName: toAccount, amount, description: desc.trim() };
    }
  }

  // --- Find amount ---
  const found = findAmount(text);
  if (!found) return { success: false, error: 'Could not find an amount. Format: [account] {category|source} {amount} [description]' };

  const { amount, prefixPart, suffixPart } = found;
  const prefixTokens = prefixPart ? prefixPart.split(/\s+/) : [];

  // --- Classify prefix tokens (any order) ---
  let accountName: string | null = null;
  let categoryName: string | null = null;
  let creditSourceName: string | null = null;
  const unmatched: string[] = [];

  for (const token of prefixTokens) {
    const asAccount = matchToken(token, ctx.accounts);
    const asCategory = matchToken(token, ctx.categories);
    const asCreditSource = matchToken(token, ctx.creditSources);

    if (asAccount && !accountName) {
      accountName = asAccount;
    } else if (asCategory && !categoryName) {
      categoryName = asCategory;
    } else if (asCreditSource && !creditSourceName) {
      creditSourceName = asCreditSource;
    } else if (!asAccount && !asCategory && !asCreditSource) {
      unmatched.push(token);
    }
    // else: slot already filled, skip silently
  }

  // Report unmatched tokens early
  if (unmatched.length > 0) {
    return { success: false, error: `Unknown: "${unmatched.join(', ')}". Use a known account, category, or income source.` };
  }

  // If no category/credit source found from prefix, check first word of description
  let description = suffixPart;
  if (!categoryName && !creditSourceName && description) {
    const descTokens = description.split(/\s+/);
    const catFromDesc = matchToken(descTokens[0], ctx.categories);
    const creditFromDesc = matchToken(descTokens[0], ctx.creditSources);
    if (catFromDesc) {
      categoryName = catFromDesc;
      description = descTokens.slice(1).join(' ');
    } else if (creditFromDesc) {
      creditSourceName = creditFromDesc;
      description = descTokens.slice(1).join(' ');
    }
  }

  const resolvedAccount = accountName || ctx.defaultAccount || ctx.accounts[0] || '';

  if (creditSourceName) {
    return { success: true, type: 'income', accountName: resolvedAccount, creditSourceName, amount, description };
  }

  if (categoryName) {
    return { success: true, type: 'expense', accountName: resolvedAccount, categoryName, amount, description };
  }

  // Fallback to Unaccounted category
  const unaccounted = ctx.categories.find(c => c.toLowerCase() === 'unaccounted') || ctx.categories[0];
  if (unaccounted) {
    return { success: true, type: 'expense', accountName: resolvedAccount, categoryName: unaccounted, amount, description };
  }

  return { success: false, error: 'Could not determine transaction type. Format: [account] {category|source} {amount} [description]' };
}
