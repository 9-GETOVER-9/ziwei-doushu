import assert from 'node:assert/strict';
import { astro } from 'iztro';
import { generateChart, resolveEffectiveLunarDate } from '../../lib/ziwei/algorithm';
import { STEMS } from '../../lib/ziwei/constants';
import { getFlowMonths, getFlowDays, flowSelectionFromSolar, flowSelectionToSolar, getFlowDecades, clampFlowSelection, getTimeFlow, getCurrentFlowSelection } from '../../lib/ziwei/time-flow';

// Calendar facts independently identify leap-month and month-length boundaries.
assert.equal(getFlowMonths(2023).length, 13);
assert.equal(getFlowMonths(2023).find(month => month.month === -2)?.days, 29);
assert.equal(getFlowMonths(2024).length, 12);
assert.equal(getFlowDays(2023, -2).length, 29);
assert.equal(getFlowDays(2024, 1).length, 29);
assert.equal(getFlowDays(2024, 2).length, 30);
assert.deepEqual(flowSelectionFromSolar({ year: 2024, month: 2, day: 9 }, 0), { year: 2023, month: 12, day: 30, hour: 0 });
assert.deepEqual(flowSelectionFromSolar({ year: 2024, month: 2, day: 10 }, 11), { year: 2024, month: 1, day: 1, hour: 11 });
assert.deepEqual(flowSelectionToSolar({ year: 2023, month: -2, day: 1, hour: 0 }), { year: 2023, month: 3, day: 22 });
assert.throws(() => flowSelectionToSolar({ year: 2023, month: -2, day: 30, hour: 0 }), /日期/);
assert.throws(() => flowSelectionToSolar({ year: 2024, month: -2, day: 1, hour: 0 }), /月份/);
assert.throws(() => flowSelectionToSolar({ year: 2024, month: 1, day: 1, hour: 12 }), /时辰/);
assert.throws(() => flowSelectionFromSolar({ year: 2023, month: 2, day: 29 }), /日期/);
assert.throws(() => flowSelectionFromSolar({ year: 2024, month: 4, day: 31 }), /日期/);

const birth = { year: 1996, month: 6, day: 18, hour: 5, gender: 'female' as const };
const chart = generateChart(birth);
const natalSnapshot = JSON.stringify(chart);
const oracle = astro.bySolar('1996-6-18', 5, '女', true, 'zh-CN');
// These are consistency checks against the same iztro engine used by the natal
// chart, not independent evidence of calendar accuracy or agreement across schools.
// Cover New Year, leap halves, month ends and every hour.
astro.config({ yearDivide: 'normal', horoscopeDivide: 'normal', ageDivide: 'normal' });
for (const solar of [
  { year: 2024, month: 2, day: 9 }, { year: 2024, month: 2, day: 10 },
  { year: 2023, month: 4, day: 5 }, { year: 2023, month: 4, day: 6 },
  { year: 2024, month: 3, day: 9 }, { year: 2024, month: 3, day: 10 },
]) {
  for (let hour = 0; hour < 12; hour++) {
    const actual = getTimeFlow(chart, flowSelectionFromSolar(solar, hour));
    const expected = oracle.horoscope(`${solar.year}-${solar.month}-${solar.day}`, hour);
    assert.equal(actual.nominalAge, expected.age.nominalAge);
    for (const scope of ['decadal', 'yearly', 'monthly', 'daily', 'hourly'] as const) {
      const level = actual.levels[scope]!;
      assert.equal(level.palaceBranch, (expected[scope].index + 2) % 12, `${scope} palace ${JSON.stringify(actual.selection)}`);
      assert.equal(level.stemName, expected[scope].heavenlyStem, `${scope} stem`);
      assert.equal(level.stemIndex, STEMS.indexOf(expected[scope].heavenlyStem));
      assert.deepEqual(Object.keys(level.siHua), expected[scope].mutagen);
      expected[scope].palaceNames.forEach((name, index) => assert.equal(level.palaceNames[(index + 2) % 12].replace('交友', '仆役'), name));
    }
  }
}
assert.equal(JSON.stringify(chart), natalSnapshot, 'flow overlays must not mutate or regenerate the natal chart');

