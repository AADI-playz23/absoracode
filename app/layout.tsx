import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/ui/Navbar';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'AbsoraCode — Learn to Code, Absolute Beginner Style',
  description:
    'A LeetCode-style platform built for absolute beginners. Pick a language, solve MCQ and code problems, track your mastery score, and level up one question at a time.',
  keywords: ['coding', 'beginner', 'learn programming', 'javascript', 'python', 'html css'],
  openGraph: {
    title:       'AbsoraCode',
    description: 'Learn to code for absolute beginners',
    type:        'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.variable} font-sans bg-surface-900 text-white antialiased min-h-screen`}>
        <div className="fixed inset-0 bg-hero-glow pointer-events-none" aria-hidden="true" />
        <Navbar />
        <main className="relative z-10">
          {children}
        </main>
      </body>
    </html>
  );
}
