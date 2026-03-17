'use client';

interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
}

interface Props {
  categories: Category[];
  onSelect: (categoryName: string) => void;
}

export default function CategoryPicker({ categories, onSelect }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-2 bg-black border-t border-[#1E1E1E] scrollbar-none">
      {categories.map(cat => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.name + ' ')}
          className="flex-shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium bg-[#0D0D0D] border border-[#1E1E1E] text-[#888] hover:border-[#00C853] hover:text-[#00C853] transition-colors whitespace-nowrap"
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}
