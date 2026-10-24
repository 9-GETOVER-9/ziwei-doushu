import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { getTianjiCourses, getTianjiEntries, getEntryVideo } from '../academy/course-data';
import { getReferenceCorpus, searchReferenceCorpus } from '@/lib/reference-corpora';
import '@/components/ExplorePages.css';

export const metadata = { title: '三纪阁 · 天纪与人纪原文检索', description: '查阅紫微精选、天纪与人纪公开课程语料，按分部、课程与关键词检索并回放原始出处。' };

type CorpusId = 'ziwei' | 'tianji' | 'renji';
interface ReadingEntry { id: string; quote: string; courseId: string; courseTitle: string; timestamp: string; sourceUrl: string; note: string; category: string }
interface ReadingResult { items: ReadingEntry[]; total: number; page: number; pageCount: number }

export default async function SanjigePage({ searchParams }: { searchParams: Promise<{ corpus?: string; q?: string; lesson?: string; category?: string; page?: string }> }) {
  const params = await searchParams;
  const corpus: CorpusId = params.corpus === 'tianji' || params.corpus === 'renji' ? params.corpus : 'ziwei';
  const query = typeof params.q === 'string' ? params.q.trim().slice(0, 200) : '';
  const pageSize = 24;
  const requestedPage = Math.max(1, Number.parseInt(params.page || '1', 10) || 1);
  const curatedCourses = getTianjiCourses();
  const curatedEntries = getTianjiEntries();
  const activeCorpus = corpus === 'ziwei' ? {
    id: 'ziwei', title: '紫微精选', totalCount: curatedEntries.length,
    sourceUrl: 'https://github.com/Renhuai123/nihai-tianji-corpus', license: 'CC BY-NC-SA 4.0',
    courses: curatedCourses.map(course => ({ id: course.id, title: course.title, count: course.count })),
    categories: [] as { id: string; title: string; count: number }[],
  } : getReferenceCorpus(corpus);
  const selectedCourse = activeCorpus.courses.find(course => course.id === params.lesson);
  const selectedCategory = activeCorpus.categories.find(category => category.id === params.category);
  let result: ReadingResult;
  if (corpus === 'ziwei') {
    const originalCourse = curatedCourses.find(course => course.id === selectedCourse?.id);
    const filtered = curatedEntries.filter(entry => (!originalCourse || entry.part === originalCourse.part) && (!query || `${entry.quote} ${entry.h2} ${entry.h3} ${entry.note}`.includes(query)));
    const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
    const page = Math.min(pageCount, requestedPage);
    result = {
      total: filtered.length, page, pageCount,
      items: filtered.slice((page - 1) * pageSize, page * pageSize).map((entry, i) => {
        const course = curatedCourses.find(item => item.part === entry.part);
        return { id: `${entry.part}-${entry.t_hms}-${i}`, quote: entry.quote, courseId: course?.id || '', courseTitle: course?.title || `第 ${entry.part}P`, timestamp: entry.t_hms, sourceUrl: getEntryVideo(entry), note: entry.note, category: `${entry.h2} · ${entry.h3}` };
      }),
    };
  } else {
    result = searchReferenceCorpus({ corpus, course: selectedCourse?.id, category: selectedCategory?.id, q: query, page: requestedPage, pageSize });
  }

  function linkFor(lesson?: string, category?: string, page = 1, nextCorpus: CorpusId = corpus) {
    const search = new URLSearchParams();
    if (nextCorpus !== 'ziwei') search.set('corpus', nextCorpus);
    if (lesson) search.set('lesson', lesson);
    if (category) search.set('category', category);
    if (query) search.set('q', query);
    if (page > 1) search.set('page', String(page));
    return `/sanjige${search.size ? `?${search.toString()}` : ''}#reading`;
  }

  return <div className="explore-page"><SiteHeader /><main id="main-content" className="explore-shell">
    <header className="explore-intro">
      <span className="explore-eyebrow">SANJI · 三纪阁</span>
      <h1 className="studio-heading">循经典而行，<br />在原话中求证。</h1>
      <p>查阅天纪、人纪与紫微精选课程资料，按分部、讲次和关键词寻找原话，再回到原视频核对。</p>
      <div className="explore-course-meta"><span>当前语料：<strong>{activeCorpus.title}</strong></span><span><strong>{activeCorpus.totalCount.toLocaleString()}</strong> 条引文</span><span><strong>{activeCorpus.courses.length}</strong> 个课程单元</span></div>
    </header>

    <nav className="explore-tabs" aria-label="选择语料库">{([{ id: 'ziwei', title: '紫微精选' }, { id: 'tianji', title: '天纪' }, { id: 'renji', title: '人纪' }] as const).map(item => <Link href={linkFor(undefined, undefined, 1, item.id)} key={item.id} className={corpus === item.id ? 'is-active' : ''} aria-current={corpus === item.id ? 'page' : undefined}>{item.title}</Link>)}<Link href="/library">古籍导读 ↗</Link></nav>
    {corpus === 'renji' && <p className="explore-note explore-corpus-boundary">人纪内容是传统医学课程原话，保留原始语境用于学习核对；本页不提供诊断、处方或治疗建议。</p>}
    <form action="/sanjige#reading" className="explore-search explore-corpus-search">
      <input type="hidden" name="corpus" value={corpus} />
      <label className="sr-only" htmlFor="course-search">检索课程引文</label><input id="course-search" name="q" defaultValue={query} maxLength={200} placeholder={corpus === 'renji' ? '搜索课程关键词或原话' : '搜索主星、宫位、四化或课程原话'} />
      {activeCorpus.categories.length > 0 && <><label className="sr-only" htmlFor="course-category">选择分部或册目</label><select name="category" id="course-category" defaultValue={selectedCategory?.id || ''}><option value="">全部分部 / 册目</option>{activeCorpus.categories.map(category => <option key={category.id} value={category.id}>{category.title} · {category.count} 条</option>)}</select></>}
      <label className="sr-only" htmlFor="course-lesson">选择课程</label><select name="lesson" id="course-lesson" defaultValue={selectedCourse?.id || ''}><option value="">全部课程</option>{activeCorpus.courses.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}</select>
      <button className="studio-button" type="submit">查找原话 ↗</button>
    </form>

    <section id="reading" className="explore-section">
      <div className="explore-section-title"><h2>{selectedCourse?.title || selectedCategory?.title || `${activeCorpus.title} · 全部引文`}</h2><span>{query ? `“${query}” · ` : ''}{result.total.toLocaleString()} 条结果</span></div>
      <div className="explore-reading-grid">
        <nav className="explore-reading-nav explore-corpus-nav" aria-label={corpus === 'ziwei' ? '课程讲次' : '语料分部'}>
          <Link className={!selectedCourse && !selectedCategory ? 'is-active' : ''} href={linkFor()}>全部{corpus === 'ziwei' ? '讲次' : '分部'}<small>{activeCorpus.totalCount.toLocaleString()} 条已收录</small></Link>
          {corpus === 'ziwei' ? activeCorpus.courses.map(course => <Link key={course.id} href={linkFor(course.id)} className={selectedCourse?.id === course.id ? 'is-active' : ''}>{course.title}<small>{course.count} 条引文</small></Link>) : activeCorpus.categories.map(category => <Link key={category.id} href={linkFor(undefined, category.id)} className={selectedCategory?.id === category.id ? 'is-active' : ''}>{category.title}<small>{category.count.toLocaleString()} 条引文</small></Link>)}
        </nav>
        <div>
          {result.items.map(entry => <article key={entry.id} className="explore-quote"><blockquote>「{entry.quote}」</blockquote><div className="explore-quote-meta"><span>{entry.category}</span>{/^https?:\/\//.test(entry.sourceUrl) ? <a className="explore-text-link" href={entry.sourceUrl} target="_blank" rel="noreferrer">{entry.courseTitle} · {entry.timestamp} 回放 ↗</a> : <span>{entry.courseTitle} · {entry.timestamp}</span>}</div>{entry.note && <p className="explore-quote-note">原文备注：{entry.note}</p>}</article>)}
          {result.total === 0 && <div className="explore-mini-empty">没有找到相关引文。试试更短的关键词，或清除分部与课程筛选。<br /><Link href={linkFor()} className="explore-text-link">在当前语料全部内容中搜索 →</Link></div>}
          <nav className="explore-pagination" aria-label="引文翻页"><span>第 {result.page} / {result.pageCount} 页</span>{result.page > 1 && <Link href={linkFor(selectedCourse?.id, selectedCategory?.id, result.page - 1)}>← 上一页</Link>}{result.page < result.pageCount && <Link href={linkFor(selectedCourse?.id, selectedCategory?.id, result.page + 1)}>下一页 →</Link>}</nav>
        </div>
      </div>
    </section>
    <p className="explore-note">紫微精选保留原项目整理的 {curatedEntries.length.toLocaleString()} 条分讲引文；天纪、人纪为各自公开语料库的本地快照。完整《地纪》原文暂未收录。</p>
    <p className="explore-source-line">当前资料来源：<a href={activeCorpus.sourceUrl} target="_blank" rel="noreferrer">{activeCorpus.title}公开语料库</a>。许可：<a href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh" target="_blank" rel="noreferrer">{activeCorpus.license}</a>。仅限非商业学习研究，转载须注明来源并以相同协议分享；课程著作权归原权利人所有。</p>
  </main><SiteFooter /></div>;
}
