'use client';

import React, { useState } from 'react';
import { BellRing, Bot, CheckCircle2, ExternalLink, Github, KeyRound, LoaderCircle, Moon, ShieldCheck, Volume2, X } from 'lucide-react';
import { MonitoringConfig } from '@/lib/types';
import { playAlertChime } from '@/lib/audio';
import { CREATE_TOKEN_URL, dispatchGitHubWorkflow, GITHUB_TOKEN_STORAGE_KEY } from '@/lib/github-actions';

interface NotificationSettingsProps {
  config: MonitoringConfig;
  onUpdateConfig: (updated: Partial<MonitoringConfig>) => void;
  onRequestBrowserNotification: () => Promise<boolean>;
  browserPermission: NotificationPermission | 'default';
}

export function NotificationSettings({ config, onUpdateConfig, onRequestBrowserNotification, browserPermission }: NotificationSettingsProps) {
  const [quietSaving, setQuietSaving] = useState(false);
  const [quietStatus, setQuietStatus] = useState('');
  const [quietError, setQuietError] = useState('');
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  const [pendingQuietValue, setPendingQuietValue] = useState<boolean | null>(null);
  const [tokenInput, setTokenInput] = useState('');

  const dispatchQuietHours = async (enabled: boolean, token: string) => {
    setQuietSaving(true);
    setQuietStatus('');
    setQuietError('');
    try {
      await dispatchGitHubWorkflow('update-settings.yml', { quiet_hours_enabled: String(enabled) }, token);
      onUpdateConfig({ quietHoursEnabled: enabled });
      setQuietStatus(enabled ? '已開啟，雲端設定更新中' : '已關閉，雲端設定更新中');
      setTokenDialogOpen(false);
      window.setTimeout(() => setQuietStatus(''), 12000);
    } catch (error) {
      const message = error instanceof Error ? error.message : '無法觸發 GitHub Actions';
      setQuietError(`設定失敗：${message}。請確認 Token 已選擇 kkholiday 且 Actions 為 Read and write。`);
      localStorage.removeItem(GITHUB_TOKEN_STORAGE_KEY);
      setTokenInput('');
      setPendingQuietValue(enabled);
      setTokenDialogOpen(true);
    } finally {
      setQuietSaving(false);
    }
  };

  const handleQuietToggle = () => {
    const nextValue = !config.quietHoursEnabled;
    const token = localStorage.getItem(GITHUB_TOKEN_STORAGE_KEY);
    if (token) {
      void dispatchQuietHours(nextValue, token);
      return;
    }
    setPendingQuietValue(nextValue);
    setTokenInput('');
    setQuietError('');
    setTokenDialogOpen(true);
  };

  const saveTokenAndToggle = () => {
    const token = tokenInput.trim();
    if (!token) {
      setQuietError('請貼上 GitHub Fine-grained Token。');
      return;
    }
    if (pendingQuietValue === null) return;
    localStorage.setItem(GITHUB_TOKEN_STORAGE_KEY, token);
    void dispatchQuietHours(pendingQuietValue, token);
  };

  return (
    <section id="monitoring-settings" className="space-y-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8">
      <div className="flex flex-col gap-3 border-b border-stone-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-stone-900">GitHub 雲端監控與通知</h2>
          <p className="mt-1 text-sm text-stone-500">介面由 GitHub Pages 提供，資料與 Telegram 推播由 GitHub Actions 更新。</p>
        </div>
        <a href="https://github.com/Shang0320/kkholiday/actions" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800">
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
        <div className={`rounded-xl border p-4 transition-colors ${config.quietHoursEnabled ? 'border-indigo-300 bg-indigo-50' : 'border-stone-300 bg-stone-50'}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <Moon className={`h-5 w-5 ${config.quietHoursEnabled ? 'text-indigo-600' : 'text-stone-500'}`} />
              <div className={`mt-2 text-sm font-bold ${config.quietHoursEnabled ? 'text-indigo-950' : 'text-stone-800'}`}>23:00–08:00 靜音</div>
            </div>
            <button type="button" role="switch" aria-checked={config.quietHoursEnabled} aria-label="23:00 至 08:00 Telegram 靜音" onClick={handleQuietToggle} disabled={quietSaving} className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors focus:outline-hidden focus:ring-2 focus:ring-indigo-300 disabled:cursor-wait disabled:opacity-60 ${config.quietHoursEnabled ? 'bg-indigo-600' : 'bg-stone-300'}`}>
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${config.quietHoursEnabled ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
          <p className={`mt-1 text-xs leading-relaxed ${config.quietHoursEnabled ? 'text-indigo-800' : 'text-stone-600'}`}>
            {quietSaving ? '正在更新雲端設定…' : config.quietHoursEnabled ? '已開啟：夜間巡檢但不發 Telegram。' : '已關閉：夜間也會發送 Telegram。'}
          </p>
          {quietStatus && <p className="mt-2 text-2xs font-semibold text-emerald-700">{quietStatus}，約 1 分鐘生效。</p>}
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4 text-xs text-stone-700">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        <p className="leading-relaxed">手機網頁不下載、不顯示也不保存 Telegram 憑證。第一次設定專用 GitHub Token 後，Telegram 實測與靜音 switch 都可直接操作雲端。</p>
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
          <button type="button" onClick={onRequestBrowserNotification} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold ${config.browserNotifyEnabled && browserPermission === 'granted' ? 'bg-sky-600 text-white' : 'bg-stone-200 text-stone-700 hover:bg-stone-300'}`}>
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
            <button type="button" onClick={() => onUpdateConfig({ soundEnabled: !config.soundEnabled })} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${config.soundEnabled ? 'bg-sky-600 text-white' : 'bg-stone-200 text-stone-700'}`}>
              {config.soundEnabled ? '開啟中' : '靜音'}
            </button>
          </div>
        </div>
      </div>

      {tokenDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="quiet-token-title">
          <div className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="rounded-xl bg-indigo-100 p-2 text-indigo-700"><KeyRound className="h-5 w-5" /></span>
                <div>
                  <h2 id="quiet-token-title" className="text-lg font-bold text-stone-900">第一次設定雲端開關</h2>
                  <p className="mt-1 text-xs leading-relaxed text-stone-600">Token 僅保存在這支手機的瀏覽器，不會寫入 GitHub 原始碼。</p>
                </div>
              </div>
              <button type="button" onClick={() => setTokenDialogOpen(false)} className="rounded-lg p-2 text-stone-500 hover:bg-stone-100" aria-label="關閉"><X className="h-5 w-5" /></button>
            </div>

            <ol className="mt-5 space-y-2 rounded-xl border border-sky-200 bg-sky-50 p-4 text-xs leading-relaxed text-sky-950">
              <li><strong>1.</strong> Repository access 選「Only select repositories」→ <strong>kkholiday</strong>。</li>
              <li><strong>2.</strong> 確認 Actions 為 <strong>Read and write</strong>。</li>
              <li><strong>3.</strong> 建立後複製 Token 貼回下方。</li>
            </ol>

            <a href={CREATE_TOKEN_URL} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-3 text-sm font-bold text-white hover:bg-stone-800">
              <KeyRound className="h-4 w-4" /> 建立專用 GitHub Token <ExternalLink className="h-4 w-4" />
            </a>

            <label className="mt-4 block text-xs font-bold text-stone-800" htmlFor="quiet-github-token">GitHub Fine-grained Token</label>
            <input id="quiet-github-token" type="password" value={tokenInput} onChange={(event) => setTokenInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') saveTokenAndToggle(); }} placeholder="github_pat_..." autoComplete="off" spellCheck={false} className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-3 py-3 font-mono text-sm text-stone-900 outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
            {quietError && <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs leading-relaxed text-rose-700">{quietError}</p>}

            <button type="button" onClick={saveTokenAndToggle} disabled={quietSaving} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-70">
              {quietSaving ? <><LoaderCircle className="h-4 w-4 animate-spin" /> 設定中...</> : '儲存並套用雲端開關'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
