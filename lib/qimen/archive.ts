import type { QimenChart } from './types';

export interface QimenArchive { id: string; savedAt: string; chart: QimenChart }
export const QIMEN_ARCHIVE_KEY = 'ziwei:qimen:archives:v1';
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const hasStrings = (v: Record<string, unknown>, keys: string[]) => keys.every(key => typeof v[key] === 'string');

// Archives are snapshots: never silently recalculate an old chart with new rules.
function validChart(c: unknown): c is QimenChart {
  if (!isRecord(c) || !hasStrings(c, ['version', 'method', 'timezone', 'lunarDate', 'solarTerm', 'solarTermAt', 'nextSolarTerm', 'nextSolarTermAt', 'yuan', 'fuTou', 'dun', 'xun', 'hiddenJia', 'voidBranches', 'horseBranch'])) return false;
  if (!isRecord(c.input) || !hasStrings(c.input, ['date', 'time', 'title']) || !isRecord(c.pillars) || !hasStrings(c.pillars, ['year', 'month', 'day', 'hour'])) return false;
  if (!Number.isInteger(c.ju) || Number(c.ju) < 1 || Number(c.ju) > 9 || !Array.isArray(c.rules) || !c.rules.every(r => typeof r === 'string')) return false;
  for (const [key, position] of [['chiefStar', 'origin'], ['chiefDoor', 'rawPalace']]) {
    const item = c[key];
    if (!isRecord(item) || typeof item.name !== 'string' || ![item.palace, item[position]].every(n => Number.isInteger(n) && Number(n) >= 1 && Number(n) <= 9)) return false;
  }
  return Array.isArray(c.palaces) && c.palaces.length === 9 && new Set(c.palaces.map(p => isRecord(p) ? p.number : null)).size === 9 && c.palaces.every(p =>
    isRecord(p) && Number.isInteger(p.number) && Number(p.number) >= 1 && Number(p.number) <= 9 &&
    hasStrings(p, ['name', 'direction', 'element', 'branches', 'door', 'deity', 'heavenStem', 'earthStem', 'hostedHeavenStem', 'hostedEarthStem', 'voidBranches']) &&
    Array.isArray(p.stars) && p.stars.every(s => typeof s === 'string') && ['horse', 'isChiefStar', 'isChiefDoor'].every(key => typeof p[key] === 'boolean'));
}

export function loadQimenArchives(): QimenArchive[] {
  let raw: string | null;
  try { raw = localStorage.getItem(QIMEN_ARCHIVE_KEY); }
  catch { throw new Error('浏览器未允许读取本地盘库；仍可起盘并导出文件。'); }
  if (!raw) return [];
  try {
    const entries: unknown = JSON.parse(raw);
    if (!Array.isArray(entries) || !entries.every(e => isRecord(e) && typeof e.id === 'string' && typeof e.savedAt === 'string' && validChart(e.chart))) throw new Error();
    return entries as QimenArchive[];
  } catch { throw new Error('本地奇门盘库格式异常，已保留原数据。请先备份浏览器数据；当前盘仍可导出。'); }
}

function writeArchives(entries: QimenArchive[]): QimenArchive[] {
  try { localStorage.setItem(QIMEN_ARCHIVE_KEY, JSON.stringify(entries)); }
  catch { throw new Error('本地保存失败，可能是空间不足或浏览器限制。请先导出 MD。'); }
  return entries;
}

export function saveQimenArchive(chart: QimenChart): QimenArchive[] {
  if (!validChart(chart)) throw new Error('盘面数据不完整，无法存档。');
  const entries = loadQimenArchives();
  const id = JSON.stringify([chart.version, chart.input.date, chart.input.time, chart.input.title]);
  return writeArchives([{ id, savedAt: new Date().toISOString(), chart }, ...entries.filter(e => e.id !== id)]);
}

export function deleteQimenArchive(id: string): QimenArchive[] {
  return writeArchives(loadQimenArchives().filter(entry => entry.id !== id));
}
