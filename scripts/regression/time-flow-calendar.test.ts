import assert from 'node:assert/strict';
import { Solar } from 'lunar-javascript';
import { generateChart } from '../../lib/ziwei/algorithm';
import {
  flowSelectionFromSolar,
  flowSelectionToSolar,
  getFlowDays,
  getTimeFlow,
} from '../../lib/ziwei/time-flow';

// Independent civil-calendar evidence, checked 2026-10-17. These expected
// dates come from HKO's published tables, not iztro or lunar-javascript.
// https://www.hko.gov.hk/tc/gts/time/calendar/pdf/files/2023.pdf
// https://www.hko.gov.hk/tc/gts/time/calendar/pdf/files/2024.pdf
// https://www.hko.gov.hk/tc/gts/time/calendar/text/files/T2026c.txt
// https://www.hko.gov.hk/tc/gts/time/calendar/text/files/T2027c.txt
// https://www.hko.gov.hk/tc/gts/time/calendar/text/files/T2030c.txt
// https://www.hko.gov.hk/tc/gts/time/calendar/pdf/files/2018.pdf
// A negative lunar month denotes the leap month, not its effective flow month.
const calendarFixtures = [
  { solar: [2023, 3, 21], lunar: [2023, 2, 30] },
  { solar: [2023, 3, 22], lunar: [2023, -2, 1] },
  { solar: [2023, 4, 5], lunar: [2023, -2, 15] },
  { solar: [2023, 4, 6], lunar: [2023, -2, 16] },
  { solar: [2023, 4, 19], lunar: [2023, -2, 29] },
  { solar: [2023, 4, 20], lunar: [2023, 3, 1] },
  { solar: [2024, 2, 9], lunar: [2023, 12, 30] },
  { solar: [2024, 2, 10], lunar: [2024, 1, 1] },
  { solar: [2024, 3, 9], lunar: [2024, 1, 29] },
  { solar: [2024, 3, 10], lunar: [2024, 2, 1] },
  { solar: [2024, 4, 8], lunar: [2024, 2, 30] },
  { solar: [2024, 4, 9], lunar: [2024, 3, 1] },
  { solar: [2026, 10, 17], lunar: [2026, 9, 8] },
  // ICU 78.2 Intl Chinese calendar disagrees at these month boundaries;
  // HKO supports these fixtures. Do not replace the oracle with Intl output.
  { solar: [2018, 11, 7], lunar: [2018, 9, 30] },
  { solar: [2018, 11, 8], lunar: [2018, 10, 1] },
  { solar: [2027, 2, 6], lunar: [2027, 1, 1] },
  { solar: [2027, 3, 7], lunar: [2027, 1, 30] },
  { solar: [2027, 3, 8], lunar: [2027, 2, 1] },
  { solar: [2030, 2, 3], lunar: [2030, 1, 1] },
  { solar: [2030, 3, 3], lunar: [2030, 1, 29] },
  { solar: [2030, 3, 4], lunar: [2030, 2, 1] },
] as const;

for (const { solar: [year, month, day], lunar: [lunarYear, lunarMonth, lunarDay] } of calendarFixtures) {
  const solar = { year, month, day };
  const expected = { year: lunarYear, month: lunarMonth, day: lunarDay, hour: 0 };
  assert.deepEqual(flowSelectionFromSolar(solar, 0), expected, `HKO solar to lunar ${year}-${month}-${day}`);
  assert.deepEqual(flowSelectionToSolar(expected), solar, `HKO lunar to solar ${year}-${month}-${day}`);
}

// Month lengths are the differences between the independently published starts.
const monthLengthFixtures = [
  [2023, 2, 30], [2023, -2, 29],
  [2024, 1, 29], [2024, 2, 30],
  [2027, 1, 30], [2030, 1, 29],
] as const;
for (const [year, month, length] of monthLengthFixtures) {
  assert.equal(getFlowDays(year, month).length, length, `HKO month length ${year}/${month}`);
}

// Central Weather Administration, 2015 Astronomical Almanac, printed p.6
// (PDF page 11): 2015-01-01 has JDN 2457024; (JDN - 10) mod 60 gives
// the 1-based sexagenary ordinal, with remainder 0 denoting ordinal 60.
// https://www.cwa.gov.tw/Data/service/notice/download/publish_20151111113546.pdf#page=11
// Only Gregorian UTC day arithmetic is used in this oracle. It does not call a
// lunar converter, iztro, getTimeFlow, or the application's constants/formulas.
const DAY_MS = 86_400_000;
const ANCHOR_UTC = Date.UTC(2015, 0, 1);
const ANCHOR_JDN = 2_457_024;
const STEMS = '甲乙丙丁戊己庚辛壬癸';
const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';
function independentDayGanzhi(utcCivilDay: number) {
  const jdn = ANCHOR_JDN + Math.round((utcCivilDay - ANCHOR_UTC) / DAY_MS);
  const zeroBasedOrdinal = ((jdn - 11) % 60 + 60) % 60;
  return STEMS[zeroBasedOrdinal % 10] + BRANCHES[zeroBasedOrdinal % 12];
}
assert.equal(independentDayGanzhi(Date.UTC(2015, 9, 10)), '己未', 'CWA worked example JDN2457306');
assert.equal(independentDayGanzhi(Date.UTC(2026, 9, 17)), '甲子');

