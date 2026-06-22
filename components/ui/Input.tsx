import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export default function Input({ label, error, hint, className = '', id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-white/70">
          {label}
        </label>
      )}
      <input
        id={inputId}
        {...props}
        className={`
          w-full rounded-xl border bg-surface-700/60 px-4 py-3 text-white
          placeholder-white/30 outline-none transition-all duration-200
          focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20
          ${error ? 'border-accent-red' : 'border-white/10 hover:border-white/20'}
          ${className}
        `}
      />
      {error && <p className="text-xs text-accent-red">{error}</p>}
      {hint && !error && <p className="text-xs text-white/40">{hint}</p>}
    </div>
  );
}
