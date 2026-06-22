'use client';
import Button from '@/components/ui/Button';

interface FeedbackResult {
  is_correct: boolean;
  feedback: string;
}

interface NextButtonProps {
  onSubmit: () => void;
  onNext: () => void;
  loading: boolean;
  result: FeedbackResult | null;
  hasAnswer: boolean;
  hasNextQuestion: boolean;
}

export default function NextButton({
  onSubmit,
  onNext,
  loading,
  result,
  hasAnswer,
  hasNextQuestion,
}: NextButtonProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Feedback panel */}
      {result && (
        <div
          className={`
            rounded-xl border p-4 animate-slide-up
            ${result.is_correct
              ? 'bg-accent-green/10 border-accent-green/30'
              : 'bg-accent-red/10   border-accent-red/30'}
          `}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">
              {result.is_correct ? '🎉' : '💡'}
            </span>
            <div>
              <p className={`font-semibold text-sm mb-1 ${result.is_correct ? 'text-accent-green' : 'text-accent-red'}`}>
                {result.is_correct ? 'Correct!' : 'Not quite'}
              </p>
              <pre className="text-white/70 text-xs leading-relaxed whitespace-pre-wrap font-sans">
                {result.feedback}
              </pre>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 justify-end">
        {!result ? (
          <Button
            id="btn-submit"
            onClick={onSubmit}
            loading={loading}
            disabled={!hasAnswer}
            size="lg"
          >
            Submit Answer
          </Button>
        ) : (
          <Button
            id="btn-next"
            onClick={onNext}
            variant={hasNextQuestion ? 'primary' : 'secondary'}
            size="lg"
          >
            {hasNextQuestion ? 'Next Question →' : '🏁 All Done!'}
          </Button>
        )}
      </div>
    </div>
  );
}
