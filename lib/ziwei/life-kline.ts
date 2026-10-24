/**
 * A transparent product index, not a classical Ziwei scoring rule or calibrated
 * prediction. All calendar/flow facts come from time-flow; no random values,
 * daily extrema, lifespan assumptions, current-clock input or AI scores.
 * Shared by the client graph and server route; keep this module platform-neutral.
 */
import { BRANCHES } from './constants';
import { flowSelectionFromSolar, getFlowDecades, getFlowMonths, getTimeFlow, type FlowSelection, type FlowSolarDate, type TimeFlow } from './time-flow';
import type { Palace, SiHua, ZiweiChart } from './types';

export type LifeTheme = 'overall' | 'career' | 'wealth' | 'relationship';
export type LifeKlineScope = 'natal' | 'decadal' | 'yearly' | 'monthly';
export type LifeKlineRelation = '本宫' | '三合' | '对宫';

export const LIFE_THEMES: ReadonlyArray<{ key: LifeTheme; label: string; palace: string }> = [
  { key: 'overall', label: '综合', palace: '命宫' },
  { key: 'career', label: '事业', palace: '官禄' },
  { key: 'wealth', label: '财帛', palace: '财帛' },
  { key: 'relationship', label: '关系', palace: '夫妻' },
];

export const LIFE_KLINE_METHOD = {
  version: 'sihua-month-segment-v1',
  label: '四化月段指数',
  baseline: 50,
  range: [0, 100] as const,
  scopeWeights: { natal: 1, decadal: 1, yearly: 1, monthly: 1 },
  siHuaWeights: { 禄: 4, 权: 3, 科: 2, 忌: -5 },
  relationWeights: { 本宫: 1, 三合: 0.5, 对宫: 0.5, 其他: 0 },
  description: '本产品公开的可视化约定，不是古籍规定的分数、事件概率、财富金额或寿命预测。目标始终是所选主题的本命宫位。',
  formula: '原始指数 = 50 + Σ（四化权重 × 时间层权重 × 与本命目标宫的关系权重）；显示值限制在 0–100，保留两位小数。其他宫位权重为 0，不列入贡献。',
  sampling: '每个真实农历月采样一次；闰月以初一、十六分为两段。出生段从出生排盘日及时辰起；开/收为首/末有效月段指数，高/低仅为月段采样极值，不是逐日极值。',
  scopeDescription: '只计算本命、大限、流年、流月四化；童限没有大限四化。不计算主星亮度、格局、流日、流时或自化评分。',
  calendarLimit: '公历 2100-12-31；每盘最多展示 100 个农历年，并受现有大限范围限制。',
} as const;

export interface LifeKlineContribution {
  scope: LifeKlineScope;
  scopeLabel: string;
  star: string;
  siHua: SiHua;
  branch: number;
  palace: string;
  relation: LifeKlineRelation;
  relationWeight: number;
  scopeWeight: number;
  siHuaWeight: number;
  value: number;
  evidence: string;
}
export interface LifeKlineMonth {
  label: string;
  selection: FlowSelection;
  solarDate: FlowSolarDate;
  startDay: number;
  endDay: number;
  score: number;
  rawScore: number;
  contributions: LifeKlineContribution[];
}
export interface LifeKlineYear {
  year: number;
  age: number;
  stemBranch: string;
  decadeLabel: string;
  open: number;
  close: number;
  high: number;
  low: number;
  partial: boolean;
  partialReasons: string[];
  months: LifeKlineMonth[];
}
export interface LifeKlineSeries {
  theme: LifeTheme;
  themeLabel: string;
  targetPalace: string;
  methodVersion: string;
  startYear: number;
  endYear: number;
  years: LifeKlineYear[];
}

interface LocatedChange { scope: LifeKlineScope; star: string; siHua: SiHua; palace: Palace }
interface SegmentFacts {
  label: string; startDay: number; endDay: number; flow: TimeFlow; changes: LocatedChange[];
}
interface CachedYear {
  facts: SegmentFacts[];
  partialReasons: string[];
  themes: Map<LifeTheme, LifeKlineYear>;
}
interface ChartCache {
  signature: string;
  birth: FlowSelection;
  startYear: number;
  endYear: number;
  starPalaces: Map<string, Palace>;
  natal: LocatedChange[];
  years: Map<number, CachedYear>;
}

