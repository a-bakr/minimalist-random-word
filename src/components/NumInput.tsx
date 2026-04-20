'use client';

import { useState, useEffect } from 'react';

export function NumInput({
  value, min, max, title, width,
  onCommit,
}: {
  value: number;
  min: number;
  max: number;
  title: string;
  width: string;
  onCommit: (n: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => { setDraft(String(value)); }, [value]);

  const commit = () => {
    const n = parseInt(draft, 10);
    if (!isNaN(n) && n >= min && n <= max) onCommit(n);
    else setDraft(String(value));
  };

  return (
    <input
      type="number"
      min={min}
      max={max}
      value={draft}
      title={title}
      style={{ width }}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        e.stopPropagation();
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') { setDraft(String(value)); (e.target as HTMLInputElement).blur(); }
      }}
      onClick={e => e.stopPropagation()}
      className="bg-transparent border-none outline-none text-center text-2xl font-black font-mono tabular-nums tracking-tight
        text-zinc-400/15 hover:text-zinc-900 dark:hover:text-zinc-50 focus:text-zinc-900
        dark:focus:text-zinc-50 transition-all duration-500 cursor-pointer
        focus:cursor-text px-2 py-1 rounded-full"
    />
  );
}
