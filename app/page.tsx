'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from '@/components/Header';
import { TargetSpotlight } from '@/components/TargetSpotlight';
import { NotificationSettings } from '@/components/NotificationSettings';
import { MonitoringControls } from '@/components/MonitoringControls';
import { AllDeparturesTable } from '@/components/AllDeparturesTable';
import { ActivityLogs } from '@/components/ActivityLogs';
import {
  TourGroup,
  MonitoringConfig,
  CheckLog,
  CheckResponse,
  MonitoredSlot,
  SlotStatusResult,
  DEFAULT_TELEGRAM_BOT_TOKEN,
  DEFAULT_TELEGRAM_CHAT_ID,
} from '@/lib/types';
import { playAlertChime } from '@/lib/audio';
import { DEFAULT_TARGET_DATE, DEFAULT_TARGET_CODE, DEFAULT_KEYWORD } from '@/lib/scraper';

const STORAGE_KEY_CONFIG = 'kkholiday_monitor_config_v3';
const STORAGE_KEY_LOGS = 'kkholiday_monitor_logs_v3';

// Default configuration with 2 target groups:
// Slot 1: 監控行程1 (首選 2026/10/31 週六)
// Slot 2: 監控行程2 (備選 2026/10/24 週六)
const initialSlots: MonitoredSlot[] = [
  {
    id: 'slot_1',
    label: '監控行程1',
    targetDate: DEFAULT_TARGET_DATE, // '2026/10/31 (六)'
    targetCode: DEFAULT_TARGET_CODE, // 'ILN34261031A'
    minAvailableSeats: 2,
    comparisonOperator: '>=', // condition: available >= 2
    enabled: true,
  },
  {
    id: 'slot_2',
    label: '監控行程2',
    targetDate: '2026/10/24 (六)',
    targetCode: 'ILN34261024A',
    minAvailableSeats: 5,
    comparisonOperator: '<=', // condition: available <= 5 (提醒即將搶光)
    enabled: true,
  },
];

const initialConfig: MonitoringConfig = {
  targetKeyword: DEFAULT_KEYWORD,
  pollIntervalSeconds: 30,
  isMonitoringActive: true,
  soundEnabled: true,
  browserNotifyEnabled: false,
  slots: initialSlots,
  channel: 'telegram',
  telegramBotToken: DEFAULT_TELEGRAM_BOT_TOKEN,
  telegramChatId: DEFAULT_TELEGRAM_CHAT_ID,
  lineChannelAccessToken: '',
  lineUserId: '',
  customWebhookUrl: '',
  quietHoursEnabled: true,
  quietStartHour: 23,
  quietEndHour: 8,
};

