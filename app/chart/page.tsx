'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import BirthForm from '@/components/BirthForm';
import ChartBoard from '@/components/ChartBoard';
import { TIME_VIEW_NAMES } from '@/components/TimeNav';
import InsightPanel from '@/components/InsightPanel';
import OrbitalField from '@/components/OrbitalField';
import { generateChart } from '@/lib/ziwei/algorithm';
import { getCurrentNominalAge } from '@/lib/ziwei/current-time';
import { BRANCHES, STAR_DESCRIPTIONS, STEMS } from '@/lib/ziwei/constants';
import { detectPatterns, getMingGongSummary } from '@/lib/ziwei/patterns';
import { normalizeBirthInput, type BirthFormState } from '@/lib/input-normalize';
import { useChartArchives } from '@/lib/history';
import { searchParamsToForm } from '@/lib/ziwei/share';
import type { BirthInfo, Palace, Star, ZiweiChart } from '@/lib/ziwei/types';
import '@/components/ChartWorkspace.css';

const EXAMPLE: BirthFormState = {
  name: '探索者 · 示例命盘', year: '1996', month: '6', day: '18',
  clockHour: '10', clockMinute: '30', unknownTime: false,
  province: '浙江省', city: '杭州', longitude: 120.1, gender: 'female',
  calendar: 'solar', isLeapMonth: false, useTrueSolarTime: true, dstCorrection: false,
};

const PALACE_TOPICS: Record<string, string> = {
  命宫: '先天气质与人生主轴', 兄弟: '手足关系与协作方式', 夫妻: '亲密关系与伴侣相处',
  子女: '子女缘分与创造表达', 财帛: '收入方式与资源流动', 疾厄: '传统命理中的身心议题',
  迁移: '外部环境与远行机遇', 仆役: '社交往来与合作关系', 交友: '社交往来与合作关系',
  官禄: '职业方向与成就方式', 田宅: '居住环境与长期积累', 福德: '内心秩序与精神感受', 父母: '长辈关系与支持资源',
};

type DetailTab = 'summary' | 'palace' | 'patterns' | 'ai';

function formDescription(form: BirthFormState) {
  return `${form.calendar === 'lunar' ? '农历' : '公历'} ${form.year}.${form.calendar === 'lunar' && form.isLeapMonth ? '闰' : ''}${form.month.padStart(2, '0')}.${form.day.padStart(2, '0')} · ${form.unknownTime ? '时辰未知' : `${form.clockHour.padStart(2, '0')}:${form.clockMinute.padStart(2, '0')}`} · ${form.gender === 'female' ? '女命' : '男命'}`;
}

