import Link from 'next/link';
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { ALL_BOOKS, getBookBySlug } from '@/lib/classics';
import '@/components/ExplorePages.css';

export async function generateStaticParams() { return ALL_BOOKS.map(book => ({ book: book.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ book: string }> }) {
  const { book: slug } = await params;
  const book = getBookBySlug(slug);
  return book ? { title: `${book.title} · 古籍导读`, description: `《${book.title}》的项目整理节录与阅读目录，非逐字校勘古籍全文。` } : {};
}

export default async function BookPage({ params }: { params: Promise<{ book: string }> }) {
  const { book: slug } = await params;
  const book = getBookBySlug(slug);
  if (!book) notFound();
  return <div className="explore-page"><SiteHeader /><main id="main-content" className="explore-shell explore-reader">
    <nav className="explore-breadcrumb" aria-label="面包屑"><Link href="/library">古籍导读</Link><span>/</span><span>{book.title}</span></nav>
    <header className="explore-intro"><span className="explore-eyebrow">{book.dynasty} · {book.author}</span><h1 className="studio-heading">{book.title} · 导读</h1><p>以《{book.title}》的主题为线索，阅读项目整理的节录与释义。</p><div className="explore-course-meta"><span>{book.chapters.length} 个章节</span><span>{book.chapters.reduce((sum, chapter) => sum + chapter.paragraphs.length, 0)} 段已收录节录</span></div></header>
    <div className="explore-lecture-list">{book.chapters.map((chapter, i) => <Link href={`/library/${book.slug}/${i}`} className="explore-lecture" key={i}><span className="explore-index">{String(i + 1).padStart(2, '0')}</span><div><h2 className="explore-chapter-title">{chapter.title}</h2>{chapter.subtitle && <p>{chapter.subtitle}</p>}</div><span>{chapter.paragraphs.length} 段 · 阅读 ↗</span></Link>)}</div>
    <p className="explore-note">以上为项目当前整理目录，按书籍主题归类。可通过全文搜索定位到具体段落。</p><Link href="/library" className="explore-text-link">← 返回全部古籍</Link>
  </main><SiteFooter /></div>;
}
