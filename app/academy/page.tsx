import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { getTianjiCourses, getTianjiEntries } from './course-data';
import '@/components/ExplorePages.css';

export const metadata = { title: '紫微学堂 · 入门与课程资料', description: '认识十四主星，阅读项目古籍导读，学习本地整理的倪海厦天纪紫微斗数课程引文。' };

export default function AcademyPage() {
  const courses = getTianjiCourses();
  return <div className="explore-page"><SiteHeader /><main id="main-content" className="explore-shell">
    <header className="explore-intro"><span className="explore-eyebrow">ACADEMY · 紫微学堂</span><h1 className="studio-heading">让每一次好奇，<br />都有迹可循。</h1><p>从星曜的名字，到命盘的结构，再查阅项目的导读节录。按照自己的节奏，开始这段学习。</p></header>
    <div className="explore-path">{[{ title: '先认识星曜', text: '从十四主星的基本象意开始，建立阅读命盘的词汇。', href: '/knowledge', label: '进入紫微知识' }, { title: '再展开命盘', text: '输入出生信息，看十二宫、四化与大限如何在一张盘中组织起来。', href: '/chart', label: '排一张自己的盘' }, { title: '阅读主题导读', text: '查阅项目按书籍主题整理的节录与释义，再与课程资料交叉阅读。', href: '/library', label: '阅读古籍导读' }].map((item, i) => <article key={item.href}><span className="explore-index">STEP 0{i + 1}</span><h3>{item.title}</h3><p>{item.text}</p><Link className="explore-text-link" href={item.href}>{item.label} ↗</Link></article>)}</div>
    <section className="explore-section"><div className="explore-section-title"><div><span className="explore-eyebrow">TIANJI · 课程资料</span><h2>倪海厦《天纪》紫微斗数</h2></div><Link className="explore-text-link" href="/sanjige">检索课程原话 ↗</Link></div><p className="explore-note">本地收录 {courses.length} 份分讲资料、{getTianjiEntries().length.toLocaleString()} 条引文。每条都附有原视频时间链接，适合边读边核对。</p><div className="explore-lecture-list">{courses.map(course => <Link key={course.id} href={`/sanjige?lesson=${encodeURIComponent(course.id)}#reading`} className="explore-lecture"><span className="explore-index">{course.id}</span><div><h3>{course.title}</h3><p>{course.summary}</p></div><span>{course.count} 条引文 · 阅读 ↗</span></Link>)}</div></section>
    <p className="explore-source-line">课程资料整理来源：<a href="https://github.com/Renhuai123/nihai-tianji-corpus" target="_blank" rel="noreferrer">nihai-tianji-corpus</a>。引文采用 CC BY-NC-SA 4.0，供非商业学习研究使用；课程著作权归原权利人所有。</p>
  </main><SiteFooter /></div>;
}