export default function ChartPage() {
  const [chart, setChart] = useState<ZiweiChart | null>(null);
  const [form, setForm] = useState<BirthFormState | null>(null);
  const draftRef = useRef<BirthFormState | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [selectedPalace, setSelectedPalace] = useState<Palace | null>(null);
  const [selectedStar, setSelectedStar] = useState<Star | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('summary');
  const [aiOpened, setAiOpened] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [sihuaNote, setSihuaNote] = useState('');
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const { archives, save, remove, storageError } = useChartArchives();
  const resultsRef = useRef<HTMLDivElement>(null);
  const patterns = useMemo(() => chart ? detectPatterns(chart) : [], [chart]);
  const summary = useMemo(() => chart ? getMingGongSummary(chart) : null, [chart]);
  const normalization = useMemo(() => {
    if (!form) return null;
    try { return normalizeBirthInput(form); } catch { return null; }
  }, [form]);

  const createChart = (info: BirthInfo, input: BirthFormState) => {
    const result = generateChart(info);
    setChart(result);
    setForm({ ...input });
    draftRef.current = { ...input };
    setSelectedPalace(result.palaces.find(palace => palace.isMingGong) ?? result.palaces[0]);
    setSelectedStar(null);
    setDetailTab('summary');
    setAiOpened(false);
    setSihuaNote('');
    setCurrentTime(new Date());
    setStatus('');
    setError('');
  };

  const openForm = (input: BirthFormState) => {
    try {
      createChart(normalizeBirthInput(input).birthInfo, input);
      requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : '排盘失败，请核对出生信息'); }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const linkedForm = searchParamsToForm(params);
    if (linkedForm) openForm({ ...EXAMPLE, ...linkedForm });
    else if (params.get('example') === '1') openForm(EXAMPLE);
    if (params.get('view') === 'history') requestAnimationFrame(() => document.getElementById('archives')?.scrollIntoView({ block: 'start' }));
  // The query is an initial entry point, not a state synchronization mechanism.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectPalace = (palace: Palace | null) => {
    setSelectedPalace(palace);
    setSelectedStar(palace?.stars.find(star => star.type === 'major') ?? palace?.stars[0] ?? null);
    setDetailTab('palace');
    setSihuaNote('');
  };
  const restart = () => {
    setChart(null);
    setFormKey(previous => previous + 1);
    setError('');
    setStatus('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const exportChart = () => {
    if (!chart || !form) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, birthInput: form, chart }, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `紫微命盘-${form.name || form.year + form.month + form.day}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus('命盘数据已导出，包含原始出生信息与完整星曜数据。');
  };
  const currentAge = chart ? getCurrentNominalAge(chart.birthInfo, currentTime) : 0;
  const currentDx = chart?.daXians.find(period => currentAge >= period.startAge && currentAge <= period.endAge);
  const selectedStarInfo = selectedStar ? STAR_DESCRIPTIONS[selectedStar.name] : null;
  const palaceTopic = selectedPalace ? PALACE_TOPICS[selectedPalace.name] ?? PALACE_TOPICS[selectedPalace.name.replace(/宫$/, '')] : '';
  const sihuas = chart?.palaces.flatMap(palace => palace.stars.filter(star => star.siHua).map(star => ({ ...star, palaceName: palace.name }))) ?? [];

  return (
    <>
      <SiteHeader />
      <main id="main-content" className="studio-page chart-workspace">
        <div className="chart-page-top">
          <div className="studio-heading">
            <span className="kicker">ZIWEI · PERSONAL CHART</span>
            <h1>从一张命盘，认识自己</h1>
            <p>以出生时刻为起点，读懂星曜、宫位与时间的关联。</p>
          </div>
          <div className="chart-action-row">
            <a className="studio-button secondary" href="#archives">我的档案 <span>{archives.length.toString().padStart(2, '0')}</span></a>
            {!chart && <button className="chart-text-button" onClick={() => openForm(EXAMPLE)}>先看一份示例 ↗</button>}
          </div>
        </div>

        {error && <p role="alert" className="birth-notice warning">{error}</p>}
        {!chart ? (
          <div className="chart-intake-grid">
            <section className="studio-panel chart-form-panel">
              <div className="chart-panel-title"><h2>创建你的命盘</h2><span className="chart-section-no">01 / BIRTH DETAILS</span></div>
              <BirthForm key={formKey} initialData={form ?? undefined}
                onFormSave={input => { draftRef.current = input; }}
                onSubmit={info => { if (draftRef.current) createChart(info, draftRef.current); }} />
            </section>
            <aside className="studio-panel chart-intro-panel">
              <div className="chart-intro-orbit"><OrbitalField /></div>
              <span className="chart-detail-eyebrow">A MAP, NOT A LIMIT</span>
              <h2>看见天赋，<br />也看见更多可能。</h2>
              <p>一张命盘，十二种人生视角。沿着主星、四化与三方四正，找到值得深入了解的线索。</p>
              <ol className="chart-intro-list">
                <li><b>01</b><span>填写出生信息<small>支持公历、农历与真太阳时校正</small></span></li>
                <li><b>02</b><span>探索你的命盘<small>点选宫位，查看主星与三方四正</small></span></li>
                <li><b>03</b><span>留存成长的线索<small>保存本地档案，随时回来继续阅读</small></span></li>
              </ol>
              <button className="chart-text-button" onClick={() => openForm(EXAMPLE)}>打开示例命盘 <span aria-hidden="true">→</span></button>
            </aside>
          </div>
        ) : (
          <div ref={resultsRef} style={{ scrollMarginTop: 95 }}>
            <section className="studio-panel chart-result-header">
              <div className="chart-person"><span className="chart-person-icon" aria-hidden="true"><img src="/reference/orbit.svg" width="25" height="25" alt="" /></span><div>
                <h2>{form?.name || '我的紫微命盘'}</h2><p>{form && formDescription(form)}{form?.city ? ` · ${form.city}` : ''}</p>
              </div></div>
              <div className="chart-action-row">
                <button className="studio-button secondary" onClick={restart}>修改信息</button>
                <button className="studio-button secondary" onClick={exportChart}>导出命盘</button>
                <button className="studio-button" onClick={() => { if (form && save(form)) setStatus('已保存到本地档案，下次打开此浏览器即可继续查看。'); }}>保存档案</button>
              </div>
            </section>
            {normalization && normalization.notes.length > 0 && <div className="chart-result-notes">
              <p className={`birth-notice${form?.unknownTime ? ' warning' : ''}`}>{normalization.notes.join('；')}</p>
            </div>}
            {status && <p role="status" className="chart-status">{status}</p>}
            <div className="chart-result-layout">
              <section className="studio-panel chart-board-panel">
                <div className="chart-panel-title"><h3>紫微命盘</h3><span className="chart-section-no">十二宫 · 三方四正</span></div>
                <div className="chart-board-scroll">
                  <ChartBoard key={JSON.stringify(chart.birthInfo)} chart={chart} onPalaceSelect={selectPalace}
                    selectedBranch={selectedPalace?.branch ?? null}
                    onTimeChange={() => { setSihuaNote(''); setCurrentTime(new Date()); }}
                    onStarSelect={(star, palace) => { selectPalace(palace); setSelectedStar(star); }}
                    onSiHuaClick={(starName, siHua, view, context) => {
                      const palace = chart.palaces.find(item => item.stars.some(star => star.name === starName));
                      if (palace) {
                        selectPalace(palace);
                        setSelectedStar(palace.stars.find(star => star.name === starName) ?? null);
                        setSihuaNote(`所选${TIME_VIEW_NAMES[view]}：${starName}化${siHua}，落在本命${palace.name}。${context}`);
                      }
                    }} />
                </div>
                <p className="chart-method">点选任意宫位，可查看本命星曜与关联宫位；上方运限切换会叠加相应四化。排盘口径：晚子时次日、闰月按日切分。</p>
              </section>

              <aside className="studio-panel chart-side-panel">
                <div className="chart-detail-tabs" role="tablist" aria-label="命盘阅读方式">
                  {([{ key: 'summary', label: '命盘摘要' }, { key: 'palace', label: '宫位详情' }, { key: 'patterns', label: '格局识别' }, { key: 'ai', label: 'AI 解读' }] as const).map(tab => (
                    <button key={tab.key} role="tab" aria-selected={detailTab === tab.key} className={detailTab === tab.key ? 'is-active' : ''} onClick={() => { setDetailTab(tab.key); if (tab.key === 'ai') setAiOpened(true); }}>{tab.label}</button>
                  ))}
                </div>
                <div className="chart-detail-content" role="tabpanel">
                  {detailTab === 'summary' && summary && <>
                    <div className="chart-detail-eyebrow">YOUR NATAL SIGNATURE</div>
                    <h3>{summary.stars.length ? summary.stars.join(' · ') : '命宫空宫'}</h3>
                    <p>{summary.nature || '须结合对宫主星与三方四正一同阅读。'}</p>
                    <div className="chart-keywords">{summary.keywords.map(keyword => <span key={keyword}>{keyword}</span>)}</div>
                    <dl className="chart-facts">
                      <div><dt>五行局</dt><dd>{chart.wuxingJuName}</dd></div>
                      <div><dt>阴阳性别</dt><dd>{chart.yinYangGender}</dd></div>
                      <div><dt>命主 / 身主</dt><dd>{chart.mingZhu} / {chart.shenZhu}</dd></div>
                      <div><dt>命宫 / 身宫</dt><dd>{BRANCHES[chart.mingGongBranch]} / {BRANCHES[chart.shenGongBranch]}</dd></div>
                    </dl>
                    <h4 className="chart-subtitle">本命四化</h4>
                    <ul className="chart-sihua-list">{sihuas.map(star => <li key={`${star.name}-${star.siHua}`}>
                      <span className="chart-sihua-badge" data-kind={star.siHua}>化{star.siHua}</span><span>{star.name}</span><small>{star.palaceName}</small>
                    </li>)}</ul>
                    <h4 className="chart-subtitle">当前大限</h4>
                    <p>{currentDx ? `${currentDx.startAge}–${currentDx.endAge} 岁 · ${currentDx.palaceName}，当前虚岁 ${currentAge}。` : currentAge < 1 ? '当前时间早于出生时间，尚未出生。' : currentAge < chart.daXians[0]?.startAge ? '当前处于起限前阶段，尚未进入首个十年大限。' : `当前虚岁 ${currentAge}，超出已生成的大限范围。`}</p>
                    <p className="chart-method">摘要来自当前命盘的星曜数据与公开规则。进一步阅读时，请连同宫位强弱、四化及格局条件一起查看。</p>
                  </>}

                  {detailTab === 'palace' && selectedPalace && <>
                    <div className="chart-detail-eyebrow">PALACE · {STEMS[selectedPalace.stem]}{BRANCHES[selectedPalace.branch]}</div>
                    <h3>{selectedPalace.name}</h3><p>{palaceTopic}</p>
                    <div className="chart-star-list">{selectedPalace.stars.map((star, index) => <button key={`${star.name}-${index}`} className={selectedStar?.name === star.name ? 'is-active' : ''} onClick={() => { setSelectedStar(star); setSihuaNote(''); }}>
                      {star.name}<small>{star.brightnessRaw || ''}{star.siHua ? ` · 化${star.siHua}` : ''}</small>
                    </button>)}</div>
                    {selectedPalace.isEmpty && <p className="birth-notice">本宫无主星，借对宫{selectedPalace.borrowedFromName}的{selectedPalace.borrowedStars?.join('、') || '主星'}共同观察。</p>}
                    {selectedStar && <div className="chart-star-description"><h4 className="chart-subtitle">{selectedStar.name}{selectedStar.brightnessRaw ? ` · ${selectedStar.brightnessRaw}` : ''}</h4>
                      <p>{selectedStarInfo ? `${selectedStarInfo.keywords.replaceAll('·', '、')}。五行属${selectedStarInfo.element}，传统星性为${selectedStarInfo.nature}。` : `此星在当前命盘落于${selectedPalace.name}，需结合宫内主星及四化阅读。`}</p>
                      <Link className="chart-text-button" href={`/library/search?q=${encodeURIComponent(selectedStar.name)}`}>在古籍中查阅「{selectedStar.name}」 ↗</Link>
                    </div>}
                    {sihuaNote && <p className="birth-notice">{sihuaNote}</p>}
                    <h4 className="chart-subtitle">三方四正 · 关联宫位</h4>
                    <div className="chart-related-palaces">{[6, 4, 8].map((offset, index) => {
                      const related = chart.palaces.find(palace => palace.branch === (selectedPalace.branch + offset) % 12);
                      if (!related) return null;
                      return <button key={offset} onClick={() => selectPalace(related)}><span>{related.name} <small>{index === 0 ? '对宫' : '三合'}</small></span><small>{related.stars.filter(star => star.type === 'major').map(star => star.name).join('、') || '空宫'} →</small></button>;
                    })}</div>
                    <p className="chart-method">此面板展示本命宫位资料。宫位的传统含义不能由单颗星单独定论。</p>
                  </>}

                  {detailTab === 'palace' && !selectedPalace && <p>点选任意宫位，查看星曜与三方四正。</p>}

                  {detailTab === 'patterns' && <>
                    <div className="chart-detail-eyebrow">PATTERNS & EVIDENCE</div>
                    <h3>{patterns.length ? `${patterns.length} 个格局线索` : '未命中已收录格局'}</h3>
                    <p>由当前星曜组合匹配公开规则，保留成立条件与出处。</p>
                    {patterns.map((pattern, index) => <article className="chart-pattern" key={`${pattern.name}-${index}`}>
                      <h4>{pattern.name}</h4><p>{pattern.description}</p>
                      {pattern.conditions?.required.length ? <small>成立条件 · {pattern.conditions.required.join('；')}</small> : null}
                      {pattern.conditions?.bonus?.length ? <small>加分条件 · {pattern.conditions.bonus.join('；')}</small> : null}
                      {pattern.conditions?.breaking?.length ? <small>破格提示 · {pattern.conditions.breaking.join('；')}</small> : null}
                      {pattern.source && <small>出处 · {pattern.source}</small>}
                    </article>)}
                  </>}

                  {aiOpened && <div hidden={detailTab !== 'ai'}>{form?.unknownTime ? <p className="birth-notice warning">请先补全出生时辰，再开始针对命盘的 AI 解读。</p> : <InsightPanel key={JSON.stringify(chart.birthInfo)} chart={chart} selectedPalace={selectedPalace} />}</div>}
                </div>
              </aside>
            </div>
          </div>
        )}

        <section id="archives" className="chart-archives">
          <div className="chart-panel-title"><h2>我的命盘档案</h2><span className="chart-section-no">LOCAL ARCHIVES · {archives.length.toString().padStart(2, '0')}</span></div>
          {storageError && <p role="alert" className="birth-notice warning">{storageError}</p>}
          {archives.length === 0 ? <div className="chart-archive-empty">这里会收好你保存过的命盘。<br />生成命盘后点击「保存档案」，便可在这台设备上随时继续探索。</div> : <div className="chart-archive-grid">
            {archives.map(entry => <article className="studio-panel chart-archive-item" key={entry.id}>
              <h3>{entry.form.name || '未命名命盘'}</h3><p>{formDescription(entry.form)}<br />{entry.form.city || '未填写出生地'} · {new Date(entry.savedAt).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' })} 保存</p>
              <div className="chart-action-row"><button className="chart-text-button" onClick={() => openForm(entry.form)}>查看命盘 →</button><button className="chart-archive-remove" aria-label={`删除${entry.form.name || '未命名命盘'}档案`} onClick={() => remove(entry.id)}>删除</button></div>
            </article>)}
          </div>}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
