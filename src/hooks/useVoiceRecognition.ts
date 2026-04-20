'use client';

import { useCallback, useRef, useState } from 'react';

interface VoiceRecognitionState {
  isListening: boolean;
  transcript: string;
  isSupported: boolean;
}

export function useVoiceRecognition() {
  const [state, setState] = useState<VoiceRecognitionState>({
    isListening: false,
    transcript: '',
    isSupported: typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition),
  });

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const accumulatedFinalRef = useRef('');

  const start = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    // Reset
    accumulatedFinalRef.current = '';
    setState(s => ({ ...s, isListening: true, transcript: '' }));

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
      setState(s => ({ ...s, transcript: display.trim() }));
      (recognition as any)._sessionFinal = sessionFinal.trim();
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setState(s => ({ ...s, transcript: '[Microphone permission denied]', isListening: false }));
      }
    };

    recognition.onend = () => {
      const sf = (recognition as any)._sessionFinal;
      if (sf) {
        accumulatedFinalRef.current = (accumulatedFinalRef.current + ' ' + sf).trim();
        (recognition as any)._sessionFinal = '';
      }
    };

    recognition.start();
  }, []);

  const stop = useCallback(() => {
    const rec = recognitionRef.current;
    const sessionFinal = (rec as any)?._sessionFinal || '';
    const finalTranscript = (accumulatedFinalRef.current + ' ' + sessionFinal).trim();

    setState(s => ({ ...s, isListening: false, transcript: finalTranscript || s.transcript }));
    try { rec?.abort(); } catch { /* already stopped */ }
    recognitionRef.current = null;

    return finalTranscript;
  }, []);

  return { ...state, start, stop };
}
