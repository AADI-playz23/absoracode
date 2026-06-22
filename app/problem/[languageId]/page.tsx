'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams }   from 'next/navigation';
import ProblemHeader   from '@/components/problem/ProblemHeader';
import McqOptions      from '@/components/problem/McqOptions';
import NextButton      from '@/components/problem/NextButton';
import CodeEditor      from '@/components/editor/CodeEditor';
import LivePreview     from '@/components/editor/LivePreview';
import type { Problem, GeneratedQuestion } from '@/lib/types';

type BuiltinQ  = Problem & { isCustomLanguage: false };
type CustomQ   = GeneratedQuestion & { isCustomLanguage: true; customQuestionRef: string };
type AnyQuestion = BuiltinQ | CustomQ;

export default function ProblemPage() {
  const params     = useParams();
  const languageId = params.languageId as string;

  const [question,     setQuestion]     = useState<AnyQuestion | null>(null);
  const [languageName, setLanguageName] = useState('');
  const [isBuiltin,    setIsBuiltin]    = useState(true);
  const [problemIndex, setProblemIndex] = useState(0);
  const [answer,       setAnswer]       = useState('');
  const [loading,      setLoading]      = useState(true);
  const [submitting,   setSubmitting]   = useState(false);
  const [result,       setResult]       = useState<{ is_correct: boolean; feedback: string } | null>(null);
  const [nextQuestion, setNextQuestion] = useState<AnyQuestion | null>(null);
  const [error,        setError]        = useState('');
  const [allDone,      setAllDone]      = useState(false);

  const loadFirstProblem = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Get language metadata
      const langRes  = await fetch('/api/languages');
      const langData = await langRes.json();
      const lang     = (langData.languages ?? []).find((l: { id: string; name: string; is_builtin: number }) => l.id === languageId);
      setLanguageName(lang?.name ?? languageId);
      const builtin = !!(lang?.is_builtin);
      setIsBuiltin(builtin);

      if (builtin) {
        // Fetch next unseen problem from the server
        const res  = await fetch(`/api/problem-next?languageId=${languageId}`);
        const data = await res.json();
        if (!res.ok) { setError(data.error ?? 'Failed to load'); return; }
        if (!data.problem) { setAllDone(true); return; }
        setQuestion({ ...data.problem, isCustomLanguage: false } as BuiltinQ);
        setAnswer(data.problem.starter_code ?? '');

        // Get current attempt count for index display
        const pRes  = await fetch(`/api/progress?languageId=${languageId}`);
        const pData = await pRes.json();
        setProblemIndex(pData.progress?.attempted_count ?? 0);
      } else {
        // Custom language: ensure batch 1 exists then load question 0
        const batchRes  = await fetch('/api/generate-batch', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ languageId, batchNumber: 1 }),
        });
        const batchData = await batchRes.json();
        if (!batchRes.ok) { setError(batchData.error ?? 'Failed to generate questions'); return; }

        const questions: GeneratedQuestion[] = JSON.parse(batchData.bank?.questions ?? '[]');
        const pRes  = await fetch(`/api/progress?languageId=${languageId}`);
        const pData = await pRes.json();
        const pos   = pData.progress?.custom_batch_position ?? 0;
        setProblemIndex(pos);

        const batchNum  = Math.floor(pos / 10) + 1;
        const posInBatch = pos % 10;

        if (batchNum === 1) {
          const q = questions[posInBatch];
          if (q) {
            setQuestion({ ...q, isCustomLanguage: true, customQuestionRef: `1:${posInBatch}` });
            setAnswer(q.starter_code ?? '');
          }
        }
      }
    } catch {
      setError('Failed to load problem. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [languageId]);

  useEffect(() => { loadFirstProblem(); }, [loadFirstProblem]);

  async function handleSubmit() {
    if (!question || !answer.trim()) return;
    setSubmitting(true);
    setError('');

    try {
      const body: Record<string, unknown> = { languageId, answer };

      if (question.isCustomLanguage) {
        body.isCustomLanguage  = true;
        body.customQuestionRef = question.customQuestionRef;
      } else {
        body.isCustomLanguage = false;
        body.problemId        = (question as BuiltinQ).id;
      }

      const res  = await fetch('/api/submit', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) { setError(data.error ?? 'Submission failed'); return; }

      setResult(data.result);
      if (data.next_question) {
        setNextQuestion(data.next_question as AnyQuestion);
      } else {
        setAllDone(true);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleNext() {
    if (!nextQuestion) return;
    const nq = nextQuestion as AnyQuestion & { starter_code?: string };
    setQuestion(nextQuestion);
    setAnswer(nq.starter_code ?? '');
    setResult(null);
    setNextQuestion(null);
    setError('');
    setProblemIndex((i) => i + 1);
  }

  // Derived
  const q          = question as (AnyQuestion & { starter_code?: string; has_visual_preview?: number; options?: string[] | string | null }) | null;
  const isCode     = q?.type === 'code';
  const showPreview = isCode && languageId === 'lang-html-css' && (q?.has_visual_preview ?? 0) === 1;
  const options     = q?.options
    ? (typeof q.options === 'string' ? JSON.parse(q.options) as string[] : q.options as string[])
    : null;

  // ── Render ──
  if (loading) {
    return (
      <div className="page-container py-8">
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          <div className="skeleton h-14 rounded-xl" />
          <div className="skeleton h-28 rounded-2xl" />
          <div className="skeleton h-64 rounded-2xl" />
          <div className="skeleton h-12 rounded-xl w-40 ml-auto" />
        </div>
      </div>
    );
  }

  if (allDone && !question) {
    return (
      <div className="page-container section-padding text-center">
        <div className="text-6xl mb-4">🏁</div>
        <h1 className="text-2xl font-bold mb-2">All Done!</h1>
        <p className="text-white/50 mb-6">You&apos;ve completed all available problems for this language.</p>
        <a href="/dashboard" className="inline-flex px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold transition-all">
          View Dashboard →
        </a>
      </div>
    );
  }

  if (!q) {
    return (
      <div className="page-container section-padding text-center">
        <p className="text-accent-red mb-4">{error || 'No problem found.'}</p>
        <button onClick={loadFirstProblem} className="text-brand-400 hover:underline">Retry</button>
      </div>
    );
  }

  return (
    <div className="page-container py-8">
      <div className="flex flex-col gap-6 max-w-3xl mx-auto">
        <ProblemHeader
          languageName={languageName}
          difficulty={q.difficulty ?? 'easy'}
          problemIndex={problemIndex}
          type={q.type ?? 'mcq'}
        />

        {/* Prompt */}
        <div className="rounded-2xl border border-white/10 bg-surface-800/60 p-6">
          <p className="text-white/90 leading-relaxed text-base">{q.prompt}</p>
        </div>

        {/* Answer area */}
        {q.type === 'mcq' && options ? (
          <McqOptions
            options={options}
            selected={answer}
            onSelect={setAnswer}
            disabled={!!result}
            correctAnswer={q.correct_answer ?? undefined}
            showResult={!!result}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <CodeEditor
              language={languageId}
              value={answer}
              onChange={setAnswer}
              height="320px"
            />
            {showPreview && <LivePreview code={answer} />}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-accent-red/10 border border-accent-red/30 px-4 py-3 text-accent-red text-sm">
            {error}
          </div>
        )}

        <NextButton
          onSubmit={handleSubmit}
          onNext={handleNext}
          loading={submitting}
          result={result}
          hasAnswer={!!answer.trim()}
          hasNextQuestion={!!nextQuestion}
        />
      </div>
    </div>
  );
}
