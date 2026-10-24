import { Solar as LunarSolar } from 'lunar-javascript';
import type { QimenChart, QimenInput, QimenPalace } from './types';

// Rules independently expressed in TypeScript after comparing the MIT projects
// listed in SOURCES.md. Keep the original palace separate from its display host.
export const QIMEN_VERSION = 'chaibu-kun2-zi23-v1';
export const QIMEN_RULES = [
  '时家转盘·拆补法；甲己符头定上中下元',
  '北京时间 UTC+08:00；钟表时间，不作真太阳时或夏令时修正',
  '年柱按立春交节时刻、月柱按节令交节时刻；阴阳遁与定局按精确节气',
  '23:00 换日；日柱与符头同用次日，农历日期仍显示钟表日期',
  '中五固定寄坤二，天禽随天芮；值使从旬首原宫（含五宫）起飞，落五寄二',
  '八神用值符、腾蛇、太阴、六合、白虎、玄武、九地、九天，阳顺阴逆',
  '空亡、驿马按时柱；公历输入范围 1900–2100 年',
];

interface Term { getName(): string; getSolar(): { toYmdHms(): string } }
interface CalendarLunar {
  getYearInGanZhiExact(): string; getMonthInGanZhiExact(): string;
  getDayInGanZhiExact(): string; getTimeInGanZhi(): string;
  getTimeXun(): string; getTimeXunKong(): string; toString(): string;
  getPrevJieQi(wholeDay: boolean): Term; getNextJieQi(wholeDay: boolean): Term;
}
const Solar = LunarSolar as unknown as {
  fromYmdHms(y: number, m: number, d: number, h: number, min: number, s: number): { getLunar(): CalendarLunar };
};
const GAN = '甲乙丙丁戊己庚辛壬癸';
const ZHI = '子丑寅卯辰巳午未申酉戌亥';
const STEMS = '戊己庚辛壬癸丁丙乙';
const RING = [1, 8, 3, 4, 9, 2, 7, 6];
const DISPLAY = [4, 9, 2, 3, 5, 7, 8, 1, 6];
const STARS = ['', '天蓬', '天芮', '天冲', '天辅', '天禽', '天心', '天柱', '天任', '天英'];
const DOORS = ['', '休门', '死门', '伤门', '杜门', '', '开门', '惊门', '生门', '景门'];
const DEITIES = ['值符', '腾蛇', '太阴', '六合', '白虎', '玄武', '九地', '九天'];
const PALACES = [
  [], ['坎', '正北', '水', '子'], ['坤', '西南', '土', '未申'],
  ['震', '正东', '木', '卯'], ['巽', '东南', '木', '辰巳'], ['中', '中央', '土', ''],
  ['乾', '西北', '金', '戌亥'], ['兑', '正西', '金', '酉'],
  ['艮', '东北', '土', '丑寅'], ['离', '正南', '火', '午'],
];
// [upper, middle, lower]; winter solstice starts yang, summer solstice starts yin.
const TERMS: Record<string, readonly [boolean, string]> = {
  冬至: [true, '174'], 小寒: [true, '285'], 大寒: [true, '396'], 立春: [true, '852'],
  雨水: [true, '963'], 惊蛰: [true, '174'], 春分: [true, '396'], 清明: [true, '417'],
  谷雨: [true, '528'], 立夏: [true, '417'], 小满: [true, '528'], 芒种: [true, '639'],
  夏至: [false, '936'], 小暑: [false, '825'], 大暑: [false, '714'], 立秋: [false, '258'],
  处暑: [false, '147'], 白露: [false, '936'], 秋分: [false, '714'], 寒露: [false, '693'],
  霜降: [false, '582'], 立冬: [false, '693'], 小雪: [false, '582'], 大雪: [false, '471'],
};
const mod = (n: number, divisor: number) => ((n % divisor) + divisor) % divisor;
const host = (palace: number) => palace === 5 ? 2 : palace;
const ganzhi = (index: number) => GAN[mod(index, 10)] + ZHI[mod(index, 12)];
function ganzhiIndex(value: string): number {
  for (let i = 0; i < 60; i++) if (ganzhi(i) === value) return i;
  throw new Error('历法返回了无法识别的干支，请检查日期。');
}

export function parseQimenInput(input: QimenInput) {
  if (!input || typeof input.date !== 'string' || typeof input.time !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !/^\d{2}:\d{2}$/.test(input.time)) {
    throw new Error('请填写完整的公历日期和时间。');
  }
  const [year, month, day] = input.date.split('-').map(Number);
  const [hour, minute] = input.time.split(':').map(Number);
  if (year < 1900 || year > 2100) throw new Error('当前奇门排盘支持 1900–2100 年。');
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day ||
      hour > 23 || minute > 59) throw new Error('日期或时间不存在，请检查月份、天数和时分。');
  if (input.title !== undefined && (typeof input.title !== 'string' || input.title.length > 80)) {
    throw new Error('盘名请使用 80 字以内的文字。');
  }
  return { year, month, day, hour, minute, date };
}

