'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { BirthInfo } from '@/lib/ziwei/types';
import type { BirthFormState } from '@/lib/input-normalize';
import { BRANCHES } from '@/lib/ziwei/constants';
import { formToSearchParams } from '@/lib/ziwei/share';
import { calculateTwinTimeWindows, twinWindowForm, type ClockMinute, type TwinCityWindows } from '@/lib/twin-time-windows';
import './TwinTimeWindows.css';

interface TwinTimeWindowsProps { birthInfo: BirthInfo; form: BirthFormState }
interface Calculation { key: string; rows: TwinCityWindows[]; error: string; loading: boolean }

const dayLabel = (time: Pick<ClockMinute, 'year' | 'month' | 'day'>) => `${time.year}.${String(time.month).padStart(2, '0')}.${String(time.day).padStart(2, '0')}`;
const clockLabel = (time: ClockMinute) => `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;

export default function TwinTimeWindows({ birthInfo, form }: TwinTimeWindowsProps) {
  const key = JSON.stringify([birthInfo, form]);
  const [calculation, setCalculation] = useState<Calculation>({ key: '', rows: [], error: '', loading: true });
  useEffect(() => {
    let cancelled = false;
    setCalculation({ key, rows: [], error: '', loading: !form.unknownTime });
    if (form.unknownTime) return;
    // Paint the selected chart first. The scan is local and does not contact a service.
    const scheduled = setTimeout(() => {
      try {
        const rows = calculateTwinTimeWindows(birthInfo, form);
        if (!cancelled) setCalculation({ key, rows, error: '', loading: false });
      } catch (cause) {
        if (!cancelled) setCalculation({ key, rows: [], error: cause instanceof Error ? cause.message : '暂时无法换算，请核对出生信息。', loading: false });
      }
    }, 0);
    return () => { cancelled = true; clearTimeout(scheduled); };
  }, [key, birthInfo, form]);
  const current = calculation.key === key ? calculation : { rows: [], error: '', loading: true };

  return (
    <section className="twintime-section" aria-labelledby="twintime-heading">
      <header className="twintime-heading">
        <div><span className="twintime-eyebrow">SAME CHART · DIFFERENT PLACES</span><h2 id="twintime-heading">同一张命盘，不同的钟表时间</h2></div>
        <span className="twintime-local">本地换算</span>
      </header>
      <p className="twintime-intro">当出生地改变，钟表上的同一刻未必属于同一个真太阳时辰。下面这些时段，经校正后会得到与你相同的排盘日、时辰与性别。</p>
      {form.unknownTime ? <p className="twintime-notice">出生时辰未知，无法确定同盘出生窗口。请补全时辰后重新排盘。</p> : <>
        <div className="twintime-fingerprint"><span>共同排盘条件</span><strong>{dayLabel(birthInfo)} · {BRANCHES[birthInfo.hour]}时 · {birthInfo.gender === 'female' ? '女命' : '男命'}</strong></div>
        {(form.useTrueSolarTime === false || !form.province) && <p className="twintime-note">当前命盘使用北京时间起盘。以下各地窗口仍按真太阳时核对同一组排盘条件。</p>}
        <div aria-busy={current.loading}>
          {current.loading && <p role="status" className="twintime-notice">正在逐分钟核对各地出生时段…</p>}
          {current.error && <p role="alert" className="twintime-notice">{current.error}</p>}
          {!current.loading && !current.error && (current.rows.length ? <div className="twintime-table-wrap"><table className="twintime-table">
            <thead><tr><th scope="col">出生城市</th><th scope="col">采用经度</th><th scope="col">钟表出生窗口</th><th scope="col"><span className="sr-only">验证命盘</span></th></tr></thead>
            <tbody>{current.rows.flatMap(row => row.windows.map((window, index) => {
              const sameDate = dayLabel(window.start) === dayLabel(window.end);
              const verifyParams = formToSearchParams(twinWindowForm(form, row.city, window.start));
              return <tr key={`${row.city.province}-${row.city.name}-${index}`}>
                <th scope="row">{row.city.name}</th><td>{row.city.longitude}°E</td>
                <td><div className="twintime-range">{sameDate ? <><span>{dayLabel(window.start)}</span><strong>{clockLabel(window.start)} — {clockLabel(window.end)}</strong></> : <><span>{dayLabel(window.start)} <strong>{clockLabel(window.start)}</strong></span><span>至 {dayLabel(window.end)} <strong>{clockLabel(window.end)}</strong></span></>}</div></td>
                <td><Link className="twintime-link" href={`/chart?${verifyParams.toString()}`} aria-label={`用${row.city.name}窗口起始分钟核对完整命盘`}>核对命盘 ↗</Link></td>
              </tr>;
            }))}</tbody>
          </table></div> : <p className="twintime-notice">在当前支持的日期范围内，没有找到已核验的各地窗口。</p>)}
        </div>
        <details className="twintime-method">
          <summary>时间口径与核验方法</summary>
          <p>按北京时间填写的当地钟表读数计算，逐分钟扫描排盘日及前后一天；每一分钟均通过排盘页相同的真太阳时、均时差和晚子时归日逻辑。起止分钟均包含在窗口中，不推断秒级边界。</p>
          <p>{form.dstCorrection ? '已沿用你选择的夏令时扣除：候选出生日期落在项目夏令时表内时减去 1 小时，其余日期不扣除。' : '当前沿用你的标准时设置，不额外扣除夏令时。若原始记录采用夏令时读数，请在出生表单勾选校正后更新。'}这里没有使用新疆地方时。</p>
          <p>经度来自项目城市库，代表所选城市条目；城市不同区县会有差异。「核对命盘」使用该窗口起始分钟重新排盘。</p>
        </details>
      </>}
      <p className="twintime-source">本地未接入原站所称的 67.5 万档案库。这里展示的是经核验的时间换算窗口，不含真人档案或匹配人数。</p>
    </section>
  );
}
