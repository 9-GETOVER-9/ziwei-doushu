import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { ALL_STARS, STAR_BRIEF_SEO, STAR_TO_SLUG } from '@/lib/seo/knowledge';
import { ALL_BOOKS, TOTAL_PARAGRAPHS } from '@/lib/classics';
import '@/components/ExplorePages.css';

export const metadata = { title: '紫微知识 · 十四主星与古籍导读', description: '从十四主星入门，阅读按三部紫微书籍组织的项目导读节录，并查阅课程出处。' };

export default function KnowledgeHomePage() {
  return <div className="explore-page"><SiteHeader /><main id="main-content" className="explore-shell">
    <header className="explore-intro"><span className="explore-eyebrow">KNOWLEDGE · 紫微知识</span><h1 className="studio-heading">认识星曜，<br />读懂自己的语言。</h1><p>十四主星是起点。循着导读与课程资料，慢慢建立自己的理解。</p></header>
    <nav className="explore-tabs explore-link-tabs" aria-label="知识分类"><a className="is-active" href="#stars">十四主星</a><a href="#classics">古籍导读</a><Link href="/academy">学习路径 ↗</Link></nav>
    <section id="stars" className="explore-section"><div className="explore-section-title"><h2>十四主星</h2><span>14 STARS</span></div><div className="explore-star-nav">{ALL_STARS.map(star => <a key={star} href={`#star-${STAR_TO_SLUG[star]}`}>{star}</a>)}</div><div className="explore-star-grid">{ALL_STARS.map((star, i) => <article id={`star-${STAR_TO_SLUG[star]}`} key={star} className="explore-star-card"><span className="explore-index">{String(i + 1).padStart(2, '0')}</span><h3>{star}</h3><p>{STAR_BRIEF_SEO[star]}</p><Link className="explore-text-link" href={`/library/search?q=${encodeURIComponent(star)}`}>查阅{star}相关节录 ↗</Link></article>)}</div><p className="explore-note">以上为传统星曜象意的入门简介。具体命盘需要结合宫位、亮度、同宫星曜及四化阅读。</p></section>
    <section id="classics" className="explore-section"><div className="explore-section-title"><div><span className="explore-eyebrow">PROJECT READING NOTES</span><h2>阅读古籍导读</h2></div><span>{ALL_BOOKS.length} 部书的导读 · {TOTAL_PARAGRAPHS.toLocaleString()} 段整理节录</span></div><form action="/library/search" className="explore-search"><label className="sr-only" htmlFor="classics-query">搜索古籍关键词</label><input id="classics-query" name="q" placeholder="搜索星曜、宫位或导读关键词" required /><button className="studio-button" type="submit">搜索节录 ↗</button></form><div className="explore-grid-three">{ALL_BOOKS.map((book, i) => <Link key={book.slug} href={`/library/${book.slug}`} className="studio-panel explore-resource-card"><span className="explore-index">导读 / 0{i + 1}</span><h3>{book.title} · 导读</h3><p>按《{book.title}》的主题整理，包含项目节录与现代释义。</p><span className="explore-text-link">{book.chapters.length} 章 · 开始阅读 ↗</span></Link>)}</div></section>
  </main><SiteFooter /></div>;
}
