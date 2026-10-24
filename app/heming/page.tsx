'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import BirthForm, { type BirthFormState } from '@/components/BirthForm';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { formToBirthInfo, formToSearchParams } from '@/lib/ziwei/share';
import { generateChart } from '@/lib/ziwei/algorithm';
import { streamAi } from '@/lib/ai/client';
import type { Palace, ZiweiChart } from '@/lib/ziwei/types';
import '@/components/ExplorePages.css';

const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';
const FOCUS_PALACES: Record<string, string[]> = {
  '感情': ['命宫', '夫妻', '福德', '迁移'],
  '合伙': ['命宫', '官禄', '财帛', '交友'],
  '上下级': ['命宫', '官禄', '交友', '迁移'],
  '朋友': ['命宫', '交友', '福德', '迁移'],
};

function findPalace(chart: ZiweiChart, name: string) {
  const normalizeName = (value: string) => value.replace('宫', '').replace('仆役', '交友');
  return chart.palaces.find(p => normalizeName(p.name) === normalizeName(name));
}

function PalaceStars({ palace }: { palace?: Palace }) {
  if (!palace) return <span>未找到宫位</span>;
  const major = palace.stars.filter(s => s.type === 'major');
  const transformations = palace.stars.filter(s => s.siHua);
  return <div className="explore-palace-stars">
    <strong>{major.map(s => s.name).join('、') || '空宫'}</strong>
    <span>{BRANCHES[palace.branch]}宫{major.length === 0 && palace.borrowedStars?.length ? ` · 对宫 ${palace.borrowedStars.join('、')}` : ''}</span>
    {transformations.length > 0 && <span className="explore-accent">{transformations.map(s => `${s.name}化${s.siHua}`).join(' · ')}</span>}
  </div>;
}

