import { generateChart } from '../ziwei/algorithm';
import { isValidGregorianDate } from '../ziwei/true-solar-time';
import type { BirthInfo, ZiweiChart } from '../ziwei/types';

export interface AiMessage { role: 'user' | 'assistant'; content: string }
export class AiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AiError(400, 'INVALID_INPUT', '请求内容不完整，请重新打开命盘后重试。');
  }
  return value as Record<string, unknown>;
}

export async function readInput(request: Request) {
  if (!request.headers.get('content-type')?.includes('application/json')) {
    throw new AiError(415, 'INVALID_CONTENT_TYPE', '请使用 JSON 发送请求。');
  }
  const origin = request.headers.get('origin');
  // Next may normalize request.url to localhost while the browser uses 127.0.0.1.
  // The actual Host header defines the public request authority. Do not trust
  // X-Forwarded-Host from arbitrary clients as an origin allowlist.
  const requestUrl = new URL(request.url);
  const actualHost = request.headers.get('host');
  let expectedOrigin = requestUrl.origin;
  if (actualHost) {
    try {
      const publicUrl = new URL(`${requestUrl.protocol}//${actualHost}`);
      if (publicUrl.username || publicUrl.password || publicUrl.pathname !== '/' || publicUrl.search || publicUrl.hash) throw new Error();
      expectedOrigin = publicUrl.origin;
    } catch { throw new AiError(403, 'INVALID_ORIGIN', '请求来源不正确，请从本站页面发起解读。'); }
  }
  if (origin && origin !== expectedOrigin) {
    throw new AiError(403, 'INVALID_ORIGIN', '请从本站页面发起解读。');
  }
  const limit = 262_144;
  if (Number(request.headers.get('content-length')) > limit) {
    throw new AiError(413, 'INPUT_TOO_LARGE', '请求内容过长，请开始新的解读。');
  }
  if (!request.body) throw new AiError(400, 'INVALID_INPUT', '没有收到命盘数据。');
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new AiError(413, 'INPUT_TOO_LARGE', '请求内容过长，请开始新的解读。');
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
  try { return object(JSON.parse(text)); }
  catch (error) {
    if (error instanceof AiError) throw error;
    throw new AiError(400, 'INVALID_JSON', '请求格式有误，请刷新后重试。');
  }
}

function integer(value: unknown, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw new AiError(400, 'INVALID_BIRTH', '出生日期或时辰不正确，请检查排盘信息。');
  }
  return value;
}

/** Only trusted engine output enters model context; ignore client-provided stars. */
export function rebuildChart(value: unknown): ZiweiChart {
  const birth = object(object(value).birthInfo);
  if (birth.unknownTime !== undefined && birth.unknownTime !== false) {
    throw new AiError(400, 'UNKNOWN_BIRTH_TIME', '出生时辰尚未确定，请先选择明确时辰再使用 AI 解读。');
  }
  if (birth.gender !== 'male' && birth.gender !== 'female') {
    throw new AiError(400, 'INVALID_BIRTH', '请选择有效的排盘性别。');
  }
  const info: BirthInfo = {
    year: integer(birth.year, 1899, 2100), month: integer(birth.month, 1, 12),
    day: integer(birth.day, 1, 31), hour: integer(birth.hour, 0, 11), gender: birth.gender,
  };
  if (birth.standardTime !== undefined) {
    const standard = object(birth.standardTime);
    const year = integer(standard.year, info.year - 1, info.year + 1);
    const month = integer(standard.month, 1, 12);
    const day = integer(standard.day, 1, 31);
    const clockHour = integer(standard.clockHour, 0, 23);
    const clockMinute = integer(standard.clockMinute, 0, 59);
    integer(standard.utcOffsetMinutes, 480, 480);
    const dstCorrectionMinutes = integer(standard.dstCorrectionMinutes, 0, 60);
    // The supported longitude correction and late-zi rollover can change the
    // standard clock date by at most one civil day, including a year boundary.
    const dateDifference = Math.abs(Date.UTC(year, month - 1, day) - Date.UTC(info.year, info.month - 1, info.day));
    if (!isValidGregorianDate(year, month, day) || dateDifference > 86_400_000 || (dstCorrectionMinutes !== 0 && dstCorrectionMinutes !== 60)) {
      throw new AiError(400, 'INVALID_BIRTH', '出生标准时刻与排盘日期不一致，请重新排盘后重试。');
    }
    info.standardTime = { year, month, day, clockHour, clockMinute, utcOffsetMinutes: 480, dstCorrectionMinutes };
  }
  // Inputs already contain the form's solar-time / late-zi corrections.
  // Names and locations are unnecessary and are not sent upstream.
  try { return generateChart(info); }
  catch { throw new AiError(400, 'INVALID_BIRTH', '出生日期不存在，或无法排盘，请核对后重试。'); }
}

export function readMessages(value: unknown): AiMessage[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 24) {
    throw new AiError(400, 'INVALID_MESSAGES', '对话过长或内容为空，请开始新的解读。');
  }
  let total = 0;
  const messages = value.map(item => {
    const message = object(item);
    if ((message.role !== 'user' && message.role !== 'assistant') || typeof message.content !== 'string') {
      throw new AiError(400, 'INVALID_MESSAGES', '对话格式有误，请重新开始解读。');
    }
    const content = message.content.trim();
    if (!content || content.length > 16_000) throw new AiError(400, 'INVALID_MESSAGES', '单条消息过长或为空。');
    total += content.length;
    return { role: message.role, content } as AiMessage;
  });
  if (total > 48_000) throw new AiError(413, 'INPUT_TOO_LARGE', '对话内容过长，请开始新的解读。');
  if (messages[0].role !== 'user' || messages[messages.length - 1].role !== 'user') {
    throw new AiError(400, 'INVALID_MESSAGES', '请在对话最后附上本次问题。');
  }
  return messages;
}

export function errorResponse(error: unknown) {
  const known = error instanceof AiError ? error : new AiError(500, 'AI_ERROR', '解读服务暂时不可用，请稍后重试。');
  return Response.json({ error: { code: known.code, message: known.message } }, {
    status: known.status, headers: { 'Cache-Control': 'no-store' },
  });
}
