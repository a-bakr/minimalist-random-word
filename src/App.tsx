/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { generate } from 'random-words';
import { Moon, Sun, Volume2, VolumeX, RotateCcw, Mic, Play, Square, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type WordEntry = { text: string; x: number; y: number; id: number; color: string };
type Recording = { id: number; url: string; transcript: string; num: number };

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

// Format seconds → "M:SS"
const fmtDuration = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

// ─── Timer ────────────────────────────────────────────────────────────────────

function Timer({
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

  // Editing state for idle mode
  const [isEditing, setIsEditing] = useState(false);
  const [draftSecs, setDraftSecs] = useState(String(duration));

  // Keep draft in sync with prop
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
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    const formatted = `${m}:${String(s).padStart(2, '0')}`;
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

  // ── Idle state ──
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

  // ── Running / overtime state ──
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

// ─── WordItem ─────────────────────────────────────────────────────────────────
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

  // Timer state
  const [duration, setDuration] = useState(() => Number(localStorage.getItem('timerDuration')) || 60);
  const [timerEnabled, setTimerEnabled] = useState(() => localStorage.getItem('timerEnabled') !== 'false');
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [liveText, setLiveText] = useState('');
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [transcribingId, setTranscribingId] = useState<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isRecordingRef = useRef(false);
  const accumulatedFinalRef = useRef('');
  const pendingTranscriptRef = useRef('');
  const liveTextRef = useRef('');
  const playbacksRef = useRef<Map<number, HTMLAudioElement>>(new Map());
  const recordingCountRef = useRef(0);

  const isMobile = /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent);

  const handleDurationChange = (secs: number) => {
    setDuration(secs);
    localStorage.setItem('timerDuration', String(secs));
  };

  const toggleTimerEnabled = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTimerEnabled(v => {
      const next = !v;
      localStorage.setItem('timerEnabled', String(next));
      if (!next && isTimerRunning) setIsTimerRunning(false);
      return next;
    });
  };

  const togglePlayback = (id: number) => (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = playbacksRef.current.get(id);
    if (!audio) return;
    setPlayingId(current => {
      if (current === id) {
        audio.pause();
        audio.currentTime = 0;
        return null;
      }
      if (current !== null) {
        const cur = playbacksRef.current.get(current);
        if (cur) { cur.pause(); cur.currentTime = 0; }
      }
      audio.play();
      return id;
    });
  };

  const removeRecording = (id: number) => (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = playbacksRef.current.get(id);
    if (audio) { audio.pause(); audio.onended = null; }
    playbacksRef.current.delete(id);
    setPlayingId(current => (current === id ? null : current));
    setRecordings(prev => {
      const rec = prev.find(r => r.id === id);
      if (rec) URL.revokeObjectURL(rec.url);
      return prev.filter(r => r.id !== id);
    });
  };

  useEffect(() => {
    return () => {
      playbacksRef.current.forEach(audio => { audio.pause(); audio.onended = null; });
    };
  }, []);

  const startRecording = async (e: React.MouseEvent) => {
    e.stopPropagation();

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return;
    }

    audioChunksRef.current = [];
    accumulatedFinalRef.current = '';
    liveTextRef.current = '';
    setLiveText('');

    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = ev => {
      if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
    };
    mediaRecorder.onstop = () => {
      const mimeType = mediaRecorder.mimeType || 'audio/webm';
      const blob = new Blob(audioChunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const id = Date.now();
      const audio = new Audio(url);
      audio.onended = () => setPlayingId(pid => (pid === id ? null : pid));
      playbacksRef.current.set(id, audio);
      recordingCountRef.current += 1;
      const num = recordingCountRef.current;
      setRecordings(prev => [...prev, { id, url, transcript: pendingTranscriptRef.current, num }]);
      stream.getTracks().forEach(t => t.stop());

      // On mobile: send audio to Groq Whisper for transcript
      if (isMobile) {
        const groqKey = import.meta.env.VITE_GROQ_API_KEY;
        if (groqKey && blob.size > 0) {
          setTranscribingId(id);
          const ext = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'mp4' : 'webm';
          const file = new File([blob], `recording.${ext}`, { type: mimeType });
          const formData = new FormData();
          formData.append('file', file);
          formData.append('model', 'whisper-large-v3-turbo');
          formData.append('response_format', 'json');
          fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${groqKey}` },
            body: formData,
          })
            .then(r => r.json())
            .then(data => {
              if (data.text) {
                setRecordings(prev => prev.map(r => r.id === id ? { ...r, transcript: data.text } : r));
              }
            })
            .catch(() => {})
            .finally(() => setTranscribingId(tid => tid === id ? null : tid));
        }
      }
    };
    setTimeout(() => mediaRecorder.start(), 200);

    const SR = !isMobile && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    if (SR) {
      const recognition = new SR();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
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
        recognition._sessionFinal = sessionFinal.trim();
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setLiveText('[Microphone permission denied]');
          isRecordingRef.current = false;
          setIsRecording(false);
        }
        // Ignore other errors (network, aborted, etc.) — don't restart to avoid browser chimes
      };

      recognition.onend = () => {
        if (recognition._sessionFinal) {
          accumulatedFinalRef.current = (accumulatedFinalRef.current + ' ' + recognition._sessionFinal).trim();
          recognition._sessionFinal = '';
        }
        // Do NOT restart — each restart causes Chrome to play its start chime mid-recording
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

    const rec = recognitionRef.current;
    const sessionFinal = rec?._sessionFinal || '';
    const refsSnapshot = (accumulatedFinalRef.current + ' ' + sessionFinal).trim();
    pendingTranscriptRef.current = refsSnapshot || liveTextRef.current;

    mediaRecorderRef.current?.stop();
    try { rec?.abort(); } catch { /* already stopped */ }
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
    // Only auto-start the timer if timerEnabled
    if (timerEnabled && !isTimerRunning) setIsTimerRunning(true);

    setWords(prev => [
      ...prev,
      { text: generate() as string, x: e.clientX, y: e.clientY, id: Date.now(), color: getRandomColor(isDark) },
    ].slice(-maxWords));
  };

  const threeWords = (text: string) => {
    if (!text) return '';
    const ws = text.trim().split(/\s+/).filter(Boolean);
    if (ws.length <= 3) return text;
    return ws.slice(0, 3).join(' ') + '\u2026';
  };

  return (
    <div
      className="relative h-dvh w-dvw cursor-pointer overflow-hidden bg-zinc-50 dark:bg-zinc-950 transition-colors duration-700"
      onClick={handleScreenClick}
    >
      {/* Top bar */}
      <div className="absolute top-6 inset-x-6 z-10 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Timer-enabled dot toggle */}
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
            onStop={() => setIsTimerRunning(false)}
            onDurationChange={handleDurationChange}
          />
        </div>
        <div className="flex items-center pointer-events-auto">
          <NumInput
            value={fontSize}
            min={12}
            max={200}
            title="Font size (px)"
            width="4rem"
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

      {/* Live transcript — no background, just floating text */}
      <AnimatePresence>
        {liveText && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.3 }}
            className="absolute bottom-28 left-1/2 -translate-x-1/2 w-[90vw] max-w-sm text-center text-sm leading-relaxed text-zinc-500 dark:text-zinc-400 select-none px-4 cursor-pointer"
            onClick={e => { e.stopPropagation(); setLiveText(''); }}
          >
            {liveText}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recording area — bottom-right: pills row + mic button */}
      <div
        className="absolute bottom-6 right-6 z-20 flex items-center gap-2"
        onClick={e => e.stopPropagation()}
      >
        {/* Saved recordings — scrollable row, hidden scrollbar */}
        {recordings.length > 0 && (
          <div
            className="flex gap-2 overflow-x-auto scrollbar-none"
            style={{ maxWidth: 'calc(100vw - 5rem)' }}
          >
            <AnimatePresence>
              {recordings.map(rec => (
                <motion.div
                  key={rec.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-full bg-zinc-100/90 dark:bg-zinc-900/90 backdrop-blur-md shrink-0"
                  initial={{ opacity: 0, x: 16, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, x: 16, filter: 'blur(6px)' }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  <button
                    onClick={togglePlayback(rec.id)}
                    className="text-zinc-400/60 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors duration-300"
                    aria-label={playingId === rec.id ? 'Stop playback' : 'Play recording'}
                  >
                    {playingId === rec.id
                      ? <Square size={14} strokeWidth={1.5} />
                      : <Play size={14} strokeWidth={1.5} />}
                  </button>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 max-w-[8rem] truncate">
                    {transcribingId === rec.id
                      ? <span className="animate-pulse">…</span>
                      : threeWords(rec.transcript) || String(rec.num)}
                  </span>
                  <button
                    onClick={removeRecording(rec.id)}
                    className="text-zinc-400/30 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors duration-300"
                    aria-label="Remove recording"
                  >
                    <X size={12} strokeWidth={1.5} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Mic / Stop button */}
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

      {/* Hint */}
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
