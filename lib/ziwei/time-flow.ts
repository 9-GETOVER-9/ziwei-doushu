/**
 * Shared, deterministic flow overlays; no React/server-only state and no natal
 * chart regeneration. Rules follow iztro 2.6.1 FunctionalAstrolabe horoscope
 * (https://github.com/SylarLong/iztro/blob/v2.6.1/src/astro/FunctionalAstrolabe.ts)
 * with horoscopeDivide/ageDivide='normal': lunar New Year, nominal lunar age,
 * Doujun month positions, leap days 1–15 in their month / 16+ in the next month.
 * Lunar calendar conversion uses the installed lunar-javascript. Four changes
 * are separate overlays from SI_HUA_TABLE; natal stars and mutations stay intact.
 * The input is an already-resolved calendar day with branch 0..11: hour 0 is
 * early zi on this day. Raw 23:xx late-zi dates must be resolved before this API.
 */
import { Lunar, LunarMonth, Solar } from 'lunar-javascript';
import { BRANCHES, SI_HUA_TABLE, STEMS } from './constants';
import type { SiHua, ZiweiChart } from './types';

/** year/month/day are lunar; a negative month denotes the leap month. */
export interface FlowSelection { year: number; month: number; day: number; hour: number }
export interface FlowSolarDate { year: number; month: number; day: number }
export interface FlowMonth { month: number; label: string; days: number }
export interface FlowDay { day: number; label: string }
export interface FlowDecade {
  index: number; startAge: number; endAge: number; startYear: number; endYear: number;
  palaceBranch: number | null; palaceName: string; stemIndex: number | null;
}
export interface FlowLevel {
  palaceBranch: number; stemIndex: number; stemName: string; branchIndex: number; branchName: string;
  siHua: Record<string, SiHua>; palaceNames: Record<number, string>;
}
export interface TimeFlow {
  selection: FlowSelection; solarDate: FlowSolarDate; lunarDate: string; nominalAge: number;
  isChildhood: boolean; childhoodPalaceBranch: number | null; decadalIndex: number; clamped: boolean;
  levels: { decadal: FlowLevel | null; yearly: FlowLevel; monthly: FlowLevel; daily: FlowLevel; hourly: FlowLevel };
}

const mod = (value: number, base = 12) => ((value % base) + base) % base;
const MONTH_NAMES = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];
const DAY_NAMES = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十', '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];
const monthLabel = (month: number) => `${month < 0 ? '闰' : ''}${MONTH_NAMES[Math.abs(month) - 1]}月`;
const dateValue = ({ year, month, day }: FlowSolarDate) => year * 10000 + month * 100 + day;

function assertYear(year: number) {
  if (!Number.isInteger(year) || year < 1 || year > 9999) throw new RangeError('年份必须为有效的四位历法年份');
}
function assertHour(hour: number) {
  if (!Number.isInteger(hour) || hour < 0 || hour > 11) throw new RangeError('时辰必须为 0–11 的地支索引');
}
function monthDays(year: number, month: number) {
  assertYear(year);
  if (!Number.isInteger(month) || month === 0 || Math.abs(month) > 12) throw new RangeError('农历月份无效');
  const days = LunarMonth.fromYm(year, month)?.getDayCount();
  if (days !== 29 && days !== 30) throw new RangeError('该农历月份不存在');
  return days;
}

export function getFlowMonths(year: number): FlowMonth[] {
  assertYear(year);
  const months: FlowMonth[] = [];
  for (let month = 1; month <= 12; month++) {
    months.push({ month, label: monthLabel(month), days: monthDays(year, month) });
    const leapDays = LunarMonth.fromYm(year, -month)?.getDayCount();
    if (leapDays === 29 || leapDays === 30) months.push({ month: -month, label: monthLabel(-month), days: leapDays });
  }
  return months;
}