export default function HomePage() {
  const [config, setConfig] = useState<MonitoringConfig>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedCfg = localStorage.getItem(STORAGE_KEY_CONFIG);
        if (savedCfg) {
          const parsed = JSON.parse(savedCfg);
          if (Array.isArray(parsed.slots) && parsed.slots.length >= 2) {
            return {
              ...initialConfig,
              ...parsed,
              telegramBotToken: DEFAULT_TELEGRAM_BOT_TOKEN,
              telegramChatId: DEFAULT_TELEGRAM_CHAT_ID,
            };
          }
        }
      } catch (e) {
        console.warn('Failed to load saved config:', e);
      }
    }
    return initialConfig;
  });

  const [slotResults, setSlotResults] = useState<SlotStatusResult[]>([]);
  const [allGroups, setAllGroups] = useState<TourGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastCheckedTime, setLastCheckedTime] = useState<string | null>(null);
  const [logs, setLogs] = useState<CheckLog[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedLogs = localStorage.getItem(STORAGE_KEY_LOGS);
        if (savedLogs) {
          return JSON.parse(savedLogs);
        }
      } catch (e) {
        console.warn('Failed to load saved logs:', e);
      }
    }
    return [];
  });

  const [countdown, setCountdown] = useState<number>(30);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | 'default'>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  // Track each slot's previous condition to prevent repetitive alert flooding
  const prevConditionMetMapRef = useRef<Record<string, boolean>>({});
  const configRef = useRef(config);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // Save config changes to localStorage
  const updateConfig = (updated: Partial<MonitoringConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...updated };
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(next));
      }
      return next;
    });
  };

  // Update a specific slot
  const handleUpdateSlot = (slotId: string, updated: Partial<MonitoredSlot>) => {
    setConfig((prev) => {
      const updatedSlots = prev.slots.map((s) => (s.id === slotId ? { ...s, ...updated } : s));
      const next = { ...prev, slots: updatedSlots };
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(next));
      }
      return next;
    });
  };

  // Add an audit log entry
  const addLog = useCallback((logData: Omit<CheckLog, 'id'>) => {
    const newLog: CheckLog = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ...logData,
    };
    setLogs((prev) => {
      const updated = [newLog, ...prev.slice(0, 49)];
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  // Perform a check against KKHoliday website for both slots
  const executeCheck = useCallback(async (isManual = false) => {
    setIsLoading(true);
    const nowTimeStr = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });

    // Retry helper with timeout
    const fetchWithRetry = async (retries = 2): Promise<Response> => {
      const current = configRef.current;
      for (let attempt = 0; attempt <= retries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);
        try {
          const res = await fetch('/api/monitor/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              keyword: current.targetKeyword,
              slots: current.slots,
            }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          if (res.ok) return res;
          // If 5xx, wait briefly and retry
          if (attempt < retries) {
            await new Promise((r) => setTimeout(r, 1000));
          }
        } catch (e) {
          clearTimeout(timeoutId);
          if (attempt >= retries) throw e;
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
      throw new Error('網路短暫不穩，已自動重試');
    };

    try {
      const current = configRef.current;
      const res = await fetchWithRetry(2);
      const data: CheckResponse = await res.json();

      if (data.success && Array.isArray(data.slotResults)) {
        setSlotResults(data.slotResults);
        setAllGroups(data.allGroups || []);
        setLastCheckedTime(nowTimeStr);

        // Prepare structured slots info for the push notification
        const slotsInfo = current.slots.map((slot) => {
          const r = data.slotResults.find((resItem) => resItem.slotId === slot.id);
          return {
            label: slot.label,
            name: r?.targetGroup?.name || '太平山 山毛櫸一日遊',
            date: slot.targetDate,
            code: slot.targetCode,
            minSeats: slot.minAvailableSeats,
            comparisonOperator: slot.comparisonOperator || (slot.minAvailableSeats >= 2 ? '>=' : '>'),
            availableSeats: r?.availableSeats ?? 0,
            totalSeats: r?.targetGroup?.totalSeats || 39,
            orderUrl: r?.orderUrl || `https://www.kkholiday.com.tw/EW/GO/GroupOrder.asp?prodCd=${slot.targetCode}`,
            isTriggered: !!r?.isConditionMet,
          };
        });

        // Check conditions for each slot
        for (const result of data.slotResults) {
          const slot = current.slots.find((s) => s.id === result.slotId);
          if (!slot || !slot.enabled) continue;

          const meetsCondition = result.isConditionMet;
          const wasMet = !!prevConditionMetMapRef.current[slot.id];

          // Trigger alert on transition or manual request
          if (meetsCondition && (!wasMet || isManual)) {
            // Play audio chime
            if (current.soundEnabled) {
              playAlertChime();
            }

            const opSymbol = slot.comparisonOperator || (slot.minAvailableSeats >= 2 ? '>=' : '>');
            const isRunningLow = opSymbol === '<=' || opSymbol === '<';
            const logTitle = isRunningLow ? '【即將搶光預警】' : '【名額釋出】';

            // Desktop Browser Notification
            if (
              current.browserNotifyEnabled &&
              typeof window !== 'undefined' &&
              'Notification' in window &&
              Notification.permission === 'granted'
            ) {
              try {
                new Notification(`🚨 ${logTitle} (${slot.label})`, {
                  body: `${result.targetDate} 目前僅剩 ${result.availableSeats} 人（符合 ${opSymbol} ${slot.minAvailableSeats} 人），請把握最後機會搶位！`,
                  icon: '/images/taipingshan_hero.jpg',
                });
              } catch (err) {
                console.warn('Notification error:', err);
              }
            }

            // Telegram / Webhook Push
            let notificationSent = false;
            let notifyMsg = '';

            try {
              const notifyRes = await fetch('/api/notify/line', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  channel: current.channel,
                  telegramBotToken: current.telegramBotToken || DEFAULT_TELEGRAM_BOT_TOKEN,
                  telegramChatId: current.telegramChatId || DEFAULT_TELEGRAM_CHAT_ID,
                  lineChannelAccessToken: current.lineChannelAccessToken,
                  lineUserId: current.lineUserId,
                  webhookUrl: current.customWebhookUrl,
                  isTest: false,
                  tourName: result.targetGroup?.name || '太平山 山毛櫸一日遊（ILN34）',
                  targetDate: result.targetDate,
                  availableSeats: result.availableSeats,
                  totalSeats: result.targetGroup?.totalSeats || 39,
                  orderUrl: result.orderUrl,
                  triggeredSlotLabel: slot.label,
                  slotsInfo,
                  quietHoursEnabled: current.quietHoursEnabled ?? true,
                  quietStartHour: current.quietStartHour ?? 23,
                  quietEndHour: current.quietEndHour ?? 8,
                }),
              });
              const notifyData = await notifyRes.json();
              if (notifyRes.ok && notifyData.success) {
                notificationSent = true;
                notifyMsg = `已成功推播至 ${notifyData.channel}`;
              } else {
                notifyMsg = `推播失敗: ${notifyData.error}`;
              }
            } catch (err) {
              notifyMsg = `推播請求異常: ${err instanceof Error ? err.message : '連線錯誤'}`;
            }

            addLog({
              timestamp: nowTimeStr,
              status: 'alert',
              date: result.targetDate,
              targetCode: result.targetCode,
              slotLabel: slot.label,
              availableSeats: result.availableSeats,
              message: `${logTitle}${slot.label} (${result.targetDate}) 可售名額為 ${result.availableSeats} 人（符合 ${opSymbol} ${slot.minAvailableSeats} 人，請快點搶票！）`,
              notified: notificationSent,
              notificationResult: notifyMsg,
            });
          }

          prevConditionMetMapRef.current[slot.id] = meetsCondition;
        }

        // Summary log if no alerts triggered
        const anyMet = data.slotResults.some((r) => r.isConditionMet);
        if (!anyMet && isManual) {
          const summaryStr = data.slotResults
            .map((r, i) => `行程${i + 1}(${r.targetDate.split(' ')[0]}): 可售 ${r.availableSeats} 人`)
            .join(' | ');
          addLog({
            timestamp: nowTimeStr,
            status: 'ok',
            date: '雙梯次同步檢測',
            availableSeats: 0,
            message: `官網狀態正常 · ${summaryStr}`,
            notified: false,
          });
        }
      } else {
        addLog({
          timestamp: nowTimeStr,
          status: 'error',
          date: '雙梯次同步',
          availableSeats: 0,
          message: data.error || '無法於 KKHoliday 頁面尋獲指定梯次資料',
          notified: false,
        });
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : '連線逾時';
      // If error occurred during background automatic reload/server redeploy, present clear explanation
      const friendlyMsg = errMsg.includes('Failed to fetch')
        ? '雲端服務正重新載入，已啟用自動重試機制保護'
        : `連線暫時波動: ${errMsg}，下個週期將自動重新嘗試`;

      addLog({
        timestamp: nowTimeStr,
        status: 'error',
        date: '雙梯次同步',
        availableSeats: 0,
        message: friendlyMsg,
        notified: false,
      });
    } finally {
      setIsLoading(false);
      setCountdown(configRef.current.pollIntervalSeconds);
    }
  }, [addLog]);

  // Request browser desktop notification permission
  const requestBrowserNotification = async (): Promise<boolean> => {
    if (typeof window !== 'undefined' || !('Notification' in window)) {
      alert('您的瀏覽器不支援桌面推播功能');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setBrowserPermission(permission);
      if (permission === 'granted') {
        updateConfig({ browserNotifyEnabled: true });
        new Notification('KKHoliday 名額雙梯次監控', {
          body: '瀏覽器推播權限已開通！當任一監控梯次有名額釋出時將立即彈出視窗通知。',
        });
        return true;
      } else {
        updateConfig({ browserNotifyEnabled: false });
        return false;
      }
    } catch (e) {
      console.warn('Error requesting notification permission:', e);
      return false;
    }
  };

  // Simulate slot release for slot 1 or slot 2
  const handleSimulateSlotAvailable = async (slotId: string) => {
    const simulatedSeats = 2;
    const targetSlot = config.slots.find((s) => s.id === slotId) || config.slots[0];

    // Update slot results locally
    setSlotResults((prev) =>
      prev.map((r) =>
        r.slotId === slotId
          ? {
              ...r,
              availableSeats: simulatedSeats,
              isConditionMet: true,
              targetGroup: r.targetGroup
                ? {
                    ...r.targetGroup,
                    availableSeats: simulatedSeats,
                    buttonText: '報名',
                    buttonType: 'btn-success',
                  }
                : null,
            }
          : r
      )
    );

    // Audio chime
    if (config.soundEnabled) {
      playAlertChime();
    }

    // Browser notification
    if (
      config.browserNotifyEnabled &&
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      try {
        new Notification(`🚨【模擬測試】KKHoliday 名額釋出！(${targetSlot.label})`, {
          body: `${targetSlot.targetDate} 模擬名額釋出: ${simulatedSeats} 人，請立即搶位！`,
          icon: '/images/taipingshan_hero.jpg',
        });
      } catch (e) {
        console.warn('Simulated notification error:', e);
      }
    }

    // Construct simulated slotsInfo
    const simulatedSlotsInfo = config.slots.map((s) => ({
      label: s.label,
      name: '太平山 山毛櫸一日遊',
      date: s.targetDate,
      code: s.targetCode,
      minSeats: s.minAvailableSeats,
      comparisonOperator: s.comparisonOperator || (s.minAvailableSeats >= 2 ? '>=' : '>'),
      availableSeats: s.id === slotId ? simulatedSeats : 0,
      totalSeats: 39,
      orderUrl: `https://www.kkholiday.com.tw/EW/GO/GroupOrder.asp?prodCd=${s.targetCode}`,
      isTriggered: s.id === slotId,
    }));

    let notifyResult = '模擬觸發本地警報';
    let isNotified = false;

    try {
      const notifyRes = await fetch('/api/notify/line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: config.channel,
          telegramBotToken: config.telegramBotToken || DEFAULT_TELEGRAM_BOT_TOKEN,
          telegramChatId: config.telegramChatId || DEFAULT_TELEGRAM_CHAT_ID,
          lineChannelAccessToken: config.lineChannelAccessToken,
          lineUserId: config.lineUserId,
          webhookUrl: config.customWebhookUrl,
          isTest: false,
          tourName: '太平山 山毛櫸一日遊',
          targetDate: targetSlot.targetDate,
          availableSeats: simulatedSeats,
          totalSeats: 39,
          orderUrl: `https://www.kkholiday.com.tw/EW/GO/GroupOrder.asp?prodCd=${targetSlot.targetCode}`,
          triggeredSlotLabel: targetSlot.label,
          slotsInfo: simulatedSlotsInfo,
        }),
      });
      const notifyData = await notifyRes.json();
      if (notifyRes.ok && notifyData.success) {
        notifyResult = `已成功傳送分段格式訊息至 Telegram (${notifyData.channel})`;
        isNotified = true;
      } else {
        notifyResult = `發送失敗: ${notifyData.error}`;
      }
    } catch (e) {
      notifyResult = `發送出錯: ${e instanceof Error ? e.message : '連線異常'}`;
    }

    addLog({
      timestamp: new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }),
      status: 'test',
      date: targetSlot.targetDate,
      targetCode: targetSlot.targetCode,
      slotLabel: targetSlot.label,
      availableSeats: simulatedSeats,
      message: `【模擬測試】${targetSlot.label} (${targetSlot.targetDate}) 模擬名額釋出 ${simulatedSeats} 人，觸發警報`,
      notified: isNotified,
      notificationResult: notifyResult,
    });
  };

  // Set any departure as slot 1 or slot 2
  const handleSetAsSlot = (group: TourGroup, slotIndex: number) => {
    const slotId = slotIndex === 0 ? 'slot_1' : 'slot_2';
    handleUpdateSlot(slotId, {
      targetCode: group.code,
      targetDate: group.date,
    });
    // Trigger immediate refresh to update status
    setTimeout(() => {
      executeCheck(true);
    }, 100);

    const el = document.getElementById('target-spotlight');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      executeCheck(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [executeCheck]);

  // Polling Interval Engine
  useEffect(() => {
    if (!config.isMonitoringActive) {
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          executeCheck(false);
          return config.pollIntervalSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [config.isMonitoringActive, config.pollIntervalSeconds, executeCheck]);

  const monitoredCodes = config.slots.map((s) => s.targetCode);

  return (
    <div className="min-h-screen bg-stone-100/70 text-stone-900 selection:bg-sky-200">
      {/* Top Header */}
      <Header
        isMonitoring={config.isMonitoringActive}
        onToggleMonitoring={() => updateConfig({ isMonitoringActive: !config.isMonitoringActive })}
        onManualRefresh={() => executeCheck(true)}
        isLoading={isLoading}
        countdown={countdown}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Dominant Visual Anchor: Dual-Slot Target Spotlight */}
        <TargetSpotlight
          slots={config.slots}
          slotResults={slotResults}
          onUpdateSlot={handleUpdateSlot}
          isMonitoring={config.isMonitoringActive}
          countdown={countdown}
          lastCheckedTime={lastCheckedTime}
          onRefresh={() => executeCheck(true)}
          onSimulateSlotAvailable={handleSimulateSlotAvailable}
          isLoading={isLoading}
          allGroups={allGroups}
        />

        {/* Configuration Section: Telegram Push & Monitoring Cadence */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-8">
            <NotificationSettings
              config={config}
              onUpdateConfig={updateConfig}
              onRequestBrowserNotification={requestBrowserNotification}
              browserPermission={browserPermission}
            />

            <MonitoringControls
              config={config}
              onUpdateConfig={updateConfig}
              countdown={countdown}
              totalInterval={config.pollIntervalSeconds}
            />
          </div>

          <div className="lg:col-span-5 space-y-8">
            <ActivityLogs
              logs={logs}
              onClearLogs={() => {
                setLogs([]);
                if (typeof window !== 'undefined') {
                  localStorage.removeItem(STORAGE_KEY_LOGS);
                }
              }}
            />
          </div>
        </div>

        {/* Full Departures Table */}
        <AllDeparturesTable
          groups={allGroups}
          monitoredCodes={monitoredCodes}
          onSetAsSlot={handleSetAsSlot}
          isLoading={isLoading}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white py-8 mt-12 text-stone-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-stone-800">KKHoliday 雙梯次名額即時監控系統</span>
            <span aria-hidden="true">·</span>
            <span>專為太平山山毛櫸步道（ILN34）梯次設計</span>
          </div>
          <div className="flex items-center gap-4 text-stone-400">
            <span>資料來源：KKHoliday 官方網站</span>
            <span aria-hidden="true">·</span>
            <a
              href="https://www.kkholiday.com.tw/EW/GO/GroupList.asp?isWm=1&ikeyword=ILN34"
              target="_blank"
              rel="noopener noreferrer"
              className="text-stone-600 hover:text-sky-700 underline"
            >
              官方原始行程頁 ↗
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
