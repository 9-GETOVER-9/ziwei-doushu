/**
 * Metis deployment parity, observed 2026-10-17. This is SAME-ALGORITHM parity,
 * not independent calendar evidence, agreement of all schools, or predictions.
 *
 * Public source snapshot: Renhuai123/ziwei-doushu @
 * 328337cbc3e005631142e5f9f6d6972040def7a5 (MIT), lib/ziwei/{sihua,constants,
 * yunxian-context}.ts. Its demo TimeNav has only natal/decade/year; it does NOT
 * contain the production monthly/daily/hourly palace adapter.
 * https://github.com/Renhuai123/ziwei-doushu/tree/328337cbc3e005631142e5f9f6d6972040def7a5
 *
 * The production /chart HTML explicitly linked its page and webpack scripts.
 * Following their ChartBoard imports gave these public deployment chunks:
 * https://static.metisziwei.com/_next/static/chunks/686.8ec0c91d359d09fc.js
 * SHA256 b561b9479360c79aaf30141184150fc55667ed966b2549a5c81c0e692dec27c9
 *   module 70686: policy-aware bySolar/byLunar -> horoscope(targetSolar,hour),
 *   locating 命宫 in palaceNames. Four changes use its separate stem functions:
 *   decade palace stem; year stem; lunar-month Five Tigers (leap >15 advances);
 *   real lunar day stem; Five Rats hour stem. It keeps natal stars unchanged.
 * https://static.metisziwei.com/_next/static/chunks/3701.d51bd9064d203962.js
 * SHA256 cc59648d1eb9718d33aa6d0c48a9c42abb74f3fecf0e4b29994d46e89ebe889b
 *   module 43701 exports the deployed iztro API. Defaults are normal year,
 *   normal horoscope, normal nominal age, forward day division. Its relevant
 *   formulas were read directly, rather than inferred from the dependency name.
 *
 * The eight anchors below were produced by executing that downloaded module
 * in an isolated VM without network/process/filesystem APIs. No site API was
 * called. CI uses installed iztro 2.6.1's real horoscope implementation plus
 * these anchors, not a second copy of time-flow.ts's palace arithmetic. The
 * deployed bundle's exact package version is not asserted or guessed.
 *
 * Scope: DEFAULT split birth-month policy, resolved civil date + 0..11 branch.
 * Civil 23:xx is already normalized by our caller. Metis's current-time page
 * initializer itself does not advance its civil date at 23:00 (a known policy
 * difference). Non-default birth policies and its silent exception fallback
 * are excluded. Childhood overlays and simultaneous ancestor-layer rendering
 * are separate product decisions, not silently claimed as full UI parity.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { astro } from 'iztro';
import { Lunar, LunarMonth, Solar } from 'lunar-javascript';
import { generateChart } from '../../lib/ziwei/algorithm';
import { getTimeFlow, type FlowSelection } from '../../lib/ziwei/time-flow';
import type { BirthInfo } from '../../lib/ziwei/types';

const require = createRequire(import.meta.url);
assert.equal(require('iztro/package.json').version, '2.6.1', 'Review the pinned Metis oracle before upgrading iztro');
astro.config({ yearDivide: 'normal', horoscopeDivide: 'normal', ageDivide: 'normal', dayDivide: 'forward', algorithm: 'default' });

const STEMS = '甲乙丙丁戊己庚辛壬癸';
const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';
// Copied from the pinned public Metis constants, not imported from our code.
const MUTAGENS = [
  ['廉贞', '破军', '武曲', '太阳'], ['天机', '天梁', '紫微', '太阴'],
  ['天同', '天机', '文昌', '廉贞'], ['太阴', '天同', '天机', '巨门'],
  ['贪狼', '太阴', '右弼', '天机'], ['武曲', '贪狼', '天梁', '文曲'],
  ['太阳', '武曲', '太阴', '天同'], ['巨门', '太阳', '文曲', '文昌'],
  ['天梁', '紫微', '左辅', '武曲'], ['破军', '巨门', '太阴', '贪狼'],
];
const SCOPES = ['decadal', 'yearly', 'monthly', 'daily', 'hourly'] as const;
const mod = (value: number, base: number) => ((value % base) + base) % base;
const dateText = (birth: Pick<BirthInfo, 'year' | 'month' | 'day'>) => `${birth.year}-${birth.month}-${birth.day}`;
const birthFrom = (date: string, hour: number, gender: BirthInfo['gender']): BirthInfo => {
  const [year, month, day] = date.split('-').map(Number);
  return { year, month, day, hour, gender };
};

function subject(birth: BirthInfo) {
  return {
    birth,
    chart: generateChart(birth),
    oracle: astro.bySolar(dateText(birth), birth.hour, birth.gender === 'male' ? '男' : '女', true, 'zh-CN'),
  };
}
type Subject = ReturnType<typeof subject>;

/** The site's separate four-change helpers, condensed from pinned sihua.ts. */
function metisStems(selection: FlowSelection) {
  const lunar = Lunar.fromYmd(selection.year, selection.month, selection.day);
  let month = Math.abs(selection.month);
  let year = selection.year;
  if (selection.month < 0 && selection.day > 15 && ++month > 12) { month = 1; year++; }
  const monthYearStem = mod(year - 4, 10);
  const yinStem = [2, 4, 6, 8, 0, 2, 4, 6, 8, 0][monthYearStem];
  const dayStem = STEMS.indexOf(lunar.getDayGan());
  const ziStem = [0, 2, 4, 6, 8, 0, 2, 4, 6, 8][dayStem];
  return {
    yearly: mod(selection.year - 4, 10),
    monthly: (yinStem + month - 1) % 10,
    daily: dayStem,
    hourly: (ziStem + selection.hour) % 10,
  };
}