export function getFlowDays(year: number, month: number): FlowDay[] {
  return Array.from({ length: monthDays(year, month) }, (_, index) => ({ day: index + 1, label: DAY_NAMES[index] }));
}

/** Explicit civil date avoids Date parsing, UTC conversion and host-timezone drift. */
export function flowSelectionFromSolar(date: FlowSolarDate, hour = 0): FlowSelection {
  assertYear(date.year); assertHour(hour);
  const probe = new Date(0);
  probe.setUTCFullYear(date.year, date.month - 1, date.day);
  if (!Number.isInteger(date.month) || !Number.isInteger(date.day) || probe.getUTCFullYear() !== date.year || probe.getUTCMonth() + 1 !== date.month || probe.getUTCDate() !== date.day) throw new RangeError('公历日期不存在');
  const solar = Solar.fromYmd(date.year, date.month, date.day);
  const lunar = solar.getLunar();
  return { year: lunar.getYear(), month: lunar.getMonth(), day: lunar.getDay(), hour };
}

export function flowSelectionToSolar(selection: FlowSelection): FlowSolarDate {
  assertHour(selection.hour);
  const days = monthDays(selection.year, selection.month);
  if (!Number.isInteger(selection.day) || selection.day < 1 || selection.day > days) throw new RangeError('该农历日期不存在');
  const solar = Lunar.fromYmd(selection.year, selection.month, selection.day).getSolar();
  return { year: solar.getYear(), month: solar.getMonth(), day: solar.getDay() };
}

export function getFlowDecades(chart: ZiweiChart): FlowDecade[] {
  const birthYear = flowSelectionFromSolar(chart.birthInfo, chart.birthInfo.hour).year;
  const decades = chart.daXians.map((decade, index) => ({
    index, startAge: decade.startAge, endAge: decade.endAge,
    startYear: birthYear + decade.startAge - 1, endYear: birthYear + decade.endAge - 1,
    palaceBranch: decade.palaceBranch, palaceName: decade.palaceName,
    stemIndex: chart.palaces.find(palace => palace.branch === decade.palaceBranch)?.stem ?? null,
  }));
  const firstAge = decades[0]?.startAge ?? chart.wuxingJu;
  return firstAge > 1 ? [{ index: -1, startAge: 1, endAge: firstAge - 1, startYear: birthYear, endYear: birthYear + firstAge - 2, palaceBranch: null, palaceName: '童限', stemIndex: null }, ...decades] : decades;
}

/** Preserve lower selections when changing a parent, and clamp missing leap days. */
export function clampFlowSelection(chart: ZiweiChart, selection: FlowSelection): FlowSelection {
  assertYear(selection.year); assertHour(selection.hour);
  if (!Number.isInteger(selection.month) || selection.month === 0 || Math.abs(selection.month) > 12) throw new RangeError('农历月份无效');
  if (!Number.isInteger(selection.day) || selection.day < 1) throw new RangeError('农历日期无效');
  const months = getFlowMonths(selection.year);
  const month = months.find(item => item.month === selection.month) ?? months.find(item => item.month === Math.abs(selection.month))!;
  const normalized = { ...selection, month: month.month, day: Math.min(selection.day, month.days) };
  const solar = flowSelectionToSolar(normalized);
  if (dateValue(solar) < dateValue(chart.birthInfo) || (dateValue(solar) === dateValue(chart.birthInfo) && normalized.hour < chart.birthInfo.hour)) return flowSelectionFromSolar(chart.birthInfo, chart.birthInfo.hour);
  const last = getFlowDecades(chart).at(-1);
  if (last && normalized.year > last.endYear) return { year: last.endYear, month: 12, day: monthDays(last.endYear, 12), hour: 11 };
  return normalized;
}