export default function HemingPage() {
  const [formA, setFormA] = useState<BirthFormState | null>(null);
  const [formB, setFormB] = useState<BirthFormState | null>(null);
  const [result, setResult] = useState<{ a: ZiweiChart; b: ZiweiChart; formA: BirthFormState; formB: BirthFormState } | null>(null);
  const [relationship, setRelationship] = useState('感情');
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [aiError, setAiError] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const requestRef = useRef<AbortController | null>(null);
  const resultRef = useRef<HTMLElement>(null);
  const dirty = result && (JSON.stringify(formA) !== JSON.stringify(result.formA) || JSON.stringify(formB) !== JSON.stringify(result.formB));
  useEffect(() => () => requestRef.current?.abort(), []);

  function resetAi() {
    requestRef.current?.abort();
    requestRef.current = null;
    setAnalyzing(false); setAnalysis(''); setAiError(''); setMessages([]); setQuestion('');
  }

  function compareCharts() {
    setError('');
    if (!formA?.year || !formA.month || !formA.day || !formB?.year || !formB.month || !formB.day) {
      setError('请填写双方完整的出生年月日。'); return;
    }
    if (formA.unknownTime || formB.unknownTime) {
      setError('双人宫位比较需要双方的出生时辰。请补全时间后再开始。'); return;
    }
    try {
      const a = generateChart(formToBirthInfo(formA));
      const b = generateChart(formToBirthInfo(formB));
      resetAi();
      setResult({ a, b, formA: { ...formA }, formB: { ...formB } });
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
    } catch (e) { setError(e instanceof Error ? e.message : '出生信息无法排盘，请检查日期与时间。'); }
  }

  async function analyze(followUp?: string) {
    if (!result || dirty || analyzing) return;
    const controller = new AbortController();
    requestRef.current?.abort(); requestRef.current = controller;
    const prompt = followUp?.trim() || `请从${relationship}关系角度，基于双方真实命盘进行合盘解读，不生成无依据的匹配分数。`;
    setAnalyzing(true); setAiError(''); setAnalysis('');
    let received = '';
    try {
      const relationshipLabel: Record<string, string> = { '感情': '恋爱', '合伙': '事业伙伴', '上下级': '上下级', '朋友': '朋友' };
      const conversation = [...messages.slice(-22).map(message => ({ ...message, content: message.content.slice(0, 16_000) })), { role: 'user' as const, content: prompt }];
      while (conversation.length > 1 && conversation.reduce((total, message) => total + message.content.length, 0) > 48_000) conversation.splice(0, 2);
      await streamAi('/api/heming', { chartA: result.a, chartB: result.b, relationship: relationshipLabel[relationship], messages: conversation }, controller.signal, text => { received = text; setAnalysis(text); });
      if (!controller.signal.aborted) {
        setMessages(previous => [...previous, { role: 'user', content: prompt }, { role: 'assistant', content: received }]);
        setAnalysis('');
        setQuestion('');
      }
    } catch (e) { if (!controller.signal.aborted) setAiError(e instanceof Error ? e.message : '暂时无法生成解读，请稍后重试。'); }
    finally { if (requestRef.current === controller) { setAnalyzing(false); requestRef.current = null; } }
  }

  return <div className="explore-page">
    <SiteHeader />
    <main id="main-content" className="explore-shell">
      <header className="explore-intro"><span className="explore-eyebrow">RELATIONSHIPS · 双人合盘</span><h1 className="studio-heading">在彼此的星图中，<br />多一份理解。</h1><p>从两张真实命盘出发，看见相同的星曜，也看见各自的不同。</p></header>
      <div className="explore-tabs" aria-label="关系类型">{Object.keys(FOCUS_PALACES).map(type => <button key={type} type="button" aria-pressed={relationship === type} className={relationship === type ? 'is-active' : ''} onClick={() => { setRelationship(type); resetAi(); }}>{type}</button>)}</div>
      <div className="explore-grid-two explore-birth-grid">
        <section className="studio-panel explore-person-form"><div className="explore-section-title"><span className="explore-index">01</span><h2>你的出生信息</h2></div><BirthForm hideSubmit onSubmit={() => {}} onFormSave={setFormA} /></section>
        <section className="studio-panel explore-person-form"><div className="explore-section-title"><span className="explore-index">02</span><h2>对方的出生信息</h2></div><BirthForm hideSubmit onSubmit={() => {}} onFormSave={setFormB} /></section>
      </div>
      <div className="explore-action-row"><button className="studio-button" onClick={compareCharts}>{result ? '更新双人命盘' : '开始双人合盘'} <span aria-hidden="true">↗</span></button><span>排盘计算在当前浏览器完成，AI 解读需单独开启。</span></div>
      {error && <p className="explore-error" role="alert">{error}</p>}
      {result ? <section className="explore-results" ref={resultRef} aria-live="polite">
        <div className="explore-section-title"><div><span className="explore-eyebrow">CHART COMPARISON</span><h2>{result.formA.name || '你'} × {result.formB.name || '对方'}</h2></div><span className="explore-tag">{relationship} · 宫位对照</span></div>
        {dirty && <p className="explore-note">出生信息已修改。点击「更新双人命盘」后，下面的结果才会同步。</p>}
        <div className="explore-grid-two explore-summary-grid">{[result.a, result.b].map((chart, i) => <div className="studio-panel explore-summary" key={i}><span>{i === 0 ? result.formA.name || '你' : result.formB.name || '对方'}</span><h3>{chart.wuxingJuName}</h3><p>命宫在{BRANCHES[chart.mingGongBranch]} · 身宫在{BRANCHES[chart.shenGongBranch]}</p><Link href={`/chart?${formToSearchParams(i === 0 ? result.formA : result.formB).toString()}`} className="explore-text-link">查看完整命盘 ↗</Link></div>)}</div>
        <div className="explore-table-wrap"><table className="explore-compare-table"><thead><tr><th scope="col">关注宫位</th><th scope="col">{result.formA.name || '你'}</th><th scope="col">{result.formB.name || '对方'}</th><th scope="col">主星对照</th></tr></thead><tbody>{FOCUS_PALACES[relationship].map(name => {
          const a = findPalace(result.a, name); const b = findPalace(result.b, name);
          const aStars = a?.stars.filter(s => s.type === 'major').map(s => s.name).sort() || [];
          const bStars = b?.stars.filter(s => s.type === 'major').map(s => s.name).sort() || [];
          const shared = aStars.filter(s => bStars.includes(s));
          return <tr key={name}><th scope="row">{name.endsWith('宫') ? name : `${name}宫`}</th><td><PalaceStars palace={a} /></td><td><PalaceStars palace={b} /></td><td>{shared.length > 0 ? `共同主星：${shared.join('、')}` : aStars.length === 0 && bStars.length === 0 ? '双方皆为空宫，需参考对宫' : '主星组合不同'}</td></tr>;
        })}</tbody></table></div>
        <p className="explore-note">这里展示排盘引擎计算出的宫位、主星与生年四化。星曜相同并不等于关系更合适，宫位对照本身不构成匹配评分。</p>
        <Link href="/knowledge" className="explore-text-link">认识这些星曜 →</Link>
        <section className="studio-panel explore-ai-panel"><div className="explore-section-title"><h2>AI 合盘解读</h2><span className="explore-tag">{relationship}</span></div><p className="explore-ai-description">开启后会将双方命盘交给已配置的 AI 服务，结合星曜结构解释关系中的相似与差异。</p>
          {messages.map((message, i) => <div key={i} className={`explore-chat-message ${message.role}`}><span>{message.role === 'user' ? '你的问题' : '合盘解读'}</span><p>{message.content}</p></div>)}
          {analysis && <div className="explore-ai-content">{analysis}</div>}
          {aiError && <p className="explore-error" role="alert">{aiError}</p>}
          {analyzing ? <div className="explore-action-row"><span role="status">正在生成解读…</span><button className="studio-button secondary" onClick={() => { requestRef.current?.abort(); setAnalyzing(false); }}>停止生成</button></div> : !messages.length ? <button disabled={!!dirty} className="studio-button" onClick={() => analyze()}>开启 AI 合盘解读 ↗</button> : <form className="explore-search" onSubmit={e => { e.preventDefault(); if (question.trim()) analyze(question); }}><label className="sr-only" htmlFor="heming-followup">继续追问</label><input id="heming-followup" value={question} onChange={e => setQuestion(e.target.value)} placeholder="关于这段关系，你还想了解什么？" required maxLength={4000} disabled={!!dirty} /><button className="studio-button" type="submit" disabled={!!dirty}>继续追问 ↗</button></form>}
        </section>
      </section> : <section className="explore-empty studio-panel"><span className="explore-orbit" aria-hidden="true">◎</span><h2>两张星图，一起展开</h2><p>填好双方信息后，可查看命宫与关系相关宫位的星曜对照。</p></section>}
    </main><SiteFooter />
  </div>;
}
