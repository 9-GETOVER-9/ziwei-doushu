import { AiError, type AiMessage } from './contracts';
import { readSseData } from './sse';

interface ProviderConfig { provider: 'anthropic' | 'openai-compatible'; key: string; model: string; url: string; timeout: number; maxTokens: number; tokenLimitField: 'max_tokens' | 'max_completion_tokens' }

export function getProviderConfig(): ProviderConfig {
  const provider = process.env.AI_PROVIDER?.trim() || 'openai-compatible';
  if (!['openai-compatible', 'openai', 'anthropic', 'deepseek'].includes(provider)) {
    throw new AiError(503, 'AI_CONFIG_INVALID', 'AI 服务配置不正确，请检查服务端 AI_PROVIDER。');
  }
  const anthropic = provider === 'anthropic';
  const key = process.env.AI_API_KEY?.trim() || (anthropic ? process.env.ANTHROPIC_API_KEY : provider === 'deepseek' ? process.env.DEEPSEEK_API_KEY : process.env.OPENAI_API_KEY)?.trim();
  const model = process.env.AI_MODEL?.trim();
  if (!key || !model || /^(your-|replace|sk-example)/i.test(key)) {
    throw new AiError(503, 'AI_NOT_CONFIGURED', 'AI 解读尚未配置。请在服务端设置 AI_API_KEY 和 AI_MODEL 后重启；排盘、运限与古籍仍可使用。');
  }
  const base = process.env.AI_BASE_URL?.trim() || (anthropic ? 'https://api.anthropic.com/v1' : provider === 'deepseek' ? 'https://api.deepseek.com/v1' : 'https://api.openai.com/v1');
  let endpoint: URL;
  try {
    endpoint = new URL(`${base.replace(/\/+$/, '')}/${anthropic ? 'messages' : 'chat/completions'}`);
    if (endpoint.username || endpoint.password || endpoint.search || endpoint.hash ||
      (endpoint.protocol !== 'https:' && !(endpoint.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname)))) throw new Error();
  } catch { throw new AiError(503, 'AI_CONFIG_INVALID', 'AI 服务地址配置不正确，请检查服务端 AI_BASE_URL。'); }
  const bounded = (value: string | undefined, fallback: number, min: number, max: number) => {
    const number = Number(value);
    return Number.isInteger(number) && number >= min && number <= max ? number : fallback;
  };
  const field = process.env.AI_TOKEN_LIMIT_FIELD;
  if (field && field !== 'max_tokens' && field !== 'max_completion_tokens') {
    throw new AiError(503, 'AI_CONFIG_INVALID', 'AI_TOKEN_LIMIT_FIELD 配置不正确。');
  }
  return { provider: anthropic ? 'anthropic' : 'openai-compatible', key, model, url: endpoint.href,
    tokenLimitField: field === 'max_tokens' || field === 'max_completion_tokens' ? field : (endpoint.hostname === 'api.openai.com' ? 'max_completion_tokens' : 'max_tokens'),
    timeout: bounded(process.env.AI_TIMEOUT_MS, 120_000, 1000, 300_000),
    maxTokens: bounded(process.env.AI_MAX_TOKENS, 4096, 128, 16_384) };
}

export async function createAiResponse(request: Request, system: string, messages: AiMessage[]): Promise<Response> {
  const config = getProviderConfig();
  const controller = new AbortController();
  const onAbort = () => controller.abort(request.signal.reason);
  request.signal.addEventListener('abort', onAbort, { once: true });
  if (request.signal.aborted) onAbort();
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, config.timeout);
  const cleanup = () => { clearTimeout(timeout); request.signal.removeEventListener('abort', onAbort); };
  const anthropic = config.provider === 'anthropic';
  let upstream: Response;
  try {
    upstream = await fetch(config.url, {
      method: 'POST', signal: controller.signal, redirect: 'error', cache: 'no-store',
      headers: anthropic
        ? { 'Content-Type': 'application/json', 'x-api-key': config.key, 'anthropic-version': '2023-06-01' }
        : { 'Content-Type': 'application/json', Authorization: `Bearer ${config.key}` },
      body: JSON.stringify(anthropic
        ? { model: config.model, max_tokens: config.maxTokens, system, messages, stream: true }
        : { model: config.model, [config.tokenLimitField]: config.maxTokens, messages: [{ role: 'system', content: system }, ...messages], stream: true }),
    });
    if (!upstream.ok || !upstream.body) {
      await upstream.body?.cancel();
      if (upstream.status === 401 || upstream.status === 403) throw new AiError(502, 'AI_AUTH_FAILED', 'AI 服务认证失败，请检查服务端密钥与模型权限。');
      if (upstream.status === 429) throw new AiError(429, 'AI_RATE_LIMITED', 'AI 服务当前繁忙或额度不足，请稍后重试。');
      throw new AiError(502, 'AI_UPSTREAM_FAILED', 'AI 服务暂时无法完成请求，请检查模型配置或稍后重试。');
    }
  } catch (error) {
    cleanup();
    if (error instanceof AiError) throw error;
    if (timedOut) throw new AiError(504, 'AI_TIMEOUT', 'AI 服务响应超时，请稍后重试。');
    if (request.signal.aborted) throw new AiError(499, 'AI_CANCELLED', '已停止生成。');
    throw new AiError(502, 'AI_CONNECTION_FAILED', '暂时无法连接 AI 服务，请检查服务端地址或稍后重试。');
  }

  const encoder = new TextEncoder();
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    async start(stream) {
      const send = (value: unknown) => { if (!cancelled) stream.enqueue(encoder.encode(`data: ${typeof value === 'string' ? value : JSON.stringify(value)}\n\n`)); };
      let receivedText = false;
      let completed = false;
      try {
        for await (const raw of readSseData(upstream.body!)) {
          if (raw === '[DONE]') { completed = true; break; }
          const event = JSON.parse(raw) as { type?: string; error?: unknown; delta?: { type?: string; text?: string; stop_reason?: string }; choices?: { delta?: { content?: string; refusal?: string }; finish_reason?: string }[] };
          if (event.error || event.type === 'error') throw new Error('upstream stream error');
          if (anthropic && event.type === 'message_stop') { completed = true; break; }
          const finish = anthropic ? event.delta?.stop_reason : event.choices?.[0]?.finish_reason;
          if (finish === 'length' || finish === 'max_tokens') throw new AiError(502, 'AI_TRUNCATED', '本次回答达到长度上限，可缩小主题后重试。');
          const text = anthropic
            ? event.type === 'content_block_delta' && event.delta?.type === 'text_delta' ? event.delta.text : undefined
            : event.choices?.[0]?.delta?.content || event.choices?.[0]?.delta?.refusal;
          if (typeof text === 'string' && text) { receivedText = true; send({ delta: { text } }); }
        }
        if (!completed || !receivedText) throw new Error('incomplete or empty stream');
        send('[DONE]');
      } catch (error) {
        if (!cancelled && !request.signal.aborted) {
          const safe = error instanceof AiError ? error : new AiError(502, timedOut ? 'AI_TIMEOUT' : 'AI_STREAM_FAILED', timedOut ? '生成超时，已保留收到的内容，请重试。' : '生成连接中断，已保留收到的内容，请重试。');
          send({ error: { code: safe.code, message: safe.message } });
        }
      } finally {
        controller.abort();
        cleanup();
        if (!cancelled) stream.close();
      }
    },
    cancel() { cancelled = true; controller.abort(); cleanup(); },
  });
  return new Response(body, { headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store, no-transform', 'X-Accel-Buffering': 'no' } });
}