const scopeLabels: Record<LifeKlineScope, string> = { natal: '本命', decadal: '大限', yearly: '流年', monthly: '流月' };
const caches = new WeakMap<ZiweiChart, ChartCache>();
const calendarEnd: FlowSolarDate = { year: 2100, month: 12, day: 31 };
const solarValue = (date: FlowSolarDate) => date.year * 10000 + date.month * 100 + date.day;
const normalizedPalace = (name: string) => name.replace(/宫$/, '');
const round = (number: number) => Math.round(number * 100) / 100;

function getTheme(theme: LifeTheme) {
  const found = LIFE_THEMES.find(item => item.key === theme);
  if (!found) throw new RangeError('人生 K 线主题无效');
  return found;
}

/** Only natal fields affecting this formula enter the key. Current age, private
 * labels, time of execution and the highlighted decade never affect the result.
 * The signature also prevents stale results if a caller edits a chart in place.
 */
function getChartCache(chart: ZiweiChart): ChartCache {
  if (chart.birthInfo.unknownTime) throw new RangeError('出生时辰未知，请补全时辰后查看人生 K 线');
  const b = chart.birthInfo;
  const signature = JSON.stringify([
    b.year, b.month, b.day, b.hour, b.gender, chart.lunarInfo.lunarMonth, chart.mingGongBranch, chart.wuxingJu,
    chart.palaces.map(palace => [palace.branch, palace.stem, palace.name, palace.stars.map(star => [star.name, star.siHua])]),
    chart.daXians.map(decade => [decade.startAge, decade.endAge, decade.palaceBranch, decade.palaceName]),
  ]);
  const previous = caches.get(chart);
  if (previous?.signature === signature) return previous;
  const birth = flowSelectionFromSolar(b, b.hour);
  const lastDecade = getFlowDecades(chart).at(-1);
  const endYear = Math.min(birth.year + 99, 2100, lastDecade?.endYear ?? birth.year);
  if (birth.year > endYear || solarValue(b) > solarValue(calendarEnd)) throw new RangeError('出生年份超出人生 K 线历法范围');
  const starPalaces = new Map<string, Palace>();
  const natal: LocatedChange[] = [];
  for (const palace of chart.palaces) {
    for (const star of palace.stars) {
      starPalaces.set(star.name, palace);
      if (star.siHua) natal.push({ scope: 'natal', star: star.name, siHua: star.siHua, palace });
    }
  }
  const cache: ChartCache = { signature, birth, startYear: birth.year, endYear, starPalaces, natal, years: new Map() };
  caches.set(chart, cache);
  return cache;
}

function assertYear(cache: ChartCache, year: number) {
  if (!Number.isInteger(year) || year < cache.startYear || year > cache.endYear) {
    throw new RangeError(`年份必须在本盘农历 ${cache.startYear}–${cache.endYear} 年范围内`);
  }
}

