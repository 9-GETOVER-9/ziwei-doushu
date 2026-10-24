import type { QimenChart } from './types';

const plain = (value: string) => value.replace(/[\r\n]+/g, ' ').replace(/[\\`*_{}\[\]<>#|]/g, '\\$&');
export function qimenMarkdown(chart: QimenChart): string {
  const c = chart;
  const rows = c.palaces.map(p => {
    const marks = [p.isChiefStar ? '值符落宫' : '', p.isChiefDoor ? '值使落宫' : '',
      p.voidBranches ? `旬空：${p.voidBranches}` : '', p.horse ? `时驿马：${c.horseBranch}` : ''].filter(Boolean);
    return `| ${p.name}${p.number}宫 | ${p.direction} | ${p.stars.join('、') || '—'} | ${p.door || '—'} | ${p.deity || '—'} | ${p.heavenStem || '—'}${p.hostedHeavenStem ? `（寄${p.hostedHeavenStem}）` : ''} | ${p.earthStem}${p.hostedEarthStem ? `（寄${p.hostedEarthStem}）` : ''} | ${marks.join('；') || '—'} |`;
  });
  return [
    `# ${plain(c.input.title)}`, '',
    `- 起局时间：公历 ${c.input.date} ${c.input.time}（时间标准 ${c.timezone}）`,
    `- 农历日期（钟表日期）：${c.lunarDate}`,
    `- 四柱：${c.pillars.year}年 ${c.pillars.month}月 ${c.pillars.day}日 ${c.pillars.hour}时`,
    `- 定局：${c.solarTerm} ${c.yuan} ${c.dun}${c.ju}局；符头 ${c.fuTou}`,
    `- 当前节气交节：${c.solarTermAt}；下一节气 ${c.nextSolarTerm}：${c.nextSolarTermAt}（${c.timezone}）`,
    `- 旬首：${c.xun}（遁${c.hiddenJia}）；时旬空：${c.voidBranches}；时驿马：${c.horseBranch}`,
    `- 值符：${c.chiefStar.name}落${c.chiefStar.palace}宫（旬首原宫${c.chiefStar.origin}）`,
    `- 值使：${c.chiefDoor.name}落${c.chiefDoor.palace}宫（加时原落宫${c.chiefDoor.rawPalace}${c.chiefDoor.rawPalace !== c.chiefDoor.palace ? `，寄${c.chiefDoor.palace}宫` : ''}）`, '',
    '## 九宫盘', '',
    '方位：上南下北、左东右西；宫序 4・9・2 / 3・5・7 / 8・1・6。中五地干保留，同时标注寄干。', '',
    '| 宫位 | 方位 | 九星 | 八门 | 八神 | 天盘干 | 地盘干 | 标记 |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |', ...rows, '',
    '## 排盘口径', '', ...c.rules.map(rule => `- ${rule}`), '',
    `规则版本：${c.version}。本文件为确定规则计算的盘面，不含 AI 断语。`, '',
    '规则来源与差异记录：[项目奇门说明](https://github.com/9-GETOVER-9/ziwei-doushu/blob/codex/%E5%A5%87%E9%97%A8%E6%8E%92%E7%9B%98%E4%B8%8E%E5%AF%BC%E5%87%BA/lib/qimen/SOURCES.md)。', '',
  ].join('\n');
}

export function qimenFilename(chart: QimenChart, extension: string): string {
  const title = chart.input.title.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '').replace(/[. ]+$/g, '').slice(0, 40) || '奇门排盘';
  const ext = extension.replace(/[^a-z0-9]/gi, '') || 'md';
  return `${title}_${chart.input.date}_${chart.input.time.replace(':', '')}.${ext}`;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function downloadText(content: string, filename: string, mime = 'text/markdown;charset=utf-8'): void {
  downloadBlob(new Blob([content], { type: mime }), filename);
}

export async function copyText(content: string): Promise<void> {
  if (!navigator.clipboard?.writeText) throw new Error('此环境无法直接复制，请使用 MD 导出。');
  try { await navigator.clipboard.writeText(content); }
  catch { throw new Error('未获得剪贴板权限，请使用 MD 导出。'); }
}

export async function downloadQimenPng(element: HTMLElement, filename: string): Promise<void> {
  // Snapshot immediately so navigation during the async import cannot change the exported chart.
  const snapshot = element.cloneNode(true) as HTMLElement;
  snapshot.querySelectorAll('.is-selected').forEach(cell => cell.classList.remove('is-selected'));
  snapshot.querySelectorAll('details').forEach(details => { details.open = true; });
  // Buttons are disabled while rendering; remove only the transient disabled
  // attribute so global button:disabled opacity does not wash out the PNG.
  snapshot.querySelectorAll('button').forEach(button => button.removeAttribute('disabled'));
  const mount = document.createElement('div');
  mount.style.cssText = 'position:fixed;left:-12000px;top:0;width:900px;pointer-events:none;';
  mount.setAttribute('aria-hidden', 'true');
  mount.dataset.theme = 'light';
  mount.style.setProperty('--bg-card', '#ffffff');
  mount.style.setProperty('--bg-0', '#ffffff');
  mount.style.setProperty('--bg-1', '#f7f7f8');
  mount.style.setProperty('--tx-0', '#0f0f0f');
  mount.style.setProperty('--tx-1', '#242427');
  mount.style.setProperty('--tx-2', '#5c5c5c');
  mount.style.setProperty('--tx-3', '#777780');
  mount.style.setProperty('--ac', '#5a5ad6');
  mount.style.setProperty('--ac-bg', '#f3f2fd');
  mount.style.setProperty('--ac-bdr', '#dcdaf5');
  mount.style.setProperty('--bdr', '#eaeaec');
  mount.appendChild(snapshot);
  document.body.appendChild(mount);
  try {
    await document.fonts.ready;
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(snapshot, { backgroundColor: '#ffffff', scale: 2, useCORS: true, logging: false, windowWidth: 1280 });
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error('PNG 生成失败，请重试。')), 'image/png'));
    downloadBlob(blob, filename);
  } finally { mount.remove(); }
}
