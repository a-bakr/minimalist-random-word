/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { generate } from 'random-words';
import { Moon, Sun, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type WordEntry = { text: string; x: number; y: number; id: number; color: string };

const getRandomColor = (isDark: boolean) =>
  `hsl(${Math.floor(Math.random() * 360)}, 70%, ${isDark ? 75 : 40}%)`;

let audioCtx: AudioContext | null = null;

const playPopSound = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  const frequencies = [523.25, 587.33, 659.25, 783.99, 880.00];
  const freq = frequencies[Math.floor(Math.random() * frequencies.length)];

  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.4);
};

// ─── WordItem ─────────────────────────────────────────────────────────────────
// Corrects position after mount so the word never overflows the viewport.
function WordItem({ word, fontSize }: { word: WordEntry; fontSize: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: word.x, y: word.y });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pad = 16;
    let x = word.x;
    let y = word.y;
    if (rect.right  > window.innerWidth  - pad) x -= rect.right  - (window.innerWidth  - pad);
    if (rect.left   < pad)                       x += pad - rect.left;
    if (rect.bottom > window.innerHeight - pad)  y -= rect.bottom - (window.innerHeight - pad);
    if (rect.top    < pad)                       y += pad - rect.top;
    if (x !== word.x || y !== word.y) setPos({ x, y });
  }, []);

  return (
    <motion.div
      ref={ref}
      className="absolute pointer-events-none"
      style={{ left: pos.x, top: pos.y }}
      initial={{ opacity: 0, filter: 'blur(16px)', scale: 0.85, x: '-50%', y: '-50%' }}
      animate={{ opacity: 1, filter: 'blur(0px)',  scale: 1,    x: '-50%', y: '-50%' }}
      exit={{    opacity: 0, filter: 'blur(16px)', scale: 1.05, x: '-50%', y: '-50%' }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <h1
        className="leading-none font-medium tracking-tight text-center select-none capitalize whitespace-nowrap drop-shadow-sm"
        style={{ color: word.color, fontSize: `${fontSize}px` }}
      >
        {word.text}
      </h1>
    </motion.div>
  );
}

// ─── NumInput ─────────────────────────────────────────────────────────────────
// A bare number input that looks like plain text until focused.
function NumInput({
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
      className="bg-transparent border-none outline-none text-center text-sm font-mono
        text-zinc-400/30 hover:text-zinc-500/40 focus:text-zinc-900
        dark:focus:text-zinc-50 transition-colors duration-300 cursor-pointer
        focus:cursor-text p-3 rounded-full"
    />
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [words, setWords] = useState<WordEntry[]>([]);
  const [maxWords, setMaxWords] = useState(() => Number(localStorage.getItem('maxWords')) || 1);
  const [fontSize, setFontSize] = useState(() => Number(localStorage.getItem('fontSize')) || 80);
  const [isDark, setIsDark] = useState(false);
  const [hasClicked, setHasClicked] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);

  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(prefersDark);
    setWords([{
      text: generate() as string,
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      id: Date.now(),
      color: getRandomColor(prefersDark),
    }]);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const handleScreenClick = (e: React.MouseEvent) => {
    if (!hasClicked) setHasClicked(true);
    if (isSoundEnabled) playPopSound();

    setWords(prev => [
      ...prev,
      { text: generate() as string, x: e.clientX, y: e.clientY, id: Date.now(), color: getRandomColor(isDark) },
    ].slice(-maxWords));
  };

  return (
    <div
      className="relative h-screen w-screen cursor-pointer overflow-hidden bg-zinc-50 dark:bg-zinc-950 transition-colors duration-700"
      onClick={handleScreenClick}
    >
      {/* Controls */}
      <div className="absolute right-6 top-6 z-10 flex items-center">
        <NumInput
          value={fontSize}
          min={12}
          max={200}
          title="Font size (px)"
          width="3rem"
          onCommit={n => { localStorage.setItem('fontSize', String(n)); setFontSize(n); }}
        />
        <NumInput
          value={maxWords}
          min={1}
          max={10}
          title="Words on screen"
          width="2.5rem"
          onCommit={n => { localStorage.setItem('maxWords', String(n)); setMaxWords(n); setWords(prev => prev.slice(-n)); }}
        />
        <button
          onClick={e => { e.stopPropagation(); setIsSoundEnabled(v => !v); }}
          className="rounded-full p-3 text-zinc-400/30 hover:text-zinc-900 dark:hover:text-zinc-50 transition-all duration-500"
          aria-label={isSoundEnabled ? 'Mute sound' : 'Enable sound'}
        >
          {isSoundEnabled ? <Volume2 size={20} strokeWidth={1.5} /> : <VolumeX size={20} strokeWidth={1.5} />}
        </button>
        <button
          onClick={e => { e.stopPropagation(); setIsDark(v => !v); }}
          className="rounded-full p-3 text-zinc-400/30 hover:text-zinc-900 dark:hover:text-zinc-50 transition-all duration-500"
          aria-label="Toggle theme"
        >
          {isDark ? <Sun size={20} strokeWidth={1.5} /> : <Moon size={20} strokeWidth={1.5} />}
        </button>
      </div>

      {/* Words */}
      <AnimatePresence>
        {words.map(word => (
          <WordItem key={word.id} word={word} fontSize={fontSize} />
        ))}
      </AnimatePresence>

      {/* Hint */}
      <AnimatePresence>
        {!hasClicked && (
          <motion.div
            exit={{ opacity: 0, y: 10, filter: 'blur(5px)' }}
            transition={{ duration: 0.5 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xs md:text-sm text-zinc-400/50 dark:text-zinc-600/50 tracking-[0.5em] uppercase select-none pointer-events-none"
          >
            Tap anywhere
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
