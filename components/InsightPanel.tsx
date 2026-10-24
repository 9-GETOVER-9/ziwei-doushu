'use client';

import { useEffect, useRef, useState } from 'react';
import type { Palace, ZiweiChart } from '@/lib/ziwei/types';
import { streamAi } from '@/lib/ai/client';
import type { TimeView } from './TimeNav';

interface Message { role: 'user' | 'assistant'; content: string; label?: string }
interface InsightPanelProps {
  chart: ZiweiChart;
  selectedPalace?: Palace | null;
  selectedSiHua?: { starName: string; siHua: string; view: TimeView } | null;
}

const TOPICS = [
  ['overview', '命格总览', '请解读命盘主轴、命宫与三方四正，说明优势、限制以及当前大限方向。'],
  ['career', '事业方向', '请分析事业方向，结合官禄、命宫、财帛与迁移说明依据、适合的工作方式与反证。'],
  ['wealth', '财务模式', '请分析财帛、田宅与福德宫体现的收入、积累与支出模式，不做具体投资建议。'],
  ['love', '感情关系', '请分析夫妻宫及三方四正，解释关系需求、相处模式、条件与反证。'],
  ['personality', '性格特质', '请从命宫、身宫与福德宫说明性格特质、内在需求以及可发展的优势。'],
  ['timing', '当前大限', '请根据命盘提供的大限年龄范围说明当前阶段主题，区分本命与大限，不编造流年星曜。'],
  ['family', '家庭关系', '请分析父母、兄弟、子女宫所象征的关系模式。不要断定现实家庭人数或已经发生的事件。'],
  ['health', '身心节律', '请解释疾厄与福德宫的传统象义及日常节律，不作疾病诊断或治疗判断。'],
] as const;

