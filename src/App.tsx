/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { generate } from 'random-words';
import { Moon, Sun, Volume2, VolumeX, RotateCcw, Mic, Play, Square, Trash2 } from 'lucide-react';
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

const playBeepSound = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();

  // Two-tone beep: 440Hz then 554Hz, distinct from pop sounds
  [440, 554].forEach((freq, i) => {
    const osc = audioCtx!.createOscillator();
    const gainNode = audioCtx!.createGain();
    const start = audioCtx!.currentTime + i * 0.22;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, start);
    gainNode.gain.setValueAtTime(0, start);
    gainNode.gain.linearRampToValueAtTime(0.2, start + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, start + 0.6);
    osc.connect(gainNode);
    gainNode.connect(audioCtx!.destination);
    osc.start(start);
    osc.stop(start + 0.6);
  });
};

// ─── Timer ────────────────────────────────────────────────────────────────────
const DURATION = 60; // seconds

function Timer({ isRunning, onReset }: { isRunning: boolean; onReset: () => void }) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevElapsedRef = useRef(0);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsed(e => e + 1);
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setElapsed(0);
      prevElapsedRef.current = 0;
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning]);

  // Beep at 60s, then every 30s after
  useEffect(() => {
    if (!isRunning) return;
    const prev = prevElapsedRef.current;
    prevElapsedRef.current = elapsed;
    if (elapsed === DURATION) {
      playBeepSound();
    } else if (elapsed > DURATION && (elapsed - DURATION) % 30 === 0 && elapsed !== prev) {
      playBeepSound();
    }
  }, [elapsed, isRunning]);

  const remaining = DURATION - elapsed;
  const isOvertime = elapsed >= DURATION;

  const display = () => {
    const secs = isOvertime ? elapsed - DURATION : Math.abs(remaining);
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    const formatted = `${m}:${String(s).padStart(2, '0')}`;
    return isOvertime ? `+${formatted}` : formatted;
  };

  if (!isRunning && elapsed === 0) {
    return (
      <div className="text-2xl font-black font-mono tabular-nums text-zinc-400/15 dark:text-zinc-600/15 select-none pointer-events-none tracking-tight">
        1:00
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2"
      onClick={e => { e.stopPropagation(); onReset(); }}
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
    if (rect.right > window.innerWidth - pad) x -= rect.right - (window.innerWidth - pad);
    if (rect.left < pad) x += pad - rect.left;
    if (rect.bottom > window.innerHeight - pad) y -= rect.bottom - (window.innerHeight - pad);
    if (rect.top < pad) y += pad - rect.top;
    if (x !== word.x || y !== word.y) setPos({ x, y });
  }, []);

  return (
    <motion.div
      ref={ref}
      className="absolute pointer-events-none"
      style={{ left: pos.x, top: pos.y }}
      initial={{ opacity: 0, filter: 'blur(16px)', scale: 0.85, x: '-50%', y: '-50%' }}
      animate={{ opacity: 1, filter: 'blur(0px)', scale: 1, x: '-50%', y: '-50%' }}
      exit={{ opacity: 0, filter: 'blur(16px)', scale: 1.05, x: '-50%', y: '-50%' }}
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
      className="bg-transparent border-none outline-none text-center text-2xl font-black font-mono tabular-nums tracking-tight
        text-zinc-400/15 hover:text-zinc-900 dark:hover:text-zinc-50 focus:text-zinc-900
        dark:focus:text-zinc-50 transition-all duration-500 cursor-pointer
        focus:cursor-text px-2 py-1 rounded-full"
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
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [liveText, setLiveText] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioUrlRef = useRef<string | null>(null);
  const isRecordingRef = useRef(false);
  // Accumulates finalized text across SpeechRecognition sessions
  // (Chrome auto-stops recognition on silence and restarts it, resetting event.results)
  const accumulatedFinalRef = useRef('');
  // Snapshot of text captured at stop time, used by onstop to avoid race with onend
  const pendingTranscriptRef = useRef('');
  const liveTextRef = useRef('');
  const playbackRef = useRef<HTMLAudioElement | null>(null);

  // Set up audio element when URL changes
  useEffect(() => {
    if (!audioUrl) { playbackRef.current = null; return; }
    const audio = new Audio(audioUrl);
    audio.onended = () => setIsPlaying(false);
    playbackRef.current = audio;
    return () => { audio.pause(); audio.onended = null; };
  }, [audioUrl]);

  const togglePlayback = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!playbackRef.current) return;
    if (isPlaying) {
      playbackRef.current.pause();
      playbackRef.current.currentTime = 0;
      setIsPlaying(false);
    } else {
      playbackRef.current.play();
      setIsPlaying(true);
    }
  };

  const closePanel = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playbackRef.current) { playbackRef.current.pause(); playbackRef.current = null; }
    setIsPlaying(false);
    setShowPanel(false);
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = null;
    setAudioUrl(null);
    setTranscript('');
  };

  const startRecording = async (e: React.MouseEvent) => {
    e.stopPropagation();

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      // Mic permission denied or not available — silently do nothing
      return;
    }

    audioChunksRef.current = [];
    accumulatedFinalRef.current = '';
    liveTextRef.current = '';
    setLiveText('');

    // ── MediaRecorder: captures audio for playback ──
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = ev => {
      if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
    };
    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      const url = URL.createObjectURL(blob);
      audioUrlRef.current = url;
      setAudioUrl(url);
      // Use the snapshot captured at stop time to avoid race with recognition.onend
      setTranscript(pendingTranscriptRef.current);
      setShowPanel(true);
      stream.getTracks().forEach(t => t.stop());
    };
    // Delay start so the mic doesn't capture the tap/click sound
    setTimeout(() => mediaRecorder.start(), 200);

    // ── SpeechRecognition: live speech-to-text ──
    const SR = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      const recognition = new SR();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        // event.results only contains results from the current session.
        // We prefix with accumulatedFinalRef to keep text from previous sessions.
        let sessionFinal = '';
        let interim = '';
        for (let i = 0; i < event.results.length; i++) {
          const text = event.results[i][0].transcript;
          if (event.results[i].isFinal) sessionFinal += text + ' ';
          else interim += text;
        }
        const fullFinal = (accumulatedFinalRef.current + ' ' + sessionFinal).trim();
        const display = interim ? fullFinal + ' ' + interim : fullFinal;
        liveTextRef.current = display.trim();
        setLiveText(display.trim());
        // Keep sessionFinal in ref so onend can persist it before restart
        recognition._sessionFinal = sessionFinal.trim();
      };

      recognition.onend = () => {
        // Save this session's finals before potentially restarting
        if (recognition._sessionFinal) {
          accumulatedFinalRef.current = (accumulatedFinalRef.current + ' ' + recognition._sessionFinal).trim();
          recognition._sessionFinal = '';
        }
        if (isRecordingRef.current) {
          try { recognition.start(); } catch { /* already starting */ }
        }
      };

      recognition.start();
    }

    isRecordingRef.current = true;
    setIsRecording(true);
  };

  const stopRecording = (e: React.MouseEvent) => {
    e.stopPropagation();
    isRecordingRef.current = false;
    setIsRecording(false);
    setLiveText('');

    // Snapshot all text we have right now (accumulated finals + current session finals)
    // before stopping, so onstop doesn't race with recognition.onend
    const rec = recognitionRef.current;
    const sessionFinal = rec?._sessionFinal || '';
    const refsSnapshot = (accumulatedFinalRef.current + ' ' + sessionFinal).trim();
    // Fall back to liveText (which includes interim results) if refs are empty
    pendingTranscriptRef.current = refsSnapshot || liveTextRef.current;

    mediaRecorderRef.current?.stop();
    try { rec?.stop(); } catch { /* already stopped */ }
  };

  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(prefersDark);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const handleScreenClick = (e: React.MouseEvent) => {
    if (!hasClicked) setHasClicked(true);
    if (isSoundEnabled) playPopSound();
    if (!isTimerRunning) setIsTimerRunning(true);

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
      {/* Top bar — timer left, controls right, same alignment */}
      <div className="absolute top-6 inset-x-6 z-10 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto">
          <Timer isRunning={isTimerRunning} onReset={() => setIsTimerRunning(false)} />
        </div>
        <div className="flex items-center pointer-events-auto">
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
      </div>

      {/* Words */}
      <AnimatePresence>
        {words.map(word => (
          <WordItem key={word.id} word={word} fontSize={fontSize} />
        ))}
      </AnimatePresence>

      {/* Live transcript — centered bottom, visible while recording */}
      <AnimatePresence>
        {isRecording && liveText && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, filter: 'blur(4px)' }}
            transition={{ duration: 0.4 }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 max-w-lg text-center text-base text-zinc-400/70 dark:text-zinc-500/60 select-none pointer-events-none px-8"
          >
            {liveText}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recording area — unified bottom-right */}
      <div className="absolute bottom-6 right-6 z-20 flex items-center gap-3" onClick={e => e.stopPropagation()}>
        {/* Review pill — slides in when panel is visible */}
        <AnimatePresence>
          {showPanel && (
            <motion.div
              className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-zinc-100/80 dark:bg-zinc-900/80 backdrop-blur-md"
              initial={{ opacity: 0, x: 20, filter: 'blur(8px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: 20, filter: 'blur(8px)' }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <button
                onClick={togglePlayback}
                className="text-zinc-400/50 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors duration-500"
                aria-label={isPlaying ? 'Stop playback' : 'Play recording'}
              >
                {isPlaying ? <Square size={16} strokeWidth={1.5} /> : <Play size={16} strokeWidth={1.5} />}
              </button>
              <p className="max-w-xs text-xs leading-relaxed text-zinc-500 dark:text-zinc-400 truncate">
                {transcript || 'No speech detected'}
              </p>
              <button
                onClick={closePanel}
                className="text-zinc-400/30 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors duration-500"
                aria-label="Clear transcript"
              >
                <Trash2 size={14} strokeWidth={1.5} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mic / Stop button — always visible */}
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`rounded-full p-3 transition-all duration-500 ${isRecording
              ? 'text-zinc-900 dark:text-zinc-50'
              : 'text-zinc-400/30 hover:text-zinc-900 dark:hover:text-zinc-50'
            }`}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        >
          <span className="relative flex">
            {isRecording && (
              <span className="absolute inset-0 rounded-full bg-red-400/40 dark:bg-red-400/30 animate-ping" />
            )}
            {isRecording ? <Square size={20} strokeWidth={1.5} /> : <Mic size={20} strokeWidth={1.5} />}
          </span>
        </button>
      </div>

      {/* Hint — centered, replaces the initial word */}
      <AnimatePresence>
        {!hasClicked && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
            exit={{ opacity: 0, filter: 'blur(16px)', scale: 1.05 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1
              className="leading-none font-medium tracking-tight text-center capitalize"
              style={{ fontSize: `${fontSize}px`, color: `hsl(0, 0%, ${isDark ? 30 : 75}%)` }}
            >
              tap me
            </h1>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