function getYearFacts(chart: ZiweiChart, cache: ChartCache, year: number): CachedYear {
  const existing = cache.years.get(year);
  if (existing) return existing;
  const months = getFlowMonths(year);
  const birthMonthIndex = year === cache.birth.year ? months.findIndex(month => month.month === cache.birth.month) : -1;
  const cutoff = flowSelectionFromSolar(calendarEnd, 11);
  const cutoffMonthIndex = year === cutoff.year ? months.findIndex(month => month.month === cutoff.month) : months.length;
  const facts: SegmentFacts[] = [];
  const partialReasons: string[] = [];
  if (year === cache.birth.year && (cache.birth.month !== 1 || cache.birth.day !== 1 || cache.birth.hour !== 0)) {
    partialReasons.push('出生首年仅含出生排盘时刻起的有效月段');
  }
  if (year === cutoff.year) partialReasons.push('末年截至公历 2100-12-31，不含之后的月段');
  months.forEach((month, monthIndex) => {
    if (monthIndex < birthMonthIndex || monthIndex > cutoffMonthIndex) return;
    const segments = month.month < 0 ? [[1, 15], [16, month.days]] : [[1, month.days]];
    for (const [segmentStart, segmentEnd] of segments) {
      let startDay = segmentStart;
      let endDay = segmentEnd;
      let hour = 0;
      if (monthIndex === birthMonthIndex) {
        if (endDay < cache.birth.day) continue;
        if (startDay <= cache.birth.day) { startDay = cache.birth.day; hour = cache.birth.hour; }
      }
      if (monthIndex === cutoffMonthIndex) endDay = Math.min(endDay, cutoff.day);
      if (startDay > endDay) continue;
      const selection: FlowSelection = { year, month: month.month, day: startDay, hour };
      const flow = getTimeFlow(chart, selection);
      if (flow.clamped || solarValue(flow.solarDate) > solarValue(calendarEnd)) throw new RangeError('月段超出有效排盘范围');
      const changes = [...cache.natal];
      for (const scope of ['decadal', 'yearly', 'monthly'] as const) {
        const level = flow.levels[scope];
        if (!level) continue;
        for (const [star, siHua] of Object.entries(level.siHua)) {
          const palace = cache.starPalaces.get(star);
          if (!palace) throw new Error(`命盘缺少四化星曜：${star}`);
          changes.push({ scope, star, siHua, palace });
        }
      }
      const label = `${month.label} ${startDay === endDay ? startDay : `${startDay}–${endDay}`}日`;
      facts.push({ label, startDay, endDay, flow, changes });
    }
  });
  if (!facts.length) throw new RangeError('该年份没有出生后且在历法范围内的月段');
  const result: CachedYear = { facts, partialReasons, themes: new Map() };
  cache.years.set(year, result);
  return result;
}

function relationOf(branch: number, target: number): LifeKlineRelation | null {
  const offset = ((branch - target) % 12 + 12) % 12;
  return offset === 0 ? '本宫' : offset === 4 || offset === 8 ? '三合' : offset === 6 ? '对宫' : null;
}

function scoreYear(chart: ZiweiChart, cache: ChartCache, theme: LifeTheme, year: number): LifeKlineYear {
  const facts = getYearFacts(chart, cache, year);
  const cached = facts.themes.get(theme);
  if (cached) return cached;
  const definition = getTheme(theme);
  const target = chart.palaces.find(palace => normalizedPalace(palace.name) === normalizedPalace(definition.palace));
  if (!target) throw new Error(`命盘缺少主题宫位：${definition.palace}`);
  const months = facts.facts.map(({ label, startDay, endDay, flow, changes }): LifeKlineMonth => {
    const contributions: LifeKlineContribution[] = [];
    for (const change of changes) {
      const relation = relationOf(change.palace.branch, target.branch);
      if (!relation) continue;
      const relationWeight = LIFE_KLINE_METHOD.relationWeights[relation];
      const scopeWeight = LIFE_KLINE_METHOD.scopeWeights[change.scope];
      const siHuaWeight = LIFE_KLINE_METHOD.siHuaWeights[change.siHua];
      const value = round(relationWeight * scopeWeight * siHuaWeight);
      const scopeLabel = scopeLabels[change.scope];
      contributions.push({
        scope: change.scope, scopeLabel, star: change.star, siHua: change.siHua,
        branch: change.palace.branch, palace: change.palace.name, relation,
        relationWeight, scopeWeight, siHuaWeight, value,
        evidence: `${scopeLabel}化${change.siHua}：${change.star}落本命${change.palace.name}（${BRANCHES[change.palace.branch]}），与本命${target.name}为${relation}；${siHuaWeight} × ${scopeWeight} × ${relationWeight} = ${value > 0 ? '+' : ''}${value}`,
      });
    }
    const rawScore = round(LIFE_KLINE_METHOD.baseline + contributions.reduce((sum, item) => sum + item.value, 0));
    return { label, selection: { ...flow.selection }, solarDate: { ...flow.solarDate }, startDay, endDay, rawScore,
      score: round(Math.min(100, Math.max(0, rawScore))), contributions };
  });
  const firstFlow = facts.facts[0].flow;
  const decade = chart.daXians[firstFlow.decadalIndex];
  const result: LifeKlineYear = {
    year, age: firstFlow.nominalAge,
    stemBranch: firstFlow.levels.yearly.stemName + firstFlow.levels.yearly.branchName,
    decadeLabel: decade ? `${decade.startAge}–${decade.endAge}岁 · ${decade.palaceName}大限` : '童限',
    open: months[0].score, close: months.at(-1)!.score,
    high: Math.max(...months.map(month => month.score)), low: Math.min(...months.map(month => month.score)),
    partial: facts.partialReasons.length > 0, partialReasons: [...facts.partialReasons], months,
  };
  facts.themes.set(theme, result);
  return result;
}

