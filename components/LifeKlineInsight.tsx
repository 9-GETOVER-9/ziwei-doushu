'use client';

import { useEffect, useRef, useState } from 'react';
import type { ZiweiChart } from '@/lib/ziwei/types';
import type { LifeTheme } from '@/lib/ziwei/life-kline';
import { streamAi } from '@/lib/ai/client';

export default function LifeKlineInsight({ chart, year, theme, themeLabel }: { chart: ZiweiChart; year: number; theme: LifeTheme; themeLabel: string }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  useEffect(() => () => { generation.current++; controller.current?.abort(); }, []);

  const generate = async () => {
    if (controller.current) return;
    const request = new AbortController();
    controller.current = request;
    const id = ++generation.current;
    setLoading(true); setError(''); setText(''); setComplete(false);
    try {
      await streamAi('/api/life-kline/interpret', { chart: { birthInfo: chart.birthInfo }, year, theme }, request.signal,
        value => { if (id === generation.current) setText(value); });
      if (id === generation.current) setComplete(true);
    } catch (cause) {
      if (id === generation.current) setError(request.signal.aborted ? '已停止生成，下面收到的内容尚未完成。' : cause instanceof Error ? cause.message : '解读未完成，请重试。');
    } finally {
      if (id === generation.current) { controller.current = null; setLoading(false); }
    }
  };

  return <section className="life-ai-panel" aria-label="所选年份AI解读">
    <div className="life-section-heading"><div><span className="chart-detail-eyebrow">READ THIS YEAR</span><h3>{year} · {themeLabel}解读</h3></div>
      {loading ? <button className="studio-button secondary" onClick={() => controller.current?.abort()}>停止生成</button>
        : <button className="studio-button secondary" onClick={() => void generate()}>{text || error ? '重新解读' : 'AI 解读这一年'} <span aria-hidden="true">↗</span></button>}
    </div>
    <p className="life-muted">结合这一年的命盘与月段证据展开说明。主动点击后使用已配置的 AI 服务，图表分数保持不变。</p>
    {loading && <p role="status" className="life-loading">正在阅读 {year} 年的命盘证据…</p>}
    {error && <p role="alert" className="birth-notice warning">{error}</p>}
    {text && <div className="life-ai-text" aria-busy={loading}>{text}</div>}
    {complete && <p className="life-muted">本次解读已完成 · {year}年 · {themeLabel}</p>}
  </section>;
}
