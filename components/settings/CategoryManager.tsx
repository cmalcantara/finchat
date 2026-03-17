'use client';
import { useState } from 'react';

interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
}

interface Props {
  categories: Category[];
  onAdd: (name: string, icon: string, color: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export default function CategoryManager({ categories, onAdd, onDelete }: Props) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [color, setColor] = useState('#888888');
  const [error, setError] = useState('');

  async function handleAdd() {
    if (!name.trim()) return;
    setError('');
    try {
      await onAdd(name.trim(), icon, color);
      setName('');
      setIcon('');
      setColor('#888888');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div>
      <h2 className="text-[#444] text-xs uppercase tracking-wider mb-3">Categories</h2>

      <div className="flex gap-2 mb-3">
        <input
          className="flex-1 bg-[#141414] border border-[#1E1E1E] text-white placeholder:text-[#444] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00C853]"
          placeholder="Category name"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <input
          className="w-14 bg-[#141414] border border-[#1E1E1E] text-white placeholder:text-[#444] rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:border-[#00C853]"
          placeholder="icon"
          value={icon}
          onChange={e => setIcon(e.target.value)}
          maxLength={2}
        />
        <input
          type="color"
          className="w-10 h-10 rounded-lg border border-[#1E1E1E] cursor-pointer bg-[#141414]"
          value={color}
          onChange={e => setColor(e.target.value)}
        />
        <button
          onClick={handleAdd}
          className="bg-[#00C853] text-black font-semibold rounded-lg px-3 py-2 text-sm hover:bg-[#00E676] transition-colors"
        >
          Add
        </button>
      </div>
      {error && <p className="text-xs text-[#FF5252] mb-2">{error}</p>}

      <div className="space-y-2">
        {categories.map(cat => (
          <div key={cat.id} className="flex items-center gap-2 bg-[#0D0D0D] border border-[#1E1E1E] rounded-lg px-3 py-2">
            <span className="text-sm">{cat.icon}</span>
            <span className="flex-1 text-sm text-white">{cat.name}</span>
            <div className="w-4 h-4 rounded-full border border-[#1E1E1E]" style={{ backgroundColor: cat.color }} />
            <button
              onClick={() => onDelete(cat.id)}
              className="text-xs text-[#FF5252] hover:text-[#FF7070] transition-colors"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
