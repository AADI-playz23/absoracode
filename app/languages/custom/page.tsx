'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

const SUGGESTIONS = ['Rust', 'Go', 'Swift', 'TypeScript', 'Kotlin', 'Ruby', 'C++', 'SQL', 'Bash', 'Lua'];

export default function CustomLanguagePage() {
  const router  = useRouter();
  const [name,    setName]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [step,    setStep]    = useState<'input' | 'generating'>('input');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError('');
    setLoading(true);
    setStep('generating');

    try {
      // 1. Upsert language
      const langRes  = await fetch('/api/languages', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: name.trim() }),
      });
      const langData = await langRes.json();
      if (!langRes.ok) { setError(langData.error ?? 'Failed to create language'); setStep('input'); return; }

      const languageId = langData.language.id;

      // 2. Generate first batch
      const batchRes  = await fetch('/api/generate-batch', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ languageId, batchNumber: 1 }),
      });
      const batchData = await batchRes.json();
      if (!batchRes.ok) { setError(batchData.error ?? 'Failed to generate questions'); setStep('input'); return; }

      // 3. Redirect to problem page
      router.push(`/problem/${languageId}`);
    } catch {
      setError('Network error. Please try again.');
      setStep('input');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-container section-padding">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">✨</div>
          <h1 className="text-3xl font-bold mb-3">
            Learn <span className="gradient-text">Any Language</span>
          </h1>
          <p className="text-white/50">
            Type any programming language. Gemini will generate 10 beginner-friendly problems just for you.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-surface-800/80 p-6 backdrop-blur-sm">
          {step === 'generating' ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-12 h-12 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
              <p className="text-white/70 font-medium">Generating your first 10 questions…</p>
              <p className="text-white/40 text-sm">This takes about 5–10 seconds</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                id="custom-language-input"
                label="Language Name"
                placeholder='e.g. Rust, Go, Swift, SQL…'
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="off"
              />

              {/* Suggestions */}
              <div>
                <p className="text-xs text-white/30 mb-2">Popular choices:</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setName(s)}
                      className="px-3 py-1 rounded-full text-xs font-medium border border-white/10
                                 hover:border-brand-500/50 hover:text-brand-300 text-white/50
                                 bg-white/5 hover:bg-brand-500/10 transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="rounded-xl bg-accent-red/10 border border-accent-red/30 px-4 py-3 text-accent-red text-sm">
                  {error}
                </div>
              )}

              <Button id="btn-generate" type="submit" loading={loading} size="lg" className="w-full">
                Generate Problems →
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
