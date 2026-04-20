'use client';

import { useCallback, useRef, useState } from 'react';

interface VoiceRecognitionState {
  isListening: boolean;
  transcript: string;
  isSupported: boolean;
}

const isMobileDevice = () =>
  typeof navigator !== 'undefined' &&
  /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent);

export function useVoiceRecognition() {
  const [state, setState] = useState<VoiceRecognitionState>({
    isListening: false,
    transcript: '',
    isSupported:
      typeof window !== 'undefined' &&
      (!!(window.SpeechRecognition || window.webkitSpeechRecognition) ||
        typeof window.MediaRecorder !== 'undefined'),
  });

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const accumulatedFinalRef = useRef('');
  const transcriptRef = useRef('');

  const mobileRecorderRef = useRef<MediaRecorder | null>(null);
  const mobileChunksRef = useRef<Blob[]>([]);
  const mobileAbortRef = useRef<AbortController | null>(null);
  const isListeningRef = useRef(false);

  const setTranscript = useCallback((t: string) => {
    transcriptRef.current = t;
    setState(s => ({ ...s, transcript: t }));
  }, []);

  const transcribeBlob = useCallback(
    async (blob: Blob, mimeType: string, signal: AbortSignal) => {
      const ext = mimeType.includes('ogg')
        ? 'ogg'
        : mimeType.includes('mp4')
          ? 'mp4'
          : 'webm';
      const file = new File([blob], `live.${ext}`, { type: mimeType });
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch('/api/transcribe', {
          method: 'POST',
          body: formData,
          signal,
        });
        if (!res.ok) return null;
        const data = await res.json();
        return typeof data.text === 'string' ? data.text.trim() : null;
      } catch {
        return null;
      }
    },
    []
  );

  const startMobile = useCallback(
    (stream: MediaStream) => {
      mobileChunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mobileRecorderRef.current = mr;
      mr.ondataavailable = e => {
        if (e.data.size > 0) mobileChunksRef.current.push(e.data);
      };
      mr.start();
      isListeningRef.current = true;
    },
    []
  );

  const stopMobile = useCallback(async () => {
    isListeningRef.current = false;
    mobileAbortRef.current?.abort();
    const mr = mobileRecorderRef.current;
    if (!mr) return;

    await new Promise<void>(resolve => {
      if (mr.state === 'inactive') {
        resolve();
        return;
      }
      mr.addEventListener('stop', () => resolve(), { once: true });
      try { mr.stop(); } catch { resolve(); }
    });

    if (mobileChunksRef.current.length > 0) {
      const mimeType = mr.mimeType || 'audio/webm';
      const blob = new Blob([...mobileChunksRef.current], { type: mimeType });
      if (blob.size > 1000) {
        const controller = new AbortController();
        mobileAbortRef.current = controller;
        const text = await transcribeBlob(blob, mimeType, controller.signal);
        if (text) setTranscript(text);
      }
    }

    mobileRecorderRef.current = null;
    mobileChunksRef.current = [];
  }, [transcribeBlob, setTranscript]);

  const start = useCallback(
    (stream?: MediaStream) => {
      accumulatedFinalRef.current = '';
      transcriptRef.current = '';
      setState(s => ({ ...s, isListening: true, transcript: '' }));

      if (isMobileDevice() && stream) {
        startMobile(stream);
        return;
      }

      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) return;

      const recognition = new SR();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let sessionFinal = '';
        let interim = '';
        for (let i = 0; i < event.results.length; i++) {
          const text = event.results[i][0].transcript;
          if (event.results[i].isFinal) sessionFinal += text + ' ';
          else interim += text;
        }
        const fullFinal = (accumulatedFinalRef.current + ' ' + sessionFinal).trim();
        const display = interim ? fullFinal + ' ' + interim : fullFinal;
        setTranscript(display.trim());
        (recognition as unknown as { _sessionFinal?: string })._sessionFinal =
          sessionFinal.trim();
      };

      recognition.onerror = (event: Event & { error?: string }) => {
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setTranscript('[Microphone permission denied]');
          setState(s => ({ ...s, isListening: false }));
        }
      };

      recognition.onend = () => {
        const sf = (recognition as unknown as { _sessionFinal?: string })._sessionFinal;
        if (sf) {
          accumulatedFinalRef.current = (
            accumulatedFinalRef.current +
            ' ' +
            sf
          ).trim();
          (recognition as unknown as { _sessionFinal?: string })._sessionFinal = '';
        }
      };

      recognition.start();
    },
    [startMobile, setTranscript]
  );

  const stop = useCallback(async () => {
    if (mobileRecorderRef.current) {
      await stopMobile();
    } else {
      const rec = recognitionRef.current;
      const sessionFinal =
        (rec as unknown as { _sessionFinal?: string } | null)?._sessionFinal || '';
      const finalTranscript = (accumulatedFinalRef.current + ' ' + sessionFinal).trim();
      if (finalTranscript) setTranscript(finalTranscript);
      try {
        rec?.abort();
      } catch {
        /* already stopped */
      }
      recognitionRef.current = null;
    }
    setState(s => ({ ...s, isListening: false }));
    return transcriptRef.current;
  }, [stopMobile, setTranscript]);

  const clearTranscript = useCallback(() => {
    transcriptRef.current = '';
    setState(s => ({ ...s, transcript: '' }));
  }, []);

  return { ...state, start, stop, clearTranscript, transcriptRef };
}
