/** Server/Node data layer. The public page imports the server-only wrapper. */
import { readFileSync } from 'node:fs';
import path from 'node:path';

export type ReferenceCorpusId = 'tianji' | 'renji';
export interface ReferenceEntry {
  id: string; quote: string; courseId: string; courseTitle: string;
  timestamp: string; sourceUrl: string; note: string;
  category: string; categoryId: string; heading: string;
}
export interface ReferenceGroup { id: string; title: string; count: number }
export interface ReferenceCorpus {
  id: ReferenceCorpusId; title: string; totalCount: number; sourceUrl: string;
  license: string; licenseUrl: string; commit: string;
  courses: ReferenceGroup[]; categories: ReferenceGroup[];
}
interface RawEntry { book: string; h2: string; h3: string; quote: string; bvid: string; part: number; ep?: number; part_name?: string; t_hms: string; note: string }
const CONFIG = {
  tianji: { title: '天纪', repo: 'nihai-tianji-corpus', commit: '462faa4c70af40b8b87ad82ffa82a5823a485e94' },
  renji: { title: '人纪', repo: 'nihai-renji-corpus', commit: 'fdafae1ea685756a92a59179fdfa2e6a01379100' },
} as const;
const CATEGORY_TITLES: Record<string, string> = {
  '01-stars': '主星', '02-palaces': '十二宫', '03-patterns': '格局', '04-sihua': '四化', '05-illness': '疾厄', '07-methodology': '方法论',
  '08-yili': '易理总纲', '09-hexagrams': '六十四卦', '10-divination': '占断', '11-fengshui': '堪舆', '12-tieban': '铁板神数',
  '01-shanghan': '伤寒论', '02-jinkui': '金匮要略', '03-bencao': '神农本草经', '04-neijing': '黄帝内经', '05-zhongjing': '仲景心法', '06-zhenjiu': '针灸大成',
};
const corpusCache = new Map<ReferenceCorpusId, { metadata: ReferenceCorpus; entries: ReferenceEntry[]; searchable: string[] }>();

function readCorpus(id: ReferenceCorpusId) {
  const cached = corpusCache.get(id);
  if (cached) return cached;
  if (id !== 'tianji' && id !== 'renji') throw new Error('Unknown reference corpus');
  const config = CONFIG[id];
  // Literal paths let Next trace these two datasets without including the workspace.
  const content = id === 'tianji'
    ? readFileSync(path.join(process.cwd(), 'tools/reference-corpora/tianji/entries.jsonl'), 'utf8')
    : readFileSync(path.join(process.cwd(), 'tools/reference-corpora/renji/entries.jsonl'), 'utf8');
  const rawEntries = content.trim().split(/\r?\n/).map(line => JSON.parse(line) as RawEntry);
  const courses = new Map<string, ReferenceGroup>();
  const categories = new Map<string, ReferenceGroup>();
  const entries = rawEntries.map((raw, index): ReferenceEntry => {
    if (typeof raw.quote !== 'string' || !raw.quote.trim() || !/^BV[\w]+$/.test(raw.bvid) || !Number.isInteger(raw.part) || raw.part < 1 || !/^\d{2}:[0-5]\d:[0-5]\d$/.test(raw.t_hms) || !CATEGORY_TITLES[raw.book] || (id === 'renji' && (!Number.isInteger(raw.ep) || raw.ep! < 1))) throw new Error(`Invalid ${id} corpus entry ${index + 1}`);
    // Tianji has two multi-part videos; Renji has a separate BV for every episode.
    // Neither source can be grouped by part alone without merging unrelated lessons.
    const courseId = id === 'tianji' ? `${raw.bvid}-${raw.part}` : `${raw.book}-${raw.ep}`;
    const category = CATEGORY_TITLES[raw.book];
    const courseTitle = id === 'renji' ? `${category} · 第 ${raw.ep} 集` : raw.bvid === 'BV1q7BZYcEZP' ? `六十四卦 · 第 ${raw.part - 3} 卦` : `天纪原课 · 第 ${raw.part} 单元`;
    const course = courses.get(courseId) ?? { id: courseId, title: courseTitle, count: 0 };
    course.count++; courses.set(courseId, course);
    const group = categories.get(raw.book) ?? { id: raw.book, title: category, count: 0 };
    group.count++; categories.set(raw.book, group);
    const [h, m, s] = raw.t_hms.split(':').map(Number);
    return {
      id: `${id}-${index + 1}`, quote: raw.quote, courseId, courseTitle,
      timestamp: raw.t_hms, sourceUrl: `https://www.bilibili.com/video/${raw.bvid}?p=${raw.part}&t=${h * 3600 + m * 60 + s}`,
      note: raw.note || '', category, categoryId: raw.book, heading: [raw.h2, raw.h3].filter(Boolean).join(' · '),
    };
  });
  const compareGroup = (a: ReferenceGroup, b: ReferenceGroup) => a.id.localeCompare(b.id, 'en', { numeric: true });
  const sourceUrl = `https://github.com/Renhuai123/${config.repo}`;
  const metadata: ReferenceCorpus = {
    id, title: config.title, totalCount: entries.length, sourceUrl,
    license: 'CC BY-NC-SA 4.0', licenseUrl: `${sourceUrl}/blob/${config.commit}/LICENSE.md`, commit: config.commit,
    courses: [...courses.values()].sort(compareGroup), categories: [...categories.values()].sort(compareGroup),
  };
  const result = { metadata, entries, searchable: entries.map(entry => `${entry.quote} ${entry.heading} ${entry.note} ${entry.category} ${entry.courseTitle}`.normalize('NFKC').toLowerCase()) };
  corpusCache.set(id, result);
  return result;
}

export function getReferenceCorpus(id: ReferenceCorpusId): ReferenceCorpus { return readCorpus(id).metadata; }

export function searchReferenceCorpus({ corpus, course, category, q = '', page = 1, pageSize = 24 }: {
  corpus: ReferenceCorpusId; course?: string; category?: string; q?: string; page?: number; pageSize?: number;
}) {
  const data = readCorpus(corpus);
  const terms = q.normalize('NFKC').toLowerCase().trim().split(/\s+/).filter(Boolean);
  const results = data.entries.filter((entry, index) => (!course || entry.courseId === course) && (!category || entry.categoryId === category) && terms.every(term => data.searchable[index].includes(term)));
  const size = Number.isFinite(pageSize) ? Math.max(1, Math.min(100, Math.floor(pageSize))) : 24;
  const pageCount = Math.max(1, Math.ceil(results.length / size));
  const currentPage = Number.isFinite(page) ? Math.max(1, Math.min(pageCount, Math.floor(page))) : 1;
  return { items: results.slice((currentPage - 1) * size, currentPage * size), total: results.length, page: currentPage, pageCount, pageSize: size };
}
