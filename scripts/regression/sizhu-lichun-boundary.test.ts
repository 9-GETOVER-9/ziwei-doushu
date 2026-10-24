/**
 * 节气四柱 立春/节气边界精确到时刻 — 回归测试
 *
 * 背景（2026-09-01）：会员反馈「紫薇排盘里给我排的四柱不准…年柱为癸未…立春是19点…我不是甲申年」。
 * 查证：农历2004正月十四=公历2004-02-04，立春2004=当天19:56，会员凌晨2:40（丑时）出生在立春前，
 * 八字年柱应为癸未（连带月柱乙丑），排盘却给甲申/丙寅。
 * 根因：节气四柱原用 lunar-javascript 的 getYearGanByLiChun()/getMonthGan()，是「按立春当天整天」切换、
 * 不看时刻（实测即使传入时间也无效），立春当天凌晨出生的被算进新年。
 * 修复：改用 getEightChar()。已知钟表时分按扣DST后的标准时刻交节；仅时辰旧记录按中点近似。
 * 独立时刻来源：日本国立天文台2004暦要項列立春2月4日20:56（日本中央标准时UTC+9），
 * 换算东八区为19:56。这里测19:30/19:57两侧，不声称秒级天文精度。
 * https://eco.mtk.nao.ac.jp/koyomi/yoko/2004/rekiyou042.html
 * https://eco.mtk.nao.ac.jp/koyomi/faq/time.html
 *
 * 本测试锁住：①会员案例修对 ②非节气日不被误伤 ③立春当天「前/后」正确分档。
 */
import assert from 'node:assert/strict';
import { generateChart } from '../../lib/ziwei/algorithm';
import { normalizeBirthInput, type BirthFormState } from '../../lib/input-normalize';

let passed = 0;
const ok = (name: string, cond: boolean) => { assert.ok(cond, `❌ ${name}`); console.log(`  ✅ ${name}`); passed++; };
const sizhu = (y: number, mo: number, d: number, h: number) =>
  (generateChart({ year: y, month: mo, day: d, hour: h, gender: 'male' } as any) as any).lunarInfo;

// ① 会员案例：2004-02-04 丑时(立春19:56前) → 节气年柱癸未、月柱乙丑
const m = sizhu(2004, 2, 4, 1);
ok('会员案例 节气四柱年柱=癸未（立春前，不是甲申）', m.fourPillars?.[0] === '癸未');
ok('会员案例 节气四柱月柱=乙丑（连带修正，不是丙寅）', m.fourPillars?.[1] === '乙丑');
ok('会员案例 非节气四柱年柱=甲申（农历正月初一口径，保持不变）', m.fourPillarsLunar?.[0] === '甲申');

// ② 立春前一天/后一天：边界两侧正确
ok('2004-02-03 丑时（立春前一天）节气年柱=癸未', sizhu(2004, 2, 3, 1).fourPillars?.[0] === '癸未');
ok('2004-02-05 丑时（立春后一天）节气年柱=甲申', sizhu(2004, 2, 5, 1).fourPillars?.[0] === '甲申');

// ③ 立春当天「时刻前 vs 时刻后」正确分档（同一天不同时辰）
//    立春=19:56（戌时19-21）。丑时(idx1=02点)在前→癸未；亥时(idx11=22点)在后→甲申。
ok('2004-02-04 丑时(立春前) → 癸未', sizhu(2004, 2, 4, 1).fourPillars?.[0] === '癸未');
ok('2004-02-04 亥时(立春后) → 甲申', sizhu(2004, 2, 4, 11).fourPillars?.[0] === '甲申');

// ④ 非节气日不被误伤（固定期望值，防回归时被动）
const c = sizhu(1990, 6, 15, 6);
ok('非节气日 1990-06-15 午时 节气四柱稳定=庚午/壬午/辛亥/甲午',
   JSON.stringify(c.fourPillars) === JSON.stringify(['庚午', '壬午', '辛亥', '甲午']));

// ⑤ 日柱、时柱不受立春影响（会员案例日柱癸丑、时柱癸丑）
ok('日柱不受立春边界影响（会员案例=癸丑）', m.fourPillars?.[2] === '癸丑');
ok('时柱不受立春边界影响（会员案例丑时=癸丑）', m.fourPillars?.[3] === '癸丑');

