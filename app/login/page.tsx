'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.replace('/chat');
      } else {
        const data = await res.json();
        setError(data.error || 'Invalid password');
      }
    } catch {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black px-6">
      <div className="w-full max-w-xs">
        <h1 className="text-white text-xl font-semibold tracking-wide mb-8 text-center">FinChat</h1>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            className="w-full bg-[#141414] border border-[#1E1E1E] text-white placeholder:text-[#444] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#00C853]"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={loading}
            autoFocus
          />
          {error && <p className="text-[#FF5252] text-xs px-1">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-[#00C853] text-black font-semibold rounded-xl py-3 text-sm hover:bg-[#00E676] disabled:opacity-30 transition-colors"
          >
            {loading ? '...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
