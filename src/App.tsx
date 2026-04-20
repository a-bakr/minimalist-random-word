'use client';

import React, { useState, useEffect, useRef } from 'react';
import { generate } from 'random-words';
import { AnimatePresence } from 'motion/react';

import type { WordEntry } from './types';
import { playPopSound, getRandomColor } from './lib/sounds';
import { useLocalStorage, useLocalStorageBool } from './hooks/useLocalStorage';
import { useVoiceRecognition } from './hooks/useVoiceRecognition';
import { useRecordings } from './hooks/useRecordings';

import { TopBar } from './components/TopBar';
import { WordItem } from './components/WordItem';
import { RecordingArea } from './components/RecordingArea';
import { TranscriptOverlay } from './components/TranscriptOverlay';
import { TranscriptCard } from './components/TranscriptCard';
import { HintOverlay } from './components/HintOverlay';

export default function App() {
  const [words, setWords] = useState<WordEntry[]>([]);
  const [maxWords, setMaxWords] = useLocalStorage('maxWords', 1);
  const [fontSize, setFontSize] = useLocalStorage('fontSize', 80);
  const [duration, setDuration] = useLocalStorage('timerDuration', 60);
  const [timerEnabled, setTimerEnabled] = useLocalStorageBool('timerEnabled', true);

  const [isDark, setIsDark] = useState(false);
  const [hasClicked, setHasClicked] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const voice = useVoiceRecognition();
  const rec = useRecordings();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const handleScreenClick = (e: React.MouseEvent) => {
    if (!hasClicked) setHasClicked(true);
    if (isSoundEnabled) playPopSound();
    if (timerEnabled && !isTimerRunning) setIsTimerRunning(true);

    setWords(prev => [
      ...prev,
      { text: generate() as string, x: e.clientX, y: e.clientY, id: Date.now(), color: getRandomColor(isDark) },
    ].slice(-maxWords));
  };

  const toggleTimerEnabled = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !timerEnabled;
    setTimerEnabled(next);
    if (!next && isTimerRunning) setIsTimerRunning(false);
  };

  const startRecording = async (e: React.MouseEvent) => {
    e.stopPropagation();
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return;
    }

    audioChunksRef.current = [];
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = ev => {
      if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
    };

    mediaRecorder.onstop = () => {
      const mimeType = mediaRecorder.mimeType || 'audio/webm';
      const blob = new Blob(audioChunksRef.current, { type: mimeType });
      const transcript = voice.transcript;
      rec.addRecording(blob, transcript);
      stream.getTracks().forEach(t => t.stop());
    };

    mediaRecorder.start();
    voice.start();
    setIsRecording(true);
  };

  const stopRecording = (e: React.MouseEvent) => {
    e.stopPropagation();
    voice.stop();
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  return (
    <div
      className="relative h-dvh w-dvw cursor-pointer overflow-hidden bg-zinc-50 dark:bg-zinc-950 transition-colors duration-700"
      onClick={handleScreenClick}
    >
      <TopBar
        timerEnabled={timerEnabled}
        toggleTimerEnabled={toggleTimerEnabled}
        duration={duration}
        isTimerRunning={isTimerRunning}
        onTimerStop={() => setIsTimerRunning(false)}
        onDurationChange={setDuration}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        maxWords={maxWords}
        onMaxWordsChange={n => { setMaxWords(n); setWords(prev => prev.slice(-n)); }}
        isSoundEnabled={isSoundEnabled}
        onSoundToggle={e => { e.stopPropagation(); setIsSoundEnabled(v => !v); }}
        isDark={isDark}
        onThemeToggle={e => { e.stopPropagation(); setIsDark(v => !v); }}
      />

      <AnimatePresence>
        {words.map(word => (
          <WordItem key={word.id} word={word} fontSize={fontSize} />
        ))}
      </AnimatePresence>

      <TranscriptOverlay text={voice.transcript} onDismiss={() => { }} />

      <RecordingArea
        recordings={rec.recordings}
        isRecording={isRecording}
        playingId={rec.playingId}
        transcribingId={null}
        onToggleRecord={isRecording ? stopRecording : startRecording}
        onTogglePlayback={rec.togglePlayback}
        onRemove={rec.removeRecording}
        onSelect={rec.selectRecording}
      />

      <TranscriptCard recording={rec.selectedRecording} onClose={rec.clearSelection} />

      <HintOverlay visible={!hasClicked} fontSize={fontSize} isDark={isDark} />
    </div>
  );
}