// 已知钟表分钟必须保留：交节用东八区标准时刻；日/时柱仍按紫微换日和时支。
const clockForm: BirthFormState = {
  name: '节气分钟回归', year: '2004', month: '2', day: '4',
  clockHour: '19', clockMinute: '30', unknownTime: false,
  province: '', city: '', longitude: 120, gender: 'female',
  calendar: 'solar', useTrueSolarTime: false, dstCorrection: false,
};
const fromClock = (patch: Partial<BirthFormState> = {}) => {
  const normalized = normalizeBirthInput({ ...clockForm, ...patch });
  return { ...normalized, chart: generateChart(normalized.birthInfo) };
};
const before = fromClock();
assert.deepEqual(before.chart.lunarInfo.fourPillars, ['癸未', '乙丑', '癸丑', '壬戌'], '2004立春19:30不能用戌时中点20:00提前换年/月');
passed++;
const after = fromClock({ clockMinute: '57' });
assert.deepEqual(after.chart.lunarInfo.fourPillars?.slice(0, 2), ['甲申', '丙寅']);
assert.deepEqual(before.chart.palaces, after.chart.palaces, '同一时辰内交节不改变农历口径的紫微本命');
passed++;

const east = fromClock({ province: '回归地点', longitude: 135, useTrueSolarTime: true });
const west = fromClock({ province: '回归地点', longitude: 80, useTrueSolarTime: true, clockHour: '20' });
assert.deepEqual(east.chart.lunarInfo.fourPillars?.slice(0, 2), ['癸未', '乙丑'], '真太阳时已到20点仍须按实际19:30判断立春');
assert.deepEqual(west.chart.lunarInfo.fourPillars?.slice(0, 2), ['甲申', '丙寅'], '真太阳时尚在酉时不应把实际20:30退回立春前');
assert.equal(west.birthInfo.hour, 9);
passed += 2;

// 2017立春在2月3日23:34附近；选择两侧留有数分钟余量，非秒级天文精度测试。
// 日本国立天文台2017暦要項：2月4日00:34（UTC+9）=2月3日23:34（UTC+8）。
// https://eco.mtk.nao.ac.jp/koyomi/yoko/2017/rekiyou172.html
const lateBefore = fromClock({ year: '2017', day: '3', clockHour: '23', clockMinute: '20' });
const lateAfter = fromClock({ year: '2017', day: '3', clockHour: '23', clockMinute: '40' });
assert.deepEqual([lateBefore.birthInfo.year, lateBefore.birthInfo.month, lateBefore.birthInfo.day, lateBefore.birthInfo.hour], [2017, 2, 4, 0]);
assert.deepEqual(lateBefore.chart.lunarInfo.fourPillars?.slice(0, 2), ['丙申', '辛丑'], '晚子排盘日归2月4日，但真实2月3日23:20尚未立春');
assert.deepEqual(lateAfter.chart.lunarInfo.fourPillars?.slice(0, 2), ['丁酉', '壬寅']);
assert.deepEqual(lateBefore.chart.palaces, lateAfter.chart.palaces);
assert.deepEqual(lateBefore.chart.lunarInfo.fourPillars?.slice(2), lateAfter.chart.lunarInfo.fourPillars?.slice(2));
passed++;

// 1987小暑在7月7日23:38附近。夏令时7月8日00:20实际是标准时7月7日23:20。
const dst = fromClock({ year: '1987', month: '7', day: '8', clockHour: '0', clockMinute: '20', dstCorrection: true });
assert.deepEqual(dst.chart.lunarInfo.fourPillars?.slice(0, 2), ['丁卯', '丙午']);
assert.deepEqual(dst.birthInfo.standardTime, { year: 1987, month: 7, day: 7, clockHour: 23, clockMinute: 20, utcOffsetMinutes: 480, dstCorrectionMinutes: 60 });
assert.deepEqual(dst.birthInfo.origInput, { year: 1987, month: 7, day: 8, clockHour: 0, clockMinute: 20 });
assert.equal(before.chart.lunarInfo.fourPillarsTimeSource, 'standard-clock');
assert.equal(sizhu(2004, 2, 4, 10).fourPillarsTimeSource, 'branch-midpoint');
assert.equal(normalizeBirthInput({ ...clockForm, unknownTime: true }).birthInfo.standardTime, undefined);
passed++;

console.log(`\n[sizhu-lichun-boundary] ${passed} 项断言组全部通过`);
