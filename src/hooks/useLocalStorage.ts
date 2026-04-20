'use client';

import { useState, useCallback } from 'react';

export function useLocalStorage(key: string, defaultValue: number): [number, (v: number) => void] {
  const [value, setValue] = useState(() => {
    const stored = localStorage.getItem(key);
    return stored ? Number(stored) : defaultValue;
  });

  const set = useCallback(
    (v: number) => {
      setValue(v);
      localStorage.setItem(key, String(v));
    },
    [key],
  );

  return [value, set];
}

export function useLocalStorageBool(key: string, defaultValue: boolean): [boolean, (v: boolean) => void] {
  const [value, setValue] = useState(() => {
    const stored = localStorage.getItem(key);
    return stored !== null ? stored !== 'false' : defaultValue;
  });

  const set = useCallback(
    (v: boolean) => {
      setValue(v);
      localStorage.setItem(key, String(v));
    },
    [key],
  );

  return [value, set];
}
