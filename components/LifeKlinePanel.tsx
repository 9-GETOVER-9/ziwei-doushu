'use client';

import { useEffect, useState } from 'react';
import { buildLifeKline, getLifeKlineRange, getLifeKlineYear, exportCsv, LIFE_KLINE_METHOD, LIFE_THEMES, type LifeTheme, type LifeKlineSeries } from '@/lib/ziwei/life-kline';
import { getCurrentFlowSelection, type FlowSelection } from '@/lib/ziwei/time-flow';
import type { ZiweiChart } from '@/lib/ziwei/types';
import LifeKlineChart from './LifeKlineChart';
import LifeKlineInsight from './LifeKlineInsight';
import './LifeKline.css';

export default function LifeKlinePanel({ chart, initialYear, onOpenFlow }: { chart: ZiweiChart; initialYear?: number; onOpenFlow: (selection: FlowSelection) => void }) {
  const [theme, setTheme] = useState<LifeTheme>('overall');
  const [chosenYear, setChosenYear] = useState(() => initialYear ?? getCurrentFlowSelection().year);
  const [range, setRange] = useState<'all' | 'twenty'>('all');
  const [monthIndex, setMonthIndex] = useState(0);
  const [exportStatus, setExportStatus] = useState('');
  const currentYear = getCurrentFlowSelection().year;
  const [result, setResult] = useState<{ series: LifeKlineSeries | null; error: string }>({ series: null, error: '' });
  const [progress, setProgress] = useState({ done: 0, total: 100 });
  useEffect(() => {
    let cancelled = false;
    setResult({ series: null, error: '' });
    const calculate = async () => {
      try {
        const { startYear, endYear } = getLifeKlineRange(chart);
        const total = endYear - startYear + 1;
        setProgress({ done: 0, total });
        for (let year = startYear; year <= endYear; year++) {
          // Yield before each year so a century of calendar work never blocks
          // navigation or paints a blank frozen panel; no network is involved.
          await new Promise<void>(resolve => setTimeout(resolve, 0));
          if (cancelled) return;
          getLifeKlineYear(chart, theme, year);
          if ((year - startYear) % 5 === 0) setProgress({ done: year - startYear + 1, total });
        }
        if (!cancelled) setResult({ series: buildLifeKline(chart, theme), error: '' });
      } catch (cause) {
        if (!cancelled) setResult({ series: null, error: cause instanceof Error ? cause.message : '暂时无法生成，请重新核对出生信息。' });
      }
    };
    void calculate();
    return () => { cancelled = true; };
  }, [chart, theme]);
  const series = result.series?.theme === theme ? result.series : null;
  if (!series || !series.years.length) return <section className="studio-panel life-panel"><h2>人生 K 线</h2>
    {result.error ? <p className="birth-notice warning" role="status">{result.error}</p> : <div role="status" className="life-computing"><p>正在展开农历时间轴 · {progress.done} / {progress.total} 年</p><progress aria-label="人生K线计算进度" value={progress.done} max={progress.total} /><p>在这台设备上计算每年的真实月段与四化依据。</p></div>}
  </section>;

  const selected = series.years.find(item => item.year === chosenYear) ?? series.years[chosenYear < series.startYear ? 0 : series.years.length - 1];
  const selectedIndex = series.years.indexOf(selected);
  const windowStart = Math.max(0, Math.min(selectedIndex - 9, series.years.length - 20));
  const visibleYears = range === 'all' ? series.years : series.years.slice(windowStart, windowStart + 20);
  const month = selected.months[Math.min(monthIndex, selected.months.length - 1)];
  const changeYear = (year: number) => { setChosenYear(year); setMonthIndex(0); setExportStatus(''); };
  const changeTheme = (value: LifeTheme) => { setTheme(value); setExportStatus(''); };
  const exportData = () => {
    const url = URL.createObjectURL(new Blob([exportCsv(series)], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = `人生K线-${series.theme}-${series.startYear}-${series.endYear}.csv`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setExportStatus('已导出当前主题的年度与月段数据。');
  };

  return <section className="studio-panel life-panel" aria-labelledby="life-kline-title">
    <div className="life-heading"><div><span className="chart-detail-eyebrow">THE RHYTHM OF A LIFETIME</span><h2 id="life-kline-title">人生 K 线<span>沿着时间，看见变化。</span></h2>
      <p>以大限、流年与流月为坐标，展开每一年的相对起伏。</p></div>
      <button className="studio-button secondary" onClick={exportData}>导出数据 <span aria-hidden="true">↓</span></button>
    </div>
    <p className="life-disclosure">项目自定义四化指数 · 分数可复算，不是传统排盘的标准分数或事件概率。</p>
    <div className="life-toolbar">
      <div className="life-theme-group" role="group" aria-label="K线主题">{LIFE_THEMES.map(item => <button key={item.key} aria-pressed={theme === item.key} className={theme === item.key ? 'is-active' : ''} onClick={() => changeTheme(item.key)}>{item.label}</button>)}</div>
      <div className="life-range-group" role="group" aria-label="K线显示范围"><button aria-pressed={range === 'all'} onClick={() => setRange('all')}>全程</button><button aria-pressed={range === 'twenty'} onClick={() => setRange('twenty')}>放大 20 年</button></div>
    </div>
    <div className="life-chart-meta"><span>农历年 · 春节换年 · 虚岁</span><span>{series.startYear}—{series.endYear} · {series.years.length} 年</span></div>
    <LifeKlineChart years={visibleYears} selectedYear={selected.year} currentYear={currentYear} onSelect={changeYear} />
    <div className="life-legend"><span><i className="is-rising" />收值 ≥ 开值</span><span><i className="is-falling" />收值 &lt; 开值</span><span><i className="is-current" />当前农历年</span><span>开 / 收：首末月段 · 高 / 低：月段极值</span></div>
    <div className="life-year-navigation">
      <div className="life-year-controls"><button aria-label="上一年K线" disabled={selectedIndex === 0} onClick={() => changeYear(series.years[selectedIndex - 1].year)}>←</button>
        <label><span className="sr-only">选择K线年份</span><select aria-label="选择K线年份" value={selected.year} onChange={event => changeYear(Number(event.target.value))}>{series.years.map(item => <option key={item.year} value={item.year}>{item.year}年 · {item.age}虚岁</option>)}</select></label>
        <button aria-label="下一年K线" disabled={selectedIndex === series.years.length - 1} onClick={() => changeYear(series.years[selectedIndex + 1].year)}>→</button>
        <button className="life-current-button" onClick={() => changeYear(Math.min(series.endYear, Math.max(series.startYear, currentYear)))}>定位今年</button>
      </div>
      <button className="chart-text-button" onClick={() => onOpenFlow(month.selection)}>查看 {selected.year} 流年盘 →</button>
    </div>
    <div className="life-year-card" aria-live="polite">
      <div className="life-year-title"><span className="chart-detail-eyebrow">YEAR IN FOCUS</span><h3>{selected.year}<small>{selected.stemBranch} · {selected.age} 虚岁</small></h3><p>{selected.decadeLabel}</p></div>
      <dl className="life-ohlc">{([['开', selected.open], ['收', selected.close], ['高', selected.high], ['低', selected.low]] as const).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value.toFixed(1)}</dd></div>)}</dl>
    </div>
    {selected.partial && <p className="life-partial">非完整年：{selected.partialReasons.join('；')}</p>}
    <div className="life-details-grid">
      <section className="life-month-section"><div className="life-section-heading"><div><span className="chart-detail-eyebrow">WITHIN THE YEAR</span><h3>这一年的月度节奏</h3></div><span className="life-muted">点击月段查看依据</span></div>
        <div className="life-month-list" role="group" aria-label="月段指数">{selected.months.map((item, index) => <button key={`${item.selection.month}-${item.startDay}`} aria-pressed={index === Math.min(monthIndex, selected.months.length - 1)} onClick={() => setMonthIndex(index)} className={index === Math.min(monthIndex, selected.months.length - 1) ? 'is-selected' : ''}>
          <span>{item.label}</span><span className="life-month-track"><i style={{ width: `${item.score}%` }} /></span><b>{item.score.toFixed(1)}</b>
        </button>)}</div>
      </section>
      <section className="life-evidence-section"><div className="life-section-heading"><div><span className="chart-detail-eyebrow">BEHIND THE NUMBER</span><h3>{month.label} · {month.score.toFixed(1)}</h3></div><span className="life-muted">围绕本命{series.targetPalace}</span></div>
        <p className="life-muted">基准 {LIFE_KLINE_METHOD.baseline} ＋ 以下贡献；只显示参与计分的四化。</p>
        <div className="life-contribution-list">{month.contributions.filter(item => item.value !== 0).map((item, index) => <div key={`${item.scope}-${item.star}-${index}`}>
          <span><small>{item.scopeLabel}</small><strong>{item.star}化{item.siHua}</strong><em>{item.palace} · {item.relation}</em></span><b className={item.value < 0 ? 'is-negative' : ''}>{item.value > 0 ? '+' : ''}{item.value}</b>
        </div>)}</div>
        {month.contributions.every(item => item.value === 0) && <p className="life-muted">本段没有四化进入计分范围，保持基准指数。</p>}
        <p className="life-evidence-note">月段内只量化本命、大限、年、月四化；不代表每日或每个时辰的变化。</p>
      </section>
    </div>
    <LifeKlineInsight key={`${selected.year}-${theme}`} chart={chart} year={selected.year} theme={theme} themeLabel={series.themeLabel} />
    <details className="life-method"><summary>指数如何计算，以及它的边界</summary><div>
      <p>{LIFE_KLINE_METHOD.description}</p><p>{LIFE_KLINE_METHOD.formula}</p><p>{LIFE_KLINE_METHOD.sampling}</p>
      <p>以本命主题宫位为中心：本宫权重 1，三合与对宫各 0.5；本命、大限、流年、流月四层权重均为 1。化禄 +4、化权 +3、化科 +2、化忌 −5，其他宫位不计分。</p>
      <p>综合观察命宫，事业观察官禄，财帛观察财帛宫，关系观察夫妻宫。相同命盘与设置会得到相同曲线；没有随机数或强制起伏，童限不补造大限四化。</p>
      <p>最多展示 100 虚岁，历法计算截至公历 2100 年底。此显示范围不代表寿命；出生年与末年可能不完整。月段极值不等于逐日极值。</p>
      <p>方法版本：{series.methodVersion}</p>
    </div></details>
    {exportStatus && <p role="status" className="chart-status">{exportStatus}</p>}
  </section>;
}
