import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { getReferenceCorpus, searchReferenceCorpus } from '../../lib/reference-corpora-data';

const manifest = JSON.parse(readFileSync('tools/reference-corpora/manifest.json', 'utf8'));
for (const source of manifest.sources) {
  for (const file of source.files) {
    assert.equal(createHash('sha256').update(readFileSync(`tools/reference-corpora/${source.id}/${file.name}`)).digest('hex'), file.sha256, `Pinned ${source.id}/${file.name} changed`);
  }
}
const tianji = getReferenceCorpus('tianji');
const renji = getReferenceCorpus('renji');
assert.deepEqual([tianji.totalCount, tianji.courses.length, tianji.categories.length], [4886, 112, 11]);
assert.deepEqual([renji.totalCount, renji.courses.length, renji.categories.length], [19294, 117, 6]);
for (const corpus of [tianji, renji]) {
  assert.equal(corpus.courses.reduce((sum, course) => sum + course.count, 0), corpus.totalCount);
  assert.equal(corpus.categories.reduce((sum, category) => sum + category.count, 0), corpus.totalCount);
}
const page1 = searchReferenceCorpus({ corpus: 'tianji', q: '紫微', page: 1 });
const page2 = searchReferenceCorpus({ corpus: 'tianji', q: '紫微', page: 2 });
assert.equal(page1.items.length, 24);
assert.ok(page1.total > 24);
assert.ok(page2.items.every(entry => !page1.items.some(first => first.id === entry.id)));
const filtered = searchReferenceCorpus({ corpus: 'renji', course: '01-shanghan-15', category: '01-shanghan' });
assert.ok(filtered.items.length > 0);
assert.ok(filtered.items.every(entry => entry.courseId === '01-shanghan-15' && entry.categoryId === '01-shanghan'));
assert.ok(filtered.items.some(entry => entry.sourceUrl === 'https://www.bilibili.com/video/BV1rL8xzAEWA?p=1&t=27'));
assert.equal(searchReferenceCorpus({ corpus: 'renji', course: '01-shanghan-15', category: '06-zhenjiu' }).total, 0);
for (const course of ['BV1KJsLekEfA-5', 'BV1q7BZYcEZP-5']) {
  const result = searchReferenceCorpus({ corpus: 'tianji', course });
  assert.ok(result.items.length > 0);
  assert.ok(result.items.every(entry => entry.sourceUrl.includes(course.split('-')[0]) && entry.sourceUrl.includes('?p=5&')));
}
assert.equal(searchReferenceCorpus({ corpus: 'tianji', page: -3 }).page, 1);
assert.deepEqual(searchReferenceCorpus({ corpus: 'renji', q: '__missing_exact_phrase__' }).items, []);
console.log('PASS pinned corpus hashes, 24,180 records, 229 distinct lessons, filtered search, pagination and exact video replay links');
