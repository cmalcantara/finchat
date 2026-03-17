import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import BottomNav from '@/components/layout/BottomNav';

const geist = Geist({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FinChat',
  description: 'Personal finance tracker',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-black">
      <body className={`${geist.className} bg-black min-h-screen`}>
        <main className="max-w-lg mx-auto min-h-screen bg-black relative flex flex-col">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
