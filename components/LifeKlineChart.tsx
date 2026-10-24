'use client';

import { useEffect, useRef } from 'react';
import type { LifeKlineYear } from '@/lib/ziwei/life-kline';

interface Props {
  years: LifeKlineYear[];
  selectedYear: number;
  currentYear: number;
  onSelect: (year: number) => void;
}

/** Original SVG renderer: OHLC is supplied by the auditable monthly model. */
export default function LifeKlineChart({ years, selectedYear, currentYear, onSelect }: Props) {
  const nodes = useRef(new Map<number, SVGGElement>());
  const rail = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<number | null>(null);
  const width = 1040, height = 330, left = 42, right = 20, top = 30, bottom = 44;
  const plotHeight = height - top - bottom;
  const step = (width - left - right) / Math.max(years.length, 1);
  const x = (index: number) => left + step * (index + .5);
  const y = (score: number) => top + (100 - score) / 100 * plotHeight;
  const candleWidth = Math.max(3, Math.min(20, step * .55));
  const selectedIndex = years.findIndex(item => item.year === selectedYear);
  useEffect(() => {
    const element = rail.current;
    if (element && selectedIndex >= 0) {
      const center = (left + step * (selectedIndex + .5)) / width * element.scrollWidth;
      element.scrollTo({ left: Math.max(0, center - element.clientWidth / 2), behavior: 'instant' });
    }
    if (pendingFocus.current === selectedYear) {
      nodes.current.get(selectedYear)?.focus({ preventScroll: true });
      pendingFocus.current = null;
    }
  }, [selectedYear, selectedIndex, step]);

  const move = (index: number, key: string) => {
    const next = key === 'Home' ? 0 : key === 'End' ? years.length - 1 : Math.min(years.length - 1, Math.max(0, index + (key === 'ArrowLeft' ? -1 : 1)));
    const year = years[next]?.year;
    if (year === undefined) return;
    if (year === selectedYear) return;
    pendingFocus.current = year;
    onSelect(year);
  };

  return <div ref={rail} className="life-chart-scroll" tabIndex={0} aria-label="人生K线图，可横向滚动。选中蜡烛后可用左右方向键切换年份">
    <svg className="life-chart" viewBox={`0 0 ${width} ${height}`} role="group" aria-label="农历年度人生K线，纵轴为零至一百的自定义四化指数">
      <title>人生 K 线 · 月段采样指数</title>
      {[0, 25, 50, 75, 100].map(value => <g key={value} aria-hidden="true">
        <line x1={left} x2={width - right} y1={y(value)} y2={y(value)} className={value === 50 ? 'life-grid-line is-baseline' : 'life-grid-line'} />
        <text x={left - 12} y={y(value) + 4} textAnchor="end" className="life-axis-text">{value}</text>
      </g>)}
      {years.map((item, index) => {
        if (index > 0 && item.decadeLabel === years[index - 1].decadeLabel) return null;
        return <g key={item.year} aria-hidden="true">
          <line x1={x(index) - step / 2} x2={x(index) - step / 2} y1={top} y2={height - bottom} className="life-decade-line" />
          {(years.length <= 25 || index === 0 || index + 5 < years.length) && <text x={x(index) + 2} y={16} className="life-axis-text">{item.age}岁 · {item.decadeLabel.includes('童限') ? '童限' : index === 0 ? '视窗起点' : '换限'}</text>}
        </g>;
      })}
      {selectedIndex >= 0 && <rect aria-hidden="true" x={x(selectedIndex) - step / 2} y={top} width={step} height={plotHeight} className="life-selected-column" />}
      <polyline aria-hidden="true" points={years.map((item, index) => `${x(index)},${y(item.close)}`).join(' ')} className="life-close-line" />
      {years.map((item, index) => {
        const rising = item.close >= item.open;
        const selected = item.year === selectedYear;
        return <g key={item.year} ref={node => { if (node) nodes.current.set(item.year, node); else nodes.current.delete(item.year); }}
          role="button" tabIndex={selected || (selectedIndex < 0 && index === 0) ? 0 : -1}
          aria-label={`${item.year}年，${item.age}虚岁，开${item.open}，收${item.close}，高${item.high}，低${item.low}${item.partial ? '，非完整年' : ''}`}
          aria-pressed={selected} className={`life-candle ${rising ? 'is-rising' : 'is-falling'}${selected ? ' is-selected' : ''}`}
          onClick={() => onSelect(item.year)} onKeyDown={event => {
            if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); move(index, event.key); }
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(item.year); }
          }}>
          <title>{`${item.year} · ${item.age}虚岁\n${item.decadeLabel}\n开 ${item.open} / 收 ${item.close}\n高 ${item.high} / 低 ${item.low}`}</title>
          <rect x={x(index) - step / 2} y={top} width={step} height={plotHeight} fill="transparent" stroke="none" />
          <line x1={x(index)} x2={x(index)} y1={y(item.high)} y2={y(item.low)} className="life-wick" />
          <rect x={x(index) - candleWidth / 2} y={y(Math.max(item.open, item.close)) - (item.open === item.close ? 1 : 0)} width={candleWidth} height={Math.max(2, Math.abs(y(item.open) - y(item.close)))} rx={1} className="life-candle-body" />
          {item.year === currentYear && <circle cx={x(index)} cy={height - bottom + 10} r={3} className="life-today-dot" />}
          {(index === 0 || index === years.length - 1 || index % (years.length > 40 ? 10 : 5) === 0) && <text x={x(index)} y={height - 13} textAnchor="middle" className="life-axis-text">{item.age}岁</text>}
        </g>;
      })}
    </svg>
  </div>;
}
