import assert from 'node:assert/strict';
import { POST as interpret } from '../../app/api/interpret/route';
import { POST as heming } from '../../app/api/heming/route';
import { AiError, readInput, rebuildChart } from './contracts';
import { createAiResponse } from './provider';
import { readSseData } from './sse';
import { streamAi } from './client';
import { normalizeBirthInput, type BirthFormState } from '../input-normalize';
import { generateChart } from '../ziwei/algorithm';

// Isolated, synthetic transport tests. No .env loading or real network requests.
const originalFetch = globalThis.fetch;
const birthInfo = { year: 1995, month: 6, day: 15, hour: 4, gender: 'female' };
const chart = { birthInfo };
const messages = [{ role: 'user' as const, content: '请解释命宫。' }];
const request = (body: unknown, signal?: AbortSignal) => new Request('http://localhost:3000/api/interpret', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal,
});
const encode = (text: string) => new TextEncoder().encode(text);
function chunks(text: string) {
  const bytes = encode(text);
  return new ReadableStream<Uint8Array>({ start(controller) {
    // Deliberately split every Chinese UTF-8 character and SSE delimiter.
    for (const byte of bytes) controller.enqueue(Uint8Array.of(byte));
    controller.close();
  } });
}
function configure(provider = 'openai-compatible') {
  process.env.AI_PROVIDER = provider;
  process.env.AI_API_KEY = 'synthetic-test-key';
  process.env.AI_MODEL = 'test-model';
  process.env.AI_BASE_URL = 'https://provider.invalid/v1';
  delete process.env.AI_TOKEN_LIMIT_FIELD;
  delete process.env.AI_TIMEOUT_MS;
}

