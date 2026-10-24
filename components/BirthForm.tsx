'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { BirthInfo } from '@/lib/ziwei/types';
import { PROVINCES } from '@/lib/ziwei/cities';
import { BRANCHES } from '@/lib/ziwei/constants';
import { isChinaDST } from '@/lib/ziwei/dst-cn';
import { leapMonthOfLunarYear } from '@/lib/ziwei/lunar-solar';
import { normalizeBirthInput, type BirthFormState } from '@/lib/input-normalize';
import './ChartWorkspace.css';

export type { BirthFormState } from '@/lib/input-normalize';

interface BirthFormProps {
  onSubmit: (info: BirthInfo) => void;
  loading?: boolean;
  initialData?: Partial<BirthFormState>;
  onFormSave?: (data: BirthFormState) => void;
  hideSubmit?: boolean;
}

export default function BirthForm({ onSubmit, loading, initialData, onFormSave, hideSubmit }: BirthFormProps) {
  const id = useId();
  const [form, setForm] = useState<BirthFormState>({
    name: '', year: '', month: '', day: '', clockHour: '8', clockMinute: '0',
    unknownTime: false, province: '', city: '', longitude: 120, gender: 'female',
    calendar: 'solar', isLeapMonth: false, useTrueSolarTime: true, dstCorrection: false,
    ...initialData,
  });
  const [error, setError] = useState('');
  const saveRef = useRef(onFormSave);
  saveRef.current = onFormSave;
  useEffect(() => { saveRef.current?.({ ...form }); }, [form]);
  const update = (patch: Partial<BirthFormState>) => { setError(''); setForm(previous => ({ ...previous, ...patch })); };
  const cities = PROVINCES.find(province => province.name === form.province)?.cities ?? [];
  const normalization = useMemo(() => {
    try { return normalizeBirthInput(form); } catch { return null; }
  }, [form]);
  const leapMonth = form.calendar === 'lunar' ? leapMonthOfLunarYear(Number(form.year)) : 0;
  const dstDate = normalization?.solarDate;
  const hasDST = dstDate ? isChinaDST(dstDate.year, dstDate.month, dstDate.day) : false;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const normalized = normalizeBirthInput(form);
      onFormSave?.({ ...form });
      onSubmit(normalized.birthInfo);
    } catch (cause) { setError(cause instanceof Error ? cause.message : '请核对出生信息'); }
  };

  return (
    <form className="birth-form" onSubmit={submit} noValidate>
      <div className="birth-form-row">
        <label className="birth-field" htmlFor={`${id}-name`}>
          <span className="studio-label">称呼 <span className="birth-optional">选填</span></span>
          <input id={`${id}-name`} placeholder="为这份命盘取个名字" autoComplete="off" maxLength={30}
            value={form.name} onChange={event => update({ name: event.target.value })} />
        </label>
        <fieldset className="birth-field birth-gender">
          <legend className="studio-label">性别</legend>
          <div className="birth-segment" role="group" aria-label="性别">
            {(['female', 'male'] as const).map(gender => (
              <button key={gender} type="button" aria-pressed={form.gender === gender}
                className={form.gender === gender ? 'is-active' : ''} onClick={() => update({ gender })}>
                {gender === 'female' ? '女命' : '男命'}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <fieldset className="birth-field">
        <legend className="studio-label">出生日期</legend>
        <div className="birth-calendar" role="group" aria-label="日期历法">
          {(['solar', 'lunar'] as const).map(calendar => (
            <button type="button" key={calendar} aria-pressed={form.calendar === calendar}
              className={form.calendar === calendar ? 'is-active' : ''}
              onClick={() => update({ calendar, isLeapMonth: false, dstCorrection: false })}>
              {calendar === 'solar' ? '公历' : '农历'}
            </button>
          ))}
        </div>
        <div className="birth-date-row">
          <label><span className="sr-only">出生年份</span>
            <input aria-label="出生年份" type="number" inputMode="numeric" min={1900} max={2050} placeholder="出生年份"
              value={form.year} onChange={event => update({ year: event.target.value, isLeapMonth: false, dstCorrection: false })} />
          </label>
          <label><span className="sr-only">出生月份</span>
            <select aria-label="出生月份" value={form.month} onChange={event => update({ month: event.target.value, isLeapMonth: false, dstCorrection: false })}>
              <option value="">月份</option>
              {Array.from({ length: 12 }, (_, index) => <option key={index} value={index + 1}>{index + 1} 月</option>)}
            </select>
          </label>
          <label><span className="sr-only">出生日期</span>
            <select aria-label="出生日期" value={form.day} onChange={event => update({ day: event.target.value, dstCorrection: false })}>
              <option value="">日期</option>
              {Array.from({ length: form.calendar === 'lunar' ? 30 : 31 }, (_, index) => <option key={index} value={index + 1}>{index + 1} 日</option>)}
            </select>
          </label>
        </div>
        {form.calendar === 'lunar' && Number(form.month) === leapMonth && leapMonth > 0 && (
          <label className="birth-check"><input type="checkbox" checked={Boolean(form.isLeapMonth)} onChange={event => update({ isLeapMonth: event.target.checked })} /> 闰 {leapMonth} 月出生</label>
        )}
      </fieldset>

      <fieldset className="birth-field">
        <legend className="studio-label">出生时间</legend>
        <div className="birth-time-row">
          <label><span className="sr-only">出生小时</span>
            <select aria-label="出生小时" value={form.clockHour} disabled={form.unknownTime} onChange={event => update({ clockHour: event.target.value })}>
              {Array.from({ length: 24 }, (_, hour) => <option key={hour} value={hour}>{String(hour).padStart(2, '0')} 时</option>)}
            </select>
          </label>
          <span className="birth-time-divider">:</span>
          <label><span className="sr-only">出生分钟</span>
            <select aria-label="出生分钟" value={form.clockMinute} disabled={form.unknownTime} onChange={event => update({ clockMinute: event.target.value })}>
              {Array.from({ length: 60 }, (_, minute) => <option key={minute} value={minute}>{String(minute).padStart(2, '0')} 分</option>)}
            </select>
          </label>
          <label className="birth-check birth-unknown"><input type="checkbox" checked={form.unknownTime} onChange={event => update({ unknownTime: event.target.checked })} /> 时辰未知</label>
        </div>
        {form.unknownTime && <p className="birth-notice warning">将暂以子时展示参考盘；时辰会改变宫位和格局，补全后请重新排盘。</p>}
      </fieldset>

      <fieldset className="birth-field">
        <legend className="studio-label">出生地点 <span className="birth-optional">用于校正真太阳时</span></legend>
        <div className="birth-form-row">
          <label><span className="sr-only">出生省份</span>
            <select aria-label="出生省份" value={form.province} onChange={event => {
              const province = PROVINCES.find(item => item.name === event.target.value);
              const city = province?.cities[0];
              update({ province: province?.name ?? '', city: city?.name ?? '', longitude: city?.longitude ?? 120 });
            }}>
              <option value="">不选择 · 使用北京时间</option>
              {PROVINCES.map(province => <option key={province.name} value={province.name}>{province.name}</option>)}
            </select>
          </label>
          <label><span className="sr-only">出生城市</span>
            <select aria-label="出生城市" value={form.city} disabled={!form.province} onChange={event => {
              const city = cities.find(item => item.name === event.target.value);
              update({ city: city?.name ?? '', longitude: city?.longitude ?? 120 });
            }}>
              {!cities.length && <option value="">城市</option>}
              {cities.map(city => <option key={city.name} value={city.name}>{city.name}</option>)}
            </select>
          </label>
        </div>
        {form.province && !form.unknownTime && (
          <label className="birth-check"><input type="checkbox" checked={form.useTrueSolarTime !== false} onChange={event => update({ useTrueSolarTime: event.target.checked })} /> 使用真太阳时（经度修正 + 均时差）</label>
        )}
        {hasDST && !form.unknownTime && (
          <label className="birth-check"><input type="checkbox" checked={Boolean(form.dstCorrection)} onChange={event => update({ dstCorrection: event.target.checked })} /> 记录时间为夏令时读数，减去 1 小时</label>
        )}
      </fieldset>

      {normalization && !form.unknownTime && <div className="birth-preview">
        <span className="birth-preview-dot" /><span>排盘时辰：{BRANCHES[normalization.birthInfo.hour]}时</span>
        <small>{normalization.notes.join('；') || '北京时间 · 晚子时按次日排盘'}</small>
      </div>}
      {error && <p className="birth-notice warning" role="alert">{error}</p>}
      {!hideSubmit && <button type="submit" className="studio-button birth-submit" disabled={loading}>
        {loading ? '正在生成命盘…' : '生成我的命盘'} <span aria-hidden="true">↗</span>
      </button>}
      <p className="birth-privacy">排盘在当前设备完成，保存档案后也仅存于本浏览器。</p>
    </form>
  );
}
