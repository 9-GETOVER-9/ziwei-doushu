import type { BirthInfo } from './ziwei/types';
import { normalizeBirthInput, type BirthFormState } from './input-normalize';
import { shiftGregorianDate, type GregorianDate } from './ziwei/true-solar-time';
import { PROVINCES } from './ziwei/cities';

export interface TwinCity { name: string; province: string; longitude: number }
export interface ClockMinute extends GregorianDate { hour: number; minute: number }
export interface TwinTimeWindow { start: ClockMinute; end: ClockMinute }
export interface TwinCityWindows { city: TwinCity; windows: TwinTimeWindow[] }

const cityNames = ['北京', '上海', '广州', '成都', '武汉', '西安', '乌鲁木齐', '哈尔滨'];
export const COMMON_TWIN_CITIES: readonly TwinCity[] = cityNames.flatMap(name => {
  for (const province of PROVINCES) {
    const city = province.cities.find(item => item.name === name);
    if (city) return [{ name, province: province.name, longitude: city.longitude }];
  }
  return [];
});

function sameFingerprint(left: BirthInfo, right: BirthInfo) {
  return left.year === right.year && left.month === right.month && left.day === right.day
    && left.hour === right.hour && left.gender === right.gender;
}

/** Reconstruct a real form for verification links, never a fabricated person. */
export function twinWindowForm(source: BirthFormState, city: TwinCity, time: ClockMinute): BirthFormState {
  return {
    ...source, name: `${city.name} · 同盘时段核对`,
    year: String(time.year), month: String(time.month), day: String(time.day),
    clockHour: String(time.hour), clockMinute: String(time.minute),
    province: city.province, city: city.name, longitude: city.longitude,
    calendar: 'solar', isLeapMonth: false, unknownTime: false, useTrueSolarTime: true,
  };
}

/**
 * Minute-resolution reverse lookup through the SAME normalizer used by /chart.
 * Scan the chart date and both adjacent civil dates, merging only consecutive
 * confirmed minutes. China city offsets fit this interval, including late zi
 * and the input's explicit DST policy. No people or sample database is queried.
 */
export function calculateTwinTimeWindows(birthInfo: BirthInfo, form: BirthFormState, cities: readonly TwinCity[] = COMMON_TWIN_CITIES): TwinCityWindows[] {
  if (form.unknownTime) return [];
  if (!sameFingerprint(normalizeBirthInput(form).birthInfo, birthInfo)) throw new Error('出生信息已经变化，请先更新命盘，再换算各地时段。');
  const results: TwinCityWindows[] = [];
  for (const city of cities) {
    const knownCity = PROVINCES.find(province => province.name === city.province)?.cities
      .some(item => item.name === city.name && item.longitude === city.longitude);
    if (!knownCity) {
      throw new Error('当前时段换算只支持城市库中的中国城市经度。');
    }
    const windows: TwinTimeWindow[] = [];
    let active: TwinTimeWindow | null = null;
    const closeWindow = () => { if (active) windows.push(active); active = null; };
    for (const dayOffset of [-1, 0, 1]) {
      const date = shiftGregorianDate(birthInfo, dayOffset);
      // These are the actual accepted civil-year limits of normalizeBirthInput.
      if (date.year < 1900 || date.year > 2050) { closeWindow(); continue; }
      for (let minuteOfDay = 0; minuteOfDay < 1440; minuteOfDay++) {
        const time = { ...date, hour: Math.floor(minuteOfDay / 60), minute: minuteOfDay % 60 };
        const candidate = normalizeBirthInput(twinWindowForm(form, city, time)).birthInfo;
        if (sameFingerprint(candidate, birthInfo)) {
          if (!active) active = { start: time, end: time };
          else active.end = time;
        } else closeWindow();
      }
    }
    closeWindow();
    if (windows.length) results.push({ city, windows });
  }
  return results;
}
