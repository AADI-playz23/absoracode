'use client';

interface LivePreviewProps {
  code: string;
}

export default function LivePreview({ code }: LivePreviewProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-accent-red/70" />
          <div className="w-3 h-3 rounded-full bg-accent-amber/70" />
          <div className="w-3 h-3 rounded-full bg-accent-green/70" />
        </div>
        <span className="text-xs text-white/40 font-mono">Live Preview</span>
      </div>
      <div className="rounded-xl border border-white/10 overflow-hidden bg-white shadow-xl">
        <iframe
          title="Live HTML/CSS Preview"
          srcDoc={code}
          sandbox="allow-scripts"
          className="w-full"
          style={{ height: '260px', border: 'none' }}
        />
      </div>
    </div>
  );
}