function makeLevel(chart: ZiweiChart, palaceBranch: number, stemIndex: number, branchIndex: number): FlowLevel {
  const siHua: Record<string, SiHua> = {};
  SI_HUA_TABLE[stemIndex].forEach((star, index) => { siHua[star] = (['禄', '权', '科', '忌'] as SiHua[])[index]; });
  const palaceNames: Record<number, string> = {};
  for (let branch = 0; branch < 12; branch++) {
    const offset = mod(palaceBranch - branch);
    palaceNames[branch] = chart.palaces.find(palace => palace.branch === mod(chart.mingGongBranch - offset))?.name ?? '';
  }
  return { palaceBranch, stemIndex, stemName: STEMS[stemIndex], branchIndex, branchName: BRANCHES[branchIndex], siHua, palaceNames };
}

export function getTimeFlow(chart: ZiweiChart, input: FlowSelection): TimeFlow {
  if (chart.birthInfo.unknownTime) throw new Error('出生时辰未知，请补全时辰后查看运限');
  const selection = clampFlowSelection(chart, input);
  const solarDate = flowSelectionToSolar(selection);
  const lunar = Lunar.fromYmd(selection.year, selection.month, selection.day);
  const birthLunar = flowSelectionFromSolar(chart.birthInfo, chart.birthInfo.hour);
  const nominalAge = selection.year - birthLunar.year + 1;
  const decadalIndex = chart.daXians.findIndex(decade => nominalAge >= decade.startAge && nominalAge <= decade.endAge);
  const isChildhood = decadalIndex < 0 && nominalAge < (chart.daXians[0]?.startAge ?? chart.wuxingJu);
  const childhoodOrder = ['命宫', '财帛', '疾厄', '夫妻', '福德', '官禄'];
  const childhoodPalaceBranch = isChildhood ? chart.palaces.find(palace => palace.name === childhoodOrder[nominalAge - 1] || palace.name === `${childhoodOrder[nominalAge - 1]}宫`)?.branch ?? null : null;
  const decade = chart.daXians[decadalIndex];
  const decadePalace = decade ? chart.palaces.find(palace => palace.branch === decade.palaceBranch) : undefined;
  const yearStem = STEMS.indexOf(lunar.getYearGan());
  const yearBranch = BRANCHES.indexOf(lunar.getYearZhi());
  const effectiveMonth = Math.abs(selection.month) + (selection.month < 0 && selection.day > 15 ? 1 : 0);
  // The natal effective lunar month already carries the chart's selected leap policy.
  const natalMonth = Math.abs(chart.lunarInfo.lunarMonth);
  const monthPalace = mod(yearBranch - natalMonth + chart.birthInfo.hour + effectiveMonth);
  const monthStem = mod((yearStem % 5) * 2 + 2 + effectiveMonth - 1, 10);
  const monthBranch = mod(effectiveMonth + 1);
  const dayPalace = mod(monthPalace + selection.day - 1);
  const dayStem = STEMS.indexOf(lunar.getDayGan());
  const dayBranch = BRANCHES.indexOf(lunar.getDayZhi());
  const hourPalace = mod(dayPalace + selection.hour);
  const hourStem = mod((dayStem % 5) * 2 + selection.hour, 10);
  return {
    selection, solarDate, lunarDate: `${selection.year}年${monthLabel(selection.month)}${DAY_NAMES[selection.day - 1]}`,
    nominalAge, isChildhood, childhoodPalaceBranch, decadalIndex,
    clamped: selection.year !== input.year || selection.month !== input.month || selection.day !== input.day || selection.hour !== input.hour,
    levels: {
      decadal: decadePalace ? makeLevel(chart, decadePalace.branch, decadePalace.stem, decadePalace.branch) : null,
      yearly: makeLevel(chart, yearBranch, yearStem, yearBranch),
      monthly: makeLevel(chart, monthPalace, monthStem, monthBranch),
      daily: makeLevel(chart, dayPalace, dayStem, dayBranch),
      hourly: makeLevel(chart, hourPalace, hourStem, selection.hour),
    },
  };
}
