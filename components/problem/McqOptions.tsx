'use client';

interface McqOptionsProps {
  options: string[];
  selected: string | null;
  onSelect: (value: string) => void;
  disabled?: boolean;
  correctAnswer?: string | null;
  showResult?: boolean;
}

export default function McqOptions({
  options,
  selected,
  onSelect,
  disabled = false,
  correctAnswer,
  showResult = false,
}: McqOptionsProps) {
  return (
    <div className="flex flex-col gap-3">
      {options.map((option, i) => {
        const isSelected = selected === option;
        const isCorrect  = showResult && option === correctAnswer;
        const isWrong    = showResult && isSelected && option !== correctAnswer;

        let borderClass = 'border-white/10 hover:border-brand-500/50 hover:bg-brand-500/5';
        if (isSelected && !showResult) borderClass = 'border-brand-500 bg-brand-500/10';
        if (isCorrect)                 borderClass = 'border-accent-green bg-accent-green/10';
        if (isWrong)                   borderClass = 'border-accent-red   bg-accent-red/10';

        return (
          <button
            key={i}
            id={`mcq-option-${i}`}
            disabled={disabled}
            onClick={() => !disabled && onSelect(option)}
            className={`
              w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left
              transition-all duration-200 cursor-pointer
              disabled:cursor-not-allowed
              ${borderClass}
            `}
          >
            <span className={`
              flex-shrink-0 w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold
              ${isSelected && !showResult ? 'border-brand-500 bg-brand-500 text-white' : ''}
              ${isCorrect ? 'border-accent-green bg-accent-green text-white' : ''}
              ${isWrong   ? 'border-accent-red   bg-accent-red   text-white' : ''}
              ${!isSelected && !isCorrect && !isWrong ? 'border-white/20 text-white/40' : ''}
            `}>
              {String.fromCharCode(65 + i)}
            </span>
            <span className="text-white/90 text-sm leading-relaxed">{option}</span>
            {isCorrect && (
              <span className="ml-auto text-accent-green text-lg">✓</span>
            )}
            {isWrong && (
              <span className="ml-auto text-accent-red text-lg">✗</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
