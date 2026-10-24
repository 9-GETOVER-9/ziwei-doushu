import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { searchClassics, getParagraphById } from '@/lib/classics';
import LibrarySearch from '../LibrarySearch';
import '@/components/ExplorePages.css';

export const metadata = { title: '搜索节录 · 古籍导读' };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const params = await searchParams;
  const query = typeof params.q === 'string' ? params.q.trim().slice(0, 200) : '';
  const hits = query ? searchClassics(query, Number.MAX_SAFE_INTEGER) : [];
  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(hits.length / pageSize));
  const page = Math.min(pageCount, Math.max(1, Number.parseInt(params.page || '1', 10) || 1));
  const linkFor = (target: number) => `/library/search?${new URLSearchParams({ q: query, page: String(target) }).toString()}`;
  return <div className="explore-page"><SiteHeader /><main id="main-content" className="explore-shell explore-reader">
    <nav className="explore-breadcrumb" aria-label="面包屑"><Link href="/library">古籍导读</Link><span>/</span><span>节录检索</span></nav>
    <header className="explore-intro"><span className="explore-eyebrow">FIND IN THE CLASSICS</span><h1 className="studio-heading">{query ? `关于「${query}」` : '寻找一句节录'}</h1><p>{query ? `在已收录古籍中，共找到 ${hits.length} 段相关节录。` : '输入星曜、宫位或一句你想查证的话。'}</p></header>
    <LibrarySearch initialQuery={query} />
    <div className="explore-search-results">{hits.slice((page - 1) * pageSize, page * pageSize).map(hit => {
      const context = getParagraphById(hit.paragraphId);
      return <Link href={`/library/${hit.bookSlug}/${context?.chapterIdx ?? 0}#${hit.paragraphId}`} className="explore-search-hit" key={hit.paragraphId}><span className="explore-eyebrow">《{hit.bookTitle}》导读 · {hit.chapterTitle}</span><p dangerouslySetInnerHTML={{ __html: hit.snippet }} /><span className="explore-text-link">阅读上下文 ↗</span></Link>;
    })}</div>
    {!hits.length && <div className="explore-mini-empty">{query ? '暂未找到相关节录。可以缩短关键词，或尝试简体、繁体的另一种写法。' : '试试「紫微」「命宫」「化忌」，从一个熟悉的词开始。'}</div>}
    {hits.length > 0 && <nav className="explore-pagination" aria-label="搜索结果翻页"><span>第 {page} / {pageCount} 页</span>{page > 1 && <Link href={linkFor(page - 1)}>← 上一页</Link>}{page < pageCount && <Link href={linkFor(page + 1)}>下一页 →</Link>}</nav>}
  </main><SiteFooter /></div>;
}
