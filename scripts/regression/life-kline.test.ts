import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { generateChart } from '../../lib/ziwei/algorithm';
import { flowSelectionFromSolar, flowSelectionToSolar, getFlowDecades, getTimeFlow } from '../../lib/ziwei/time-flow';
import type { ZiweiChart } from '../../lib/ziwei/types';

// Independent RFC-4180-style reader: tests the exported contract, not its writer.
function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', quoted = false;
  const text = csv.replace(/^\uFEFF/, '');
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { field += '"'; index++; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) { row.push(field); field = ''; }
    else if ((char === '\r' || char === '\n') && !quoted) {
      row.push(field); rows.push(row); row = []; field = '';
      if (char === '\r' && text[index + 1] === '\n') index++;
    } else field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  assert.equal(quoted, false, 'CSV quotes must be balanced');
  return rows;
}

async function main() {
  assert.ok(existsSync(resolve('lib/ziwei/life-kline.ts')), 'life-kline public data API must exist');
  const { buildLifeKline, getLifeKlineYear, getLifeKlineRange, exportCsv, LIFE_THEMES, LIFE_KLINE_METHOD } = await import('../../lib/ziwei/life-kline');
  assert.equal(typeof getLifeKlineRange, 'function', 'range API must allow incremental UI generation');
  const chart = generateChart({ year: 1996, month: 6, day: 18, hour: 5, gender: 'female', name: 'PRIVATE-NAME', city: 'PRIVATE-CITY' });
  const snapshot = JSON.stringify(chart);
  assert.deepEqual(getLifeKlineRange(chart), { startYear: 1996, endYear: 2095 });

  // The candle is a chronological monthly-segment summary, never daily extrema.
  const leapYear = getLifeKlineYear(chart, 'overall', 2023);
  assert.equal(leapYear.months.length, 14);
  const leap = leapYear.months.filter(month => month.selection.month === -2);
  assert.deepEqual(leap.map(month => [month.startDay, month.endDay]), [[1, 15], [16, 29]]);
  assert.deepEqual(leap.map(month => month.selection.day), [1, 16]);
  assert.deepEqual(leap.map(month => month.solarDate), [{ year: 2023, month: 3, day: 22 }, { year: 2023, month: 4, day: 6 }]);
  assert.equal(leapYear.stemBranch, '癸卯');
  assert.equal(leapYear.age, 28);
  assert.equal(leapYear.open, leapYear.months[0].score);
  assert.equal(leapYear.close, leapYear.months.at(-1)!.score);
  assert.equal(leapYear.high, Math.max(...leapYear.months.map(month => month.score)));
  assert.equal(leapYear.low, Math.min(...leapYear.months.map(month => month.score)));
  assert.equal(getLifeKlineYear(chart, 'overall', 2024).months.length, 12);
  assert.notDeepEqual(leap[0].contributions.filter(row => row.scope === 'monthly'), leap[1].contributions.filter(row => row.scope === 'monthly'));

  // Independently hand-audited 1996-06-18 巳时 female / 2024 / natal 命宫 at 丑:
  // Target branches 丑/巳/酉/未. Year-constant contribution is natal 文昌科 +1,
  // 己亥 decade 天梁科 +1 and 文曲忌 -2.5, 甲辰 year 太阳忌 -5 => baseline 44.5.
  // 甲年月干: 丙丁戊己庚辛壬癸甲乙丙丁. Looking up those four changes against
  // the fixed natal placements gives monthly deltas +1,+4,+3,-1.5,+6,+1.5,+2,
  // +2,-5,-3.5,+1,+4. These literal expectations do not use the scoring function
  // or the same constants table to manufacture an oracle.
  const handYear = getLifeKlineYear(chart, 'overall', 2024);
  assert.deepEqual(handYear.months.map(month => month.score), [45.5, 48.5, 47.5, 43, 50.5, 46, 46.5, 46.5, 39.5, 41, 45.5, 48.5]);
  assert.deepEqual([handYear.open, handYear.close, handYear.high, handYear.low], [45.5, 48.5, 50.5, 39.5]);
  assert.deepEqual(handYear.months[0].contributions.map(row => [row.scope, row.star, row.siHua, row.value]), [
    ['natal', '文昌', '科', 1], ['decadal', '天梁', '科', 1], ['decadal', '文曲', '忌', -2.5],
    ['yearly', '太阳', '忌', -5], ['monthly', '文昌', '科', 1],
  ]);

  // Birth during the latter leap half must not backfill earlier months/half-month.
  const leapBorn = generateChart({ year: 2023, month: 4, day: 6, hour: 5, gender: 'male' });
  const birthYear = getLifeKlineYear(leapBorn, 'career', 2023);
  assert.equal(birthYear.months.length, 11);
  assert.deepEqual(birthYear.months[0].selection, { year: 2023, month: -2, day: 16, hour: 5 });
  assert.ok(birthYear.partial);
  assert.ok(birthYear.partialReasons.some(reason => reason.includes('出生')));
  assert.ok(birthYear.months.every(month => month.contributions.every(row => row.scope !== 'decadal')), 'childhood has no invented decade transformations');
  const leapLastBorn = generateChart({ year: 2017, month: 8, day: 21, hour: 11, gender: 'female' });
  assert.deepEqual(getLifeKlineYear(leapLastBorn, 'overall', 2017).months[0].selection, { year: 2017, month: -6, day: 30, hour: 11 });
  const beforeNewYear = generateChart({ year: 2000, month: 1, day: 1, hour: 0, gender: 'male' });
  assert.equal(buildLifeKline(beforeNewYear, 'overall').startYear, 1999, 'use real lunar birth year');
  const nextYear = getLifeKlineYear(beforeNewYear, 'overall', 2000);
  assert.equal(nextYear.age, 2);
  assert.equal(nextYear.months[0].selection.month, 1);
  assert.equal(nextYear.months[0].selection.day, 1);
  const firstDecade = getFlowDecades(chart).find(decade => decade.index === 0)!;
  assert.ok(getLifeKlineYear(chart, 'wealth', firstDecade.startYear).months[0].contributions.some(row => row.scope === 'decadal'));
  assert.equal(getLifeKlineYear(chart, 'wealth', firstDecade.startYear - 1).decadeLabel, '童限');

  // Public product weights are verifiable without treating the formula as a
  // traditional oracle. Isolate synthetic natal markers from all real flow stars.
  const controlled: ZiweiChart = structuredClone(chart);
  controlled.palaces.forEach(palace => palace.stars.forEach(star => { delete star.siHua; }));
  const target = controlled.mingGongBranch;
  const controlBefore = getLifeKlineYear(controlled, 'overall', 2024).months[0].score;
  const withMarker: ZiweiChart = structuredClone(controlled);
  withMarker.palaces.find(palace => palace.branch === target)!.stars.push({ name: '测试化禄', type: 'minor', siHua: '禄' });
  const plus = getLifeKlineYear(withMarker, 'overall', 2024).months[0];
  assert.equal(plus.score - controlBefore, 4, 'natal/direct lu contributes exactly +4');
  const trine: ZiweiChart = structuredClone(controlled);
  trine.palaces.find(palace => palace.branch === (target + 4) % 12)!.stars.push({ name: '测试化忌', type: 'minor', siHua: '忌' });
  assert.equal(getLifeKlineYear(trine, 'overall', 2024).months[0].score - controlBefore, -2.5, 'natal/trine ji contributes exactly -2.5');
  const opposite: ZiweiChart = structuredClone(controlled);
  opposite.palaces.find(palace => palace.branch === (target + 6) % 12)!.stars.push({ name: '测试化权', type: 'minor', siHua: '权' });
  assert.equal(getLifeKlineYear(opposite, 'overall', 2024).months[0].score - controlBefore, 1.5);
  const outside: ZiweiChart = structuredClone(controlled);
  outside.palaces.find(palace => palace.branch === (target + 1) % 12)!.stars.push({ name: '测试化禄', type: 'minor', siHua: '禄' });
  assert.equal(getLifeKlineYear(outside, 'overall', 2024).months[0].score, controlBefore);

  const series = buildLifeKline(chart, 'overall');
  assert.equal(series.years.length, 100);
  assert.equal(series.endYear, series.startYear + 99);
  assert.equal(series.methodVersion, LIFE_KLINE_METHOD.version);
  assert.equal(series.years[0].months[0].selection.hour, 5);
  for (const year of series.years) {
    assert.ok(year.low <= year.open && year.open <= year.high);
    assert.ok(year.low <= year.close && year.close <= year.high);
    for (const month of year.months) {
      assert.ok(month.score >= 0 && month.score <= 100);
      const raw = 50 + month.contributions.reduce((sum, row) => sum + row.value, 0);
      assert.equal(month.rawScore, raw, 'each exported point is independently reproducible from contributions');
      assert.equal(month.score, Math.round(Math.min(100, Math.max(0, raw)) * 100) / 100);
      const flow = getTimeFlow(chart, month.selection);
      assert.equal(flow.clamped, false, 'sampling never silently backfills prebirth/invalid segments');
      assert.deepEqual(month.solarDate, flowSelectionToSolar(month.selection));
      for (const row of month.contributions) {
        assert.ok(row.evidence.includes(row.star));
        if (row.scope !== 'natal') assert.equal(flow.levels[row.scope]?.siHua[row.star], row.siHua, 'contribution matches actual flow transformations');
      }
    }
  }
  const themes = LIFE_THEMES.map(theme => buildLifeKline(chart, theme.key));
  assert.equal(new Set(themes.map(item => JSON.stringify(item.years.map(year => year.close)))).size, 4, 'themes must use different target palaces');
  assert.strictEqual(getLifeKlineYear(chart, 'overall', 2023), leapYear, 'one chart/year reuses cached facts');
  chart.currentAge = 999;
  chart.currentDaXianIndex = 11;
  assert.deepEqual(getLifeKlineYear(chart, 'overall', 2023), leapYear, 'results do not depend on the current clock or highlighted decade');
  chart.currentAge = JSON.parse(snapshot).currentAge;
  chart.currentDaXianIndex = JSON.parse(snapshot).currentDaXianIndex;
  assert.equal(JSON.stringify(chart), snapshot, 'data generation leaves natal input untouched');

  const futureChart = generateChart({ year: 2050, month: 6, day: 18, hour: 5, gender: 'female' });
  assert.deepEqual(getLifeKlineRange(futureChart), { startYear: 2050, endYear: 2100 });
  const capped = buildLifeKline(futureChart, 'relationship');
  assert.equal(capped.endYear, 2100);
  const last = capped.years.at(-1)!;
  const limit = flowSelectionFromSolar({ year: 2100, month: 12, day: 31 }, 11);
  assert.ok(last.partial);
  assert.ok(last.partialReasons.some(reason => reason.includes('2100-12-31')));
  assert.equal(last.months.at(-1)!.selection.month, limit.month);
  assert.equal(last.months.at(-1)!.endDay, limit.day);
  assert.ok(capped.years.flatMap(year => year.months).every(month => month.solarDate.year <= 2100));
  for (const invalid of [NaN, Infinity, 2023.5, 1995, 2096]) assert.throws(() => getLifeKlineYear(chart, 'overall', invalid), /年份|范围/);
  assert.throws(() => getLifeKlineYear(chart, 'bogus' as 'overall', 2023), /主题/);
  assert.throws(() => buildLifeKline(chart, '__proto__' as 'overall'), /主题/);
  assert.throws(() => buildLifeKline({ ...chart, birthInfo: { ...chart.birthInfo, unknownTime: true } }, 'overall'), /时辰/);
  assert.throws(() => getLifeKlineRange({ ...chart, birthInfo: { ...chart.birthInfo, unknownTime: true } }), /时辰/);
  assert.throws(() => getLifeKlineRange({ ...chart, birthInfo: { ...chart.birthInfo, year: 2101 } }), /范围/);
  const csv = exportCsv(series);
  assert.ok(csv.includes(LIFE_KLINE_METHOD.version));
  assert.ok(csv.includes('农历年'));
  assert.ok(csv.includes('月段'));
  assert.ok(csv.includes(',"-2",'), 'CSV leap-month indices remain numeric, not formula-like strings');
  assert.ok(!csv.includes('PRIVATE-NAME') && !csv.includes('PRIVATE-CITY'));
  const parsed = parseCsv(csv);
  const headerAt = parsed.findIndex(row => row[0] === '农历年');
  const header = parsed[headerAt];
  const lunarMonthColumn = header.indexOf('农历月（负数为闰月）');
  const contributionColumn = header.indexOf('贡献合计');
  assert.ok(contributionColumn >= 0, 'CSV exposes numeric total contributions');
  const exported2023 = parsed.slice(headerAt + 1).filter(row => row[0] === '2023');
  assert.deepEqual(exported2023.map(row => Number(row[lunarMonthColumn])), [1, 2, -2, -2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  const exported2024 = parsed.slice(headerAt + 1).find(row => row[0] === '2024')!;
  assert.equal(Number(exported2024[contributionColumn]), -4.5, 'negative numeric contributions survive CSV round trip');
  const unsafeLabel = parseCsv(exportCsv({ ...series, themeLabel: '=1+1', years: [] }));
  assert.equal(unsafeLabel.find(row => row[0] === '主题')?.[1], "'=1+1", 'string spreadsheet formulas stay neutralized');
  console.log(`PASS life-kline: ${series.years.length} years, ${series.years.reduce((sum, year) => sum + year.months.length, 0)} real month segments; four themes, formula, leap/birth/childhood, calendar cap, validation and CSV`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
