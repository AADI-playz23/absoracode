'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import MasteryCard   from '@/components/dashboard/MasteryCard';
import ProgressChart from '@/components/dashboard/ProgressChart';

interface ProgressRow {
  language_id:    string;
  language_name:  string;
  is_builtin:     number;
  solved_count:   number;
  attempted_count: number;
  mastery_score:  number;
  last_active:    string;
}

export default function DashboardPage() {
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  useEffect(() => {
    fetch('/api/progress')
      .then((r) => r.json())
      .then((d) => { setProgress(d.progress ?? []); })
      .catch(() => setError('Failed to load progress.'))
      .finally(() => setLoading(false));
  }, []);

  const totalSolved   = progress.reduce((a, p) => a + p.solved_count, 0);
  const totalAttempted = progress.reduce((a, p) => a + p.attempted_count, 0);
  const avgMastery    = progress.length > 0
    ? Math.round(progress.reduce((a, p) => a + p.mastery_score, 0) / progress.length * 100)
    : 0;

  return (
    <div className="page-container section-padding">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            Your <span className="gradient-text">Dashboard</span>
          </h1>
          <p className="text-white/50">Track your mastery across all languages</p>
        </div>
        <a
          href="https://absoradevbox.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand-500/20 bg-brand-500/5 hover:bg-brand-500/10 text-brand-400 hover:text-brand-300 font-medium text-sm self-start sm:self-auto transition-all duration-200"
        >
          💻 Open DevBox ↗
        </a>
      </div>

      {/* Stats bar */}
      {!loading && progress.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Problems Solved',    value: totalSolved,    icon: '✅' },
            { label: 'Total Attempts',     value: totalAttempted, icon: '🎯' },
            { label: 'Avg Mastery',        value: `${avgMastery}%`, icon: '⭐' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-white/10 bg-surface-800/60 p-4 text-center">
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-xs text-white/40 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-40 rounded-2xl" />)}
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <p className="text-accent-red mb-4">{error}</p>
          <Link href="/login" className="text-brand-400 hover:underline">Sign in again</Link>
        </div>
      ) : progress.length === 0 ? (
        /* Empty state */
        <div className="text-center py-20 rounded-2xl border border-dashed border-white/15">
          <div className="text-5xl mb-4">🚀</div>
          <h2 className="text-xl font-semibold mb-2">No progress yet</h2>
          <p className="text-white/40 mb-6 max-w-sm mx-auto">
            Solve your first problem to start tracking your mastery score.
          </p>
          <Link
            href="/languages"
            id="btn-start-learning"
            className="inline-flex px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold transition-all"
          >
            Start Learning →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Mastery cards */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-4">
              Languages
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {progress.map((p) => (
                <MasteryCard
                  key={p.language_id}
                  languageId={p.language_id}
                  languageName={p.language_name}
                  isBuiltin={p.is_builtin === 1}
                  solvedCount={p.solved_count}
                  attemptedCount={p.attempted_count}
                  masteryScore={p.mastery_score}
                  lastActive={p.last_active}
                />
              ))}
            </div>
          </section>

          {/* Chart */}
          <ProgressChart
            data={progress.map((p) => ({
              languageName: p.language_name,
              masteryScore: p.mastery_score,
              solvedCount:  p.solved_count,
            }))}
          />

          {/* CTA */}
          <div className="text-center">
            <Link
              href="/languages"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/15 hover:border-brand-500/40 text-white/70 hover:text-white font-medium transition-all"
            >
              + Explore more languages
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
