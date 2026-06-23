import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AbsoraCode — Learn Programming from Scratch',
  description: 'Solve beginner-friendly MCQ and code problems in HTML/CSS, JavaScript, Python, or any language. Track your mastery score and grow one question at a time.',
};

const features = [
  {
    icon: '🎯',
    title: 'Structured Learning',
    desc: 'Problems sorted by difficulty — easy, medium, hard — so you always make progress.',
  },
  {
    icon: '🧠',
    title: 'MCQ + Code Challenges',
    desc: 'Test concepts with multiple choice and reinforce them by writing real code.',
  },
  {
    icon: '📊',
    title: 'Mastery Tracking',
    desc: 'Per-language mastery scores show exactly where you stand and where to improve.',
  },
  {
    icon: '✨',
    title: 'Any Language via AI',
    desc: 'Pick any programming language — Gemini generates 10 fresh problems on demand.',
  },
];

const builtinLanguages = [
  { name: 'HTML & CSS', icon: '🎨', color: 'from-orange-500 to-pink-500',   id: 'lang-html-css'  },
  { name: 'JavaScript', icon: '⚡', color: 'from-yellow-400 to-amber-500',  id: 'lang-javascript' },
  { name: 'Python',     icon: '🐍', color: 'from-blue-500 to-cyan-500',     id: 'lang-python'    },
  { name: 'C++',        icon: '⚙️', color: 'from-blue-600 to-indigo-600',   id: 'lang-cpp'       },
  { name: 'Java',       icon: '☕', color: 'from-red-500 to-orange-500',    id: 'lang-java'      },
  { name: 'Rust',       icon: '🦀', color: 'from-amber-600 to-red-700',    id: 'lang-rust'      },
  { name: 'Golang',     icon: '🐹', color: 'from-cyan-400 to-blue-500',    id: 'lang-golang'    },
  { name: 'JumboLang',  icon: '🐘', color: 'from-purple-500 to-indigo-500', id: 'lang-jumbolang' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="page-container section-padding text-center">
        <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/30 rounded-full px-4 py-1.5 text-brand-400 text-sm font-medium mb-6 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse-slow" />
          Built for absolute beginners
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 animate-slide-up text-balance">
          Learn to Code,{' '}
          <span className="gradient-text">One Question at a Time</span>
        </h1>

        <p className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto mb-10 animate-slide-up text-balance">
          Pick a language, solve bite-sized MCQ and code challenges, track your mastery — no
          experience required. Powered by AI for unlimited practice.
        </p>

        <div className="flex flex-wrap gap-4 justify-center animate-slide-up">
          <Link
            href="/signup"
            id="cta-get-started"
            className="px-8 py-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-lg
                       shadow-xl shadow-brand-500/30 hover:shadow-brand-500/50
                       transition-all duration-200 active:scale-[0.98]"
          >
            Get Started Free →
          </Link>
          <Link
            href="/login"
            id="cta-login"
            className="px-8 py-4 rounded-xl border border-white/15 hover:border-white/30 text-white/80
                       hover:text-white font-semibold text-lg bg-white/5 hover:bg-white/10
                       transition-all duration-200 active:scale-[0.98]"
          >
            Sign In
          </Link>
        </div>
      </section>

      {/* Built-in languages */}
      <section className="page-container pb-16">
        <h2 className="text-center text-sm font-semibold text-white/40 uppercase tracking-widest mb-8">
          Start with a built-in language
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {builtinLanguages.map((lang) => (
            <Link
              key={lang.id}
              href={`/problem/${lang.id}`}
              className="group flex flex-col items-center gap-3 p-6 rounded-2xl border border-white/10
                         bg-surface-800/60 hover:border-white/20 hover:bg-surface-700/60
                         transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${lang.color} flex items-center justify-center text-2xl shadow-lg`}>
                {lang.icon}
              </div>
              <span className="font-semibold text-white group-hover:text-brand-300 transition-colors">
                {lang.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="page-container pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-white/10 bg-surface-800/60 p-6
                         hover:border-brand-500/30 hover:bg-surface-700/60
                         transition-all duration-300 group"
            >
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="font-semibold text-white mb-2 group-hover:text-brand-300 transition-colors">
                {f.title}
              </h3>
              <p className="text-sm text-white/50 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
