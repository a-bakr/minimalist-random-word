'use client';

import { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Recording } from '../types';

export function TranscriptCard({
  recording,
  onClose,
}: {
  recording: Recording | null;
  onClose: () => void;
}) {
  const cardTapRef = useRef<{ x: number; y: number } | null>(null);

  return (
    <AnimatePresence>
      {recording && (
        <>
          <motion.div
            className="fixed inset-0 z-[25]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed z-[30]
              bottom-20 left-0 right-0 rounded-2xl mx-3 px-5 py-4
              sm:mx-0 sm:right-6 sm:left-auto sm:w-72
              bg-zinc-50/98 dark:bg-zinc-900/98 backdrop-blur-xl cursor-pointer"
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            onPointerDown={e => { cardTapRef.current = { x: e.clientX, y: e.clientY }; }}
            onClick={e => {
              e.stopPropagation();
              if (!cardTapRef.current) return;
              const dx = Math.abs(e.clientX - cardTapRef.current.x);
              const dy = Math.abs(e.clientY - cardTapRef.current.y);
              if (dx < 8 && dy < 8) onClose();
            }}
          >
            <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 max-h-[40vh] overflow-y-auto sm:max-h-48 scrollbar-thin-dark select-none">
              {recording.transcript
                ? recording.transcript
                : <span className="text-zinc-400 dark:text-zinc-600 italic">No transcript</span>}
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
