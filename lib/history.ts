'use client';

import { useEffect, useState } from 'react';
import { normalizeBirthInput, type BirthFormState } from './input-normalize';

export interface ChartArchive {
  id: string;
  form: BirthFormState;
  savedAt: number;
}

const KEY = 'ziwei-studio-archives-v1';

function readArchives(): ChartArchive[] {
  const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? localStorage.getItem('ziwei_history') ?? '[]');
  if (!Array.isArray(raw)) return [];
  return raw.filter((entry): entry is ChartArchive => {
    if (!entry || typeof entry !== 'object' || typeof entry.id !== 'string' || typeof entry.savedAt !== 'number') return false;
    try { normalizeBirthInput(entry.form); return true; } catch { return false; }
  });
}

export function useChartArchives() {
  const [archives, setArchives] = useState<ChartArchive[]>([]);
  const [storageError, setStorageError] = useState('');
  useEffect(() => {
    try { setArchives(readArchives()); } catch { setStorageError('本地档案暂时无法读取。排盘仍可正常使用。'); }
  }, []);

  const persist = (next: ChartArchive[]) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      setArchives(next);
      setStorageError('');
      return true;
    } catch {
      setStorageError('浏览器未允许保存档案，或本地空间不足。可以先导出命盘。');
      return false;
    }
  };

  const save = (form: BirthFormState) => {
    normalizeBirthInput(form);
    const signature = JSON.stringify(form);
    const remaining = archives.filter(entry => JSON.stringify(entry.form) !== signature);
    return persist([{ id: crypto.randomUUID(), form: { ...form }, savedAt: Date.now() }, ...remaining]);
  };
  const remove = (id: string) => persist(archives.filter(entry => entry.id !== id));
  return { archives, save, remove, storageError };
}
