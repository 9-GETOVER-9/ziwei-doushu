'use client';
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ZiweiChart, Palace, Star } from '@/lib/ziwei/types';
import { BRANCHES, STEMS } from '@/lib/ziwei/constants';
import PalaceCell from './PalaceCell';
import TimeNav, { type TimeView, TIME_LEVEL_KEYS, TIME_VIEW_MARKS, TIME_VIEW_NAMES } from './TimeNav';
import { flowSelectionFromSolar, getTimeFlow, type FlowSelection } from '@/lib/ziwei/time-flow';

interface ChartBoardProps {
  chart: ZiweiChart;
  onStarSelect?: (star: Star, palace: Palace) => void;
  onPalaceSelect?: (palace: Palace) => void;
  onSiHuaClick?: (starName: string, siHua: string, view: TimeView, context: string) => void;
}

const BRANCH_GRID_POS: Record<number, [number, number]> = {
  5: [1, 1], 6: [1, 2], 7: [1, 3], 8: [1, 4],
  4: [2, 1], 9: [2, 4],
  3: [3, 1], 10: [3, 4],
  2: [4, 1], 1: [4, 2], 0: [4, 3], 11: [4, 4],
};

// 每个地支宫位在网格中的中心坐标（百分比）
const BRANCH_SVG_POS: Record<number, [number, number]> = {
  5: [12.5, 12.5], 6: [37.5, 12.5], 7: [62.5, 12.5], 8: [87.5, 12.5],
  4: [12.5, 37.5],                                      9: [87.5, 37.5],
  3: [12.5, 62.5],                                     10: [87.5, 62.5],
  2: [12.5, 87.5], 1: [37.5, 87.5], 0: [62.5, 87.5], 11: [87.5, 87.5],
};

// 绕盘面顺时针排列（用于三方四正四边形排序）
const CLOCKWISE_INDEX: Record<number, number> = {
  5: 0, 6: 1, 7: 2, 8: 3,
  9: 4, 10: 5,
  11: 6, 0: 7, 1: 8, 2: 9,
  3: 10, 4: 11,
};

function sortClockwise(branches: number[]): number[] {
  return [...branches].sort((a, b) => CLOCKWISE_INDEX[a] - CLOCKWISE_INDEX[b]);
}

/** 三方四正：本宫 + 对宫 + 两个三合宫 */
function getSanFangSiZheng(branch: number): [number, number, number, number] {
  return [
    branch,
    (branch + 6) % 12,   // 对宫
    (branch + 4) % 12,   // 三合1
    (branch + 8) % 12,   // 三合2
  ];
}

const ANIMATION_ORDER = [5, 6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4];

function todaySelection(): FlowSelection {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
  const part = (name: string) => Number(parts.find(item => item.type === name)?.value);
  const date = new Date(Date.UTC(part('year'), part('month') - 1, part('day') + (part('hour') === 23 ? 1 : 0)));
  return flowSelectionFromSolar({ year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() }, Math.floor((part('hour') + 1) / 2) % 12);
}

