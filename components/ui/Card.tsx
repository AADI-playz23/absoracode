import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
}

export default function Card({ children, className = '', hover = false, glow = false }: CardProps) {
  return (
    <div
      className={`
        relative rounded-2xl border border-white/10 bg-surface-800/80 backdrop-blur-sm
        ${hover ? 'transition-all duration-300 hover:border-brand-500/40 hover:bg-surface-700/80 hover:shadow-xl hover:shadow-brand-500/10 cursor-pointer' : ''}
        ${glow ? 'shadow-lg shadow-brand-500/10' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
