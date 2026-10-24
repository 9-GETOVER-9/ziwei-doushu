/** Read-only differential diagnostic; no installed packages or application files changed.
 * This compares source lineage, not independent astrological correctness.
 * Run: node node_modules/tsx/dist/cli.mjs scripts/regression/metis-natal-parity.test.ts
 * Add --details for all synthetic diagnostic inputs/results as JSON.
 */
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import Module from 'node:module';
import path from 'node:path';
import ts from 'typescript';
import { generateChart } from '../../lib/ziwei/algorithm';
import { normalizeBirthInput, type BirthFormState } from '../../lib/input-normalize';
import type { BirthInfo, ZiweiChart } from '../../lib/ziwei/types';

const baseline = 'f106f6bbf218fd4c6923526a7e2bcfe731f3bae1';
// Fetched read-only on 2026-10-17: the latest public upstream algorithm has
// exactly the same normalized SHA256 as this already available Git object.
const verifiedUpstreamHead = '328337cbc3e005631142e5f9f6d6972040def7a5';
const algorithmSHA256 = '4a155269b6ac2dc69a947e59b774322f62406d7c83f66a514f320e69b65c7f80';
// Both modules resolve these existing helpers. Require byte-for-byte agreement
// with the fixed upstream before doing so, otherwise shared changes could hide
// a future drift in the reference side of this differential check.
for (const file of ['constants.ts', 'wenmo-data.ts', 'wenmo-tables.generated.ts', 'wenmo-config.ts']) {
  const relative = `lib/ziwei/${file}`;
  const source = execFileSync('git', ['show', `${baseline}:${relative}`], { encoding: 'utf8' });
  assert.equal(readFileSync(relative, 'utf8').replace(/\r\n/g, '\n'), source.replace(/\r\n/g, '\n'), `reference helper drift: ${relative}`);
}
const baselineLock = JSON.parse(execFileSync('git', ['show', `${baseline}:package-lock.json`], { encoding: 'utf8', maxBuffer: 12 * 1024 * 1024 }));
for (const dependency of ['iztro', 'lunar-lite', 'lunar-typescript', 'lunar-javascript']) {
  assert.equal(JSON.parse(readFileSync(`node_modules/${dependency}/package.json`, 'utf8')).version, baselineLock.packages[`node_modules/${dependency}`].version, `reference dependency drift: ${dependency}`);
}
function loadBaseline(file: string): any {
  const source = execFileSync('git', ['show', `${baseline}:${file}`], { encoding: 'utf8' });
  if (file.endsWith('algorithm.ts')) assert.equal(createHash('sha256').update(source.replace(/\r\n/g, '\n')).digest('hex'), algorithmSHA256, 'fixed public upstream algorithm source');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const filename = path.resolve(file).replace(/\.ts$/, '.audit-baseline.ts');
  const LegacyModule = Module as any;
  const loaded = new LegacyModule(filename);
  loaded.filename = filename;
  loaded.paths = LegacyModule._nodeModulePaths(path.dirname(filename));
  loaded._compile(code, filename);
  return loaded.exports;
}
const oldAlgorithm = loadBaseline('lib/ziwei/algorithm.ts');
const oldShare = loadBaseline('lib/ziwei/share.ts');
function natalOnly(chart: ZiweiChart) {
  return {
    palaces: chart.palaces.map(({ isCurrentDaXian: _current, ...palace }) => palace),
    daXians: chart.daXians, ming: chart.mingGongBranch, shen: chart.shenGongBranch,
    ju: chart.wuxingJu, ziwei: chart.ziweiPos,
  };
}
function comparableLunarInfo(chart: ZiweiChart) {
  const { fourPillarsTimeSource: _source, ...lunarInfo } = chart.lunarInfo;
  return lunarInfo;
}
let natalComparisons = 0;
const natalDifferences: unknown[] = [];
const metadataDifferences: unknown[] = [];
const dateFixtures = [
  // June follows Lunar New Year, so these span all ten birth-year stems.
  ...Array.from({ length: 10 }, (_, index) => [1984 + index, 6, 18]),
  [1900, 1, 1], [1988, 4, 10], [1993, 6, 18], [1999, 2, 11], [1999, 2, 16],
  [2000, 1, 1], [2017, 8, 20], [2017, 8, 21], [2023, 4, 5], [2023, 4, 6],
  [2024, 2, 9], [2024, 2, 10], [2050, 12, 31],
].filter((date, index, dates) => dates.findIndex(other => other.join('-') === date.join('-')) === index);
const yearStems = new Set<number>();
for (const date of dateFixtures) for (const gender of ['male', 'female'] as const) for (let hour = 0; hour < 12; hour++) {
  const birth: BirthInfo = { year: date[0], month: date[1], day: date[2], hour, gender };
  const old = oldAlgorithm.generateChart(birth) as ZiweiChart;
  const current = generateChart(birth);
  yearStems.add(current.lunarInfo.yearStem);
  natalComparisons++;
  if (JSON.stringify(natalOnly(old)) !== JSON.stringify(natalOnly(current))) natalDifferences.push(birth);
  const oldLunar = comparableLunarInfo(old);
  const currentLunar = comparableLunarInfo(current);
  if (JSON.stringify(oldLunar) !== JSON.stringify(currentLunar)) metadataDifferences.push({ birth, old: oldLunar, current: currentLunar });
}
assert.equal(yearStems.size, 10, 'ten birth-year stems covered');
assert.deepEqual(natalDifferences, [], 'same canonical birth must preserve all natal stars/brightness/transformations, palace positions and decade ranges');
// The old public Demo form submits the civil date unchanged and computes only
// the longitude offset. This is its handleSubmit path, distinct from share.ts.
function oldDemoInput(form: BirthFormState): BirthInfo {
  return { year: Number(form.year), month: Number(form.month), day: Number(form.day),
    hour: form.unknownTime ? 0 : oldShare.calcTrueSolarBranch(Number(form.clockHour), Number(form.clockMinute), form.longitude),
    gender: form.gender };
}
function compact(info: BirthInfo) {
  const chart = generateChart(info);
  return { date: `${info.year}-${info.month}-${info.day}`, hour: info.hour, unknownTime: info.unknownTime ?? false,
    ming: chart.mingGongBranch, shen: chart.shenGongBranch, ju: chart.wuxingJu, ziwei: chart.ziweiPos };
}
const template: BirthFormState = { name: '', year: '1996', month: '6', day: '18', clockHour: '10', clockMinute: '0', unknownTime: false, province: '北京', city: '北京', longitude: 116.4, gender: 'female' };
const inputComparisons = [
  ['ordinary', {}],
  ['equation-of-time', { year: '2000', month: '2', day: '11', clockHour: '1', clockMinute: '5', province: '浙江', city: '杭州', longitude: 120.155 }],
  ['western-cross-midnight', { clockHour: '0', clockMinute: '15', province: '新疆', city: '乌鲁木齐', longitude: 87.616 }],
  ['eastern-late-zi', { clockHour: '22', clockMinute: '50', province: '黑龙江', city: '黑河', longitude: 127.5 }],
  ['western-clock-23', { clockHour: '23', clockMinute: '5', province: '新疆', city: '乌鲁木齐', longitude: 87.616 }],
  ['no-location-clock-23', { clockHour: '23', clockMinute: '5', province: '', city: '', longitude: 120 }],
  ['explicit-dst', { year: '1988', month: '5', day: '1', clockHour: '1', clockMinute: '30', dstCorrection: true }],
  ['unknown-hour', { unknownTime: true }],
].map(([name, changes]) => {
  const form = { ...template, ...(changes as Partial<BirthFormState>) };
  const current = normalizeBirthInput(form);
  return { name, form, publicDemo: compact(oldDemoInput(form)), publicShare: compact(oldShare.formToBirthInfo(form)), current: compact(current.birthInfo), solarTime: current.solarTime && { hour: current.solarTime.hour, minute: current.solarTime.minute, eot: current.solarTime.equationOfTimeMinutes } };
});
console.log(`PASS ${natalComparisons} natal comparisons; 10 birth-year stems, both genders, all 12 hours; zero star/palace/brightness/transformation/decade differences.`);
console.log(`Metadata differences: ${metadataDifferences.length}; excluded current-age markers and fourPillarsTimeSource provenance. Baseline ${baseline}; verified upstream ${verifiedUpstreamHead}.`);
for (const item of inputComparisons) {
  const describe = (value: ReturnType<typeof compact>) => `${value.date} hour=${value.hour} ming=${value.ming} ziwei=${value.ziwei}${value.unknownTime ? ' unknown' : ''}`;
  console.log(`INPUT ${item.name}: publicDemo[${describe(item.publicDemo)}] publicShare[${describe(item.publicShare)}] local[${describe(item.current)}]`);
}
if (process.argv.includes('--details')) console.log(JSON.stringify({ baseline, verifiedUpstreamHead, algorithmSHA256, natalComparisons, yearStemCount: yearStems.size, natalDifferences, metadataDifferenceCount: metadataDifferences.length, metadataDifferences, inputComparisons }, null, 2));
