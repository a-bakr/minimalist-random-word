'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { RotateCcw } from 'lucide-react';
import { playBeepSound, fmtDuration } from '../lib/sounds';

export function Timer({
  duration,
  isRunning,
  onStop,
  onDurationChange,
}: {
  duration: number;
  isRunning: boolean;
  onStop: () => void;
  onDurationChange: (secs: number) => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const firedBeepRef = useRef(false);

  const [isEditing, setIsEditing] = useState(false);
  const [draftSecs, setDraftSecs] = useState(String(duration));

  useEffect(() => { setDraftSecs(String(duration)); }, [duration]);

  useEffect(() => {
    if (isRunning) {
      firedBeepRef.current = false;
      intervalRef.current = setInterval(() => {
        setElapsed(e => e + 1);
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setElapsed(0);
      firedBeepRef.current = false;
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning]);

  useEffect(() => {
    if (!isRunning) return;
    if (elapsed === duration && !firedBeepRef.current) {
      firedBeepRef.current = true;
      playBeepSound();
    }
  }, [elapsed, isRunning, duration]);

  const remaining = duration - elapsed;
  const isOvertime = elapsed >= duration;

  const display = () => {
    const secs = isOvertime ? elapsed - duration : Math.abs(remaining);
    const formatted = fmtDuration(secs);
    return isOvertime ? `+${formatted}` : formatted;
  };

  const commitDuration = () => {
    const n = parseInt(draftSecs, 10);
    if (!isNaN(n) && n >= 10 && n <= 600) {
      onDurationChange(n);
    } else {
      setDraftSecs(String(duration));
    }
    setIsEditing(false);
  };

  // Idle state
  if (!isRunning && elapsed === 0) {
    if (isEditing) {
      return (
        <input
          autoFocus
          type="number"
          min={10}
          max={600}
          value={draftSecs}
          onChange={e => setDraftSecs(e.target.value)}
          onBlur={commitDuration}
          onKeyDown={e => {
            e.stopPropagation();
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') { setDraftSecs(String(duration)); setIsEditing(false); }
          }}
          onClick={e => e.stopPropagation()}
          className="bg-transparent border-none outline-none text-center text-2xl font-black font-mono tabular-nums tracking-tight
            text-zinc-900 dark:text-zinc-50 transition-all duration-300 cursor-text w-16"
        />
      );
    }

    return (
      <div
        onClick={e => { e.stopPropagation(); setIsEditing(true); }}
        className="text-2xl font-black font-mono tabular-nums tracking-tight cursor-pointer select-none
          text-zinc-400/15 dark:text-zinc-600/15 hover:text-zinc-400/40 dark:hover:text-zinc-500/40 transition-colors duration-500"
      >
        {fmtDuration(duration)}
      </div>
    );
  }

  // Running / overtime state
  return (
    <div
      className="flex items-center gap-2"
      onClick={e => { e.stopPropagation(); onStop(); }}
    >
      <motion.span
        key={isOvertime ? 'over' : 'count'}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`text-2xl font-black font-mono tabular-nums tracking-tight cursor-pointer transition-colors duration-500 ${isOvertime
          ? 'text-amber-400/80 dark:text-amber-300/80'
          : 'text-zinc-400/70 dark:text-zinc-500/70'
          }`}
      >
        {display()}
      </motion.span>
      <RotateCcw
        size={16}
        strokeWidth={2}
        className="text-zinc-400/30 dark:text-zinc-600/30 cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors duration-300"
      />
    </div>
  );
}