let checked = 0;
const childComparisons: number[] = [];
function compare(pair: Subject, selection: FlowSelection) {
  const solar = Lunar.fromYmd(selection.year, selection.month, selection.day).getSolar();
  const expected = pair.oracle.horoscope(`${solar.getYear()}-${solar.getMonth()}-${solar.getDay()}`, selection.hour);
  const actual = getTimeFlow(pair.chart, selection);
  const context = `${dateText(pair.birth)}/${pair.birth.hour}/${pair.birth.gender} -> ${JSON.stringify(selection)}`;
  assert.equal(actual.clamped, false, `fixture must not hide a clamp: ${context}`);
  assert.equal(actual.nominalAge, expected.age.nominalAge, context);
  const stems = metisStems(selection);
  for (const scope of SCOPES) {
    const expectedScope = expected[scope];
    // Same selection route used by the production adapter, not index arithmetic.
    const palace = pair.oracle.palaces[expectedScope.palaceNames.indexOf('命宫')];
    const branch = BRANCHES.indexOf(palace.earthlyBranch);
    const level = actual.levels[scope];
    if (scope === 'decadal' && actual.isChildhood) {
      assert.equal(actual.childhoodPalaceBranch, branch, `childhood palace ${context}`);
      childComparisons.push(actual.nominalAge);
      // The initial local product intentionally omitted childhood four changes.
      // If enabled later, their stem/position must match the site's explicit
      // childhood decade view. No assertion here says all UI views show them.
      if (!level) continue;
    }
    assert.ok(level, `${scope} exists ${context}`);
    const stemIndex = scope === 'decadal' ? STEMS.indexOf(expectedScope.heavenlyStem) : stems[scope];
    assert.equal(level.palaceBranch, branch, `${scope} palace ${context}`);
    assert.equal(level.stemIndex, stemIndex, `${scope} stem ${context}`);
    assert.equal(level.stemName, STEMS[stemIndex], `${scope} stem name ${context}`);
    assert.equal(level.branchName, expectedScope.earthlyBranch, `${scope} cycle branch ${context}`);
    assert.deepEqual(level.siHua, Object.fromEntries(MUTAGENS[stemIndex].map((star, i) => [star, ['禄', '权', '科', '忌'][i]])), `${scope} four changes ${context}`);
    expectedScope.palaceNames.forEach((name, index) => {
      const at = BRANCHES.indexOf(pair.oracle.palaces[index].earthlyBranch);
      assert.equal(level.palaceNames[at].replace('交友', '仆役'), name, `${scope} rotated palace ${context}`);
    });
  }
  checked++;
  return expected;
}

function fromSolar(date: string, hour: number): FlowSelection {
  const [year, month, day] = date.split('-').map(Number);
  const lunar = Solar.fromYmd(year, month, day).getLunar();
  return { year: lunar.getYear(), month: lunar.getMonth(), day: lunar.getDay(), hour };
}

