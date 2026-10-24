import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import OrbitalField from '@/components/OrbitalField';

const features=[
  {number:'01',title:'紫微命盘',en:'YOUR CHART',body:'从出生时空出发，看见十二宫、星曜与四化之间的联系。',href:'/chart',label:'排出我的命盘'},
  {number:'02',title:'两个人的星图',en:'TOGETHER',body:'并排看两张命盘，从共同的星曜与不同的宫位开始理解彼此。',href:'/heming',label:'开始合盘'},
  {number:'03',title:'命理学双子',en:'CHART TWINS',body:'在收录的人物样本中，寻找与你相似的主星配置。',href:'/twins',label:'寻找相似星图'},
  {number:'04',title:'回到知识的源头',en:'THE LIBRARY',body:'查星曜，读古籍，循着天纪讲义，让每一次探索有迹可循。',href:'/academy',label:'进入学术中心'},
];
export default function HomePage(){return <>
  <SiteHeader/>
  <main id="main-content">
    <section className="landing-stage" aria-labelledby="landing-title">
      <OrbitalField/>
      <div className="landing-copy">
        <h1 id="landing-title">从一张命盘，<br/>慢慢读懂自己。</h1>
        <div className="landing-copy-tail">
          <p>把出生的那一刻，化作一张可以探索的星图。<br className="desktop-break"/>从紫微斗数出发，看见自己，也理解彼此。</p>
          <div className="landing-actions"><Link href="/chart" className="studio-button large">从我的出生信息开始</Link><Link href="/chart?example=1" className="quiet-link">先看一张示例命盘 <span aria-hidden="true">↗</span></Link></div>
          <span className="landing-note">免费排盘 · 本地保存 · 你的节奏</span>
        </div>
      </div>
    </section>
    <ol className="landing-journey" id="how-it-works" aria-label="从出生信息到探索命盘">
      <li><span>01</span><div><strong>输入出生信息</strong><p>公历、农历与真太阳时校正</p></div></li>
      <li><span>02</span><div><strong>看见完整星图</strong><p>十二宫、四化与大限流年</p></div></li>
      <li><span>03</span><div><strong>沿着线索理解</strong><p>格局、星曜与古籍出处</p></div></li>
      <li><span>04</span><div><strong>留存，再探索</strong><p>保存命盘，随时继续查看</p></div></li>
    </ol>
    <section className="landing-explore" aria-labelledby="explore-title">
      <div className="explore-heading"><span className="studio-label">不止一张命盘</span><h2 id="explore-title">每一个问题，都有一个开始。</h2><p>关于自己，关于关系，也关于古老知识中的新发现。</p></div>
      <div className="feature-grid">{features.map(f=><Link href={f.href} key={f.number} className="feature-item"><div className="feature-meta"><span>{f.number}</span><span>{f.en}</span></div><h3>{f.title}</h3><p>{f.body}</p><span className="feature-link">{f.label}<span aria-hidden="true">↗</span></span></Link>)}</div>
    </section>
    <section className="landing-library"><div><span className="studio-label">天 · 地 · 人</span><h2>观星，也观己。</h2><p>从天纪讲义到古籍导读，慢慢建立自己的理解。<br/>让一张命盘，成为学习的起点。</p><Link href="/sanjige" className="quiet-link">开启三纪研习 <span aria-hidden="true">↗</span></Link></div><blockquote>「知命」的意义，<br/>是更清醒地走自己的路。</blockquote></section>
  </main><SiteFooter/>
</>;}
