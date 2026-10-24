'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { buildQimenChart, beijingNowInput, shiftQimenTime, QIMEN_VERSION } from '@/lib/qimen/engine';
import { qimenMarkdown, qimenFilename, downloadText, copyText, downloadQimenPng } from '@/lib/qimen/export';
import { loadQimenArchives, saveQimenArchive, deleteQimenArchive, type QimenArchive } from '@/lib/qimen/archive';
import type { QimenChart, QimenInput, QimenPalace } from '@/lib/qimen/types';
import './QimenWorkspace.css';

const SAMPLE: QimenInput = { date: '2026-10-17', time: '17:06', title: '截图对照盘' };
const PILLARS = [['year', '年柱'], ['month', '月柱'], ['day', '日柱'], ['hour', '时柱']] as const;

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : '操作未完成，请重试。';
}

function Icon({ kind }: { kind: 'copy' | 'download' | 'image' | 'save' }) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === 'copy' && <><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></>}
    {kind === 'download' && <><path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4" /></>}
    {kind === 'image' && <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8" cy="8" r="1.5" /><path d="m3 17 6-6 4 4 3-3 5 5" /></>}
    {kind === 'save' && <><path d="M5 3h12l4 4v14H3V3h2Z" /><path d="M7 3v6h10V3M7 21v-8h10v8" /></>}
  </svg>;
}

function PalaceCell({ palace, selected, onSelect, disabled }: {
  palace: QimenPalace; selected: boolean; onSelect: () => void; disabled: boolean;
}) {
  return <button type="button" className={`qm-palace${selected ? ' is-selected' : ''}`} onClick={onSelect}
    disabled={disabled} aria-pressed={selected} aria-label={`${palace.name}${palace.number}宫，${palace.stars.join('、')}，${palace.door}，查看详情`}>
    <span className="qm-palace-top"><span className="qm-deity">{palace.deity}</span><span className="qm-palace-markers">
      {palace.voidBranches && <span className="qm-badge qm-void" title={`时旬空：${palace.voidBranches}`}>空</span>}
      {palace.horse && <span className="qm-badge qm-horse" title="时驿马所在宫">马</span>}
    </span></span>
    <span className="qm-palace-body"><span className="qm-palace-symbols">
      <span className="qm-star">{palace.stars.map(star => <span key={star}>{star}</span>)}</span>
      <span className="qm-door">{palace.door}</span>
    </span><span className="qm-stems">
      <span title="天盘干"><small>天</small><b>{palace.heavenStem}</b>{palace.hostedHeavenStem && <em title="天盘寄干">{palace.hostedHeavenStem}</em>}</span>
      <span title="地盘干"><small>地</small><b>{palace.earthStem}</b>{palace.hostedEarthStem && <em title="地盘寄干">{palace.hostedEarthStem}</em>}</span>
    </span></span>
    <span className="qm-palace-flags">{palace.isChiefStar && <span>值符星</span>}{palace.isChiefDoor && <span>值使门</span>}</span>
    <span className="qm-palace-bottom"><span><b>{palace.number}</b> {palace.name}宫</span><span>{palace.branches}</span></span>
  </button>;
}

function PalaceDetail({ palace }: { palace?: QimenPalace }) {
  if (!palace) return null;
  return <section className="qm-palace-detail" aria-labelledby="qm-detail-title">
    <div className="qm-detail-heading"><div><span className="studio-label">宫位详情</span><h3 id="qm-detail-title">{palace.name}{palace.number}宫 <small>{palace.direction} · {palace.element}</small></h3></div><span className="qm-detail-tip">点击九宫，逐宫查看</span></div>
    <dl className="qm-detail-list">
      <div><dt>九星</dt><dd>{palace.stars.join('、') || '—'}{palace.isChiefStar && <small>值符星</small>}</dd></div>
      <div><dt>八门</dt><dd>{palace.door || '—'}{palace.isChiefDoor && <small>值使门</small>}</dd></div>
      <div><dt>八神</dt><dd>{palace.deity || '—'}</dd></div>
      <div><dt>天盘干</dt><dd>{palace.heavenStem || '—'}{palace.hostedHeavenStem && <small>寄 {palace.hostedHeavenStem}</small>}</dd></div>
      <div><dt>地盘干</dt><dd>{palace.earthStem}{palace.hostedEarthStem && <small>寄 {palace.hostedEarthStem}</small>}</dd></div>
      <div><dt>时旬空 / 驿马</dt><dd>{palace.voidBranches || '不逢空'} · {palace.horse ? '时马' : '无马'}</dd></div>
    </dl>
  </section>;
}

export default function QimenWorkspace() {
  const [form, setForm] = useState<QimenInput>({ date: '', time: '', title: '' });
  const [chart, setChart] = useState<QimenChart | null>(null);
  const [selected, setSelected] = useState(1);
  const [archives, setArchives] = useState<QimenArchive[]>([]);
  const [archiveError, setArchiveError] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [copyFallback, setCopyFallback] = useState('');
  const captureRef = useRef<HTMLDivElement>(null);
  const manualCopyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const input = beijingNowInput();
      const initial = buildQimenChart(input);
      setForm(initial.input); setChart(initial); setSelected(initial.chiefStar.palace);
    } catch (e) { setError(messageOf(e)); }
    try { setArchives(loadQimenArchives()); }
    catch (e) { setArchiveError(messageOf(e)); }
  }, []);

  const dirty = chart && (form.date !== chart.input.date || form.time !== chart.input.time || ((form.title || '').trim() || '奇门排盘') !== chart.input.title);
  const selectedPalace = chart?.palaces.find(p => p.number === selected);
  const oldRules = chart && chart.version !== QIMEN_VERSION;

  function generate(input: QimenInput, feedback = '') {
    setError(''); setNotice(''); setCopyFallback('');
    try {
      const next = buildQimenChart(input);
      setChart(next); setForm(next.input); setSelected(next.chiefStar.palace);
      if (feedback) setNotice(feedback);
    } catch (e) { setError(messageOf(e)); }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); generate(form, '已按表单时间重新起盘。');
  }

  function moveTime(minutes: number) {
    if (!chart) return;
    try { generate(shiftQimenTime(chart.input, minutes)); }
    catch (e) { setError(messageOf(e)); }
  }

  function save() {
    if (!chart) return;
    setError(''); setNotice('');
    try { setArchives(saveQimenArchive(chart)); setNotice('当前盘已保存到本地盘库。'); setArchiveError(''); }
    catch (e) { setError(messageOf(e)); }
  }

  function restore(archive: QimenArchive) {
    setChart(archive.chart); setForm(archive.chart.input); setSelected(archive.chart.chiefStar.palace);
    setError(''); setCopyFallback(''); setNotice('已打开存档盘，保留保存时的结果与规则。');
  }

  function remove(id: string) {
    try { setArchives(deleteQimenArchive(id)); setNotice('该存档已删除。'); setArchiveError(''); }
    catch (e) { setArchiveError(messageOf(e)); }
  }

  async function copy() {
    if (!chart) return;
    const text = qimenMarkdown(chart);
    setError(''); setNotice(''); setCopyFallback('');
    try { await copyText(text); setNotice('已复制完整盘面，可粘贴到笔记或 AI 对话。'); }
    catch (e) { setError(messageOf(e)); setCopyFallback(text); }
  }

  function exportMarkdown() {
    if (!chart) return;
    setNotice('');
    try {
      downloadText(qimenMarkdown(chart), qimenFilename(chart, 'md'), 'text/markdown;charset=utf-8');
      setNotice('Markdown 文件已生成，包含当前盘及排盘规则。'); setError('');
    } catch (e) { setError(messageOf(e)); }
  }

  async function exportPng() {
    if (!chart || !captureRef.current) return;
    setBusy(true); setError(''); setNotice('正在生成盘面图片…');
    try {
      await downloadQimenPng(captureRef.current, qimenFilename(chart, 'png'));
      setNotice('PNG 图片已生成。');
    } catch (e) { setError(messageOf(e)); setNotice(''); }
    finally { setBusy(false); }
  }

  return <main className="studio-page qm-page" id="main-content">
    <div className="studio-heading qm-heading"><div><span className="studio-label">SHI JIA QI MEN</span><h1>奇门遁甲</h1><p>一时一局，观天地之序。把每一次起盘，留作可回看的记录。</p></div><span className="qm-method-tag"><i />{chart?.method || '时家转盘·拆补法'}</span></div>

    <div className="qm-workspace">
      <section className="studio-panel qm-form-panel" aria-labelledby="qm-form-title">
        <div className="qm-section-heading"><h2 id="qm-form-title">起一局</h2><span>时间起盘</span></div>
        <form onSubmit={submit}>
          <label className="qm-field"><span>盘名 <small>选填</small></span><input value={form.title || ''} maxLength={80} placeholder="为这次起盘留个名字" disabled={busy} onChange={e => setForm({ ...form, title: e.target.value })} /></label>
          <label className="qm-field"><span>公历日期</span><input type="date" min="1900-01-01" max="2100-12-31" required value={form.date} disabled={busy} onChange={e => setForm({ ...form, date: e.target.value })} /></label>
          <label className="qm-field"><span>起盘时间</span><input type="time" step="60" required value={form.time} disabled={busy} onChange={e => setForm({ ...form, time: e.target.value })} /></label>
          <div className="qm-time-basis"><span>北京时间 UTC+08:00</span><span>钟表时 · 23:00 换日</span></div>
          <button type="submit" className="studio-button qm-start" disabled={busy || !form.date || !form.time}>开始排盘 <span aria-hidden="true">↗</span></button>
          <div className="qm-form-shortcuts"><button type="button" disabled={busy} onClick={() => generate(beijingNowInput(), '已按当前北京时间起盘。')}>此刻起盘</button><button type="button" disabled={busy} onClick={() => generate(SAMPLE, '已载入截图对照盘：2026-10-17 17:06。')}>载入示例</button></div>
        </form>
        <div className="qm-form-note"><span>本版口径</span><p>精确交节定局，中五寄坤二，天禽随天芮。完整规则随盘保存。</p></div>
      </section>

      <section className="qm-stage" aria-label="奇门盘面">
        <div className="qm-toolbar"><div className="qm-time-step"><button type="button" onClick={() => moveTime(-120)} disabled={busy || !chart} aria-label="前一个时辰">‹</button><span>时序推演</span><button type="button" onClick={() => moveTime(120)} disabled={busy || !chart} aria-label="后一个时辰">›</button></div><div className="qm-export-actions">
          <button type="button" disabled={busy || !chart} onClick={copy}><Icon kind="copy" />复制盘面</button>
          <button type="button" disabled={busy || !chart} onClick={exportMarkdown}><Icon kind="download" />导出 MD</button>
          <button type="button" disabled={busy || !chart} onClick={exportPng}><Icon kind="image" />{busy ? '生成中…' : '导出 PNG'}</button>
          <button type="button" className="qm-save-button" disabled={busy || !chart || !!archiveError} onClick={save}><Icon kind="save" />存档</button>
        </div></div>

        {dirty && <p className="qm-inline-note">表单已修改；当前盘面与导出仍为 {chart.input.date} {chart.input.time}。点击“开始排盘”更新。</p>}
        {oldRules && <p className="qm-inline-note">当前为存档版本 {chart.version}；点击“开始排盘”可按现行规则重新计算。</p>}
        {error && <p className="qm-message qm-error" role="alert">{error}</p>}
        <p className={`qm-message qm-status${notice ? '' : ' is-empty'}`} role="status" aria-live="polite">{notice || '\u00a0'}</p>
        {copyFallback && <div className="qm-copy-fallback"><label htmlFor="qm-manual-copy">也可以手动选择下方盘面文字：</label><textarea id="qm-manual-copy" ref={manualCopyRef} readOnly value={copyFallback} rows={8} /><button className="studio-button secondary" type="button" onClick={() => { manualCopyRef.current?.focus(); manualCopyRef.current?.select(); }}>全选文字</button></div>}

        {chart ? <>
          <div className="qm-chart-card" ref={captureRef}>
            <div className="qm-chart-heading"><div><span className="studio-label">奇门遁甲 · {chart.method}</span><h2>{chart.input.title || '时空之局'}</h2><p><time dateTime={chart.timezone === 'UTC+08:00' ? `${chart.input.date}T${chart.input.time}:00+08:00` : undefined}>{chart.input.date} <strong>{chart.input.time}</strong></time><span>{chart.timezone}</span></p></div><div className="qm-chart-seal" aria-hidden="true"><span>奇</span><span>门</span></div></div>
            <div className="qm-pillars">{PILLARS.map(([key, label]) => <div key={key}><span>{label}</span><strong>{chart.pillars[key]}</strong></div>)}</div>
            <div className="qm-chart-meta"><span>{chart.solarTerm} · {chart.yuan}</span><strong>{chart.dun}{chart.ju}局</strong><span>{chart.xun}旬 · {chart.voidBranches}空</span></div>
            <div className="qm-board" aria-label="九宫盘，上南下北、左东右西">
              {chart.palaces.map(palace => palace.number === 5 ? <div key={5} className="qm-center">
                <span className="qm-center-label">{chart.method}</span>
                <div className="qm-center-orbit" aria-hidden="true"><span>☯</span></div>
                <strong>{chart.dun}{chart.ju}局</strong>
                <span>{chart.solarTerm} {chart.yuan}</span>
                <div className="qm-center-chiefs"><span>值符 {chart.chiefStar.name}<b>落{chart.chiefStar.palace}宫</b></span><span>值使 {chart.chiefDoor.name}<b>落{chart.chiefDoor.palace}宫</b></span></div>
                <span className="qm-center-earth">中五地干 {palace.earthStem} · {oldRules ? '寄宫见规则' : '寄坤'}</span>
              </div> : <PalaceCell key={palace.number} palace={palace} selected={selected === palace.number} disabled={busy} onSelect={() => setSelected(palace.number)} />)}
            </div>
            <div className="qm-chart-legend"><span><i className="qm-legend-star" />九星</span><span><i className="qm-legend-door" />八门</span><span><i className="qm-legend-deity" />八神</span><span>小字天干为寄干</span><span>上南下北 · 左东右西</span></div>
            <div className="qm-chart-footnote"><span>{chart.lunarDate}</span><span>{chart.timezone} · {oldRules ? '存档口径见下方规则' : '23:00 换日 · 中五寄坤二'}</span></div>
            <details className="qm-export-rules"><summary>排盘规则与交节依据</summary><div><ul>{chart.rules.map(rule => <li key={rule}>{rule}</li>)}</ul><dl><div><dt>本节气</dt><dd>{chart.solarTerm} · {chart.solarTermAt}</dd></div><div><dt>下个节气</dt><dd>{chart.nextSolarTerm} · {chart.nextSolarTermAt}</dd></div><div><dt>符头 / 旬首</dt><dd>{chart.fuTou} / {chart.xun}遁{chart.hiddenJia}</dd></div><div><dt>时驿马 / 规则版本</dt><dd>{chart.horseBranch} / {chart.version}</dd></div></dl><p>{oldRules ? '以上为存档时的排盘口径，重新排盘将采用本版规则。' : '闰月按农历标注；定局取节气与符头，月柱取节月。'}</p></div></details>
            <div className="qm-capture-signature">紫微 · 奇门排盘 <span>{chart.version}</span></div>
          </div>
          <PalaceDetail palace={selectedPalace} />
        </> : <div className="qm-loading studio-panel" role="status"><span className="qm-loading-orbit" aria-hidden="true">◎</span><p>正在准备起盘时间…</p></div>}
      </section>

      <section className="studio-panel qm-archives" aria-labelledby="qm-archives-title">
        <div className="qm-section-heading"><h2 id="qm-archives-title">本地盘库</h2><span>{archives.length} 局</span></div>
        <p className="qm-archive-intro">存于当前浏览器，重要记录请同时导出。</p>
        {archiveError && <div className="qm-message qm-error" role="alert"><p>{archiveError}</p><button type="button" onClick={() => { try { setArchives(loadQimenArchives()); setArchiveError(''); } catch (e) { setArchiveError(messageOf(e)); } }}>重新读取</button></div>}
        {archives.length ? <ul className="qm-archive-list">{archives.map(archive => <li key={archive.id}>
          <button className="qm-archive-open" type="button" disabled={busy} onClick={() => restore(archive)}><strong>{archive.chart.input.title || '未命名盘'}</strong><span>{archive.chart.input.date} {archive.chart.input.time}</span><small>{archive.chart.dun}{archive.chart.ju}局 · {archive.chart.solarTerm} {archive.chart.yuan}</small></button>
          <button className="qm-archive-delete" type="button" disabled={busy} aria-label={`删除存档 ${archive.chart.input.title || archive.chart.input.date + ' ' + archive.chart.input.time}`} onClick={() => remove(archive.id)}>删除</button>
        </li>)}</ul> : !archiveError && <div className="qm-archive-empty"><span aria-hidden="true">＋</span><p>还没有存档</p><small>起盘后，点击“存档”收藏这一局。</small></div>}
      </section>
    </div>
    <div className="qm-bottom-note"><span>同一时刻，同一取法</span><p>页面、复制和导出使用同一份排盘结果；与其他软件对盘时，请先核对换日、中宫寄宫和交节设置。</p></div>
  </main>;
}
