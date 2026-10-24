import assert from 'node:assert/strict';
import { buildQimenChart } from '../../lib/qimen/engine';
import { qimenFilename, qimenMarkdown } from '../../lib/qimen/export';
import { deleteQimenArchive, loadQimenArchives, QIMEN_ARCHIVE_KEY, saveQimenArchive } from '../../lib/qimen/archive';

const storage = new Map<string, string>();
let denyWrite = false;
Object.defineProperty(globalThis, 'localStorage', { value: {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => { if (denyWrite) throw new Error('quota'); storage.set(key, value); },
}, configurable: true });
const chart = buildQimenChart({ date: '2026-10-17', time: '17:06', title: '事业 | **盘**\n<script>' });
const md = qimenMarkdown(chart);
assert(md.includes('丙午年 戊戌月 甲子日 癸酉时'));
assert(md.includes('天心落1宫'));
assert(md.includes('开门落6宫'));
assert.equal(md.split('\n').filter(line => /^\| .[1-9]宫 /.test(line)).length, 9);
assert(md.includes('时旬空：戌亥；时驿马：亥'));
assert(md.includes(chart.version));
assert(!md.includes('<script>'));
assert(!md.includes('事业 | **盘**'));
assert(md.includes('地盘干'));
assert(!/[<>:"/\\|?*\u0000-\u001f]/.test(qimenFilename(chart, 'md')));
assert(qimenFilename(chart, '.png').endsWith('_2026-10-17_1706.png'));

assert.deepEqual(loadQimenArchives(), []);
const saved = saveQimenArchive(chart);
assert.equal(saved.length, 1);
assert.deepEqual(loadQimenArchives()[0].chart, chart);
assert.equal(saveQimenArchive(chart).length, 1, '相同盘重复保存不产生重复项');
const older = { ...chart, version: 'previous-rule-version' };
saveQimenArchive(older);
assert.deepEqual(loadQimenArchives()[0].chart, older, '旧规则盘完整恢复，不重算');
assert.equal(deleteQimenArchive(saved[0].id).length, 1);

denyWrite = true;
assert.throws(() => saveQimenArchive(chart), /保存失败/);
assert.equal(loadQimenArchives().length, 1);
denyWrite = false;
const broken = JSON.stringify([{ id: 'invalid', savedAt: 'today', chart: { ...chart, palaces: [{}] } }]);
storage.set(QIMEN_ARCHIVE_KEY, broken);
assert.throws(loadQimenArchives, /格式异常/);
assert.throws(() => saveQimenArchive(chart), /格式异常/);
assert.throws(() => deleteQimenArchive('invalid'), /格式异常/);
assert.equal(storage.get(QIMEN_ARCHIVE_KEY), broken, '损坏数据不能被保存/删除操作默默覆盖');
storage.set(QIMEN_ARCHIVE_KEY, 'not json');
assert.throws(loadQimenArchives, /格式异常/);
console.log('✓ 奇门 MD / 文件名 / 本地存档 / 损坏与配额保护回归通过');
