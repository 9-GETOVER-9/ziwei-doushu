import { errorResponse, readInput, readMessages, rebuildChart } from '@/lib/ai/contracts';
import { interpretationPrompt } from '@/lib/ai/prompts';
import { createAiResponse } from '@/lib/ai/provider';

export const runtime = 'nodejs';
export const maxDuration = 180;

export async function POST(request: Request) {
  try {
    const input = await readInput(request);
    const chart = rebuildChart(input.chart);
    const messages = readMessages(input.messages);
    return await createAiResponse(request, interpretationPrompt(chart), messages);
  } catch (error) { return errorResponse(error); }
}