// Two natal fixtures keep every integration date within a real 12-decade range,
// so date clamping cannot silently reduce the intended validation coverage.
const earlyChart = generateChart({ year: 1900, month: 1, day: 1, hour: 0, gender: 'male' });
const lateChart = generateChart({ year: 2000, month: 1, day: 1, hour: 0, gender: 'female' });
const chartForYear = (year: number) => year < 2000 ? earlyChart : lateChart;
let independentDayCount = 0;
let integrationDayCount = 0;
for (let utc = Date.UTC(1900, 0, 1); utc < Date.UTC(2101, 0, 1); utc += DAY_MS) {
  const date = new Date(utc);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const expected = independentDayGanzhi(utc);
  const lunar = Solar.fromYmd(year, month, day).getLunar();
  assert.equal(lunar.getDayGan() + lunar.getDayZhi(), expected, `CWA day cycle ${year}-${month}-${day}`);
  independentDayCount++;
  // Every civil month start/end also exercises the actual flow module, including
  // Gregorian leap years and century boundaries, while keeping CI time bounded.
  if (day === 1 || new Date(utc + DAY_MS).getUTCDate() === 1) {
    const flow = getTimeFlow(chartForYear(year), flowSelectionFromSolar({ year, month, day }, 0));
    assert.equal(flow.clamped, false, 'integration sample must keep its requested date');
    assert.deepEqual(flow.solarDate, { year, month, day });
    assert.equal(flow.levels.daily.stemName + flow.levels.daily.branchName, expected, `getTimeFlow day cycle ${year}-${month}-${day}`);
    integrationDayCount++;
  }
}
assert.equal(independentDayCount, 73_414);
assert.equal(integrationDayCount, 4_824);

// Explicit lunar boundaries feed getTimeFlow as well; the date displayed by the
// converter and the date used for the daily overlay must remain identical.
for (const { solar: [year, month, day], lunar: [lunarYear, lunarMonth, lunarDay] } of calendarFixtures) {
  const flow = getTimeFlow(chartForYear(year), { year: lunarYear, month: lunarMonth, day: lunarDay, hour: 0 });
  assert.equal(flow.clamped, false);
  assert.deepEqual(flow.solarDate, { year, month, day });
  assert.equal(flow.levels.daily.stemName + flow.levels.daily.branchName, independentDayGanzhi(Date.UTC(year, month - 1, day)));
}

// Literal rows from HKO Tables 4 and 5, independently checking the month/hour
// stems. Tables do not establish the application's leap-half or late-zi policy.
// https://www.hko.gov.hk/en/gts/time/stemsandbranches.htm
const monthRows = [
  '丙丁戊己庚辛壬癸甲乙丙丁', '戊己庚辛壬癸甲乙丙丁戊己',
  '庚辛壬癸甲乙丙丁戊己庚辛', '壬癸甲乙丙丁戊己庚辛壬癸',
  '甲乙丙丁戊己庚辛壬癸甲乙',
];
const hourRows = [
  '甲乙丙丁戊己庚辛壬癸甲乙', '丙丁戊己庚辛壬癸甲乙丙丁',
  '戊己庚辛壬癸甲乙丙丁戊己', '庚辛壬癸甲乙丙丁戊己庚辛',
  '壬癸甲乙丙丁戊己庚辛壬癸',
];
for (let year = 2020; year < 2030; year++) {
  for (let month = 1; month <= 12; month++) {
    const flow = getTimeFlow(lateChart, { year, month, day: 1, hour: 0 });
    assert.equal(flow.levels.monthly.stemName, monthRows[((year - 4) % 10) % 5][month - 1]);
    assert.equal(flow.levels.monthly.branchName, '寅卯辰巳午未申酉戌亥子丑'[month - 1]);
  }
}
for (let day = 17; day < 27; day++) {
  for (let hour = 0; hour < 12; hour++) {
    const flow = getTimeFlow(lateChart, flowSelectionFromSolar({ year: 2026, month: 10, day }, hour));
    // The independently checked 2026-10-17 is a Jia day; ten consecutive civil
    // days cover all stems. Hours 0..11 refer to an already-resolved chart day.
    assert.equal(flow.levels.hourly.stemName, hourRows[(day - 17) % 5][hour]);
    assert.equal(flow.levels.hourly.branchName, BRANCHES[hour]);
  }
}

console.log(`PASS independent calendar: ${calendarFixtures.length} HKO date fixtures, ${monthLengthFixtures.length} month lengths, ${independentDayCount} CWA day-cycle dates, ${integrationDayCount} monthly-edge getTimeFlow checks, 120 month and 120 hour stem combinations`);
