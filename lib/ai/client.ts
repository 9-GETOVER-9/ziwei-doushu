import { readSseData } from './sse';

export async function streamAi(path: '/api/interpret' | '/api/heming' | '/api/life-kline/interpret', body: unknown, signal: AbortSignal, onText: (text: string) => void) {
  const response = await fetch(path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new Error(error?.error?.message || '解读服务暂时不可用，请稍后重试。');
  }
  if (!response.body) throw new Error('未收到解读内容，请重试。');
  let text = '';
  let completed = false;
  for await (const data of readSseData(response.body)) {
    if (data === '[DONE]') { completed = true; break; }
    const event = JSON.parse(data) as { delta?: { text?: string }; error?: { message?: string } };
    if (event.error) throw new Error(event.error.message || '解读中断，请重试。');
    if (typeof event.delta?.text === 'string') { text += event.delta.text; onText(text); }
  }
  if (!completed || !text.trim()) throw new Error('解读连接中断或未返回正文，请重试。');
  return text;
}
