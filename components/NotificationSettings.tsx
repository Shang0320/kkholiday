'use client';

import React from 'react';
import { BellRing, Bot, CheckCircle2, Github, Moon, ShieldCheck, Volume2 } from 'lucide-react';
import { MonitoringConfig } from '@/lib/types';
import { playAlertChime } from '@/lib/audio';

interface NotificationSettingsProps {
  config: MonitoringConfig;
  onUpdateConfig: (updated: Partial<MonitoringConfig>) => void;
  onRequestBrowserNotification: () => Promise<boolean>;
  browserPermission: NotificationPermission | 'default';
}

export function NotificationSettings({
  config,
  onUpdateConfig,
  onRequestBrowserNotification,
  browserPermission,
}: NotificationSettingsProps) {
  return (
    <section id="monitoring-settings" className="space-y-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8">
      <div className="flex flex-col gap-3 border-b border-stone-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-stone-900">GitHub 雲端監控與通知</h2>
          <p className="mt-1 text-sm text-stone-500">介面由 GitHub Pages 提供，資料與 Telegram 推播由 GitHub Actions 更新。</p>
        </div>
        <a
          href="https://github.com/Shang0320/kkholiday/actions"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800"
        >
          <Github className="h-4 w-4" /> 查看 Actions
        </a>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <div className="mt-2 text-sm font-bold text-emerald-950">每 5 分鐘巡檢</div>
          <p className="mt-1 text-xs leading-relaxed text-emerald-800">手機與電腦關閉後，GitHub 仍會繼續執行。</p>
        </div>
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
          <Bot className="h-5 w-5 text-sky-600" />
          <div className="mt-2 text-sm font-bold text-sky-950">Telegram 推播</div>
          <p className="mt-1 text-xs leading-relaxed text-sky-800">Token 與 Chat ID 僅存放在 GitHub Secrets。</p>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
          <Moon className="h-5 w-5 text-indigo-600" />
          <div className="mt-2 text-sm font-bold text-indigo-950">23:00–08:00 靜音</div>
          <p className="mt-1 text-xs leading-relaxed text-indigo-800">夜間照常巡檢，但不發送 Telegram 打擾。</p>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4 text-xs text-stone-700">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        <p className="leading-relaxed">手機網頁不下載、不顯示也不保存 Telegram 憑證。若需要測試背景推播，請到 GitHub Actions 手動執行一次工作流程。</p>
      </div>

      <div className="grid grid-cols-1 gap-4 border-t border-stone-200 pt-5 sm:grid-cols-2">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4">
          <div className="flex items-center gap-3">
            <BellRing className="h-5 w-5 shrink-0 text-sky-600" />
            <div>
              <div className="text-xs font-bold text-stone-900">手機瀏覽器通知</div>
              <div className="text-xs text-stone-500">{browserPermission === 'granted' ? '已授權' : browserPermission === 'denied' ? '已被封鎖' : '尚未授權'}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onRequestBrowserNotification}
            className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold ${config.browserNotifyEnabled && browserPermission === 'granted' ? 'bg-sky-600 text-white' : 'bg-stone-200 text-stone-700 hover:bg-stone-300'}`}
          >
            {config.browserNotifyEnabled && browserPermission === 'granted' ? '已開啟' : '授權'}
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4">
          <div className="flex items-center gap-3">
            <Volume2 className="h-5 w-5 shrink-0 text-sky-600" />
            <div>
              <div className="text-xs font-bold text-stone-900">名額提示音</div>
              <div className="text-xs text-stone-500">符合條件時在目前裝置播放</div>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={playAlertChime} className="rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-xs">試聽</button>
            <button
              type="button"
              onClick={() => onUpdateConfig({ soundEnabled: !config.soundEnabled })}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${config.soundEnabled ? 'bg-sky-600 text-white' : 'bg-stone-200 text-stone-700'}`}
            >
              {config.soundEnabled ? '開啟中' : '靜音'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
