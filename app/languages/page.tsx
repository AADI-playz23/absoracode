import Link from 'next/link';
import type { Metadata } from 'next';
import type { Language } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Languages — AbsoraCode',
  description: 'Choose a programming language to practice. Built-in tracks for HTML/CSS, JavaScript, and Python. Or type any language to get AI-generated problems.',
};

const LANG_META: Record<string, { icon: string; color: string; desc: string }> = {
  'lang-html-css':   { icon: '🎨', color: 'from-orange-500 to-pink-500',  desc: 'Style the web with HTML structure and CSS design' },
  'lang-javascript': { icon: '⚡', color: 'from-yellow-400 to-amber-500', desc: 'The language of the web — interactive and powerful' },
  'lang-python':     { icon: '🐍', color: 'from-blue-500 to-cyan-500',    desc: 'Clean, readable syntax loved by beginners and pros' },
};

async function getLanguages(): Promise<Language[]> {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const res  = await fetch(`${base}/api/languages?builtin=1`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data.languages ?? [];
  } catch {
    return [];
  }
}

export default async function LanguagesPage() {
  const languages = await getLanguages();

  return (
    <div className="page-container section-padding">
      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">
          Choose a <span className="gradient-text">Language</span>
        </h1>
        <p className="text-white/50">
          Start with a curated track, or generate problems for any language you want to learn.
        </p>
      </div>

      {/* Built-in languages */}
      <section className="mb-12">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-4">
          Built-in Tracks
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {languages.length === 0 ? (
            // Skeleton
            [1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-40 rounded-2xl" />
            ))
          ) : (
            languages.map((lang) => {
              const meta = LANG_META[lang.id] ?? { icon: '💡', color: 'from-brand-500 to-accent-cyan', desc: '' };
              return (
                <Link
                  key={lang.id}
                  href={`/problem/${lang.id}`}
                  id={`lang-card-${lang.id}`}
                  className="group flex flex-col p-6 rounded-2xl border border-white/10
                             bg-surface-800/60 hover:border-white/20 hover:bg-surface-700/60
                             transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
                >
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${meta.color} flex items-center justify-center text-2xl shadow-lg mb-4`}>
                    {meta.icon}
                  </div>
                  <h3 className="font-semibold text-white group-hover:text-brand-300 transition-colors mb-1">
                    {lang.name}
                  </h3>
                  <p className="text-sm text-white/40 flex-1">{meta.desc}</p>
                  <div className="mt-4 flex items-center gap-1 text-brand-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Start learning <span>→</span>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </section>

      {/* Custom language */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-4">
          Any Language, AI-Powered
        </h2>
        <Link
          href="/languages/custom"
          id="lang-card-custom"
          className="group flex items-center gap-5 p-6 rounded-2xl border border-dashed border-accent-purple/40
                     bg-accent-purple/5 hover:border-accent-purple/70 hover:bg-accent-purple/10
                     transition-all duration-300"
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-purple to-brand-500 flex items-center justify-center text-2xl shadow-lg flex-shrink-0">
            ✨
          </div>
          <div>
            <h3 className="font-semibold text-white group-hover:text-accent-purple transition-colors mb-1">
              Custom Language
            </h3>
            <p className="text-sm text-white/40">
              Type any language — Rust, Go, Swift, SQL, anything. Gemini generates 10 beginner problems on demand.
            </p>
          </div>
          <div className="ml-auto text-accent-purple text-xl opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            →
          </div>
        </Link>
      </section>
    </div>
  );
}
