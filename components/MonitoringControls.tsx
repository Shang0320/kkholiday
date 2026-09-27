'use client';

import React from 'react';
import { Sliders, PauseCircle, PlayCircle, Clock } from 'lucide-react';
import { MonitoringConfig } from '@/lib/types';

interface MonitoringControlsProps {
  config: MonitoringConfig;
  onUpdateConfig: (updated: Partial<MonitoringConfig>) => void;
  countdown: number;
  totalInterval: number;
}

export function MonitoringControls({
  config,
  onUpdateConfig,
  countdown,
  totalInterval,
}: MonitoringControlsProps) {
  const intervals = [
    { label: '15 秒', value: 15 },
    { label: '30 秒 (推薦)', value: 30 },
    { label: '60 秒', value: 60 },
    { label: '2 分鐘', value: 120 },
    { label: '5 分鐘', value: 300 },
  ];

  const progressPercent = Math.max(0, Math.min(100, (countdown / totalInterval) * 100));

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-stone-200 pb-4">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-sky-600" />
          <h2 className="text-lg font-bold text-stone-900">自動輪詢頻率設定</h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onUpdateConfig({ isMonitoringActive: !config.isMonitoringActive })}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              config.isMonitoringActive
                ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                : 'bg-sky-600 text-white hover:bg-sky-700'
            }`}
          >
            {config.isMonitoringActive ? (
              <>
                <PauseCircle className="w-4 h-4" />
                <span>暫停自動輪詢</span>
              </>
            ) : (
              <>
                <PlayCircle className="w-4 h-4" />
                <span>啟動自動輪詢</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Progress countdown indicator */}
      {config.isMonitoringActive && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-stone-500 font-mono">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-600" />
              <span>雙梯次自動排程輪詢進行中</span>
            </span>
            <span>下次檢查：<strong className="text-stone-900 tabular-nums">{countdown}</strong> 秒後</span>
          </div>
          <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-600 transition-all duration-1000 ease-linear rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Polling Interval Selector */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-stone-700 block">
          輪詢檢查間隔時間
        </label>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {intervals.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onUpdateConfig({ pollIntervalSeconds: item.value })}
              className={`py-2 px-2 text-xs font-medium rounded-lg border text-center transition-all cursor-pointer ${
                config.pollIntervalSeconds === item.value
                  ? 'border-sky-600 bg-sky-50 text-sky-900 font-bold shadow-xs'
                  : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-stone-500">
          系統將依照此間隔同時對 2 個指定梯次向 KKHoliday 官方網站檢查最新名額，不會對官方伺服器造成負擔。
        </p>
      </div>
    </div>
  );
}
