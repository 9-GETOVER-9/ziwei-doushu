import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { ALL_BOOKS, TOTAL_PARAGRAPHS } from '@/lib/classics';
import LibrarySearch from './LibrarySearch';
import '@/components/ExplorePages.css';

export const metadata = { title: '古籍导读 · 紫微斗数阅读室', description: '阅读与搜索按骨髓赋、紫微斗数全集与紫微斗数全书组织的项目导读节录。' };

export default function LibraryPage() {
  return <div className="explore-page"><SiteHeader /><main id="main-content" className="explore-shell">
    <header className="explore-intro"><span className="explore-eyebrow">CLASSICS · 古籍导读</span><h1 className="studio-heading">读过星图，<br />再读一页导读。</h1><p>从一颗星、一座宫位，查阅项目整理的相关段落。这里按 {ALL_BOOKS.length} 部书组织了 {TOTAL_PARAGRAPHS.toLocaleString()} 段整理节录。</p></header>
    <LibrarySearch />
    <div className="explore-star-nav" aria-label="常用关键词">{['紫微', '七杀朝斗', '双禄朝垣', '化忌', '命宫', '机月同梁'].map(query => <Link key={query} href={`/library/search?q=${encodeURIComponent(query)}`}>{query}</Link>)}</div>
    <section className="explore-section"><div className="explore-section-title"><h2>在架导读</h2><Link href="/knowledge" className="explore-text-link">从十四主星开始 ↗</Link></div><div className="explore-grid-three">{ALL_BOOKS.map((book, i) => <Link href={`/library/${book.slug}`} key={book.slug} className="studio-panel explore-resource-card"><span className="explore-index">导读 / 0{i + 1}</span><h3>{book.title} · 导读</h3><p className="explore-book-author">{book.dynasty} · {book.author}</p><p>以《{book.title}》的主题为线索，阅读项目整理的节录与释义。</p><span className="explore-text-link">{book.chapters.length} 章 · {book.chapters.reduce((sum, chapter) => sum + chapter.paragraphs.length, 0)} 段 · 开始阅读 ↗</span></Link>)}</div></section>
    <section className="studio-panel explore-method-summary"><h2>从节录建立理解</h2><p>节录检索覆盖当前收录的段落，可从搜索结果直接定位到所在章节。内容来自项目内置的整理数据，部分段落包含现代释义，未按古本逐字校勘，适合作为导读；本页不将其作为古籍全文提供。</p></section>
    <Link className="explore-text-link" href="/sanjige">配合《天纪》课程原话学习 →</Link>
  </main><SiteFooter /></div>;
}
