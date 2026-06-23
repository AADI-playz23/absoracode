interface MasteryCardProps {
  languageName: string;
  isBuiltin: boolean;
  solvedCount: number;
  attemptedCount: number;
  masteryScore: number; // 0–1
  lastActive: string;
  languageId: string;
}

const LANGUAGE_ICONS: Record<string, string> = {
  'Python':      '🐍',
  'C++':         '⚙️',
  'Java':        '☕',
  'Rust':        '🦀',
  'Golang':      '🐹',
  'JumboLang':   '🐘',
};

export default function MasteryCard({
  languageName,
  isBuiltin,
  solvedCount,
  attemptedCount,
  masteryScore,
  lastActive,
  languageId,
}: MasteryCardProps) {
  const pct      = isBuiltin ? Math.min(100, solvedCount) : Math.round(masteryScore * 100);
  const icon     = LANGUAGE_ICONS[languageName] ?? '💡';
  const accuracy = attemptedCount > 0 ? Math.round((solvedCount / attemptedCount) * 100) : 0;

  const scoreColor =
    pct >= 70 ? 'text-accent-green' :
    pct >= 40 ? 'text-accent-amber' :
                'text-accent-red';

  const barColor =
    pct >= 70 ? 'bg-accent-green' :
    pct >= 40 ? 'bg-accent-amber' :
                'bg-accent-red';

  return (
    <a
      href={`/problem/${languageId}`}
      className="block group rounded-2xl border border-white/10 bg-surface-800/80 p-5
                 hover:border-brand-500/40 hover:bg-surface-700/80
                 transition-all duration-300 hover:shadow-xl hover:shadow-brand-500/10"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{icon}</span>
          <div>
            <h3 className="font-semibold text-white group-hover:text-brand-300 transition-colors">
              {languageName}
            </h3>
            <span className={`text-xs ${isBuiltin ? 'text-brand-400' : 'text-accent-purple'}`}>
              {isBuiltin ? 'Built-in' : 'Custom'}
            </span>
          </div>
        </div>
        <span className={`text-2xl font-bold font-mono ${scoreColor}`}>
          {pct}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-white/40">
        <span>
          {isBuiltin 
            ? `${solvedCount} / 100 solved · ${accuracy}% accuracy`
            : `${solvedCount} solved / ${attemptedCount} attempted · ${accuracy}% accuracy`
          }
        </span>
        <span>
          {new Date(lastActive).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      </div>
    </a>
  );
}
