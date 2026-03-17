'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/chat', label: 'Chat' },
  { href: '/budgets', label: 'Budget' },
  { href: '/settings', label: 'Settings' },
];

export default function BottomNav() {
  const pathname = usePathname();
  if (pathname === '/login') return null;
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center bg-black border-t border-[#1E1E1E]" style={{ height: '4rem' }}>
      <div className="w-full max-w-lg flex">
        {tabs.map(tab => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 text-xs font-medium tracking-widest uppercase transition-colors ${
                active ? 'text-[#00C853]' : 'text-[#444] hover:text-[#777]'
              }`}
            >
              {active && <div className="w-5 h-px bg-[#00C853] rounded-full" />}
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
