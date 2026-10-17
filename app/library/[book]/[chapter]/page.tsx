import Link from 'next/link';
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { ALL_BOOKS, getChapter } from '@/lib/classics';
import '@/components/ExplorePages.css';

export async function generateStaticParams() { return ALL_BOOKS.flatMap(book => book.chapters.map((_, i) => ({ book: book.slug, chapter: String(i) }))); }

export async function generateMetadata({ params }: { params: Promise<{ book: string; chapter: string }> }) {
  const { book, chapter } = await params;
  const result = /^\d+$/.test(chapter) ? getChapter(book, Number(chapter)) : null;
  return result ? { title: `${result.chapter.title} · ${result.book.title}导读`, description: `《${result.book.title}》${result.chapter.title}的项目整理节录，非逐字校勘本。` } : {};
}

export default async function ChapterPage({ params }: { params: Promise<{ book: string; chapter: string }> }) {
  const { book: slug, chapter: index } = await params;
  const result = /^\d+$/.test(index) ? getChapter(slug, Number(index)) : null;
  if (!result) notFound();
  const { book, chapter, chapterIdx } = result;
  return <div className="explore-page"><SiteHeader /><main id="main-content" className="explore-shell explore-reader">
    <nav className="explore-breadcrumb" aria-label="面包屑"><Link href="/library">古籍导读</Link><span>/</span><Link href={`/library/${book.slug}`}>{book.title}</Link><span>/</span><span>{chapter.title}</span></nav>
    <article><header className="explore-intro"><span className="explore-eyebrow">《{book.title}》 · {book.dynasty}</span><h1 className="studio-heading">{chapter.title}</h1>{chapter.subtitle && <p>{chapter.subtitle}</p>}</header>
      <p className="explore-note">本章为项目整理节录，部分段落含现代释义；并非古籍原文的逐字校勘本。</p><div className="explore-classic-text">{chapter.paragraphs.map(paragraph => <section id={paragraph.id} key={paragraph.id} className="explore-classic-paragraph"><a href={`#${paragraph.id}`} className="explore-paragraph-number" aria-label={`定位第 ${paragraph.idx} 段`}>{String(paragraph.idx).padStart(2, '0')}</a><div><p>{paragraph.text}</p>{paragraph.translation && <aside className="explore-classic-note"><span>白话</span>{paragraph.translation}</aside>}{paragraph.niNote && <aside className="explore-classic-note"><span>倪师注</span>{paragraph.niNote}</aside>}</div></section>)}</div>
      <nav className="explore-chapter-nav" aria-label="章节导航">{chapterIdx > 0 ? <Link href={`/library/${book.slug}/${chapterIdx - 1}`}><span>← 上一章</span><strong>{book.chapters[chapterIdx - 1].title}</strong></Link> : <Link href={`/library/${book.slug}`}><span>← 返回目录</span><strong>{book.title}</strong></Link>}{chapterIdx < book.chapters.length - 1 && <Link href={`/library/${book.slug}/${chapterIdx + 1}`}><span>下一章 →</span><strong>{book.chapters[chapterIdx + 1].title}</strong></Link>}</nav>
    </article>
  </main><SiteFooter /></div>;
}
