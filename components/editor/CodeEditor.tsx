'use client';
import dynamic from 'next/dynamic';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface CodeEditorProps {
  language: string;
  value: string;
  onChange: (value: string) => void;
  height?: string;
  readOnly?: boolean;
}

const LANGUAGE_MAP: Record<string, string> = {
  'lang-python':     'python',
  'lang-cpp':        'cpp',
  'lang-java':       'java',
  'lang-rust':       'rust',
  'lang-golang':     'go',
  'lang-jumbolang':  'plaintext',
};

export default function CodeEditor({
  language,
  value,
  onChange,
  height = '340px',
  readOnly = false,
}: CodeEditorProps) {
  const monacoLang = LANGUAGE_MAP[language] ?? language.toLowerCase().replace(/[^a-z]/g, '') ?? 'plaintext';

  return (
    <div
      className="overflow-hidden rounded-xl border border-white/10 shadow-xl"
      style={{ height }}
    >
      <MonacoEditor
        height={height}
        language={monacoLang}
        value={value}
        theme="vs-dark"
        onChange={(v) => onChange(v ?? '')}
        options={{
          fontSize:          14,
          fontFamily:        'JetBrains Mono, Fira Code, monospace',
          fontLigatures:     true,
          minimap:           { enabled: false },
          lineNumbers:       'on',
          roundedSelection:  true,
          scrollBeyondLastLine: false,
          automaticLayout:   true,
          padding:           { top: 16, bottom: 16 },
          readOnly,
          tabSize:           2,
          wordWrap:          'on',
          suggest:           { showKeywords: true },
        }}
      />
    </div>
  );
}