const newYearBefore = getTimeFlow(chart, { year: 2023, month: 12, day: 30, hour: 0 });
const newYearAfter = getTimeFlow(chart, { year: 2024, month: 1, day: 1, hour: 0 });
assert.equal(newYearAfter.nominalAge, newYearBefore.nominalAge + 1);
assert.notEqual(newYearAfter.levels.yearly.stemIndex, newYearBefore.levels.yearly.stemIndex);
const leap15 = getTimeFlow(chart, { year: 2023, month: -2, day: 15, hour: 0 });
const leap16 = getTimeFlow(chart, { year: 2023, month: -2, day: 16, hour: 0 });
assert.notEqual(leap15.levels.monthly.palaceBranch, leap16.levels.monthly.palaceBranch);
assert.notEqual(leap15.levels.monthly.stemIndex, leap16.levels.monthly.stemIndex);
assert.notEqual(leap15.levels.daily.palaceBranch, leap16.levels.daily.palaceBranch);
const hour1 = getTimeFlow(chart, { ...leap15.selection, hour: 1 });
assert.notEqual(leap15.levels.hourly.palaceBranch, hour1.levels.hourly.palaceBranch);
assert.notEqual(leap15.levels.hourly.stemIndex, hour1.levels.hourly.stemIndex);

const earlyYearChart = generateChart({ year: 2000, month: 1, day: 1, hour: 0, gender: 'male' });
const decades = getFlowDecades(earlyYearChart);
assert.equal(decades[1].startYear, 1999 + decades[1].startAge - 1, 'birth lunar year, not Gregorian year');
const child = getTimeFlow(earlyYearChart, flowSelectionFromSolar({ year: 2000, month: 1, day: 1 }, 0));
assert.equal(child.nominalAge, 1);
assert.equal(child.isChildhood, true);
assert.equal(child.decadalIndex, -1);
assert.equal(child.levels.decadal, null, 'childhood does not invent decade transformations');
assert.equal(child.childhoodPalaceBranch, earlyYearChart.mingGongBranch);
assert.equal(decades[0].palaceBranch, null);
const first = decades[1];
assert.equal(getTimeFlow(earlyYearChart, { year: first.startYear, month: 1, day: 1, hour: 0 }).decadalIndex, first.index);
const second = decades[2];
assert.notEqual(getTimeFlow(earlyYearChart, { year: first.startYear, month: 1, day: 1, hour: 0 }).levels.decadal?.palaceBranch, getTimeFlow(earlyYearChart, { year: second.startYear, month: 1, day: 1, hour: 0 }).levels.decadal?.palaceBranch);
assert.deepEqual(clampFlowSelection(chart, { year: 2024, month: -2, day: 30, hour: 3 }), { year: 2024, month: 2, day: 30, hour: 3 });
assert.deepEqual(clampFlowSelection(chart, { year: 2024, month: 1, day: 30, hour: 3 }), { year: 2024, month: 1, day: 29, hour: 3 });
const futureChart = generateChart({ year: 2050, month: 6, day: 18, hour: 5, gender: 'male' });
const clamped = getTimeFlow(futureChart, { year: 2026, month: 1, day: 1, hour: 0 });
assert.equal(clamped.clamped, true);
assert.deepEqual(clamped.solarDate, { year: 2050, month: 6, day: 18 });
assert.equal(clamped.nominalAge, 1);
assert.ok(getFlowDecades(futureChart).at(-1)!.endYear > 2100);
assert.throws(() => getTimeFlow({ ...chart, birthInfo: { ...birth, unknownTime: true } }, leap15.selection), /时辰未知/);

