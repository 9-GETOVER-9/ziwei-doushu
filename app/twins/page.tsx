import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { FAMOUS_PERSONS } from '@/lib/ziwei/famous';
import { generateChart } from '@/lib/ziwei/algorithm';
import TwinsExplorer from './TwinsExplorer';
import '@/components/ExplorePages.css';

export const metadata = { title: '同盘探索 · 本地名人样本', description: '将自己的命盘与本地收录的名人示例比较，探索主星结构的相似之处。' };

export default function TwinsPage() {
  const samples = FAMOUS_PERSONS.map(person => {
    const chart = generateChart({ year: person.year, month: person.month, day: person.day, hour: person.hour, gender: person.gender, name: person.name });
    return { id: person.id, name: person.name, category: person.category, description: person.description, year: person.year, month: person.month, day: person.day, hour: person.hour, gender: person.gender, chart };
  });
  return <div className="explore-page"><SiteHeader /><main id="main-content" className="explore-shell"><header className="explore-intro"><span className="explore-eyebrow">CHART TWINS · 同盘探索</span><h1 className="studio-heading">相似的星图，<br />各自的人生。</h1><p>在本地收录的 {samples.length} 位名人样本中，探索与你相似的主星组合。</p></header><TwinsExplorer samples={samples} /><p className="explore-source-line">样本来自 <a href="https://github.com/Renhuai123/ziwei-doushu" target="_blank" rel="noreferrer">紫微斗数开源项目</a>。名人出生时辰为原项目整理的估算值，适合学习比较，不能作为已核实的个人命盘。</p></main><SiteFooter /></div>;
}
