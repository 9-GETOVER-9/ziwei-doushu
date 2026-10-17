import assert from 'node:assert/strict';
import { getCurrentNominalAge } from '../../lib/ziwei/current-time';
import { normalizeBirthInput, type BirthFormState } from '../../lib/input-normalize';

const form: BirthFormState = {
  name: '合成边界样本', year: '2026', month: '12', day: '31',
  clockHour: '19', clockMinute: '30', unknownTime: false,
  province: '', city: '', longitude: 120, gender: 'female',
  useTrueSolarTime: false, dstCorrection: false,
};
const birth = (patch: Partial<BirthFormState> = {}) => normalizeBirthInput({ ...form, ...patch }).birthInfo;
const now = new Date('2026-10-17T10:00:00Z'); // Beijing 18:00
assert.equal(getCurrentNominalAge(birth(), now), 0, 'a later birthday in the same lunar year is not childhood yet');
assert.equal(getCurrentNominalAge(birth({ month: '6', day: '18' }), now), 1);
const tonight = birth({ month: '10', day: '17' });
assert.equal(getCurrentNominalAge(tonight, now), 0, 'future time on the same civil day');
assert.equal(getCurrentNominalAge(tonight, new Date('2026-10-17T11:30:00Z')), 1, 'birth instant inclusive');

const lateZi = birth({ month: '10', day: '17', clockHour: '23' });
assert.equal(lateZi.day, 18);
assert.equal(getCurrentNominalAge(lateZi, new Date('2026-10-17T15:15:00Z')), 0, 'late-zi date shift cannot make a future instant already born');
assert.equal(getCurrentNominalAge(lateZi, new Date('2026-10-17T15:30:00Z')), 1);
const west = birth({ month: '10', day: '18', clockHour: '0', province: '新疆', longitude: 80, useTrueSolarTime: true });
assert.equal(west.day, 17);
assert.equal(getCurrentNominalAge(west, new Date('2026-10-17T15:50:00Z')), 0, 'solar-time previous chart day cannot move the actual birth instant');
assert.equal(getCurrentNominalAge(west, new Date('2026-10-17T16:30:00Z')), 1);

// Legacy branch-only records cannot identify a minute; compare their resolved
// chart day/branch without pretending they carry an exact birth instant.
assert.equal(getCurrentNominalAge({ year: 2026, month: 12, day: 31 }, now), 0);
console.log('PASS current age before birth: same year/day, exact instant, late zi, solar previous day, legacy record');
