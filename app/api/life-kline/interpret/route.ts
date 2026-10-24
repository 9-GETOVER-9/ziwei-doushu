import { AiError, errorResponse, readInput, rebuildChart } from '@/lib/ai/contracts';
import { lifeKlinePrompt } from '@/lib/ai/life-kline-prompt';
import { createAiResponse } from '@/lib/ai/provider';
import { getLifeKlineYear, LIFE_THEMES, type LifeKlineYear } from '@/lib/ziwei/life-kline';

export const runtime = 'nodejs';
export const maxDuration = 180;

export async function POST(request: Request) {
  try {
    const input = await readInput(request);
    if (Object.keys(input).some(key => !['chart', 'year', 'theme'].includes(key))) {
      throw new AiError(400, 'INVALID_LIFE_KLINE', '年度解读只接受命盘、农历年份和主题，请从人生 K 线页面重试。');
    }
    if (typeof input.year !== 'number' || !Number.isInteger(input.year) || input.year < 1899 || input.year > 2100) {
      throw new AiError(400, 'INVALID_LIFE_KLINE', '请选择有效的农历年份。');
    }
    const theme = LIFE_THEMES.find(item => item.key === input.theme);
    if (!theme) throw new AiError(400, 'INVALID_LIFE_KLINE', '请选择综合、事业、财帛或关系主题。');
    const chart = rebuildChart(input.chart);
    let year: LifeKlineYear;
    try { year = getLifeKlineYear(chart, theme.key, input.year); }
    catch (error) {
      if (error instanceof RangeError) {
        throw new AiError(400, 'INVALID_LIFE_KLINE', '所选年份不在这张命盘的人生 K 线范围内，请重新选择年份。');
      }
      throw error;
    }
    return await createAiResponse(request, lifeKlinePrompt(theme.key, year), [{
      role: 'user', content: `请依据已提供的四化月段证据，解读农历 ${year.year} 年的${theme.label}趋势。`,
    }]);
  } catch (error) { return errorResponse(error); }
}
