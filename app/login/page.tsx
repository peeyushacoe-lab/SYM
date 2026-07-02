'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed.');
        setLoading(false);
        return;
      }
      router.push(data.redirect);
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="glass rounded-xl shadow-lift px-7 py-8">
          <div className="text-center mb-7">
            <img src="/logo-192.png" alt="SYM" className="w-16 h-16 object-contain mx-auto mb-3" />
            <h1 className="text-[26px] font-semibold tracking-tight text-on-surface">SYM</h1>
            <p className="text-[13px] text-on-surface-variant mt-0.5">Siksha Yogi Management</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-sm text-on-error-container bg-error-container border border-dangerBorder rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <div>
              <label className="label">Username</label>
              <input
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoFocus
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary w-full !py-2.5 !rounded-lg">
              {loading ? 'Signing in...' : 'Sign In'}
              {!loading && <span className="material-symbols-outlined text-[18px]">arrow_forward</span>}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-on-surface-variant mt-6 flex items-center justify-center gap-1.5">
          <span className="material-symbols-outlined text-[16px]">support_agent</span>
          Accounts are created by your institute&apos;s management.
        </p>
      </div>
    </div>
  );
}