const fireChart = generateChart({ ...birth, hour: 9 });
assert.equal(fireChart.wuxingJu, 6);
for (let age = 1; age <= 5; age++) {
  const result = getTimeFlow(fireChart, { year: 1996 + age - 1, month: 6, day: 1, hour: 9 });
  assert.equal(result.nominalAge, age);
  assert.equal(result.levels.decadal, null);
  assert.equal(fireChart.palaces.find(palace => palace.branch === result.childhoodPalaceBranch)?.name, ['命宫', '财帛', '疾厄', '夫妻', '福德'][age - 1]);
}
const leapBirth = { year: 2023, month: 4, day: 6, hour: 5, gender: 'female' as const };
const natalSplit = generateChart(leapBirth);
const natalPrevious = generateChart(leapBirth, { leapMonth: 'prev-month' });
// Split changes the month used for month-based stars, while day-based stars
// still use the real leap-month day. Do not truncate day 30 to the next small
// month's 29 days in metadata when the natal bySolar calculation keeps day 30.
const leapMonthEndBirth = { year: 2017, month: 8, day: 21, hour: 5, gender: 'female' as const };
const leapMonthEndChart = generateChart(leapMonthEndBirth);
assert.deepEqual(resolveEffectiveLunarDate(2017, 8, 21, 'split'), {
  lunarYear: 2017, lunarMonth: 7, lunarDay: 30, isLeapMonth: false,
  rawLunarMonth: -6, rawLunarDay: 30,
});
assert.equal(leapMonthEndChart.lunarInfo.lunarMonth, 7);
assert.equal(leapMonthEndChart.lunarInfo.lunarDay, 30);
assert.deepEqual(flowSelectionFromSolar(leapMonthEndBirth, 5), { year: 2017, month: -6, day: 30, hour: 5 });
assert.equal(leapMonthEndChart.ziweiPos, 11, 'metadata correction must preserve the existing natal Ziwei position');
assert.equal(generateChart(leapMonthEndBirth, { leapMonth: 'next-month' }).lunarInfo.lunarDay, 29, 'non-split policies still clamp their substituted calendar date');
assert.equal(resolveEffectiveLunarDate(1906, 6, 21, 'prev-month').lunarDay, 29, 'previous-month policy still clamps to its real small month');
const futureSelection = { year: 2026, month: 9, day: 8, hour: 4 };
assert.notEqual(getTimeFlow(natalSplit, futureSelection).levels.monthly.palaceBranch, getTimeFlow(natalPrevious, futureSelection).levels.monthly.palaceBranch, 'retain the existing natal leap policy');
const farFuture = getTimeFlow(futureChart, { year: 2150, month: 1, day: 1, hour: 0 });
assert.equal(farFuture.selection.year, 2150, 'do not impose a 2100 cutoff on an existing 12-decade chart');
assert.ok(farFuture.levels.decadal);
const lastDecade = getFlowDecades(futureChart).at(-1)!;
assert.equal(getTimeFlow(futureChart, { year: lastDecade.endYear + 1, month: 1, day: 1, hour: 0 }).selection.year, lastDecade.endYear);
const stable = getTimeFlow(chart, futureSelection);
astro.config({ horoscopeDivide: 'exact', ageDivide: 'birthday' });
assert.deepEqual(getTimeFlow(chart, futureSelection), stable, 'unrelated iztro global configuration must not drift an existing flow view');
astro.config({ horoscopeDivide: 'normal', ageDivide: 'normal' });

