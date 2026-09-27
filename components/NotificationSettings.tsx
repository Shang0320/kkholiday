'use client';

import React, { useState } from 'react';
import {
  Send,
  Volume2,
  BellRing,
  Key,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  ShieldCheck,
  Bot,
  Moon,
  Clock,
  Cloud,
  Github,
  Terminal,
} from 'lucide-react';
import { MonitoringConfig, DEFAULT_TELEGRAM_BOT_TOKEN, DEFAULT_TELEGRAM_CHAT_ID } from '@/lib/types';
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
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestNotification = async () => {
    setIsTesting(true);
    setTestResult(null);

    // Play local audio chime if enabled
    if (config.soundEnabled) {
      playAlertChime();
    }

    // Try web browser notification if permitted
    if (config.browserNotifyEnabled && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('🔔 KKHoliday 雙梯次監控測試通知', {
          body: '瀏覽器推播已正常啟用！當任一梯次可售名額 > 1 時將第一時間發送通知。',
          icon: '/images/taipingshan_hero.jpg',
        });
      } catch (e) {
        console.warn('Browser notification error:', e);
      }
    }

    try {
      const res = await fetch('/api/notify/line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: config.channel,
          telegramBotToken: config.telegramBotToken || DEFAULT_TELEGRAM_BOT_TOKEN,
          telegramChatId: config.telegramChatId || DEFAULT_TELEGRAM_CHAT_ID,
          lineChannelAccessToken: config.lineChannelAccessToken,
          lineUserId: config.lineUserId,
          webhookUrl: config.customWebhookUrl,
          isTest: true,
          tourName: '太平山 山毛櫸一日遊（ILN34）雙梯次同步監控',
          availableSeats: 2,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: `發送成功！${data.channel} 已收到分段格式的測試推播訊息，請前往確認您的 Telegram 訊息。`,
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || '推播發送失敗，請確認 Token 與 Chat ID 是否正確。',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '連線失敗';
      setTestResult({
        success: false,
        message: `發送請求錯誤: ${msg}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div id="monitoring-settings" className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
      {/* Notice Banner */}
      <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 text-sky-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <div className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
            ✓
          </div>
          <div>
            <strong className="text-sky-900 block font-semibold">
              Telegram 專屬推播設定已完成並固化寫入系統
            </strong>
            <span className="text-sky-800">
              您的 Bot Token 與 Chat ID（1177409998）已寫死為預設值，每次重整或更新皆會自動載入，不需再手動重打！
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <h2 className="text-xl font-bold text-stone-900">推播通知管道與設定</h2>
          <p className="text-sm text-stone-500 mt-0.5">
            設定當任一監控梯次可售名額釋出時接收即時推播的方式（已內建固定 Token 與 Chat ID）
          </p>
        </div>

        {/* Test Notification Trigger */}
        <button
          type="button"
          onClick={handleTestNotification}
          disabled={isTesting}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50 shrink-0 shadow-xs"
        >
          <Send className={`w-3.5 h-3.5 ${isTesting ? 'animate-bounce' : ''}`} />
          <span>{isTesting ? '發送測試中...' : '發送測試推播至 Telegram'}</span>
        </button>
      </div>

      {testResult && (
        <div
          className={`p-4 rounded-xl text-sm border flex items-start gap-3 ${
            testResult.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          {testResult.success ? (
            <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <div className="font-semibold">{testResult.success ? '連線測試成功' : '測試推播失敗'}</div>
            <p className="text-xs">{testResult.message}</p>
          </div>
        </div>
      )}

      {/* Primary: Telegram Configuration Inputs */}
      <div className="space-y-4 p-5 rounded-xl bg-sky-50/40 border border-sky-200">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
            <Bot className="w-4 h-4 text-sky-600" />
            <span>Telegram 推播帳號綁定狀態（已寫死預設）</span>
          </span>
          <span className="inline-flex items-center gap-1 text-2xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            已固定寫入
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="tg-bot-token" className="text-xs font-bold text-stone-800 block mb-1">
              Telegram Bot Token
            </label>
            <input
              id="tg-bot-token"
              type="text"
              value={config.telegramBotToken || DEFAULT_TELEGRAM_BOT_TOKEN}
              onChange={(e) => onUpdateConfig({ telegramBotToken: e.target.value })}
              className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-600 font-mono text-xs"
            />
            <span className="text-2xs text-stone-500 mt-1 block">@ai_shang_bot 機器人權杖（已固定）</span>
          </div>

          <div>
            <label htmlFor="tg-chat-id" className="text-xs font-bold text-stone-800 block mb-1">
              您的 Telegram Chat ID
            </label>
            <input
              id="tg-chat-id"
              type="text"
              value={config.telegramChatId || DEFAULT_TELEGRAM_CHAT_ID}
              onChange={(e) => onUpdateConfig({ telegramChatId: e.target.value })}
              className="w-full px-3.5 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-600 font-mono text-xs"
            />
            <span className="text-2xs text-stone-500 mt-1 block">已指定發送至 Chat ID: 1177409998</span>
          </div>
        </div>

        {/* Message preview matching requested format */}
        <div className="p-3.5 rounded-lg bg-white border border-sky-100 text-xs text-stone-700 space-y-1.5">
          <div className="font-bold text-sky-950 flex items-center gap-1.5">
            <span>📲 簡訊格式預覽（支援 &gt;= 釋出 或 &lt;= 即將搶光提醒）：</span>
          </div>
          <pre className="p-3 bg-stone-50 rounded-md font-mono text-2xs text-stone-800 leading-relaxed border border-stone-200 overflow-x-auto">
{`🚨【KKHoliday 名額釋出警報！】
══════════════════
監控行程1:
梯次日期：2026/10/31 (六)
行程名稱：太平山 山毛櫸一日遊
可售名額：🔥 2 人 (釋出！)
觸發條件：可售人數 >= 2 人
----
監控行程2:
梯次日期：2026/10/24 (六)
行程名稱：太平山 山毛櫸一日遊
可售名額：🔥 3 人 (釋出！)
觸發條件：可售人數 <= 5 人 (倒數即將搶光)
══════════════════
👉【立即點擊直達官方報名填單】`}
          </pre>
        </div>
      </div>

      {/* 24-Hour Autonomous Server & Quiet Hours (23:00 ~ 08:00) */}
      <div className="p-5 rounded-xl border border-indigo-200 bg-linear-to-br from-indigo-50/70 via-white to-purple-50/50 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Moon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-stone-900">夜間免打擾保護模式（23:00 ~ 08:00）</h3>
                <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                  守護睡眠
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                雲端系統 24 小時不中斷運行監控，但在台灣時間 23:00 ~ 隔日 08:00 間靜音不跳出推播，避免夜間驚擾。
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onUpdateConfig({ quietHoursEnabled: !(config.quietHoursEnabled ?? true) })}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                config.quietHoursEnabled ?? true
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-stone-200 hover:bg-stone-300 text-stone-700'
              }`}
            >
              {config.quietHoursEnabled ?? true ? '已啟用 (23~08 不打擾)' : '已關閉 (全日推播)'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-white/80 border border-indigo-100">
            <Cloud className="w-4 h-4 text-indigo-600 shrink-0" />
            <div>
              <span className="font-semibold text-stone-800 block">雲端 24 小時全時監控</span>
              <span className="text-stone-500 text-2xs">即使電腦或手機關機，雲端背景亦持續偵測</span>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-white/80 border border-indigo-100">
            <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
            <div>
              <span className="font-semibold text-stone-800 block">設定免打擾區間</span>
              <span className="text-stone-500 text-2xs font-mono font-medium">每日 {config.quietStartHour ?? 23}:00 至 隔日 0{config.quietEndHour ?? 8}:00</span>
            </div>
          </div>
        </div>
      </div>

      {/* GitHub Actions 24h Autonomous Cloud Runner Status */}
      <div className="p-5 rounded-xl border border-stone-800 bg-stone-900 text-stone-100 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-stone-800 border border-stone-700 text-white flex items-center justify-center shrink-0">
              <Github className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">GitHub Actions 24H 免費雲端自主巡檢</h3>
                <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/30 text-emerald-400">
                  代碼與排程已就緒
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                專案內已打包專屬排程腳本 <code className="text-sky-300">.github/workflows/monitor.yml</code> 與 <code className="text-sky-300">scripts/monitor.js</code>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-stone-950 rounded-lg p-3 border border-stone-800 text-xs font-mono space-y-2">
          <div className="flex items-center gap-1.5 text-stone-400 font-sans text-2xs uppercase tracking-wider font-semibold">
            <Terminal className="w-3.5 h-3.5 text-sky-400" />
            <span>只需一條指令即可推送到您的 GitHub：</span>
          </div>
          <p className="text-emerald-400 bg-stone-900/80 p-2.5 rounded border border-stone-800/80 select-all overflow-x-auto whitespace-pre">
git remote add origin https://github.com/您的帳號/kkholiday-monitor.git && git push -u origin main
          </p>
          <p className="text-stone-400 text-2xs font-sans">
            推送後 GitHub 即每 5 分鐘自動啟動 Ubuntu 雲端環境替您監控並推播至您的 Telegram（完全免費、無需伺服器開銷）。
          </p>
        </div>
      </div>

      {/* Auxiliary Notification Controls: Browser Push & Audio Chime */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-200">
        {/* Browser Push */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-stone-200 bg-stone-50">
          <div className="flex items-center gap-3">
            <BellRing className="w-5 h-5 text-sky-600 shrink-0" />
            <div>
              <div className="text-xs font-bold text-stone-900">瀏覽器桌面推播</div>
              <div className="text-xs text-stone-500">
                狀態：{browserPermission === 'granted' ? '已授權允許' : browserPermission === 'denied' ? '已被封鎖' : '尚未授權'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onRequestBrowserNotification}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              config.browserNotifyEnabled && browserPermission === 'granted'
                ? 'bg-sky-600 text-white'
                : 'bg-stone-200 hover:bg-stone-300 text-stone-700'
            }`}
          >
            {config.browserNotifyEnabled && browserPermission === 'granted' ? '已開啟' : '授權並開啟'}
          </button>
        </div>

        {/* Audio Chime */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-stone-200 bg-stone-50">
          <div className="flex items-center gap-3">
            <Volume2 className="w-5 h-5 text-sky-600 shrink-0" />
            <div>
              <div className="text-xs font-bold text-stone-900">名額釋出音效警報</div>
              <div className="text-xs text-stone-500">當有空位時發出清脆提示音</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={playAlertChime}
              className="px-2.5 py-1 text-xs font-medium text-stone-600 hover:text-stone-900 bg-white border border-stone-300 rounded-md cursor-pointer hover:bg-stone-50"
              title="試聽警報聲音"
            >
              試聽
            </button>
            <button
              type="button"
              onClick={() => onUpdateConfig({ soundEnabled: !config.soundEnabled })}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                config.soundEnabled
                  ? 'bg-sky-600 text-white'
                  : 'bg-stone-200 hover:bg-stone-300 text-stone-700'
              }`}
            >
              {config.soundEnabled ? '開啟中' : '靜音'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
