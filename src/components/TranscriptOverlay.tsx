'use client';

import { motion, AnimatePresence } from 'motion/react';

export function TranscriptOverlay({ text, onDismiss }: { text: string; onDismiss: () => void }) {
  return (
    <AnimatePresence>
      {text && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.3 }}
          className="absolute bottom-28 left-1/2 -translate-x-1/2 w-[90vw] max-w-sm text-center text-sm leading-relaxed text-zinc-500 dark:text-zinc-400 select-none px-4 cursor-pointer"
          onClick={e => { e.stopPropagation(); onDismiss(); }}
        >
          {text}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