// Persist representative cases from the independent review: both directions of
// decade progression, and births on either side of the leap-month split.
for (const fixture of [
  { year: 1996, month: 6, day: 18, effectiveBirthMonth: undefined },
  { year: 2023, month: 4, day: 5, effectiveBirthMonth: 2 }, // leap 2/15
  { year: 2023, month: 4, day: 6, effectiveBirthMonth: 3 }, // leap 2/16
]) {
  for (const gender of ['male', 'female'] as const) {
    const representative = generateChart({ ...fixture, hour: 5, gender });
    if (fixture.effectiveBirthMonth) assert.equal(representative.lunarInfo.lunarMonth, fixture.effectiveBirthMonth);
    const forward = (fixture.year === 1996 && gender === 'male') || (fixture.year === 2023 && gender === 'female');
    assert.equal((representative.daXians[1].palaceBranch - representative.daXians[0].palaceBranch + 12) % 12, forward ? 1 : 11, 'yang male / yin female forward; yin male / yang female reverse');
    const expectedChart = astro.bySolar(`${fixture.year}-${fixture.month}-${fixture.day}`, 5, gender === 'male' ? '男' : '女', true, 'zh-CN');
    for (const hour of [0, 11]) {
      const actual = getTimeFlow(representative, flowSelectionFromSolar({ year: 2038, month: 6, day: 18 }, hour));
      const expected = expectedChart.horoscope('2038-6-18', hour);
      assert.equal(actual.nominalAge, expected.age.nominalAge);
      for (const scope of ['decadal', 'yearly', 'monthly', 'daily', 'hourly'] as const) {
        const level = actual.levels[scope]!;
        const context = `${fixture.year}-${fixture.month}-${fixture.day} ${gender} ${scope} hour ${hour}`;
        assert.equal(level.palaceBranch, (expected[scope].index + 2) % 12, context);
        assert.equal(level.stemName, expected[scope].heavenlyStem, context);
        assert.equal(level.branchName, expected[scope].earthlyBranch, context);
        assert.deepEqual(level.siHua, Object.fromEntries(expected[scope].mutagen.map((star, index) => [star, ['禄', '权', '科', '忌'][index]])), context);
      }
    }
  }
}
// The summary and "today" navigation must resolve the same China civil time,
// including late zi crossing Lunar New Year and a decade boundary.
function withCurrentTime<T>(iso: string, run: () => T): T {
  const OriginalDate = globalThis.Date;
  const fixedTime = new OriginalDate(iso).getTime();
  globalThis.Date = new Proxy(OriginalDate, {
    construct(target, args, newTarget) { return Reflect.construct(target, args.length ? args : [fixedTime], newTarget); },
    apply() { return new OriginalDate(fixedTime).toString(); },
    get(target, key, receiver) { return key === 'now' ? () => fixedTime : Reflect.get(target, key, receiver); },
  });
  try { return run(); } finally { globalThis.Date = OriginalDate; }
}
for (const fixture of [
  { iso: '2026-02-16T14:59:00Z', solar: { year: 2026, month: 2, day: 16 }, age: 33, hour: 11, decade: 2 },
  { iso: '2026-02-16T15:00:00Z', solar: { year: 2026, month: 2, day: 17 }, age: 34, hour: 0, decade: 3 },
  { iso: '2026-02-16T16:00:00Z', solar: { year: 2026, month: 2, day: 17 }, age: 34, hour: 0, decade: 3 },
]) {
  withCurrentTime(fixture.iso, () => {
    const target = getCurrentFlowSelection();
    assert.deepEqual(flowSelectionToSolar(target), fixture.solar, fixture.iso);
    assert.equal(target.hour, fixture.hour, fixture.iso);
    const boundaryChart = generateChart({ year: 1993, month: 6, day: 18, hour: 5, gender: 'female' });
    const boundaryFlow = getTimeFlow(boundaryChart, target);
    assert.equal(boundaryChart.currentAge, fixture.age, `summary age ${fixture.iso}`);
    assert.equal(boundaryFlow.nominalAge, fixture.age, `navigation age ${fixture.iso}`);
    assert.equal(boundaryChart.currentDaXianIndex, fixture.decade, `summary decade ${fixture.iso}`);
    assert.equal(boundaryFlow.decadalIndex, fixture.decade, `navigation decade ${fixture.iso}`);
    const earlyBirth = generateChart({ year: 2000, month: 1, day: 1, hour: 0, gender: 'male' });
    const earlyFlow = getTimeFlow(earlyBirth, target);
    assert.equal(earlyBirth.currentAge, target.year - 1999 + 1, 'birth before Spring Festival uses its real lunar birth year');
    assert.equal(earlyBirth.currentAge, earlyFlow.nominalAge);
  });
}
console.log('PASS flow calendar boundaries, same-engine consistency, China late-zi current age/decade, childhood, real overlays, future-birth clamp and immutable natal chart');
