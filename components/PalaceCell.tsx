'use client';

import { motion } from 'framer-motion';
import type { Palace, Star } from '@/lib/ziwei/types';
import { STEMS, BRANCHES } from '@/lib/ziwei/constants';
import clsx from 'clsx';

interface PalaceCellProps {
  palace: Palace;
  onClick?: () => void;
  onStarClick?: (star: Star) => void;
  isSelected?: boolean;
  isSanFang?: boolean;
  delay?: number;
  overlayStarSiHua?: Record<string, string>;
  overlayLabel?: string;
  flowName?: string;
  isFlowMing?: boolean;
  onSiHuaClick?: (starName: string, siHua: string) => void;
}

function SiHuaBadge({ siHua, overlay, label, starName, onClick }: { siHua: string; overlay?: boolean; label?: string; starName: string; onClick?: () => void }) {
  const className = clsx('zw-sihua-badge', overlay && 'is-overlay');
  const content = <>{overlay && label && <span>{label}</span>}{siHua}</>;
  return onClick
    ? <button type="button" className={className} data-sihua={siHua} aria-label={`${label === '限' ? '大限' : label ? '流' + label : '生年'}${starName}化${siHua}详情`} onClick={onClick}>{content}</button>
    : <span className={className} data-sihua={siHua}>{content}</span>;
}

export default function PalaceCell({ palace, onClick, onStarClick, isSelected, isSanFang, delay = 0, overlayStarSiHua, overlayLabel, flowName, isFlowMing, onSiHuaClick }: PalaceCellProps) {
  const { branch, stem, name, stars, daXianAge, isCurrentDaXian, isMingGong, isShenGong } = palace;
  const ganzhi = `${STEMS[stem]}${BRANCHES[branch]}`;
  const majorStars = stars.filter(star => star.type === 'major');
  const luckyStars = stars.filter(star => star.type === 'lucky');
  const shaStars = stars.filter(star => star.type === 'sha');

  function badges(star: Star) {
    const overlay = overlayStarSiHua?.[star.name];
    return <>{star.siHua && <SiHuaBadge starName={star.name} siHua={star.siHua} />}{overlay && <SiHuaBadge starName={star.name} siHua={overlay} overlay label={overlayLabel} onClick={onSiHuaClick ? () => onSiHuaClick(star.name, overlay) : undefined} />}</>;
  }

  return <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .3, delay, ease: 'easeOut' }}
    className={clsx('zw-palace-cell', isSelected && 'is-selected', isSanFang && 'is-sanfang', isMingGong && 'is-ming', isCurrentDaXian && 'is-current-daxian', isFlowMing && 'is-flow-ming')} role="group" aria-label={`${name}，${ganzhi}${flowName ? '，' + flowName : ''}`}>
    {onClick && <button type="button" className="zw-palace-select" onClick={onClick} aria-label={`选择${name}，${ganzhi}，查看宫位与三方四正`} aria-pressed={Boolean(isSelected)} />}
    <div className="zw-palace-content">
      {daXianAge && <span className={clsx('zw-palace-age', isCurrentDaXian && 'is-current')}>{daXianAge[0]}–{daXianAge[1]}</span>}
      <div className="zw-palace-heading"><span className={clsx('zw-palace-name', (isMingGong || isShenGong) && 'is-emphasized')}>{name}</span>{isMingGong && <span className="zw-palace-mark">命</span>}{isShenGong && <span className="zw-palace-mark">身</span>}</div>
      <div className="zw-palace-ganzhi">{ganzhi}</div>
      <div className="zw-major-stars">{majorStars.length === 0 && <span className="zw-empty-palace">空宫</span>}{majorStars.map(star => <div className="zw-star-row" key={star.name}>{onStarClick ? <button type="button" className="zw-star-major" data-brightness={star.brightness || 'normal'} aria-label={`查看${name}${star.name}星详情`} onClick={() => onStarClick(star)}>{star.name}</button> : <span className="zw-star-major" data-brightness={star.brightness || 'normal'}>{star.name}</span>}{badges(star)}</div>)}</div>
      {luckyStars.length > 0 && <div className="zw-secondary-stars">{luckyStars.map(star => <span className="zw-star-lucky zw-star-row" key={star.name}>{star.name}{badges(star)}</span>)}</div>}
      {shaStars.length > 0 && <div className="zw-secondary-stars">{shaStars.map(star => <span className="zw-star-sha zw-star-row" key={star.name}>{star.name}{badges(star)}</span>)}</div>}
      {flowName && <div className={clsx('zw-palace-flow-name', isFlowMing && 'is-flow-ming')}>{flowName}</div>}
    </div>
  </motion.div>;
}