export function beijingNowInput(now = new Date()): QimenInput {
  const clock = new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString();
  return { date: clock.slice(0, 10), time: clock.slice(11, 16), title: '' };
}

export function shiftQimenTime(input: QimenInput, minutes: number): QimenInput {
  const { date } = parseQimenInput(input);
  if (!Number.isSafeInteger(minutes)) throw new Error('时间步长必须是整数分钟。');
  const next = new Date(date.getTime() + minutes * 60_000).toISOString();
  const result = { ...input, date: next.slice(0, 10), time: next.slice(11, 16) };
  parseQimenInput(result);
  return result;
}

export function buildQimenChart(input: QimenInput): QimenChart {
  const { year, month, day, hour, minute } = parseQimenInput(input);
  // Component-based construction is deliberately independent of the device's TZ.
  const lunar = Solar.fromYmdHms(year, month, day, hour, minute, 0).getLunar();
  const pillars = {
    year: lunar.getYearInGanZhiExact(), month: lunar.getMonthInGanZhiExact(),
    day: lunar.getDayInGanZhiExact(), hour: lunar.getTimeInGanZhi(),
  };
  const currentTerm = lunar.getPrevJieQi(false);
  const nextTerm = lunar.getNextJieQi(false);
  const term = currentTerm.getName();
  const config = TERMS[term];
  if (!config) throw new Error(`无法识别节气：${term}`);
  const dayIndex = ganzhiIndex(pillars.day);
  const fuTouIndex = dayIndex - dayIndex % 5;
  const yuanIndex = (fuTouIndex % 15) / 5;
  const ju = Number(config[1][yuanIndex]);
  const isYang = config[0];
  const step = isYang ? 1 : -1;
  const hourIndex = ganzhiIndex(pillars.hour);
  const xunIndex = Math.floor(hourIndex / 10);
  const hiddenJia = STEMS[xunIndex];
  const earth = new Array<string>(10).fill('');
  for (let i = 0; i < 9; i++) earth[mod(ju - 1 + step * i, 9) + 1] = STEMS[i];

  const chiefOrigin = earth.indexOf(hiddenJia);
  const hourStem = pillars.hour[0] === '甲' ? hiddenJia : pillars.hour[0];
  const chiefTarget = host(earth.indexOf(hourStem));
  // Do not substitute 5 -> 2 before counting hours; only host the final destination.
  const doorRawTarget = mod(chiefOrigin - 1 + step * (hourIndex % 10), 9) + 1;
  const doorTarget = host(doorRawTarget);
  const originRing = RING.indexOf(host(chiefOrigin));
  const starTurn = RING.indexOf(chiefTarget) - originRing;
  const doorTurn = RING.indexOf(doorTarget) - originRing;
  const voidBranches = lunar.getTimeXunKong();
  const horseBranch = ['寅', '亥', '申', '巳'][ZHI.indexOf(pillars.hour[1]) % 4];
  const palaces: QimenPalace[] = DISPLAY.map(number => {
    const [name, direction, element, branches] = PALACES[number];
    const ringIndex = RING.indexOf(number);
    const starOrigin = number === 5 ? 5 : RING[mod(ringIndex - starTurn, 8)];
    const doorOrigin = number === 5 ? 5 : RING[mod(ringIndex - doorTurn, 8)];
    return {
      number, name, direction, element, branches,
      stars: number === 5 ? [] : starOrigin === 2 ? ['天芮', '天禽'] : [STARS[starOrigin]],
      door: DOORS[doorOrigin],
      deity: number === 5 ? '' : DEITIES[mod((ringIndex - RING.indexOf(chiefTarget)) * step, 8)],
      heavenStem: number === 5 ? '' : earth[starOrigin], earthStem: earth[number],
      hostedHeavenStem: starOrigin === 2 ? earth[5] : '',
      hostedEarthStem: number === 2 ? earth[5] : '',
      voidBranches: [...branches].filter(branch => voidBranches.includes(branch)).join(''),
      horse: branches.includes(horseBranch),
      isChiefStar: number === chiefTarget, isChiefDoor: number === doorTarget,
    };
  });
  return {
    version: QIMEN_VERSION, input: { date: input.date, time: input.time, title: input.title?.trim() || '奇门排盘' },
    method: '时家转盘·拆补法', timezone: 'UTC+08:00', rules: [...QIMEN_RULES],
    lunarDate: lunar.toString(), pillars, solarTerm: term, solarTermAt: currentTerm.getSolar().toYmdHms(),
    nextSolarTerm: nextTerm.getName(), nextSolarTermAt: nextTerm.getSolar().toYmdHms(),
    yuan: ['上元', '中元', '下元'][yuanIndex], fuTou: ganzhi(fuTouIndex), dun: isYang ? '阳遁' : '阴遁', ju,
    xun: lunar.getTimeXun(), hiddenJia, voidBranches, horseBranch,
    chiefStar: { name: STARS[chiefOrigin], palace: chiefTarget, origin: chiefOrigin },
    chiefDoor: { name: DOORS[host(chiefOrigin)], palace: doorTarget, rawPalace: doorRawTarget }, palaces,
  };
}