// Fixed results of the actual deployed engine, encoded as [palace, cycle].
const anchors = [
  { birth: '1996-6-18', hour: 5, gender: 'female', target: '2023-4-5', at: 0, age: 28, layers: ['亥己亥', '卯癸卯', '巳乙卯', '未癸巳', '未壬子'] },
  { birth: '1996-6-18', hour: 5, gender: 'female', target: '2023-4-6', at: 11, age: 28, layers: ['亥己亥', '卯癸卯', '午丙辰', '酉甲午', '申乙亥'] },
  { birth: '1997-6-18', hour: 3, gender: 'male', target: '2024-2-9', at: 0, age: 27, layers: ['丑癸丑', '卯癸卯', '丑乙丑', '午癸卯', '午壬子'] },
  { birth: '1997-6-18', hour: 3, gender: 'male', target: '2024-2-10', at: 0, age: 28, layers: ['丑癸丑', '辰甲辰', '卯丙寅', '卯甲辰', '卯甲子'] },
  { birth: '2017-8-20', hour: 5, gender: 'female', target: '2026-10-17', at: 8, age: 10, layers: ['卯癸卯', '午丙午', '丑戊戌', '申甲子', '辰壬申'] },
  { birth: '2017-8-21', hour: 5, gender: 'female', target: '2026-10-17', at: 8, age: 10, layers: ['卯癸卯', '午丙午', '丑戊戌', '申甲子', '辰壬申'] },
  { birth: '2023-4-5', hour: 5, gender: 'male', target: '2038-6-18', at: 0, age: 16, layers: ['酉辛酉', '午戊午', '寅戊午', '巳丙寅', '巳戊子'] },
  { birth: '2023-4-6', hour: 5, gender: 'male', target: '2038-6-18', at: 11, age: 16, layers: ['戌壬戌', '午戊午', '丑戊午', '辰丙寅', '卯己亥'] },
] as const;
for (const anchor of anchors) {
  const pair = subject(birthFrom(anchor.birth, anchor.hour, anchor.gender));
  const expected = compare(pair, fromSolar(anchor.target, anchor.at));
  assert.equal(expected.age.nominalAge, anchor.age, 'deployed anchor nominal age');
  assert.deepEqual(SCOPES.map(scope => {
    const layer = expected[scope];
    return pair.oracle.palaces[layer.palaceNames.indexOf('命宫')].earthlyBranch + layer.heavenlyStem + layer.earthlyBranch;
  }), anchor.layers, 'installed oracle agrees with executed deployment anchor');
}

// Every natal and target branch across both genders and both birth-year polarities.
for (const year of [1996, 1997]) for (const gender of ['male', 'female'] as const) {
  for (let birthHour = 0; birthHour < 12; birthHour++) {
    const pair = subject({ year, month: 6, day: 18, hour: birthHour, gender });
    const forward = (year === 1996) === (gender === 'male');
    assert.equal(mod(pair.chart.daXians[1].palaceBranch - pair.chart.daXians[0].palaceBranch, 12), forward ? 1 : 11);
    for (let hour = 0; hour < 12; hour++) compare(pair, fromSolar('2026-10-17', hour));
  }
}

// All leap months in the declared 1900–2050 test range; no Cartesian explosion.
const early = subject(birthFrom('1899-1-1', 5, 'female'));
const later = subject(birthFrom('1996-6-18', 5, 'female'));
let leapMonths = 0;
for (let year = 1900; year <= 2050; year++) for (let month = 1; month <= 12; month++) {
  const days = LunarMonth.fromYm(year, -month)?.getDayCount();
  if (days !== 29 && days !== 30) continue;
  leapMonths++;
  for (const day of [15, 16, 29, 30]) if (day <= days) {
    compare(year < 2000 ? early : later, { year, month: -month, day, hour: (year + day) % 12 });
  }
}
assert.ok(leapMonths > 0, 'real leap months were exercised');

// Month starts/ends also exercise consecutive Lunar New Years, including 2023 leap 2.
for (let year = 2023; year <= 2027; year++) for (let month = 1; month <= 12; month++) {
  const days = LunarMonth.fromYm(year, month)!.getDayCount();
  for (const day of [1, days]) compare(later, { year, month, day, hour: (month + day) % 12 });
}

// Complete sexagenary day cycle plus one day: catches accidental month reset.
const dayCycles = new Set<string>();
for (let offset = 0; offset <= 60; offset++) {
  const date = new Date(Date.UTC(2026, 0, 1 + offset));
  const expected = compare(later, fromSolar(`${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`, offset % 12));
  dayCycles.add(expected.daily.heavenlyStem + expected.daily.earthlyBranch);
}
assert.equal(dayCycles.size, 60);

// All twelve decade start/end years for four directions/polarities; actual
// lunar birth year is taken from the independent engine, not our decade helper.
for (const year of [1996, 1997]) for (const gender of ['male', 'female'] as const) {
  const pair = subject({ year, month: 6, day: 18, hour: 5, gender });
  const birthYear = pair.oracle.rawDates.lunarDate.lunarYear;
  for (const palace of pair.oracle.palaces) for (const age of palace.decadal.range) {
    const targetYear = birthYear + age - 1;
    const first = age === palace.decadal.range[0];
    compare(pair, { year: targetYear, month: first ? 1 : 12, day: first ? 1 : LunarMonth.fromYm(targetYear, 12)!.getDayCount(), hour: first ? 0 : 11 });
  }
}
// Fire-six supplies all five childhood years. Only palace movement is required
// here; displaying their four changes remains an explicitly separate UI policy.
const child = subject(birthFrom('1996-6-18', 9, 'female'));
assert.equal(child.chart.wuxingJu, 6);
for (let age = 1; age < 6; age++) compare(child, { year: 1996 + age - 1, month: 6, day: 1, hour: 9 });
assert.deepEqual([...new Set(childComparisons)].sort(), [1, 2, 3, 4, 5]);

console.log(`PASS Metis default-rule parity: ${checked} dates/hours, ${leapMonths} real leap months (1900–2050), eight executed deployment anchors; same-algorithm verification, UI overlay policy excluded`);
