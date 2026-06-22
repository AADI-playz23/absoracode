interface ProblemHeaderProps {
  languageName: string;
  difficulty: 'easy' | 'medium' | 'hard';
  problemIndex: number;
  type: 'mcq' | 'code';
}

const difficultyConfig = {
  easy:   { label: 'Easy',   className: 'bg-accent-green/20 text-accent-green border-accent-green/30' },
  medium: { label: 'Medium', className: 'bg-accent-amber/20 text-accent-amber border-accent-amber/30' },
  hard:   { label: 'Hard',   className: 'bg-accent-red/20   text-accent-red   border-accent-red/30'   },
};

const typeConfig = {
  mcq:  { label: 'Multiple Choice', icon: '◉' },
  code: { label: 'Code Challenge',  icon: '</>' },
};

export default function ProblemHeader({
  languageName,
  difficulty,
  problemIndex,
  type,
}: ProblemHeaderProps) {
  const diff = difficultyConfig[difficulty];
  const kind = typeConfig[type];

  return (
    <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-white/10">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-white/50 text-sm font-mono">#{problemIndex + 1}</span>
        <span className="text-white font-semibold">{languageName}</span>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${diff.className}`}>
          {diff.label}
        </span>
        <span className="text-xs text-white/40 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
          {kind.icon} {kind.label}
        </span>
      </div>

      {/* DevBox external link — static, opens in new tab */}
      <a
        href="https://absoradevbox.vercel.app/devbox_login.html"
        target="_blank"
        rel="noopener noreferrer"
        className="
          flex items-center gap-1.5 text-sm font-medium
          text-brand-400 hover:text-brand-300
          border border-brand-500/30 hover:border-brand-400/50
          bg-brand-500/10 hover:bg-brand-500/20
          px-3 py-1.5 rounded-lg transition-all duration-200
        "
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
        Open DevBox →
      </a>
    </div>
  );
}
