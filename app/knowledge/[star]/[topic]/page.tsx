import Link from 'next/link';
import { redirect } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { ALL_STARS, ALL_TOPICS, getKnowledge, STAR_BRIEF_SEO, STAR_TO_SLUG, SLUG_TO_STAR } from '@/lib/seo/knowledge';
import { searchClassics, getParagraphById } from '@/lib/classics';
import type { TopicKey } from '@/lib/ziwei/db-analysis';
import '@/components/ExplorePages.css';

export const dynamicParams = true;
export async function generateStaticParams() { return ALL_STARS.map(star => ({ star: STAR_TO_SLUG[star], topic: 'overview' })); }

function resolveStar(slug: string) { return SLUG_TO_STAR[slug] || (ALL_STARS.includes(slug) ? slug : undefined); }

export async function generateMetadata({ params }: { params: Promise<{ star: string; topic: string }> }) {
  const { star: slug, topic } = await params;
  const star = resolveStar(slug);
  if (!star) return { title: '紫微知识' };
  const validTopic = ALL_TOPICS.includes(topic as TopicKey) ? topic as TopicKey : 'overview';
  const data = getKnowledge(star, validTopic);
  return { title: data.exists ? `${star} · ${data.topicLabel} · 紫微知识` : `${star}星简介与整理节录`, description: data.parsed.dingdiao || STAR_BRIEF_SEO[star] };
}

export default async function KnowledgePage({ params }: { params: Promise<{ star: string; topic: string }> }) {
  const { star: slug, topic } = await params;
  const star = resolveStar(slug);
  if (!star) redirect('/knowledge');
  if (!ALL_TOPICS.includes(topic as TopicKey)) redirect(`/knowledge#star-${STAR_TO_SLUG[star]}`);
  const data = getKnowledge(star, topic as TopicKey);
  const references = searchClassics(star, 6);
  const sections = [{ title: '一句话定调', text: data.parsed.dingdiao }, { title: '核心论断', text: data.parsed.lundian }, { title: '命盘依据', text: data.parsed.yiju }, { title: '资料出处', text: data.parsed.chuchu }].filter(section => section.text);
  return <div className="explore-page"><SiteHeader /><main id="main-content" className="explore-shell explore-reader">
    <nav className="explore-breadcrumb" aria-label="面包屑"><Link href="/knowledge">紫微知识</Link><span>/</span><span>{star}</span></nav>
    <header className="explore-intro"><span className="explore-eyebrow">FOURTEEN STARS · 十四主星</span><h1 className="studio-heading">{star}</h1><p>{STAR_BRIEF_SEO[star]}</p></header>
    {data.exists ? sections.map(section => <section className="explore-knowledge-section" key={section.title}><h2>{section.title}</h2><p>{section.text}</p></section>) : <p className="explore-note">当前版本尚未收录「{star} · {data.topicLabel}」的专项解读。以下提供主星简介与已收录的项目整理节录，方便继续阅读。</p>}
    <section className="explore-section"><div className="explore-section-title"><h2>{star}相关整理节录</h2><Link href={`/library/search?q=${encodeURIComponent(star)}`} className="explore-text-link">查看全部节录 ↗</Link></div>{references.map(reference => { const context = getParagraphById(reference.paragraphId); return <Link key={reference.paragraphId} href={`/library/${reference.bookSlug}/${context?.chapterIdx ?? 0}#${reference.paragraphId}`} className="explore-search-hit"><span className="explore-eyebrow">《{reference.bookTitle}》导读 · {reference.chapterTitle}</span><p dangerouslySetInnerHTML={{ __html: reference.snippet }} /><span className="explore-text-link">阅读上下文 ↗</span></Link>; })}</section>
    <section className="explore-section"><div className="explore-section-title"><h2>继续认识其他主星</h2></div><div className="explore-star-nav">{ALL_STARS.filter(item => item !== star).map(item => <Link key={item} href={`/knowledge/${STAR_TO_SLUG[item]}/overview`}>{item}</Link>)}</div></section><Link href="/chart" className="studio-button">在自己的命盘中寻找{star} ↗</Link>
  </main><SiteFooter /></div>;
}
