'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { BRANCHES, STEMS } from '@/lib/ziwei/constants';
import { getFlowDecades, getFlowMonths, getFlowDays, type FlowSelection, type TimeFlow } from '@/lib/ziwei/time-flow';
import type { ZiweiChart } from '@/lib/ziwei/types';
import './TimeNav.css';

export type TimeView = 'mingpan' | 'daxian' | 'liunian' | 'liuyue' | 'liuri' | 'liushi';
export const TIME_VIEW_NAMES: Record<TimeView, string> = { mingpan: '本命', daxian: '大限', liunian: '流年', liuyue: '流月', liuri: '流日', liushi: '流时' };
export const TIME_LEVEL_KEYS = { daxian: 'decadal', liunian: 'yearly', liuyue: 'monthly', liuri: 'daily', liushi: 'hourly' } as const;
export const TIME_VIEW_MARKS = { daxian: '限', liunian: '年', liuyue: '月', liuri: '日', liushi: '时' } as const;

interface TimeNavProps {
  chart: ZiweiChart;
  flow: TimeFlow;
  view: TimeView;
  onChange: (selection: FlowSelection, view: TimeView) => void;
  onViewChange: (view: TimeView) => void;
  onToday: () => void;
}

function TimeRow({ name, kind, hint, selected, children }: { name: string; kind: string; hint: string; selected: number; children: ReactNode }) {
  const rail = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = rail.current;
    const active = element?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (element && active) element.scrollTo({ left: active.offsetLeft - element.clientWidth / 2 + active.clientWidth / 2 });
  }, [selected]);
  const scroll = (direction: number) => rail.current?.scrollBy({ left: direction * rail.current.clientWidth * .8, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  return <section className="zw-flow-row" data-flow={kind} aria-label={name + '选择'}>
    <div className="zw-flow-heading"><h3>{name}</h3><span>{hint}</span><div className="zw-flow-arrows"><button type="button" aria-label={'向前浏览' + name} onClick={() => scroll(-1)}>‹</button><button type="button" aria-label={'向后浏览' + name} onClick={() => scroll(1)}>›</button></div></div>
    <div ref={rail} className="zw-flow-rail" role="group" aria-label={name}>{children}</div>
  </section>;
}

export default function TimeNav({ chart, flow, view, onChange, onViewChange, onToday }: TimeNavProps) {
  const { selection } = flow;
  const solarDateLabel = `${flow.solarDate.year}-${String(flow.solarDate.month).padStart(2, '0')}-${String(flow.solarDate.day).padStart(2, '0')}`;
  const decades = getFlowDecades(chart);
  const birthYear = decades[0].startYear - decades[0].startAge + 1;
  const decade = decades.find(item => item.index === flow.decadalIndex) ?? decades[0];
  const years = Array.from({ length: decade.endYear - decade.startYear + 1 }, (_, index) => decade.startYear + index);
  const months = getFlowMonths(selection.year);
  const days = getFlowDays(selection.year, selection.month);
  const level = view === 'mingpan' ? null : flow.levels[TIME_LEVEL_KEYS[view]];
  const choose = (patch: Partial<FlowSelection>, nextView: TimeView) => onChange({ ...selection, ...patch }, nextView);
  return <div className="zw-flow-nav">
    <div className="zw-flow-toolbar"><span>时序推演</span><div><button type="button" aria-pressed={view === 'mingpan'} className={view === 'mingpan' ? 'is-active' : ''} onClick={() => onViewChange('mingpan')}>本命盘</button><button type="button" onClick={onToday}>回到今天</button></div></div>
    <TimeRow name="大限" kind="daxian" hint="所选流年所属大限 · 点击切换" selected={flow.decadalIndex}>
      {decades.map(item => <button type="button" key={item.index} className="zw-flow-card is-tall" aria-pressed={item.index === flow.decadalIndex} aria-label={'大限' + item.startAge + '至' + item.endAge + '岁，' + item.palaceName} onClick={() => choose({ year: item.index === flow.decadalIndex ? selection.year : item.startYear }, 'daxian')}><small>{item.startAge}~{item.endAge}岁</small><strong>{item.stemIndex == null || item.palaceBranch == null ? '童限' : STEMS[item.stemIndex] + BRANCHES[item.palaceBranch]}</strong><small>{item.index === -1 ? '起限前' : item.palaceName}</small></button>)}
    </TimeRow>
    <TimeRow name="流年" kind="liunian" hint="农历正月换年 · 点击切换" selected={selection.year}>
      {years.map(year => <button type="button" key={year} className="zw-flow-card is-tall" aria-pressed={year === selection.year} aria-label={'流年' + year + '年，' + (year - birthYear + 1) + '岁'} onClick={() => choose({ year }, 'liunian')}><strong className="zw-flow-year">{year}</strong><small>{year - birthYear + 1}岁</small><span>{STEMS[((year - 4) % 10 + 10) % 10]}{BRANCHES[((year - 4) % 12 + 12) % 12]}</span></button>)}
    </TimeRow>
    <TimeRow name="流月" kind="liuyue" hint="精细到每月 · 含农历闰月" selected={selection.year * 100 + selection.month}>
      {months.map(month => <button type="button" key={month.month} className="zw-flow-card" aria-pressed={month.month === selection.month} aria-label={'流月' + month.label} onClick={() => choose({ month: month.month }, 'liuyue')}>{month.label}</button>)}
    </TimeRow>
    <TimeRow name="流日" kind="liuri" hint={'本月' + days.length + '天 · 点击切换'} selected={selection.year * 10000 + selection.month * 100 + selection.day}>
      {days.map(day => <button type="button" key={day.day} className="zw-flow-card" aria-pressed={day.day === selection.day} aria-label={'流日' + day.label} onClick={() => choose({ day: day.day }, 'liuri')}>{day.label}</button>)}
    </TimeRow>
    <TimeRow name="流时" kind="liushi" hint="精细到时辰 · 点击切换" selected={selection.hour}>
      {BRANCHES.map((branch, hour) => <button type="button" key={branch} className="zw-flow-card" aria-pressed={hour === selection.hour} aria-label={'流时' + branch + '时'} onClick={() => choose({ hour }, 'liushi')}>{branch}时</button>)}
    </TimeRow>
    <div className="zw-flow-summary" role="status" aria-live="polite" aria-atomic="true">
      <div><b>{TIME_VIEW_NAMES[view]}</b><span>{flow.lunarDate} · {BRANCHES[selection.hour]}时</span><span>公历 {solarDateLabel} · {flow.nominalAge}虚岁</span></div>
      {level && <div className="zw-flow-transformations"><span>{TIME_VIEW_NAMES[view]}命宫在{BRANCHES[level.palaceBranch]} · {level.stemName}干四化</span>{Object.entries(level.siHua).map(([star, sihua]) => <span key={sihua} className="zw-sihua-text" data-sihua={sihua}>{star}化{sihua}</span>)}</div>}
      {flow.isChildhood && view === 'daxian' && <div>童限 · 尚未起大限{flow.childhoodPalaceBranch != null ? `，童限在本命${chart.palaces.find(palace => palace.branch === flow.childhoodPalaceBranch)?.name}` : ''}</div>}
      {flow.clamped && <small>已自动调整到有效日期。</small>}
    </div>
    <details className="zw-flow-method"><summary>运限计算口径</summary><p>年龄按农历虚岁计算，正月初一换年。流月依斗君起宫，闰月前十五日归本月、后半月归下月；流日从流月命宫起初一，流时从流日命宫起子时。子时代表该排盘日的早子时；23点后的晚子时请选次日。本命星曜保留，选中层级另列宫名与四化。</p></details>
  </div>;
}
