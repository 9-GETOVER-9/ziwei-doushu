'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import BirthForm, { type BirthFormState } from '@/components/BirthForm';
import TwinTimeWindows from '@/components/TwinTimeWindows';
import { generateChart } from '@/lib/ziwei/algorithm';
import { formToBirthInfo } from '@/lib/ziwei/share';
import type { ZiweiChart } from '@/lib/ziwei/types';

interface Sample {
  id: string; name: string; category: string; description: string;
  year: number; month: number; day: number; hour: number;
  gender: 'male' | 'female'; chart: ZiweiChart;
}

const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';

function majorSignature(chart: ZiweiChart, palaceName: string) {
  return chart.palaces.find(p => p.name === palaceName)?.stars.filter(s => s.type === 'major').map(s => s.name).sort().join('、') || '空宫';
}

function lifeStars(chart: ZiweiChart) {
  return chart.palaces.find(p => p.branch === chart.mingGongBranch)?.stars.filter(s => s.type === 'major').map(s => s.name).sort().join('、') || '空宫';
}

function sampleLink(sample: Sample) {
  return `/chart?${new URLSearchParams({ n: sample.name, y: String(sample.year), m: String(sample.month), d: String(sample.day), h: String(sample.hour * 2), mi: '0', g: sample.gender === 'male' ? 'm' : 'f' }).toString()}`;
}

export default function TwinsExplorer({ samples }: { samples: Sample[] }) {
  const [form, setForm] = useState<BirthFormState | null>(null);
  const [comparison, setComparison] = useState<{ chart: ZiweiChart; form: BirthFormState } | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('全部样本');
  const [error, setError] = useState('');
  const dirty = comparison && JSON.stringify(form) !== JSON.stringify(comparison.form);
  const rows = useMemo(() => samples.map(sample => {
    const samePalaces = comparison ? comparison.chart.palaces.filter(p => majorSignature(comparison.chart, p.name) === majorSignature(sample.chart, p.name)) : [];
    const sameLife = comparison ? lifeStars(comparison.chart) === lifeStars(sample.chart) : false;
    const sameStructure = comparison ? samePalaces.length === 12 && comparison.chart.mingGongBranch === sample.chart.mingGongBranch : false;
    return { sample, samePalaces, sameLife, sameStructure };
  }).filter(row => (!query || `${row.sample.name} ${row.sample.description} ${row.sample.category} ${lifeStars(row.sample.chart)}`.includes(query)) && (filter === '全部样本' || filter === '命宫主星相同' && row.sameLife || filter === '十二宫主星同构' && row.sameStructure)).sort((a, b) => b.samePalaces.length - a.samePalaces.length), [samples, comparison, query, filter]);

  function runComparison() {
    setError('');
    if (!form?.year || !form.month || !form.day) { setError('请先填写完整出生日期。'); return; }
    if (form.unknownTime) { setError('同盘结构比较需要出生时辰，请补全时间。'); return; }
    try { setComparison({ chart: generateChart(formToBirthInfo(form)), form: { ...form } }); setFilter('全部样本'); }
    catch (e) { setError(e instanceof Error ? e.message : '请检查出生日期和时间。'); }
  }

  return <>
    <div className="explore-sample-layout"><section className="studio-panel explore-sample-form"><div className="explore-section-title"><h2>你的出生信息</h2></div><BirthForm hideSubmit onSubmit={() => {}} onFormSave={setForm} /><div className="explore-action-row"><button className="studio-button" onClick={runComparison}>{comparison ? '更新比较结果' : '开始探索相似命盘'} ↗</button></div>{error && <p className="explore-error" role="alert">{error}</p>}{comparison && <p className="explore-note">当前命宫主星：{lifeStars(comparison.chart)}<br />{comparison.chart.wuxingJuName} · 命宫在{BRANCHES[comparison.chart.mingGongBranch]}{dirty && <><br />信息已修改，请更新比较结果。</>}</p>}</section>
      <section aria-live="polite"><label className="sr-only" htmlFor="sample-search">搜索本地样本</label><input id="sample-search" className="explore-sample-search" placeholder="搜索名字、领域或命宫主星" value={query} onChange={e => setQuery(e.target.value)} /><div className="explore-sample-toolbar" aria-label="样本匹配筛选">{['全部样本', '命宫主星相同', '十二宫主星同构'].map(label => <button key={label} aria-pressed={filter === label} disabled={!comparison && label !== '全部样本'} className={filter === label ? 'is-active' : ''} onClick={() => setFilter(label)}>{label}</button>)}</div><div className="explore-section-title"><h2>{comparison ? '与你的命盘对照' : '本地名人样本'}</h2><span>{rows.length} 条结果</span></div>{rows.map(({ sample, samePalaces, sameLife, sameStructure }) => <article className="explore-sample-card" key={sample.id}><div className="explore-sample-title"><h3>{sample.name}</h3><span className="explore-tag">{sample.category}</span></div><p>{sample.description} · {sample.year} 年 {sample.month} 月 {sample.day} 日 · {BRANCHES[sample.hour]}时（估算）</p><div className="explore-sample-details"><span>命宫：{lifeStars(sample.chart)}</span><span>{sample.chart.wuxingJuName}</span><span>命宫在{BRANCHES[sample.chart.mingGongBranch]}</span></div>{comparison && <p className="explore-sample-matches">{sameStructure ? '十二宫主星组合与命宫位置相同' : sameLife ? '命宫主星组合相同' : '命宫主星组合不同'} · {samePalaces.length} / 12 个宫位的主星组合一致</p>}<Link href={sampleLink(sample)} className="explore-text-link">查看样本命盘 ↗</Link></article>)}{!rows.length && <div className="explore-mini-empty">这 {samples.length} 条本地样本中没有符合当前条件的结果。<br />可以切换「全部样本」，或换一个搜索关键词。</div>}</section>
    </div>
    {comparison && <TwinTimeWindows birthInfo={comparison.chart.birthInfo} form={comparison.form} />}
    <section className="studio-panel explore-method-summary"><h2>我们如何比较星图</h2><p>命宫主星筛选比较双方命宫内的十四主星组合，空宫单独标识。十二宫主星同构还要求全部对应宫位的主星组合与命宫地支相同；空宫也纳入对照计数。此处比较的是命盘结构，不是人生相似度，也不是人与人的匹配分数。目前仅检索本页的 {samples.length} 条本地样本。</p></section>
  </>;
}
