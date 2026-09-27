'use client';

import React from 'react';
import Image from 'next/image';
import { TourGroup, MonitoredSlot, SlotStatusResult } from '@/lib/types';
import {
  ExternalLink,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  ShieldCheck,
  Calendar,
  Layers,
  Check,
  Moon,
  Cloud,
} from 'lucide-react';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';
const TELEGRAM_TEST_URL = 'https://github.com/Shang0320/kkholiday/actions/workflows/telegram-test.yml';

interface TargetSpotlightProps {
  slots: MonitoredSlot[];
  slotResults: SlotStatusResult[];
  onUpdateSlot: (slotId: string, updated: Partial<MonitoredSlot>) => void;
  isMonitoring: boolean;
  countdown: number;
  lastCheckedTime: string | null;
  onRefresh: () => void;
  onSimulateSlotAvailable: (slotId: string) => void;
  isLoading: boolean;
  allGroups: TourGroup[];
}

export function TargetSpotlight({
  slots,
  slotResults,
  onUpdateSlot,
  isMonitoring,
  countdown,
  lastCheckedTime,
  onRefresh,
  onSimulateSlotAvailable,
  isLoading,
  allGroups,
}: TargetSpotlightProps) {
  const anyConditionMet = slotResults.some((r) => r.isConditionMet);

  return (
    <div id="target-spotlight" className="relative rounded-2xl overflow-hidden border border-stone-200 bg-white shadow-md space-y-0">
      {/* Top Banner with Taipingshan Visual */}
      <div className="relative h-48 sm:h-56 md:h-64 w-full bg-stone-900 overflow-hidden">
        <Image
          src={`${BASE_PATH}/images/taipingshan_hero.jpg`}
          alt="太平山山毛櫸秋季金黃步道"
          fill
          priority
          sizes="(max-width: 1200px) 100vw, 1200px"
          className="object-cover object-center opacity-85"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-900/60 to-black/30" />

        <div className="absolute inset-0 p-4 sm:p-8 flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 text-2xs sm:text-xs font-medium text-stone-200 bg-black/40 backdrop-blur-md px-2.5 sm:px-3 py-1 rounded-md border border-white/10">
              <span className="font-semibold text-sky-300">太平山山毛櫸一日遊 (ILN34)</span>
              <span aria-hidden="true" className="text-stone-400">·</span>
              <span className="text-amber-300 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" /> 雙梯次同步監控
              </span>
              <span aria-hidden="true" className="hidden sm:inline text-stone-400">·</span>
              <span className="hidden sm:flex text-indigo-300 items-center gap-1">
                <Moon className="w-3.5 h-3.5" /> 23~08 夜間免打擾
              </span>
            </div>

            <div className="flex items-center gap-2 bg-stone-900/80 backdrop-blur-md px-3 py-1 rounded-md border border-stone-700 text-xs text-stone-300">
              <Cloud className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-sky-300 font-semibold">雲端 24h 運作中</span>
              <span className="text-stone-500">|</span>
              <span className={`w-2 h-2 rounded-full ${isMonitoring ? 'bg-emerald-400 animate-ping' : 'bg-stone-500'}`} />
              <span>{isMonitoring ? `輪詢中 · ${countdown}s` : '已暫停'}</span>
            </div>
          </div>

          <div className="space-y-1">
            <h1 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-sm">
              太平山 山毛櫸一日遊 · 雙梯次即時監控
            </h1>
            <p className="text-stone-300 text-xs sm:text-sm">
              可同時鎖定 2 個不同出發日期梯次；GitHub 每 5 分鐘更新名額，符合條件即由 Telegram 通知。
            </p>
          </div>
        </div>
      </div>

      {/* Slots Container: 2 Monitoring Cards side-by-side */}
      <div className="p-4 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-sky-600" />
            <h2 className="text-lg font-bold text-stone-900">雙梯次監控狀態與名額</h2>
          </div>
          <div className="flex items-center gap-3 text-xs text-stone-500">
            <span>最後同步時間：<strong className="font-mono text-stone-800">{lastCheckedTime ? lastCheckedTime.split(' ')[1] || lastCheckedTime : '同步中...'}</strong></span>
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-md transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin text-sky-600' : ''}`} />
              <span>重整</span>
            </button>
          </div>
        </div>

        {/* 2-Slot Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {slots.map((slot, index) => {
            const result = slotResults.find((r) => r.slotId === slot.id);
            const targetGroup = result?.targetGroup;
            const availableSeats = result?.availableSeats ?? (targetGroup?.availableSeats ?? 0);
            const totalSeats = targetGroup?.totalSeats ?? 39;
            const isMet = result?.isConditionMet ?? false;
            const price = targetGroup?.price ?? '1,899';
            const orderUrl = result?.orderUrl || `https://www.kkholiday.com.tw/EW/GO/GroupOrder.asp?prodCd=${slot.targetCode}`;

            return (
              <div
                key={slot.id}
                className={`min-w-0 rounded-xl border p-4 sm:p-5 transition-all flex flex-col justify-between ${
                  isMet
                    ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20 shadow-md'
                    : 'border-stone-200 bg-stone-50/60 hover:border-stone-300'
                }`}
              >
                <div className="space-y-4">
                  {/* Slot Header */}
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-stone-200/80 pb-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={`flex items-center justify-center w-6 h-6 rounded-md text-white font-bold text-xs ${index === 0 ? 'bg-sky-600' : 'bg-purple-600'}`}>
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-stone-900 block">
                          {slot.label}
                        </span>
                        <span className="block truncate text-2xs text-stone-500 font-mono">
                          團號 {slot.targetCode}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isMet ? (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse ${
                          slot.comparisonOperator === '<='
                            ? 'text-rose-800 bg-rose-100 ring-1 ring-rose-400'
                            : 'text-emerald-800 bg-emerald-100'
                        }`}>
                          <CheckCircle2 className={`w-3.5 h-3.5 ${slot.comparisonOperator === '<=' ? 'text-rose-600' : 'text-emerald-600'}`} />
                          {slot.comparisonOperator === '<=' ? '🚨 票即將搶光！' : '已釋出名額！'}
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-stone-700 bg-stone-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3 text-stone-500" />
                          {availableSeats === 0 ? '目前候補中' : `目前尚餘 ${availableSeats} 人`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Target Date Selector */}
                  <div className="space-y-1">
                    <label className="text-2xs font-semibold text-stone-500 block">選擇監控梯次日期</label>
                    <select
                      value={slot.targetCode}
                      onChange={(e) => {
                        const selectedGroup = allGroups.find(g => g.code === e.target.value);
                        if (selectedGroup) {
                          onUpdateSlot(slot.id, {
                            targetCode: selectedGroup.code,
                            targetDate: selectedGroup.date,
                          });
                        }
                      }}
                      className="w-full text-xs font-medium bg-white border border-stone-300 rounded-lg p-2 text-stone-800 focus:outline-hidden focus:ring-2 focus:ring-sky-600"
                    >
                      {allGroups.length === 0 ? (
                        <option value={slot.targetCode}>{slot.targetDate} ({slot.targetCode})</option>
                      ) : (
                        allGroups.map((g) => (
                          <option key={g.code} value={g.code}>
                            {g.date} · 可售 {g.availableSeats} 人 · NT$ {g.price} ({g.code})
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
                    <div className="p-3 rounded-lg bg-white border border-stone-200">
                      <span className="text-2xs text-stone-500 block">即時可售名額</span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className={`text-2xl font-black font-mono tabular-nums ${availableSeats > 1 ? 'text-emerald-600' : 'text-stone-800'}`}>
                          {availableSeats}
                        </span>
                        <span className="text-xs text-stone-400">/ {totalSeats} 人</span>
                      </div>
                      <span className="text-2xs text-stone-500 mt-1 block">
                        {availableSeats > 0 ? '開放線上報名' : '目前為候補中'}
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-white border border-stone-200 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-2xs text-stone-500 block">通知條件門檻</span>
                          <span className={`text-2xs font-semibold px-1 py-0.5 rounded-sm ${
                            (slot.comparisonOperator || '>=') === '<='
                              ? 'text-rose-700 bg-rose-50'
                              : 'text-sky-700 bg-sky-50'
                          }`}>
                            {(slot.comparisonOperator || '>=') === '<=' ? '倒數搶光預警' : '釋出名額預警'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          {/* Operator selector: >= (釋出) or <= (即將搶光) */}
                          <select
                            value={slot.comparisonOperator || '>='}
                            onChange={(e) => {
                              const op = e.target.value as '>=' | '<=';
                              onUpdateSlot(slot.id, {
                                comparisonOperator: op,
                              });
                            }}
                            className="text-xs font-bold font-mono px-1.5 py-1 border border-stone-300 rounded-md bg-stone-50 text-stone-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-600"
                            title="切換判斷邏輯：>= (釋出大於等於) 或 <= (即將搶光小於等於)"
                          >
                            <option value=">=">&gt;= (大於等於)</option>
                            <option value="<=">&lt;= (小於等於·搶光提醒)</option>
                          </select>

                          <input
                            type="number"
                            min="1"
                            max="39"
                            value={slot.minAvailableSeats}
                            onChange={(e) => {
                              const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                              onUpdateSlot(slot.id, {
                                minAvailableSeats: val,
                              });
                            }}
                            className="w-14 px-2 py-0.5 text-xs font-bold font-mono text-center border border-stone-300 rounded-md bg-stone-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-600"
                          />
                          <span className="text-xs text-stone-600 font-medium">人</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1 mt-2.5 pt-2 border-t border-stone-100">
                        <span className="text-2xs text-stone-400">快捷:</span>
                        {(slot.comparisonOperator === '<=' ? [3, 5, 8, 10] : [1, 2, 4, 8]).map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() =>
                              onUpdateSlot(slot.id, {
                                minAvailableSeats: num,
                              })
                            }
                            className={`px-1.5 py-0.5 text-2xs rounded-sm border cursor-pointer font-mono font-medium ${
                              slot.minAvailableSeats === num
                                ? (slot.comparisonOperator === '<='
                                    ? 'bg-rose-600 text-white font-bold border-rose-600'
                                    : 'bg-sky-600 text-white font-bold border-sky-600')
                                : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                            }`}
                          >
                            {slot.comparisonOperator || '>='}{num}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions for this Slot */}
                <div className="pt-4 mt-2 border-t border-stone-200/80 flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => onSimulateSlotAvailable(slot.id)}
                      className="inline-flex w-full sm:w-auto items-center justify-center gap-1 px-2.5 py-2 sm:py-1.5 text-xs sm:text-2xs font-semibold text-sky-800 bg-sky-100 hover:bg-sky-200 rounded-md transition-colors cursor-pointer border border-sky-200"
                      title="模擬此梯次釋出名額，測試此手機的畫面、音效與瀏覽器通知"
                    >
                      <Sparkles className="w-3 h-3 text-sky-600" />
                      <span>手機模擬 (可售=2)</span>
                    </button>

                    <a
                      href={TELEGRAM_TEST_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full sm:w-auto items-center justify-center gap-1 px-2.5 py-2 sm:py-1.5 text-xs sm:text-2xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors border border-emerald-700"
                      title="開啟 GitHub Actions，實際發送 Telegram 測試訊息"
                    >
                      <span>Telegram 實測</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <a
                    href={orderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex w-full sm:w-auto items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-bold transition-all ${
                      isMet
                        ? (slot.comparisonOperator === '<='
                            ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs animate-bounce'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs animate-bounce')
                        : 'bg-stone-800 hover:bg-stone-900 text-white'
                    }`}
                  >
                    <span>{isMet ? (slot.comparisonOperator === '<=' ? '⚡ 即刻搶票 ↗' : '立即搶報名 ↗') : (availableSeats > 0 ? '前往報名 ↗' : '前往官方候補 ↗')}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