function AiContent({ text }: { text: string }) {
  return <div className="space-y-2 text-[14px] leading-[1.9]" style={{ color: 'var(--tx-2, #545767)' }}>
    {text.split('\n').map((line, i) => {
      const title = line.match(/^(?:#{1,4}\s+(.+)|\*\*【?(.+?)】?\*\*)$/);
      if (title) return <h4 key={i} className="pt-3 text-[15px] font-semibold" style={{ color: 'var(--tx-0, #252735)' }}>{title[1] || title[2]}</h4>;
      if (!line.trim()) return null;
      return <p key={i} className="whitespace-pre-wrap break-words">{line.split(/\*\*(.+?)\*\*/).map((part, index) => index % 2 ? <strong key={index} className="font-semibold">{part}</strong> : part)}</p>;
    })}
  </div>;
}

export default function InsightPanel({ chart, selectedPalace, selectedSiHua }: InsightPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTopic, setActiveTopic] = useState('');
  const controllerRef = useRef<AbortController | null>(null);
  const historyRef = useRef<Message[]>([]);
  const lastRequest = useRef<{ text: string; label?: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const generation = useRef(0);

  useEffect(() => {
    generation.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
    historyRef.current = [];
    lastRequest.current = null;
    setMessages([]); setError(''); setLoading(false); setInput(''); setActiveTopic('');
    return () => { generation.current += 1; controllerRef.current?.abort(); };
  }, [chart]);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, error]);

  const sendMessage = async (text: string, label?: string) => {
    if (controllerRef.current || !text.trim()) return;
    const question = text.trim();
    if (question.length > 4000) { setError('请将问题控制在 4000 字以内。'); return; }
    const controller = new AbortController();
    controllerRef.current = controller;
    const id = ++generation.current;
    const user: Message = { role: 'user', content: question, label };
    const history = [...historyRef.current, { role: 'user' as const, content: question }];
    if (history.length > 23) {
      controllerRef.current = null;
      setError('本轮对话已较长，请点击「重新开始」开启新的解读。'); return;
    }
    lastRequest.current = { text: question, label };
    setError(''); setInput(''); setLoading(true);
    setMessages(previous => [...previous, user, { role: 'assistant', content: '' }]);
    try {
      const text = await streamAi('/api/interpret', { chart, messages: history }, controller.signal, content => {
        if (id === generation.current) setMessages(previous => [...previous.slice(0, -1), { role: 'assistant', content }]);
      });
      if (id === generation.current) {
        historyRef.current = [...history, { role: 'assistant', content: text }];
        lastRequest.current = null;
      }
    } catch (cause) {
      if (id === generation.current) setError(controller.signal.aborted ? '已停止生成。你可以重新生成，或换一个问题。' : cause instanceof Error ? cause.message : '解读暂时不可用，请重试。');
    } finally {
      if (id === generation.current) { controllerRef.current = null; setLoading(false); }
    }
  };

  const reset = () => {
    generation.current += 1; controllerRef.current?.abort(); controllerRef.current = null;
    historyRef.current = []; lastRequest.current = null;
    setMessages([]); setError(''); setLoading(false); setActiveTopic('');
  };

  const contextualPrompt = selectedSiHua
    ? `请解释${selectedSiHua.starName}化${selectedSiHua.siHua}的传统含义。用户当前查看${selectedSiHua.view}；请先核查所提供命盘是否包含这一时间层，未包含时不要假定该飞化已经成立。`
    : selectedPalace ? `请分析${selectedPalace.name}，说明主星、四化、三方四正的支撑与最强反证。` : '';
  const contextLabel = selectedSiHua ? `${selectedSiHua.starName}化${selectedSiHua.siHua}` : selectedPalace?.name;

  return <section className="flex min-h-[460px] flex-col overflow-hidden rounded-2xl border" style={{ background: 'var(--bg-card, #fff)', borderColor: 'var(--bdr, #e8e9ef)' }} aria-label="AI 命盘解读">
    <div className="flex items-start justify-between gap-3 border-b px-5 py-4" style={{ borderColor: 'var(--bdr, #e8e9ef)' }}>
      <div>
        <h3 className="text-base font-semibold" style={{ color: 'var(--tx-0, #252735)' }}>AI 深度解读</h3>
        <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--tx-3, #8b8f9f)' }}>从一个主题开始，围绕这张命盘继续聊。</p>
      </div>
      {messages.length > 0 && <button onClick={reset} className="shrink-0 rounded-lg px-2 py-1 text-xs" style={{ color: 'var(--ac, #5a5ad6)' }}>重新开始</button>}
    </div>

    <div className="flex flex-wrap gap-2 px-5 py-4">
      {TOPICS.map(([key, label, prompt]) => <button key={key} disabled={loading} onClick={() => { setActiveTopic(key); void sendMessage(prompt, label); }} className="rounded-full border px-3 py-1.5 text-xs transition-colors disabled:cursor-wait disabled:opacity-50" style={{ borderColor: activeTopic === key ? 'var(--ac, #5a5ad6)' : 'var(--bdr, #e8e9ef)', color: activeTopic === key ? 'var(--ac, #5a5ad6)' : 'var(--tx-2, #545767)', background: activeTopic === key ? 'var(--ac-bg, #f0f0ff)' : 'transparent' }}>{label}</button>)}
    </div>

    {contextLabel && <div className="mx-5 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-3 text-xs" style={{ background: 'var(--ac-bg, #f0f0ff)', color: 'var(--ac, #5a5ad6)' }}>
      <span>当前选中 · {contextLabel}</span>
      <button disabled={loading} onClick={() => void sendMessage(contextualPrompt, `解读${contextLabel}`)} className="font-medium disabled:opacity-40">解读这里 →</button>
    </div>}

    <div ref={scrollRef} className="max-h-[640px] flex-1 space-y-6 overflow-y-auto px-5 pb-5" aria-busy={loading}>
      {messages.length === 0 && <div className="py-12 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-xl" style={{ background: 'var(--ac-bg, #f0f0ff)', color: 'var(--ac, #5a5ad6)' }}>✦</div>
        <p className="text-sm font-medium" style={{ color: 'var(--tx-0, #252735)' }}>你想先了解哪一面？</p>
        <p className="mx-auto mt-2 max-w-sm text-xs leading-6" style={{ color: 'var(--tx-3, #8b8f9f)' }}>选择上方主题，或写下具体问题。每次解读都基于当前命盘生成。</p>
      </div>}
      {messages.map((message, index) => <div key={index}>
        {message.role === 'user' ? <div className="flex justify-end"><div className="max-w-[90%] rounded-2xl rounded-br-sm px-4 py-3 text-sm" style={{ background: 'var(--ac-bg, #f0f0ff)', color: 'var(--ac, #5a5ad6)' }}>{message.label || message.content}</div></div>
          : <div><div className="mb-2 text-[11px] font-medium tracking-wide" style={{ color: 'var(--ac, #5a5ad6)' }}>✦ 紫微解读</div>{message.content ? <AiContent text={message.content} /> : loading && index === messages.length - 1 ? <p className="animate-pulse text-sm" style={{ color: 'var(--tx-3, #8b8f9f)' }}>正在结合命盘分析…</p> : null}</div>}
      </div>)}
      {error && <div role="alert" className="rounded-xl border px-4 py-3 text-sm leading-6" style={{ borderColor: 'var(--bdr, #e8e9ef)', background: 'var(--bg-1, #f7f8fb)', color: 'var(--tx-2, #545767)' }}>
        {error}
        {lastRequest.current && !loading && <button onClick={() => { const previous = lastRequest.current; if (previous) { setMessages(items => items.slice(0, -2)); void sendMessage(previous.text, previous.label); } }} className="mt-2 block text-xs font-medium" style={{ color: 'var(--ac, #5a5ad6)' }}>重新生成</button>}
      </div>}
    </div>

    <form className="border-t p-4" style={{ borderColor: 'var(--bdr, #e8e9ef)' }} onSubmit={event => { event.preventDefault(); void sendMessage(input); }}>
      <div className="flex items-center gap-2">
        <input aria-label="向命盘提问" value={input} maxLength={4000} disabled={loading} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault(); }} placeholder="写下你想了解的问题…" className="min-w-0 flex-1 rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200" style={{ background: 'var(--bg-card, #fff)', borderColor: 'var(--bdr, #e8e9ef)', color: 'var(--tx-0, #252735)' }} />
        {loading ? <button type="button" onClick={() => controllerRef.current?.abort()} className="rounded-xl border px-4 py-3 text-sm" style={{ borderColor: 'var(--bdr, #e8e9ef)', color: 'var(--tx-2, #545767)' }}>停止</button>
          : <button type="submit" disabled={!input.trim()} className="rounded-xl px-4 py-3 text-sm font-medium text-white disabled:opacity-40" style={{ background: 'var(--ac, #5a5ad6)' }}>发送</button>}
      </div>
    </form>
  </section>;
}
