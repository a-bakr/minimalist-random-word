'use client';

import { motion, AnimatePresence } from 'motion/react';

export function HintOverlay({ visible, fontSize, isDark }: { visible: boolean; fontSize: number; isDark: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
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
  );
}
