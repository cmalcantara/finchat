'use client';
import { useState, useEffect } from 'react';
import CategoryManager from '@/components/settings/CategoryManager';
import BudgetLimitForm from '@/components/settings/BudgetLimitForm';
import GSheetConfig from '@/components/settings/GSheetConfig';

interface Category { id: number; name: string; icon: string; color: string; }
interface Account { id: number; name: string; currency: string; initial_balance: number; is_default: number; }
interface CreditSource { id: number; name: string; }
interface Settings {
  gsheet_apps_script_url: string;
  gsheet_secret: string;
  gsheet_enabled: string;
  currency_symbol: string;
  total_monthly_budget: string;
}

export default function SettingsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [creditSources, setCreditSources] = useState<CreditSource[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [currencySymbol, setCurrencySymbol] = useState('₱');
  const [totalBudget, setTotalBudget] = useState('');
  const [generalSaved, setGeneralSaved] = useState(false);
  const currentMonth = new Date().toISOString().slice(0, 7);

  // New account form
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountCurrency, setNewAccountCurrency] = useState('PHP');
  const [newAccountBalance, setNewAccountBalance] = useState('');

  // New credit source form
  const [newCreditSource, setNewCreditSource] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    await Promise.all([loadCategories(), loadAccounts(), loadCreditSources(), loadSettings()]);
  }

  async function loadCategories() {
    const cats = await fetch('/api/categories').then(r => r.json());
    setCategories(cats);
  }
  async function loadAccounts() {
    const accs = await fetch('/api/accounts').then(r => r.json());
    setAccounts(accs);
  }
  async function loadCreditSources() {
    const srcs = await fetch('/api/credit-sources').then(r => r.json());
    setCreditSources(srcs);
  }
  async function loadSettings() {
    const s = await fetch('/api/settings').then(r => r.json());
    setSettings(s);
    setCurrencySymbol(s.currency_symbol || '₱');
    setTotalBudget(s.total_monthly_budget || '');
  }

  async function handleAddCategory(name: string, icon: string, color: string) {
    const res = await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, icon, color }) });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed'); }
    await loadCategories();
  }
  async function handleDeleteCategory(id: number) {
    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    if (!res.ok) { const err = await res.json(); alert(err.error || 'Failed'); return; }
    await loadCategories();
  }
  async function handleSetLimit(categoryId: number, yearMonth: string, amount: number) {
    const res = await fetch(`/api/budgets/${categoryId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ year_month: yearMonth, amount }) });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to set limit'); }
  }
  async function handleSaveGSheet(url: string, secret: string, enabled: boolean) {
    await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gsheet_apps_script_url: url, gsheet_secret: secret, gsheet_enabled: String(enabled) }) });
    await loadSettings();
  }
  async function handleSyncNow() {
    const res = await fetch('/api/gsheet-sync', { method: 'POST' });
    return res.json();
  }
  async function handleResetSync() {
    const res = await fetch('/api/gsheet-sync', { method: 'PUT' });
    return res.json();
  }
  async function handleSaveGeneral() {
    await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currency_symbol: currencySymbol, total_monthly_budget: totalBudget }) });
    setGeneralSaved(true);
    setTimeout(() => setGeneralSaved(false), 2000);
  }
  async function handleAddAccount() {
    if (!newAccountName.trim()) return;
    const res = await fetch('/api/accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newAccountName.trim(), currency: newAccountCurrency, initial_balance: parseFloat(newAccountBalance) || 0 }) });
    if (!res.ok) { const err = await res.json(); alert(err.error || 'Failed'); return; }
    setNewAccountName(''); setNewAccountBalance('');
    await loadAccounts();
  }
  async function handleDeleteAccount(id: number) {
    const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
    if (!res.ok) { const err = await res.json(); alert(err.error || 'Failed'); return; }
    await loadAccounts();
  }
  async function handleSetDefault(id: number) {
    await fetch(`/api/accounts/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_default: 1 }) });
    // Unset others
    for (const acc of accounts.filter(a => a.id !== id && a.is_default === 1)) {
      await fetch(`/api/accounts/${acc.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_default: 0 }) });
    }
    await loadAccounts();
  }
  async function handleAddCreditSource() {
    if (!newCreditSource.trim()) return;
    const res = await fetch('/api/credit-sources', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newCreditSource.trim() }) });
    if (!res.ok) { const err = await res.json(); alert(err.error || 'Failed'); return; }
    setNewCreditSource('');
    await loadCreditSources();
  }
  async function handleDeleteCreditSource(id: number) {
    const res = await fetch(`/api/credit-sources/${id}`, { method: 'DELETE' });
    if (!res.ok) { const err = await res.json(); alert(err.error || 'Failed'); return; }
    await loadCreditSources();
  }

  return (
    <div className="flex flex-col h-screen pb-16 bg-black">
      <header className="px-4 py-3 border-b border-[#1E1E1E] bg-black flex-shrink-0">
        <h1 className="text-base font-semibold tracking-wide text-white">Settings</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 bg-black">

        {/* General */}
        <div>
          <h2 className="text-[#444] text-xs uppercase tracking-wider mb-3">General</h2>
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                className="w-16 bg-[#141414] border border-[#1E1E1E] text-white placeholder:text-[#444] rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:border-[#00C853]"
                placeholder="₱" value={currencySymbol} onChange={e => setCurrencySymbol(e.target.value)} maxLength={3}
              />
              <input
                type="number"
                className="flex-1 bg-[#141414] border border-[#1E1E1E] text-white placeholder:text-[#444] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00C853]"
                placeholder="Total monthly budget (0 = no limit)" value={totalBudget} onChange={e => setTotalBudget(e.target.value)} min="0"
              />
            </div>
            <button onClick={handleSaveGeneral} className="w-full bg-[#00C853] text-black font-semibold rounded-lg px-3 py-2 text-sm hover:bg-[#00E676] transition-colors">
              {generalSaved ? 'Saved' : 'Save General Settings'}
            </button>
          </div>
        </div>

        {/* Accounts */}
        <div>
          <h2 className="text-[#444] text-xs uppercase tracking-wider mb-3">Accounts</h2>
          <div className="space-y-2 mb-3">
            {accounts.map(acc => (
              <div key={acc.id} className="flex items-center gap-2 bg-[#0D0D0D] border border-[#1E1E1E] rounded-lg px-3 py-2">
                <span className="text-sm text-white flex-1">
                  {acc.name}
                  <span className="text-xs text-[#555] ml-1">({acc.currency})</span>
                  {acc.is_default === 1 && <span className="ml-1 text-xs bg-[#00C853]/10 text-[#00C853] rounded px-1">default</span>}
                </span>
                <button onClick={() => handleSetDefault(acc.id)} className="text-xs text-[#00C853] hover:text-[#00E676]">*</button>
                <button onClick={() => handleDeleteAccount(acc.id)} className="text-xs text-[#FF5252] hover:text-[#FF7070]">✕</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className="flex-1 bg-[#141414] border border-[#1E1E1E] text-white placeholder:text-[#444] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00C853]"
              placeholder="Account name" value={newAccountName} onChange={e => setNewAccountName(e.target.value)}
            />
            <select
              className="bg-[#141414] border border-[#1E1E1E] text-white rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-[#00C853] [color-scheme:dark]"
              value={newAccountCurrency} onChange={e => setNewAccountCurrency(e.target.value)}
            >
              <option>PHP</option><option>USD</option><option>EUR</option><option>SGD</option>
            </select>
            <input
              type="number"
              className="w-24 bg-[#141414] border border-[#1E1E1E] text-white placeholder:text-[#444] rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-[#00C853]"
              placeholder="Balance" value={newAccountBalance} onChange={e => setNewAccountBalance(e.target.value)}
            />
            <button onClick={handleAddAccount} className="bg-[#00C853] text-black font-semibold rounded-lg px-3 py-2 text-sm hover:bg-[#00E676] transition-colors">Add</button>
          </div>
        </div>

        {/* Credit Sources */}
        <div>
          <h2 className="text-[#444] text-xs uppercase tracking-wider mb-3">Income Sources</h2>
          <div className="space-y-1 mb-3">
            {creditSources.map(s => (
              <div key={s.id} className="flex items-center gap-2 bg-[#0D0D0D] border border-[#1E1E1E] rounded-lg px-3 py-2">
                <span className="flex-1 text-sm text-white">{s.name}</span>
                <button onClick={() => handleDeleteCreditSource(s.id)} className="text-xs text-[#FF5252] hover:text-[#FF7070]">✕</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className="flex-1 bg-[#141414] border border-[#1E1E1E] text-white placeholder:text-[#444] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00C853]"
              placeholder="Source name" value={newCreditSource} onChange={e => setNewCreditSource(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddCreditSource(); }}
            />
            <button onClick={handleAddCreditSource} className="bg-[#00C853] text-black font-semibold rounded-lg px-3 py-2 text-sm hover:bg-[#00E676] transition-colors">Add</button>
          </div>
        </div>

        <CategoryManager categories={categories} onAdd={handleAddCategory} onDelete={handleDeleteCategory} />

        <BudgetLimitForm categories={categories} currentMonth={currentMonth} onSetLimit={handleSetLimit} />

        {settings && (
          <GSheetConfig
            initialUrl={settings.gsheet_apps_script_url}
            initialSecret={settings.gsheet_secret}
            initialEnabled={settings.gsheet_enabled === 'true'}
            onSave={handleSaveGSheet}
            onSyncNow={handleSyncNow}
            onReset={handleResetSync}
          />
        )}
      </div>
    </div>
  );
}
