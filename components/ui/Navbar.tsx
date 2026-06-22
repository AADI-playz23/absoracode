'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Navbar() {
  const router  = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
    setLoading(false);
  }

  return (
    <nav className="relative z-50 border-b border-white/10 bg-surface-900/80 backdrop-blur-md sticky top-0">
      <div className="page-container flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-cyan flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-brand-500/30 group-hover:shadow-brand-500/50 transition-shadow">
            A
          </div>
          <span className="font-bold text-lg tracking-tight">
            Absora<span className="gradient-text">Code</span>
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-2">
          <Link
            href="/languages"
            className="px-4 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-all"
          >
            Languages
          </Link>
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-all"
          >
            Dashboard
          </Link>
          <button
            id="btn-logout"
            onClick={handleLogout}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white/50 hover:text-white/80 hover:bg-white/5 transition-all disabled:opacity-50"
          >
            {loading ? 'Logging out…' : 'Logout'}
          </button>
        </div>
      </div>
    </nav>
  );
}