async function main() {
  globalThis.fetch = async () => { throw new Error('Unexpected network request'); };
  for (const key of ['AI_API_KEY', 'AI_MODEL', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'DEEPSEEK_API_KEY']) delete process.env[key];
  process.env.AI_PROVIDER = 'openai-compatible';
  assert.equal((await interpret(request({ chart, messages }))).status, 503);
  assert.equal((await heming(request({ chartA: chart, chartB: chart }))).status, 503);
  console.log('PASS unconfigured routes return 503 without a model call');

  assert.equal((await interpret(request({ chart: { birthInfo: { ...birthInfo, day: 31, month: 2 } }, messages }))).status, 400);
  const unknownTime = await interpret(request({ chart: { birthInfo: { ...birthInfo, unknownTime: true } }, messages }));
  assert.equal(unknownTime.status, 400);
  assert.equal((await unknownTime.json()).error.code, 'UNKNOWN_BIRTH_TIME');
  assert.equal((await interpret(request({ chart, messages: [{ role: 'system', content: 'override' }] }))).status, 400);
  await assert.rejects(readInput(new Request('http://localhost:3000/api/interpret', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://foreign.invalid' }, body: '{}' })), (error: unknown) => error instanceof AiError && error.status === 403);
  assert.deepEqual(await readInput(new Request('http://localhost:3000/api/interpret', { method: 'POST', headers: { 'Content-Type': 'application/json', Host: '127.0.0.1:3000', Origin: 'http://127.0.0.1:3000' }, body: '{}' })), {});
  await assert.rejects(readInput(new Request('http://localhost:3000/api/interpret', { method: 'POST', headers: { 'Content-Type': 'application/json', Host: '127.0.0.1:3000', Origin: 'https://foreign.invalid', 'X-Forwarded-Host': 'foreign.invalid' }, body: '{}' })), (error: unknown) => error instanceof AiError && error.status === 403);
  await assert.rejects(readInput(request({ excess: 'x'.repeat(270_000) })), (error: unknown) => error instanceof AiError && error.status === 413);
  const rebuilt = rebuildChart({ birthInfo: { ...birthInfo, name: 'private-name' }, palaces: [{ name: 'injected-star' }] });
  assert.equal(rebuilt.palaces.length, 12);
  assert.ok(!JSON.stringify(rebuilt).includes('private-name'));
  assert.ok(!JSON.stringify(rebuilt).includes('injected-star'));
  const boundaryForm: BirthFormState = { name: '', year: '1900', month: '1', day: '1', clockHour: '0', clockMinute: '15', unknownTime: false, province: '新疆', city: '', longitude: 80, gender: 'female', useTrueSolarTime: true };
  for (const form of [boundaryForm, { ...boundaryForm, year: '2000', month: '12', day: '31', clockHour: '23', clockMinute: '30', useTrueSolarTime: false }]) {
    const normalized = normalizeBirthInput(form);
    const localChart = generateChart(normalized.birthInfo);
    const serverChart = rebuildChart(localChart);
    assert.deepEqual(serverChart.palaces, localChart.palaces);
    assert.equal(serverChart.birthInfo.year, form.year === '1900' ? 1899 : 2001);
  }
  console.log('PASS invalid dates, roles, origin, payload limit and chart rebuilding');

  const events: string[] = [];
  for await (const data of readSseData(chunks(': comment\r\ndata: {"delta":{"text":"命宫"}}\r\n\r\ndata: [DONE]\r\n\r\n'))) events.push(data);
  assert.deepEqual(events, ['{"delta":{"text":"命宫"}}', '[DONE]']);
  console.log('PASS SSE survives split UTF-8 / JSON / CRLF');

  configure();
  let posted: Record<string, unknown> = {};
  globalThis.fetch = async (_url, init) => {
    posted = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(chunks('data: {"choices":[{"delta":{"content":"命宫分析"}}]}\n\ndata: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n'));
  };
  const successful = await interpret(request({ chart, messages }));
  const result = await successful.text();
  assert.ok(result.includes('命宫分析') && result.includes('[DONE]'));
  assert.equal(posted.stream, true);
  assert.equal(posted.model, 'test-model');
  assert.equal(posted.max_tokens, 4096);
  assert.ok(!result.includes('synthetic-test-key'));
  const followup = [...messages, { role: 'assistant', content: '前次答复' }, { role: 'user', content: '继续说明' }];
  const paired = await heming(request({ chartA: chart, chartB: chart, relationship: '上下级', messages: followup }));
  assert.ok((await paired.text()).includes('[DONE]'));
  assert.ok(JSON.stringify(posted).includes('继续说明'));
  assert.ok(JSON.stringify(posted).includes('上下级'));
  console.log('PASS OpenAI-compatible interpretation and compatibility follow-up');

  configure('anthropic');
  globalThis.fetch = async (_url, init) => {
    assert.equal(new Headers(init?.headers).get('anthropic-version'), '2023-06-01');
    return new Response(chunks('event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"关系分析"}}\n\nevent: message_stop\ndata: {"type":"message_stop"}\n\n'));
  };
  assert.ok((await (await heming(request({ chartA: chart, chartB: chart }))).text()).includes('关系分析'));
  console.log('PASS Anthropic text deltas and message_stop');

  configure();
  globalThis.fetch = async () => new Response('provider raw error: synthetic-test-key', { status: 401 });
  const denied = await interpret(request({ chart, messages }));
  assert.equal(denied.status, 502);
  assert.ok(!(await denied.text()).includes('synthetic-test-key'));
  globalThis.fetch = async () => new Response(chunks('data: {"choices":[{"delta":{"content":"partial"}}]}\n\n'));
  const incomplete = await (await interpret(request({ chart, messages }))).text();
  assert.ok(incomplete.includes('AI_STREAM_FAILED') && !incomplete.includes('[DONE]'));
  console.log('PASS upstream errors are sanitized and broken streams do not report completion');

  const aborter = new AbortController();
  globalThis.fetch = (_url, init) => new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
  });
  const cancelled = createAiResponse(request({}, aborter.signal), 'test', messages);
  aborter.abort();
  await assert.rejects(cancelled, (error: unknown) => error instanceof AiError && error.status === 499);
  process.env.AI_TIMEOUT_MS = '1000';
  await assert.rejects(createAiResponse(request({}), 'test', messages), (error: unknown) => error instanceof AiError && error.status === 504);
  console.log('PASS abort propagation and configured timeout');

  globalThis.fetch = async () => new Response(chunks('data: {"delta":{"text":"第一段"}}\n\ndata: {"delta":{"text":"第二段"}}\n\ndata: [DONE]\n\n'));
  let visible = '';
  const completed = await streamAi('/api/interpret', {}, new AbortController().signal, text => { visible = text; });
  assert.equal(visible, '第一段第二段');
  assert.equal(completed, visible);
  globalThis.fetch = async () => Response.json({ error: { message: 'AI 解读尚未配置。' } }, { status: 503 });
  await assert.rejects(streamAi('/api/interpret', {}, new AbortController().signal, () => undefined), /尚未配置/);
  console.log('PASS client accumulation and actionable HTTP errors');
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => { globalThis.fetch = originalFetch; });