/** Cheap range discovery lets clients generate one year per event-loop turn. */
export function getLifeKlineRange(chart: ZiweiChart): { startYear: number; endYear: number } {
  const { startYear, endYear } = getChartCache(chart);
  return { startYear, endYear };
}

/** Computes only this year's facts; a server request never builds a century. */
export function getLifeKlineYear(chart: ZiweiChart, theme: LifeTheme, year: number): LifeKlineYear {
  getTheme(theme);
  const cache = getChartCache(chart);
  assertYear(cache, year);
  return scoreYear(chart, cache, theme, year);
}

/** Cache is weakly scoped to the natal chart; changing theme reuses all calendars. */
export function buildLifeKline(chart: ZiweiChart, theme: LifeTheme): LifeKlineSeries {
  const definition = getTheme(theme);
  const cache = getChartCache(chart);
  const years: LifeKlineYear[] = [];
  for (let year = cache.startYear; year <= cache.endYear; year++) years.push(scoreYear(chart, cache, theme, year));
  return { theme, themeLabel: definition.label, targetPalace: definition.palace, methodVersion: LIFE_KLINE_METHOD.version,
    startYear: cache.startYear, endYear: cache.endYear, years };
}

/** Month-level rows preserve reproducible evidence and annual OHLC. Deliberately
 * omits identity/location/raw birth input; quote every field and neutralize CSV
 * formula prefixes even if a consumer supplies a non-engine series object.
 */
export function exportCsv(series: LifeKlineSeries): string {
  const cell = (value: unknown) => {
    const text = String(value ?? '');
    // Negative numeric month indices are valid calendar data, not formulas.
    const numeric = typeof value === 'number' && Number.isFinite(value);
    const safe = !numeric && /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const rows: unknown[][] = [
    ['方法版本', series.methodVersion, LIFE_KLINE_METHOD.label],
    ['指数含义', LIFE_KLINE_METHOD.description],
    ['采样说明', LIFE_KLINE_METHOD.sampling],
    ['公式', LIFE_KLINE_METHOD.formula],
    ['四化权重', JSON.stringify(LIFE_KLINE_METHOD.siHuaWeights), '时间层权重', JSON.stringify(LIFE_KLINE_METHOD.scopeWeights), '宫位关系权重', JSON.stringify(LIFE_KLINE_METHOD.relationWeights)],
    ['主题', series.themeLabel, '本命目标宫', series.targetPalace],
    ['农历年', '虚岁', '年干支', '大限', '开', '收', '月段采样高', '月段采样低', '非完整年说明', '月段', '农历月（负数为闰月）', '采样日', '采样时辰索引', '公历采样日', '有效起日', '有效止日', '指数', '原始指数', '贡献合计', '贡献依据'],
  ];
  for (const year of series.years) for (const month of year.months) {
    rows.push([year.year, year.age, year.stemBranch, year.decadeLabel, year.open, year.close, year.high, year.low, year.partialReasons.join('；'),
      month.label, month.selection.month, month.selection.day, month.selection.hour,
      `${month.solarDate.year}-${String(month.solarDate.month).padStart(2, '0')}-${String(month.solarDate.day).padStart(2, '0')}`,
      month.startDay, month.endDay, month.score, month.rawScore, round(month.rawScore - LIFE_KLINE_METHOD.baseline), month.contributions.map(row => row.evidence).join('；')]);
  }
  return '\uFEFF' + rows.map(row => row.map(cell).join(',')).join('\r\n');
}
