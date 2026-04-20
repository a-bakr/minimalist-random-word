'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import type { WordEntry } from '../types';

export function WordItem({ word, fontSize }: { word: WordEntry; fontSize: number }) {
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
