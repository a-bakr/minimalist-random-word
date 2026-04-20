'use client';

import { Volume2, VolumeX, Moon, Sun } from 'lucide-react';
import { Timer } from './Timer';
import { NumInput } from './NumInput';

export function TopBar({
  timerEnabled,
  toggleTimerEnabled,
  duration,
  isTimerRunning,
  onTimerStop,
  onDurationChange,
  fontSize,
  onFontSizeChange,
  maxWords,
  onMaxWordsChange,
  isSoundEnabled,
  onSoundToggle,
  isDark,
  onThemeToggle,
}: {
  timerEnabled: boolean;
  toggleTimerEnabled: (e: React.MouseEvent) => void;
  duration: number;
  isTimerRunning: boolean;
  onTimerStop: () => void;
  onDurationChange: (secs: number) => void;
  fontSize: number;
  onFontSizeChange: (n: number) => void;
  maxWords: number;
  onMaxWordsChange: (n: number) => void;
  isSoundEnabled: boolean;
  onSoundToggle: (e: React.MouseEvent) => void;
  isDark: boolean;
  onThemeToggle: (e: React.MouseEvent) => void;
}) {
  return (
    <div className="absolute top-6 inset-x-6 z-10 flex items-center justify-between pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-2">
        <button
          onClick={toggleTimerEnabled}
          className="p-1.5 group"
          aria-label={timerEnabled ? 'Disable timer' : 'Enable timer'}
        >
          <div
            className={`w-2 h-2 rounded-full transition-all duration-500 ${timerEnabled
              ? 'bg-zinc-400/50 dark:bg-zinc-500/50 group-hover:bg-zinc-600 dark:group-hover:bg-zinc-300'
              : 'bg-zinc-400/10 dark:bg-zinc-600/10 group-hover:bg-zinc-400/30 dark:group-hover:bg-zinc-500/30'
              }`}
          />
        </button>
        <Timer
          duration={duration}
          isRunning={isTimerRunning}
          onStop={onTimerStop}
          onDurationChange={onDurationChange}
        />
      </div>
      <div className="flex items-center pointer-events-auto">
        <NumInput
          value={fontSize}
          min={12}
          max={200}
          title="Font size (px)"
          width="4rem"
          onCommit={onFontSizeChange}
        />
        <NumInput
          value={maxWords}
          min={1}
          max={10}
          title="Words on screen"
          width="2.5rem"
          onCommit={onMaxWordsChange}
        />
        <button
          onClick={onSoundToggle}
          className="rounded-full p-3 text-zinc-400/30 hover:text-zinc-900 dark:hover:text-zinc-50 transition-all duration-500"
          aria-label={isSoundEnabled ? 'Mute sound' : 'Enable sound'}
        >
          {isSoundEnabled ? <Volume2 size={20} strokeWidth={1.5} /> : <VolumeX size={20} strokeWidth={1.5} />}
        </button>
        <button
          onClick={onThemeToggle}
          className="rounded-full p-3 text-zinc-400/30 hover:text-zinc-900 dark:hover:text-zinc-50 transition-all duration-500"
          aria-label="Toggle theme"
        >
          {isDark ? <Sun size={20} strokeWidth={1.5} /> : <Moon size={20} strokeWidth={1.5} />}
        </button>
      </div>
    </div>
  );
}
