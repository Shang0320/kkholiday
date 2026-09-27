'use client';

import React from 'react';
import { RefreshCw, Radio, Cloud, Moon } from 'lucide-react';

interface HeaderProps {
  isMonitoring: boolean;
  onToggleMonitoring: () => void;
  onManualRefresh: () => void;
  isLoading: boolean;
  countdown: number;
}

export function Header({
  isMonitoring,
  onToggleMonitoring,
  onManualRefresh,
  isLoading,
  countdown,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-stone-200 bg-white/95 backdrop-blur-sm shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 min-h-16 py-2 flex items-center justify-between gap-2">
        {/* Brand */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-700 text-white font-bold text-sm shadow-xs">
            KK
          </div>
          <div className="flex min-w-0 flex-col sm:flex-row sm:items-center sm:gap-2">
            <span className="truncate text-sm sm:text-lg font-bold tracking-tight text-stone-900">
              KKHoliday 名額監控
            </span>
            <div className="flex items-center gap-1.5 mt-0.5 sm:mt-0">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-sky-100 text-sky-800">
                <Cloud className="w-3 h-3 text-sky-600" />
                雲端 24h
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-indigo-100 text-indigo-800">
                <Moon className="w-3 h-3 text-indigo-600" />
                23~08 靜音
              </span>
            </div>
          </div>
        </div>

        {/* Navigation links (guide removed as requested) */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-600">
          <a href="#target-spotlight" className="hover:text-sky-700 transition-colors">雙梯次監控</a>
          <a href="#monitoring-settings" className="hover:text-sky-700 transition-colors">推播設定</a>
          <a href="#all-groups" className="hover:text-sky-700 transition-colors">全部梯次</a>
          <a href="#logs" className="hover:text-sky-700 transition-colors">監控日誌</a>
        </nav>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <button
            type="button"
            onClick={onManualRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
            title="立即向 KKHoliday 官方網站檢查一次最新名額"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-sky-700' : ''}`} />
            <span className="hidden sm:inline">{isLoading ? '同步中...' : '手動重整'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleMonitoring}
            className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap shadow-xs ${
              isMonitoring
                ? 'bg-sky-600 hover:bg-sky-700 text-white'
                : 'bg-stone-200 hover:bg-stone-300 text-stone-700'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${isMonitoring ? 'animate-pulse text-sky-200' : ''}`} />
            <span>{isMonitoring ? <><span className="sm:hidden">{countdown}s</span><span className="hidden sm:inline">監控中 ({countdown}s)</span></> : '已暫停'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
