import { AiError, errorResponse, readInput, readMessages, rebuildChart } from '@/lib/ai/contracts';
import { compatibilityPrompt } from '@/lib/ai/prompts';
import { createAiResponse } from '@/lib/ai/provider';

export const runtime = 'nodejs';
export const maxDuration = 180;

export async function POST(request: Request) {
  try {
    const input = await readInput(request);
    const a = rebuildChart(input.chartA);
    const b = rebuildChart(input.chartB);
    if (input.question !== undefined && (typeof input.question !== 'string' || input.question.length > 4000)) {
      throw new AiError(400, 'INVALID_QUESTION', '请将本次问题控制在 4000 字以内。');
    }
    const allowed = ['未指定', '恋人', '夫妻', '朋友', '事业伙伴', '上下级', '亲子', '恋爱', '婚姻', '合作'];
    const relationship = typeof input.relationship === 'string' && allowed.includes(input.relationship) ? input.relationship : '未指定';
    const messages = input.messages === undefined
      ? [{ role: 'user' as const, content: typeof input.question === 'string' && input.question.trim() ? input.question.trim() : '请分析双方关系的互补、摩擦和相处方向，并列出命盘依据。' }]
      : readMessages(input.messages);
    return await createAiResponse(request, compatibilityPrompt(a, b, relationship), messages);
  } catch (error) { return errorResponse(error); }
}
