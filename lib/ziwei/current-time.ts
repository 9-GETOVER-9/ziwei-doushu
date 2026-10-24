import { Solar } from 'lunar-javascript';
import type { BirthInfo } from './types';

interface SolarDay { year: number; month: number; day: number }

/** Current chart day uses China civil time and resolves 23:xx to next-day zi. */
export function resolveCurrentZiweiTime(now: Date = new Date()): { solarDate: SolarDay; hour: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', hourCycle: 'h23',
  }).formatToParts(now);
  const part = (name: string) => Number(parts.find(item => item.type === name)?.value);
  const clockHour = part('hour');
  const day = new Date(Date.UTC(part('year'), part('month') - 1, part('day') + (clockHour === 23 ? 1 : 0)));
  return {
    solarDate: { year: day.getUTCFullYear(), month: day.getUTCMonth() + 1, day: day.getUTCDate() },
    hour: Math.floor((clockHour + 1) / 2) % 12,
  };
}

/** Birth date is the normalized chart day; never use the Gregorian birth year. */
export function getCurrentNominalAge(birthDate: SolarDay & Partial<Pick<BirthInfo, 'hour' | 'standardTime'>>, now: Date = new Date()): number {
  const { solarDate, hour } = resolveCurrentZiweiTime(now);
  const targetYear = Solar.fromYmd(solarDate.year, solarDate.month, solarDate.day).getLunar().getYear();
  const birthYear = Solar.fromYmd(birthDate.year, birthDate.month, birthDate.day).getLunar().getYear();
  const age = targetYear - birthYear + 1;
  // Nominal age is meaningful only after birth. A lunar-year difference alone
  // incorrectly classifies later dates in the same year as one-year-old children.
  const standard = birthDate.standardTime;
  const beforeBirth = standard
    ? now.getTime() < Date.UTC(standard.year, standard.month - 1, standard.day, standard.clockHour, standard.clockMinute) - standard.utcOffsetMinutes * 60_000
    : solarDate.year * 10000 + solarDate.month * 100 + solarDate.day < birthDate.year * 10000 + birthDate.month * 100 + birthDate.day
      || (solarDate.year === birthDate.year && solarDate.month === birthDate.month && solarDate.day === birthDate.day && birthDate.hour !== undefined && hour < birthDate.hour);
  return beforeBirth ? Math.min(age, 0) : age;
}
