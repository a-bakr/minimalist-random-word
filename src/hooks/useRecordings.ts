'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { Recording } from '../types';

export function useRecordings() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [selectedRecordingId, setSelectedRecordingId] = useState<number | null>(null);

  const playbacksRef = useRef<Map<number, HTMLAudioElement>>(new Map());
  const recordingCountRef = useRef(0);

  const selectedRecording = recordings.find(r => r.id === selectedRecordingId) ?? null;

  useEffect(() => {
    return () => {
      playbacksRef.current.forEach(audio => { audio.pause(); audio.onended = null; });
    };
  }, []);

  const addRecording = useCallback((blob: Blob, transcript: string) => {
    const url = URL.createObjectURL(blob);
    const id = Date.now();
    const audio = new Audio(url);
    audio.onended = () => setPlayingId(pid => (pid === id ? null : pid));
    playbacksRef.current.set(id, audio);
    recordingCountRef.current += 1;
    const num = recordingCountRef.current;
    setRecordings(prev => [...prev, { id, url, transcript, num }]);
  }, []);

  const removeRecording = useCallback((id: number) => (e: React.MouseEvent) => {
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
  }, []);

  const togglePlayback = useCallback((id: number) => (e: React.MouseEvent) => {
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
  }, []);

  const selectRecording = useCallback((id: number) => {
    setSelectedRecordingId(id);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedRecordingId(null);
  }, []);

  return {
    recordings,
    playingId,
    selectedRecording,
    addRecording,
    removeRecording,
    togglePlayback,
    selectRecording,
    clearSelection,
  };
}
