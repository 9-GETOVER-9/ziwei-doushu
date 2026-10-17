import type { BirthInfo } from './ziwei/types';
import { lunarToSolar } from './ziwei/lunar-solar';
import { isChinaDST } from './ziwei/dst-cn';
import {
  calculateTrueSolarTime, formatTrueSolarClock, isValidGregorianDate,
  resolveZiweiDayOffset, shiftGregorianDate,
} from './ziwei/true-solar-time';

/** 原始表单数据始终单独保存，不能以校正后的排盘日期覆盖出生记录。 */
export interface BirthFormState {
  name: string;
  year: string;
  month: string;
  day: string;
  clockHour: string;
  clockMinute: string;
  unknownTime: boolean;
  province: string;
  city: string;
  longitude: number;
  gender: 'male' | 'female';
  calendar?: 'solar' | 'lunar';
  isLeapMonth?: boolean;
  useTrueSolarTime?: boolean;
  dstCorrection?: boolean;
}

function integer(value: string, label: string, min: number, max: number): number {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) throw new Error(`请填写${label}`);
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) throw new Error(`${label}须在 ${min}–${max} 之间`);
  return parsed;
}

export function normalizeBirthInput(form: BirthFormState) {
  if (!form || typeof form !== 'object' || typeof form.name !== 'string' || typeof form.province !== 'string' || typeof form.city !== 'string' || typeof form.unknownTime !== 'boolean') throw new Error('出生资料格式无效，请重新填写');
  const year = integer(form.year, '年份', 1900, 2050);
  const month = integer(form.month, '月份', 1, 12);
  const day = integer(form.day, '日期', 1, 31);
  if (form.gender !== 'male' && form.gender !== 'female') throw new Error('请选择性别');
  if (form.calendar && form.calendar !== 'solar' && form.calendar !== 'lunar') throw new Error('历法无效');
  const solarDate = form.calendar === 'lunar'
    ? lunarToSolar(year, month, day, form.isLeapMonth ?? false)
    : isValidGregorianDate(year, month, day) ? { year, month, day } : null;
  if (!solarDate) throw new Error(form.calendar === 'lunar' ? '该农历日期或闰月不存在，请核对后再排盘' : '该公历日期不存在，请核对后再排盘');
  const identity = { gender: form.gender, name: form.name.trim() || undefined, province: form.province || undefined, city: form.city || undefined };
  const notes: string[] = [];
  if (form.calendar === 'lunar') notes.push(`农历已换算为公历 ${solarDate.year} 年 ${solarDate.month} 月 ${solarDate.day} 日`);
  if (form.unknownTime) {
    notes.push('出生时辰未知：暂以子时展示结构，宫位与格局均不能视为最终命盘。补全时辰后请重新排盘。');
    return { birthInfo: { ...solarDate, hour: 0, ...identity, unknownTime: true } as BirthInfo, solarDate, chartDate: solarDate, solarTime: null, notes };
  }
  const clockHour = integer(form.clockHour, '小时', 0, 23);
  const clockMinute = integer(form.clockMinute, '分钟', 0, 59);
  const correctSolar = form.useTrueSolarTime !== false && Boolean(form.province);
  if (correctSolar && (!Number.isFinite(form.longitude) || form.longitude < -180 || form.longitude > 180)) throw new Error('出生地经度无效，请重新选择城市');
  const subtractDST = Boolean(form.dstCorrection) && isChinaDST(solarDate.year, solarDate.month, solarDate.day);
  const solarTime = calculateTrueSolarTime({ ...solarDate, clockHour: clockHour - (subtractDST ? 1 : 0), clockMinute, longitude: correctSolar ? form.longitude : undefined });
  const dayOffset = resolveZiweiDayOffset(solarTime, 'next-day');
  const chartDate = shiftGregorianDate(solarDate, dayOffset);
  if (subtractDST) notes.push('已按所选夏令时读数减去 1 小时');
  if (correctSolar) notes.push(`真太阳时 ${formatTrueSolarClock(solarTime)}，含经度修正与均时差`);
  if (dayOffset) notes.push(`依真太阳时跨日及晚子时规则，排盘日为 ${chartDate.year} 年 ${chartDate.month} 月 ${chartDate.day} 日`);
  const birthInfo: BirthInfo = { ...chartDate, ...identity, hour: solarTime.branch, longitude: correctSolar ? form.longitude : undefined, origInput: { ...solarDate, clockHour, clockMinute } };
  return { birthInfo, solarDate, chartDate, solarTime, notes };
}
