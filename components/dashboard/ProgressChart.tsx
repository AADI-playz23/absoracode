interface ProgressChartProps {
  data: Array<{
    languageName: string;
    masteryScore: number; // 0–1
    solvedCount: number;
  }>;
}

const COLORS = [
  'bg-brand-500',
  'bg-accent-purple',
  'bg-accent-cyan',
  'bg-accent-green',
  'bg-accent-amber',
];

export default function ProgressChart({ data }: ProgressChartProps) {
  if (data.length === 0) return null;

  const max = Math.max(...data.map((d) => d.solvedCount), 1);

  return (
    <div className="rounded-2xl border border-white/10 bg-surface-800/80 p-5">
      <h3 className="text-sm font-semibold text-white/70 mb-4">Problems Solved per Language</h3>
      <div className="flex flex-col gap-3">
        {data.map((item, i) => (
          <div key={item.languageName} className="flex items-center gap-3">
            <span className="text-xs text-white/50 w-24 truncate">{item.languageName}</span>
            <div className="flex-1 h-6 bg-white/5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full flex items-center pl-3 transition-all duration-700 ${COLORS[i % COLORS.length]}`}
                style={{ width: `${Math.max((item.solvedCount / max) * 100, 4)}%` }}
              >
                <span className="text-xs font-bold text-white">{item.solvedCount}</span>
              </div>
            </div>
            <span className="text-xs text-white/40 w-10 text-right">
              {Math.round(item.masteryScore * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
