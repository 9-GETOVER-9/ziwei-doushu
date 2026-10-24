import assert from 'node:assert/strict';
import { formToBirthInfo, formToSearchParams, searchParamsToForm } from '../../lib/ziwei/share';
import { normalizeBirthInput } from '../../lib/input-normalize';
import type { BirthFormState } from '../../components/BirthForm';

const base: BirthFormState = {
  name: '边界测试', year: '2000', month: '1', day: '1',
  clockHour: '23', clockMinute: '30', unknownTime: false,
  province: '新疆', city: '测试经度', longitude: 80, gender: 'female',
};

// 西部地区钟表 23:30 仍是真太阳时亥时，不能先按钟表日期换到次日。
const west = formToBirthInfo(base);
assert.deepEqual([west.year, west.month, west.day, west.hour], [2000, 1, 1, 10]);
assert.deepEqual(west.origInput, { year: 2000, month: 1, day: 1, clockHour: 23, clockMinute: 30 });

const clockOnly = { ...base, province: '', city: '', useTrueSolarTime: false };
const rollover = formToBirthInfo({ ...clockOnly, year: '2023', month: '12', day: '31' });
assert.deepEqual([rollover.year, rollover.month, rollover.day, rollover.hour], [2024, 1, 1, 0]);
const early = formToBirthInfo({ ...clockOnly, clockHour: '0' });
assert.deepEqual([early.year, early.month, early.day, early.hour], [2000, 1, 1, 0]);
const previousDay = formToBirthInfo({ ...base, clockHour: '0' });
assert.deepEqual([previousDay.year, previousDay.month, previousDay.day, previousDay.hour], [1999, 12, 31, 11]);
const eastLate = formToBirthInfo({ ...base, clockHour: '22', longitude: 135 });
assert.deepEqual([eastLate.year, eastLate.month, eastLate.day, eastLate.hour], [2000, 1, 2, 0]);

const lunar = formToBirthInfo({ ...clockOnly, calendar: 'lunar', year: '2024', month: '1', day: '1', clockHour: '12' });
assert.deepEqual([lunar.year, lunar.month, lunar.day], [2024, 2, 10]);
assert.throws(() => formToBirthInfo({ ...clockOnly, calendar: 'lunar', year: '2024', month: '5', isLeapMonth: true }), /农历日期或闰月不存在/);
assert.throws(() => formToBirthInfo({ ...clockOnly, year: '2023', month: '2', day: '29' }), /公历日期不存在/);
assert.throws(() => formToBirthInfo({ ...clockOnly, clockHour: '8xyz' }), /请填写小时/);
assert.throws(() => formToBirthInfo({ ...base, longitude: NaN }), /经度无效/);

const dstInput = { ...clockOnly, year: '1990', month: '5', day: '1', clockHour: '1' };
assert.equal(formToBirthInfo({ ...dstInput, dstCorrection: false }).hour, 1);
assert.equal(formToBirthInfo({ ...dstInput, dstCorrection: true }).hour, 0);
const unknown = normalizeBirthInput({ ...base, unknownTime: true });
assert.deepEqual([unknown.birthInfo.year, unknown.birthInfo.month, unknown.birthInfo.day, unknown.birthInfo.hour], [2000, 1, 1, 0]);
assert.equal(unknown.solarTime, null);
assert.ok(unknown.notes.some(note => note.includes('时辰未知')));
assert.equal(unknown.birthInfo.origInput, undefined);
assert.equal(unknown.birthInfo.unknownTime, true);
assert.throws(() => formToBirthInfo({ ...base, year: 2000 } as unknown as BirthFormState), /请填写年份/);

const shared = { ...base, year: '2023', month: '2', day: '1', calendar: 'lunar' as const, isLeapMonth: true, useTrueSolarTime: false, dstCorrection: true };
const restored = searchParamsToForm(formToSearchParams(shared)) as BirthFormState;
assert.deepEqual(restored, shared);
assert.deepEqual(formToBirthInfo(restored), formToBirthInfo(shared));
const legacy = searchParamsToForm(new URLSearchParams('y=2000&m=1&d=1&h=8')) as BirthFormState;
assert.equal(legacy.calendar, 'solar');
assert.equal(legacy.useTrueSolarTime, true);
assert.equal(legacy.dstCorrection, false);
const zeroLongitude = { ...base, longitude: 0 };
assert.deepEqual(formToBirthInfo(searchParamsToForm(formToSearchParams(zeroLongitude)) as BirthFormState), formToBirthInfo(zeroLongitude));
assert.throws(() => formToBirthInfo(searchParamsToForm(new URLSearchParams('y=2000&m=1&d=1&p=北京&lo=120junk')) as BirthFormState), /经度无效/);

console.log('PASS input normalization: solar/clock midnight, late zi, year rollover, lunar conversion, invalid dates, DST opt-in, original input, unknown time');
