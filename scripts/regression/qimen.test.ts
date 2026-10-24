import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { buildQimenChart, beijingNowInput, shiftQimenTime } from '../../lib/qimen/engine';
import type { QimenChart } from '../../lib/qimen/types';

const chart = (date: string, time: string) => buildQimenChart({ date, time });
const palace = (q: QimenChart, n: number) => q.palaces.find(p => p.number === n)!;
const summary = (q: QimenChart) => [q.pillars.year, q.pillars.month, q.pillars.day, q.pillars.hour, q.solarTerm, q.yuan, q.dun, q.ju];

if (process.argv.includes('--timezone-probe')) {
  // Run the same wall-clock input in actual distinct process timezones, including
  // a DST zone. Neither the date parser nor the calendar may read device local TZ.
  console.log(JSON.stringify({
    q: chart('2026-02-04', '04:02'),
    lateZi: chart('2026-10-21', '23:00'),
    now: beijingNowInput(new Date('2026-12-31T16:30:00Z')),
    shifted: shiftQimenTime({ date: '2026-12-31', time: '23:30' }, 120),
  }));
} else {
  // Human-transcribed from the user's 3meta screenshot. No reference engine is
  // executed to generate expectations during this test.
  const screenshot = chart('2026-10-17', '17:06');
  assert.deepEqual(summary(screenshot), ['丙午', '戊戌', '甲子', '癸酉', '寒露', '上元', '阴遁', 6]);
  assert.deepEqual(screenshot.chiefStar, { name: '天心', palace: 1, origin: 6 });
  assert.deepEqual(screenshot.chiefDoor, { name: '开门', palace: 6, rawPalace: 6 });
  assert.equal(screenshot.voidBranches, '戌亥');
  assert.equal(screenshot.horseBranch, '亥');

  // Columns: number, stars, door, deity, heaven, earth, hosted heaven, hosted earth.
  type PalaceRow = [number, string, string, string, string, string, string, string];
  function checkPalaces(q: QimenChart, rows: PalaceRow[]) {
    for (const [n, stars, door, deity, sky, earth, hostedSky, hostedEarth] of rows) {
      const p = palace(q, n);
      assert.deepEqual(
        [p.stars.join('、'), p.door, p.deity, p.heavenStem, p.earthStem, p.hostedHeavenStem, p.hostedEarthStem],
        [stars, door, deity, sky, earth, hostedSky, hostedEarth], `${q.input.date} ${q.input.time} palace ${n}`,
      );
    }
  }
  checkPalaces(screenshot, [
    [1, '天心', '休门', '值符', '戊', '癸', '', ''],
    [2, '天英', '死门', '六合', '丁', '壬', '', '己'],
    [3, '天任', '伤门', '九地', '丙', '辛', '', ''],
    [4, '天冲', '杜门', '玄武', '辛', '庚', '', ''],
    [5, '', '', '', '', '己', '', ''],
    [6, '天柱', '开门', '腾蛇', '乙', '戊', '', ''],
    [7, '天芮、天禽', '惊门', '太阴', '壬', '乙', '己', ''],
    [8, '天蓬', '生门', '九天', '癸', '丙', '', ''],
    [9, '天辅', '景门', '白虎', '庚', '丁', '', ''],
  ]);

  // Independent public screenshot: kentang2017/kinqimen issue #27.
  // https://user-images.githubusercontent.com/36002974/159656439-c576bbf7-754e-4ddb-b26b-83080d50205d.jpg
  // Date is from issue prose; UTC+08:00 is the explicit comparison assumption.
  // Screenshot labels raw palace 5; the visible star and door are hosted in 2.
  const yinReference = chart('2016-12-02', '17:00');
  assert.deepEqual(summary(yinReference), ['丙申', '己亥', '戊午', '辛酉', '小雪', '中元', '阴遁', 8]);
  assert.deepEqual(yinReference.chiefStar, { name: '天冲', palace: 2, origin: 3 });
  assert.deepEqual(yinReference.chiefDoor, { name: '伤门', palace: 2, rawPalace: 5 });
  checkPalaces(yinReference, [
    [1, '天芮、天禽', '死门', '玄武', '丁', '丙', '辛', ''],
    [2, '天冲', '伤门', '值符', '癸', '丁', '', '辛'],
    [3, '天心', '开门', '六合', '庚', '癸', '', ''],
    [4, '天蓬', '休门', '太阴', '丙', '壬', '', ''],
    [5, '', '', '', '', '辛', '', ''],
    [6, '天英', '景门', '九地', '乙', '庚', '', ''],
    [7, '天辅', '杜门', '九天', '壬', '己', '', ''],
    [8, '天柱', '惊门', '白虎', '己', '戊', '', ''],
    [9, '天任', '生门', '腾蛇', '戊', '乙', '', ''],
  ]);

  // Independent public screenshot: kinqimen issue #4 maintainer reply (09:00,
  // not the different 09:20 input in the issue body).
  // https://github.com/kentang2017/kinqimen/issues/4#issuecomment-793771135
  // Original yang deities 勾陈/朱雀 occupy our fixed 白虎/玄武 slots. This is an
  // explicit convention difference, not a claim of literal screenshot identity.
  const yangReference = chart('2021-03-09', '09:00');
  assert.deepEqual(summary(yangReference), ['辛丑', '辛卯', '丙辰', '癸巳', '惊蛰', '中元', '阳遁', 7]);
  assert.equal(yangReference.chiefStar.name, '天英');
  assert.equal(yangReference.chiefStar.palace, 3);
  assert.equal(yangReference.chiefDoor.name, '景门');
  assert.equal(yangReference.chiefDoor.palace, 9);
  assert.equal(yangReference.voidBranches, '午未');
  assert.equal(yangReference.horseBranch, '亥');
  assert.equal(palace(yangReference, 6).horse, true);
  checkPalaces(yangReference, [
    [1, '天冲', '休门', '九地', '癸', '辛', '', ''],
    [2, '天心', '死门', '六合', '乙', '壬', '', '丙'],
    [3, '天英', '伤门', '值符', '庚', '癸', '', ''],
    [4, '天芮、天禽', '杜门', '腾蛇', '壬', '丁', '丙', ''],
    [5, '', '', '', '', '丙', '', ''],
    [6, '天任', '开门', '玄武', '己', '乙', '', ''],
    [7, '天蓬', '惊门', '白虎', '辛', '戊', '', ''],
    [8, '天辅', '生门', '九天', '丁', '己', '', ''],
    [9, '天柱', '景门', '太阴', '戊', '庚', '', ''],
  ]);

  // Hand calculation: 阳五, 甲戌日下元, 乙丑时甲子旬戊 originally in 5.
  // The door counts one step from actual 5 to 6, not from hosted 2 to 3.
  // Cross-checked with qimen-rs c4e7fb1 unit test duty_door_counts_from_actual_center_before_hosting.
  const centerSource = chart('2024-01-11', '01:00');
  assert.deepEqual(summary(centerSource), ['癸卯', '乙丑', '甲戌', '乙丑', '小寒', '下元', '阳遁', 5]);
  assert.deepEqual(centerSource.chiefStar, { name: '天禽', palace: 4, origin: 5 });
  assert.deepEqual(centerSource.chiefDoor, { name: '死门', palace: 6, rawPalace: 6 });
  assert.deepEqual(palace(centerSource, 4).stars, ['天芮', '天禽']);
  assert.equal(palace(centerSource, 4).hostedHeavenStem, '戊');

  // Calendar boundaries are locked to lunar-javascript 1.7.7 / sxwnl values.
  // qimen-rs 0.2.1 independently executed the same minute fixtures; its calendar
  // shares the sxwnl lineage, so this is boundary handling, not a new ephemeris certification.
  assert.deepEqual(summary(chart('2026-02-04', '04:02')), ['乙巳', '己丑', '己酉', '丙寅', '大寒', '上元', '阳遁', 3]);
  assert.deepEqual(summary(chart('2026-02-04', '04:03')), ['丙午', '庚寅', '己酉', '丙寅', '立春', '上元', '阳遁', 8]);
  assert.equal(chart('2026-02-04', '04:03').solarTermAt, '2026-02-04 04:02:08');
  assert.deepEqual(summary(chart('2026-06-21', '16:24')), ['丙午', '甲午', '丙寅', '丙申', '芒种', '上元', '阳遁', 6]);
  assert.deepEqual(summary(chart('2026-06-21', '16:25')), ['丙午', '甲午', '丙寅', '丙申', '夏至', '上元', '阴遁', 9]);
  assert.deepEqual(summary(chart('2026-12-22', '04:50')), ['丙午', '庚子', '庚午', '戊寅', '大雪', '中元', '阴遁', 7]);
  assert.deepEqual(summary(chart('2026-12-22', '04:51')), ['丙午', '庚子', '庚午', '戊寅', '冬至', '中元', '阳遁', 7]);

  const lateBefore = chart('2026-10-21', '22:59');
  const lateAfter = chart('2026-10-21', '23:00');
  const midnight = chart('2026-10-22', '00:00');
  assert.deepEqual([lateBefore.pillars.day, lateBefore.fuTou, lateBefore.yuan, lateBefore.ju], ['戊辰', '甲子', '上元', 6]);
  assert.deepEqual([lateAfter.pillars.day, lateAfter.pillars.hour, lateAfter.fuTou, lateAfter.yuan, lateAfter.ju], ['己巳', '甲子', '己巳', '中元', 9]);
  assert.deepEqual(lateAfter.palaces, midnight.palaces, 'one continuous 子时 across civil midnight');
  assert.deepEqual(lateAfter.pillars, midnight.pillars);
  assert.notEqual(lateAfter.lunarDate, midnight.lunarDate, 'civil lunar date must not silently move at 23:00');
  assert.equal(lateAfter.hiddenJia, '戊', '甲子时 uses hidden 戊 instead of looking for absent 甲');
  assert.deepEqual(lateAfter.palaces.filter(p => p.number !== 5).map(p => [p.heavenStem, p.earthStem]).every(([sky, earth]) => sky === earth), true, '甲时星盘伏吟');

  // A lunar leap month is a civil display event, not a duplicate solar month pillar.
  const leapStart = chart('2023-03-22', '12:00');
  assert.match(leapStart.lunarDate, /闰二月/);
  assert.equal(leapStart.pillars.month, chart('2023-03-21', '12:00').pillars.month);
  assert.equal(leapStart.pillars.month, '乙卯');
  assert.equal(chart('2024-02-29', '12:00').input.date, '2024-02-29');
  assert.doesNotThrow(() => chart('1900-01-01', '00:00'));
  assert.doesNotThrow(() => chart('2100-12-31', '23:59'));
  for (const date of ['2023-02-29', '1900-02-29', '2100-02-29', '2026-04-31', '2026-00-01', '2026-13-01', '1899-12-31', '2101-01-01', '2026-1-1']) {
    assert.throws(() => chart(date, '12:00'), `reject nonexistent/out-of-range ${date}`);
  }
  for (const time of ['24:00', '12:60', '1:00', '', '-1:00']) assert.throws(() => chart('2026-01-01', time));
  assert.throws(() => buildQimenChart({ date: '2026-01-01', time: '12:00', title: '盘'.repeat(81) }));
  assert.deepEqual(shiftQimenTime({ date: '2024-02-29', time: '23:30', title: '边界' }, 120), { date: '2024-03-01', time: '01:30', title: '边界' });
  assert.throws(() => shiftQimenTime({ date: '2100-12-31', time: '23:30' }, 120));
  assert.throws(() => shiftQimenTime({ date: '2026-01-01', time: '00:00' }, 0.5));
  assert.deepEqual(beijingNowInput(new Date('2026-12-31T16:30:00Z')), { date: '2027-01-01', time: '00:30', title: '' });

  // Scan one civil year at noon, plus all twelve branches and both sides of each
  // hour boundary. This checks missing/duplicated symbols, not only select fixtures.
  const seenFormations = new Set<string>();
  let scanned = 0;
  function invariant(q: QimenChart) {
    const label = `${q.input.date} ${q.input.time}`;
    assert.deepEqual(q.palaces.map(p => p.number), [4, 9, 2, 3, 5, 7, 8, 1, 6], label);
    assert.equal(new Set(q.palaces.map(p => p.earthStem)).size, 9, label);
    assert.equal(new Set(q.palaces.flatMap(p => [p.heavenStem, p.hostedHeavenStem]).filter(Boolean)).size, 9, label);
    assert.equal(new Set(q.palaces.flatMap(p => p.stars)).size, 9, label);
    assert.equal(new Set(q.palaces.map(p => p.door).filter(Boolean)).size, 8, label);
    assert.equal(new Set(q.palaces.map(p => p.deity).filter(Boolean)).size, 8, label);
    assert.equal(q.palaces.filter(p => p.horse).length, 1, label);
    assert.equal(q.palaces.map(p => p.voidBranches).join('').length, 2, label);
    assert.equal(q.palaces.filter(p => p.isChiefStar).length, 1, label);
    assert.equal(q.palaces.filter(p => p.isChiefDoor).length, 1, label);
    assert.ok(palace(q, q.chiefStar.palace).stars.includes(q.chiefStar.name), label);
    assert.equal(palace(q, q.chiefStar.palace).deity, '值符', label);
    assert.equal(palace(q, q.chiefDoor.palace).door, q.chiefDoor.name, label);
    assert.equal(palace(q, 2).hostedEarthStem, palace(q, 5).earthStem, label);
    const qin = q.palaces.find(p => p.stars.includes('天禽'))!;
    assert.deepEqual(qin.stars, ['天芮', '天禽'], label);
    assert.equal(qin.hostedHeavenStem, palace(q, 5).earthStem, label);
    assert.equal(palace(q, 5).heavenStem, '', label);
    seenFormations.add(`${q.dun}${q.ju}`);
    scanned++;
  }
  for (let day = 0; day < 365; day++) {
    const date = new Date(Date.UTC(2026, 0, 1 + day)).toISOString().slice(0, 10);
    invariant(chart(date, '12:00'));
  }
  for (const date of ['2026-01-11', '2026-08-11']) {
    for (let hour = 0; hour < 24; hour++) {
      const q = chart(date, `${String(hour).padStart(2, '0')}:00`);
      assert.equal(q.pillars.hour[1], '子丑寅卯辰巳午未申酉戌亥'[Math.floor((hour + 1) / 2) % 12]);
      invariant(q);
      if (hour % 2 === 1) {
        const before = chart(date, `${String(hour - 1).padStart(2, '0')}:59`);
        assert.notEqual(before.pillars.hour, q.pillars.hour);
        invariant(before);
      }
    }
  }
  assert.equal(seenFormations.size, 18, 'scan covers all nine yin and nine yang formations');

  const probes = ['Asia/Shanghai', 'UTC', 'America/New_York'].map(TZ => execFileSync(
    process.execPath, ['--import', 'tsx', process.argv[1], '--timezone-probe'],
    { encoding: 'utf8', env: { ...process.env, TZ }, timeout: 30_000 },
  ));
  assert.equal(probes[0], probes[1], 'Shanghai/UTC process parity');
  assert.equal(probes[1], probes[2], 'UTC/New York process parity');
  console.log(`PASS qimen: 3 screenshot fixtures; exact terms, 23:00, center hosting, leap dates, 12 hours, ${scanned} invariant charts / 18 formations, 3 process timezones`);
}