export default function ChartBoard({ chart, onStarSelect, onPalaceSelect, onSiHuaClick }: ChartBoardProps) {
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);
  const [timeView, setTimeView] = useState<TimeView>('mingpan');
  const [timeSelection, setTimeSelection] = useState<FlowSelection>(todaySelection);
  const flow = useMemo(() => chart.birthInfo.unknownTime ? null : getTimeFlow(chart, timeSelection), [chart, timeSelection]);

  const palaceMap: Record<number, Palace> = {};
  chart.palaces.forEach(p => { palaceMap[p.branch] = p; });

  const activeLevel = flow && timeView !== 'mingpan' ? flow.levels[TIME_LEVEL_KEYS[timeView]] : null;
  const currentDx = flow && flow.decadalIndex >= 0 ? chart.daXians[flow.decadalIndex] : null;
  const overlayData = activeLevel?.siHua ?? {};
  const overlayLabel = timeView === 'mingpan' ? undefined : TIME_VIEW_MARKS[timeView];
  const flowContext = flow ? `${flow.lunarDate} ${BRANCHES[flow.selection.hour]}时（公历${flow.solarDate.year}-${flow.solarDate.month}-${flow.solarDate.day}）` : '';

  const handlePalaceClick = (branch: number) => {
    const isDeselecting = selectedBranch === branch;
    setSelectedBranch(prev => prev === branch ? null : branch);
    if (!isDeselecting) {
      const palace = palaceMap[branch];
      if (palace) onPalaceSelect?.(palace);
    }
  };

  // 三方四正
  const sanFangBranches = selectedBranch !== null ? getSanFangSiZheng(selectedBranch) : null;
  const sanFangSet = sanFangBranches ? new Set(sanFangBranches) : null;

  return (
    <div className="zw-chart-board w-full select-none">
      {/* 时间导航轴 */}
      {flow ? <TimeNav
        chart={chart}
        flow={flow}
        view={timeView}
        onViewChange={setTimeView}
        onChange={(selection, view) => { setTimeSelection(selection); setTimeView(view); }}
        onToday={() => { setTimeSelection(todaySelection()); setTimeView('liunian'); }}
      /> : <p className="birth-notice warning mb-4">补全出生时辰后，即可查看大限、流年、流月、流日与流时。</p>}

      {/* 命盘标题 */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-3"
      >
        <div className="text-[10px] tracking-[0.5em] uppercase mb-1" style={{ color: 'var(--t-faint)' }}>
          Zi Wei Dou Shu
        </div>
        <h2 className="text-sm tracking-[0.25em] font-medium" style={{ color: 'var(--t-gold)' }}>
          {chart.birthInfo.name ? `${chart.birthInfo.name} · ` : ''}紫微斗数命盘
        </h2>
      </motion.div>

      {/* 4x4 命盘网格（含 SVG 叠加层） */}
      <div
        className="grid rounded-xl overflow-hidden relative"
        style={{
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridTemplateRows: 'repeat(4, auto)',
          gap: '1px',
          background: 'var(--t-border)',
          border: '1px solid var(--t-border)',
        }}
      >
        {ANIMATION_ORDER.map((branch, i) => {
          const [row, col] = BRANCH_GRID_POS[branch];
          const palace = palaceMap[branch];
          if (!palace) return null;
          return (
            <div key={branch} style={{ gridRow: row, gridColumn: col, background: 'var(--t-bg)' }}>
              <PalaceCell
                palace={{ ...palace, isCurrentDaXian: currentDx?.palaceBranch === branch }}
                onClick={() => handlePalaceClick(branch)}
                onStarClick={(star) => onStarSelect?.(star, palace)}
                isSelected={selectedBranch === branch}
                isSanFang={!!(sanFangSet?.has(branch) && selectedBranch !== branch)}
                delay={i * 0.04}
                overlayStarSiHua={Object.keys(overlayData).length > 0 ? overlayData : undefined}
                overlayLabel={overlayLabel}
                flowName={activeLevel ? `${TIME_VIEW_NAMES[timeView]} · ${activeLevel.palaceNames[branch]}` : undefined}
                isFlowMing={activeLevel?.palaceBranch === branch}
                onSiHuaClick={(starName, siHua) => onSiHuaClick?.(starName, siHua, timeView, flowContext)}
              />
            </div>
          );
        })}

        {/* 中央信息区 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col items-center justify-center p-4 gap-3"
          style={{ gridRow: '2 / 4', gridColumn: '2 / 4', background: 'var(--t-bg)' }}
        >
          <div aria-hidden="true" className="text-5xl select-none leading-none" style={{ color: 'var(--ac)', opacity: 0.18 }}>
            ☯
          </div>

          <div className="text-center space-y-1">
            <div className="text-[9px] tracking-[0.3em] font-medium" style={{ color: 'var(--t-gold)' }}>紫微斗数</div>
            <div className="text-[10px] space-y-0.5" style={{ color: 'var(--t-faint)' }}>
              <div>命宫 <span className="zw-chart-accent">{BRANCHES[chart.mingGongBranch]}</span></div>
              <div>身宫 <span className="zw-chart-accent">{BRANCHES[chart.shenGongBranch]}</span></div>
              <div className="text-[9px] zw-chart-accent">{chart.wuxingJuName}</div>
            </div>
          </div>

          {flow && (() => {
            return (
              <div className="zw-current-period rounded-lg px-3 py-1.5 text-center">
                <div className="text-[9px] mb-0.5 tracking-wider">{activeLevel ? `${TIME_VIEW_NAMES[timeView]}命宫` : '所选大限'}</div>
                <div className="text-[12px] font-medium tabular-nums">{activeLevel ? `${BRANCHES[activeLevel.palaceBranch]}宫` : currentDx ? `${currentDx.startAge}–${currentDx.endAge}岁` : '童限 · 起限前'}</div>
                <div className="text-[10px]">{activeLevel ? `本命${palaceMap[activeLevel.palaceBranch]?.name}` : currentDx?.palaceName}</div>
                {activeLevel && <div className="text-[9px]">四化取{activeLevel.stemName}干</div>}
                <div className="text-[9px] mt-1">{flow.selection.year}年 · {flow.nominalAge}虚岁</div>
              </div>
            );
          })()}

          <div className="text-[9px] text-center leading-relaxed font-mono" style={{ color: 'var(--tx-2)' }}>
            {chart.lunarInfo.lunarYear}·{chart.lunarInfo.isLeapMonth ? '闰' : ''}
            {chart.lunarInfo.lunarMonth}·{chart.lunarInfo.lunarDay}
          </div>
        </motion.div>

        {/* ── 三方四正 SVG 连线（绝对定位在 grid 内部，受 overflow:hidden 裁切） ── */}
        <AnimatePresence>
          {sanFangBranches !== null && (
            <motion.div
              key={`sf-${selectedBranch}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="pointer-events-none"
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 20,
              }}
            >
              <svg
                aria-hidden="true"
                width="100%"
                height="100%"
                xmlns="http://www.w3.org/2000/svg"
                style={{ display: 'block' }}
              >
                {(() => {
                  // 三角形（三方）+ 一条直线（对宫）
                  const p0 = BRANCH_SVG_POS[sanFangBranches[0]]; // 本宫
                  const p1 = BRANCH_SVG_POS[sanFangBranches[1]]; // 对宫
                  const p2 = BRANCH_SVG_POS[sanFangBranches[2]]; // 三合1
                  const p3 = BRANCH_SVG_POS[sanFangBranches[3]]; // 三合2
                  const dash = "6,5";
                  const stroke = 'var(--ac)';
                  const sw = "1.5";
                  return (
                    <>
                      {/* 对宫直线：本宫 ↔ 对宫（穿过中心） */}
                      <line
                        x1={`${p0[0]}%`} y1={`${p0[1]}%`}
                        x2={`${p1[0]}%`} y2={`${p1[1]}%`}
                        stroke={stroke} strokeWidth={sw}
                        strokeDasharray={dash} strokeLinecap="round"
                      />
                      {/* 三合三角形：本宫 → 三合1 → 三合2 → 本宫 */}
                      <line
                        x1={`${p0[0]}%`} y1={`${p0[1]}%`}
                        x2={`${p2[0]}%`} y2={`${p2[1]}%`}
                        stroke={stroke} strokeWidth={sw}
                        strokeDasharray={dash} strokeLinecap="round"
                      />
                      <line
                        x1={`${p2[0]}%`} y1={`${p2[1]}%`}
                        x2={`${p3[0]}%`} y2={`${p3[1]}%`}
                        stroke={stroke} strokeWidth={sw}
                        strokeDasharray={dash} strokeLinecap="round"
                      />
                      <line
                        x1={`${p3[0]}%`} y1={`${p3[1]}%`}
                        x2={`${p0[0]}%`} y2={`${p0[1]}%`}
                        stroke={stroke} strokeWidth={sw}
                        strokeDasharray={dash} strokeLinecap="round"
                      />
                      {/* 四个宫位中心标记点 */}
                      {[p0, p1, p2, p3].map((p, i) => (
                        <circle
                          key={i}
                          cx={`${p[0]}%`} cy={`${p[1]}%`}
                          r="3"
                          fill="var(--ac)"
                          opacity={i === 0 ? .9 : .55}
                        />
                      ))}
                    </>
                  );
                })()}
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 图例 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-3 flex items-center justify-center gap-2 text-[9px] flex-wrap"
      >
        {['禄', '权', '科', '忌'].map(sihua => <span key={sihua} className="zw-sihua-badge" data-sihua={sihua}>化{sihua}</span>)}
        <span className="px-1.5 py-0.5 rounded-full" style={{ color: 'var(--t-faint)', border: '1px solid var(--t-border)' }}>
          选择宫位看三方四正
        </span>
      </motion.div>
    </div>
  );
}
