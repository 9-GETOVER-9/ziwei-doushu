import assert from 'node:assert/strict';
import { normalizeBirthInput, type BirthFormState } from '../../lib/input-normalize';
import { calculateTwinTimeWindows, type ClockMinute, type TwinCity, type TwinCityWindows } from '../../lib/twin-time-windows';
import type { BirthInfo } from '../../lib/ziwei/types';

const cities: TwinCity[] = [
  { name: '上海', province: '上海市', longitude: 121.5 },
  { name: '乌鲁木齐', province: '新疆维吾尔自治区', longitude: 87.6 },
];
const base: BirthFormState = {
  name: '窗口核验', year: '2000', month: '1', day: '1', clockHour: '0', clockMinute: '15',
  unknownTime: false, gender: 'female', province: '上海市', city: '上海', longitude: 121.5,
  calendar: 'solar', useTrueSolarTime: true, dstCorrection: false,
};
const stamp = (time: ClockMinute) => Date.UTC(time.year, time.month - 1, time.day, time.hour, time.minute);
const fingerprint = (birth: BirthInfo) => [birth.year, birth.month, birth.day, birth.hour, birth.gender].join('/');
const inputAt = (source: BirthFormState, city: TwinCity, timestamp: number): BirthFormState => {
  const date = new Date(timestamp);
  return { ...source, calendar: 'solar', isLeapMonth: false, useTrueSolarTime: true,
    year: String(date.getUTCFullYear()), month: String(date.getUTCMonth() + 1), day: String(date.getUTCDate()),
    clockHour: String(date.getUTCHours()), clockMinute: String(date.getUTCMinutes()),
    province: city.province, city: city.name, longitude: city.longitude };
};

function verifyWindows(source: BirthFormState, results: TwinCityWindows[]) {
  const expected = fingerprint(normalizeBirthInput(source).birthInfo);
  assert.equal(results.length, cities.length, 'each supported city has a confirmed window');
  for (const result of results) {
    assert.ok(result.windows.length > 0);
    for (const window of result.windows) {
      assert.ok(stamp(window.start) <= stamp(window.end));
      for (let minute = stamp(window.start); minute <= stamp(window.end); minute += 60_000) {
        assert.equal(fingerprint(normalizeBirthInput(inputAt(source, result.city, minute)).birthInfo), expected,
          `${result.city.name} minute ${new Date(minute).toISOString()} must normalize to the same chart`);
      }
      assert.notEqual(fingerprint(normalizeBirthInput(inputAt(source, result.city, stamp(window.start) - 60_000)).birthInfo), expected, 'minute before window must not match');
      assert.notEqual(fingerprint(normalizeBirthInput(inputAt(source, result.city, stamp(window.end) + 60_000)).birthInfo), expected, 'minute after window must not match');
    }
  }
}

const chart = normalizeBirthInput(base).birthInfo;
const crossing = calculateTwinTimeWindows(chart, base, cities);
verifyWindows(base, crossing);
const shanghai = crossing.find(row => row.city.name === '上海')!;
assert.equal(shanghai.windows[0].start.year, 1999, 'zi-hour window crosses the previous calendar year');
assert.equal(shanghai.windows[0].start.day, 31);
assert.equal(shanghai.windows[0].end.year, 2000);

const dstSource = { ...base, year: '1990', month: '5', day: '1', clockHour: '10', dstCorrection: true };
const dstResults = calculateTwinTimeWindows(normalizeBirthInput(dstSource).birthInfo, dstSource, cities);
verifyWindows(dstSource, dstResults);
const standardSource = { ...dstSource, clockHour: '9', dstCorrection: false };
assert.equal(fingerprint(normalizeBirthInput(dstSource).birthInfo), fingerprint(normalizeBirthInput(standardSource).birthInfo));
const standardResults = calculateTwinTimeWindows(normalizeBirthInput(standardSource).birthInfo, standardSource, cities);
for (let index = 0; index < cities.length; index++) {
  assert.equal(stamp(dstResults[index].windows[0].start) - stamp(standardResults[index].windows[0].start), 3_600_000);
  assert.equal(stamp(dstResults[index].windows[0].end) - stamp(standardResults[index].windows[0].end), 3_600_000);
}

const dstBoundary = { ...dstSource, month: '4', day: '15', clockHour: '0', clockMinute: '15' };
verifyWindows(dstBoundary, calculateTwinTimeWindows(normalizeBirthInput(dstBoundary).birthInfo, dstBoundary, cities));
const lunarSource = { ...base, calendar: 'lunar' as const, year: '2024', month: '1', day: '1', clockHour: '12' };
verifyWindows(lunarSource, calculateTwinTimeWindows(normalizeBirthInput(lunarSource).birthInfo, lunarSource, cities));
assert.deepEqual(calculateTwinTimeWindows(chart, { ...base, unknownTime: true }, cities), []);
assert.throws(() => calculateTwinTimeWindows({ ...chart, hour: 6 }, base, cities), /更新命盘/);
console.log('PASS twin time windows: every included minute, both adjacent exclusions, zi/year crossing, DST shift and transition, lunar input, stale/unknown input');
