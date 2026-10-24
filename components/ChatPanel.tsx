'use client';
import type { ZiweiChart } from '@/lib/ziwei/types';
import InsightPanel from './InsightPanel';

/** Share the same streaming, cancellation and error handling as the report panel. */
export default function ChatPanel({ chart }: { chart: ZiweiChart }) {
  return <InsightPanel chart={chart} />;
}
