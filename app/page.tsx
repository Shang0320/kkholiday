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
} from '@/lib/types';
import { playAlertChime } from '@/lib/audio';
import { DEFAULT_TARGET_DATE, DEFAULT_TARGET_CODE, DEFAULT_KEYWORD } from '@/lib/scraper';

const STORAGE_KEY_CONFIG = 'kkholiday_monitor_config_v3';
const STORAGE_KEY_LOGS = 'kkholiday_monitor_logs_v3';
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

// Default configuration with 2 target groups:
// Slot 1: 監控行程1 (首選 2026/10/31 週六)
// Slot 2: 監控行程2 (備選 2026/11/07 週六)
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
    targetDate: '2026/11/07 (六)',
    targetCode: 'ILN34261107A',
    minAvailableSeats: 8,
    comparisonOperator: '>=',
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
  telegramBotToken: '',
  telegramChatId: '',
  lineChannelAccessToken: '',
  lineUserId: '',
  customWebhookUrl: '',
  quietHoursEnabled: true,
  quietStartHour: 23,
  quietEndHour: 8,
};

export default function HomePage() {
  const [config, setConfig] = useState<MonitoringConfig>(initialConfig);

  const [slotResults, setSlotResults] = useState<SlotStatusResult[]>([]);
  const [allGroups, setAllGroups] = useState<TourGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastCheckedTime, setLastCheckedTime] = useState<string | null>(null);
  const [logs, setLogs] = useState<CheckLog[]>([]);

  const [countdown, setCountdown] = useState<number>(30);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | 'default'>('default');

  // Track each slot's previous condition to prevent repetitive alert flooding
  const prevConditionMetMapRef = useRef<Record<string, boolean>>({});
  const configRef = useRef(config);

  /* Browser-only persistence is intentionally restored after hydration. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const savedCfg = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (savedCfg) {
        const parsed = JSON.parse(savedCfg);
        if (Array.isArray(parsed.slots) && parsed.slots.length >= 2) {
          setConfig({ ...initialConfig, ...parsed, telegramBotToken: '', telegramChatId: '' });
        }
      }
      const savedLogs = localStorage.getItem(STORAGE_KEY_LOGS);
      if (savedLogs) setLogs(JSON.parse(savedLogs));
      if ('Notification' in window) setBrowserPermission(Notification.permission);
    } catch (error) {
      console.warn('Failed to restore browser settings:', error);
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

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

  // GitHub Actions refreshes this static snapshot before each Pages deployment.
  const executeCheck = useCallback(async (isManual = false) => {
    setIsLoading(true);
    const nowTimeStr = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });

    try {
      const current = configRef.current;
      const res = await fetch(`${BASE_PATH}/data/status.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`GitHub Pages 資料讀取失敗 (${res.status})`);
      const data: CheckResponse = await res.json();

      if (data.success && Array.isArray(data.allGroups)) {
        const groups = data.allGroups;
        const derivedResults: SlotStatusResult[] = current.slots.map((slot) => {
          const targetGroup = groups.find((group) => group.code === slot.targetCode)
            || groups.find((group) => group.date.includes(slot.targetDate.split(' ')[0]))
            || null;
          const availableSeats = targetGroup?.availableSeats ?? 0;
          const operator = slot.comparisonOperator || '>=';
          const isConditionMet = Boolean(targetGroup && slot.enabled && (
            operator === '<=' ? availableSeats > 0 && availableSeats <= slot.minAvailableSeats
              : operator === '<' ? availableSeats > 0 && availableSeats < slot.minAvailableSeats
                : operator === '>' ? availableSeats > slot.minAvailableSeats
                  : availableSeats >= slot.minAvailableSeats
          ));
          return {
            slotId: slot.id,
            targetGroup,
            targetDate: slot.targetDate,
            targetCode: slot.targetCode,
            minAvailableSeats: slot.minAvailableSeats,
            comparisonOperator: operator,
            availableSeats,
            isConditionMet,
            orderUrl: targetGroup?.orderUrl || `https://www.kkholiday.com.tw/EW/GO/GroupOrder.asp?prodCd=${slot.targetCode}`,
          };
        });

        setSlotResults(derivedResults);
        setAllGroups(groups);
        setLastCheckedTime(new Date(data.timestamp).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }));

        // Check conditions for each slot
        for (const result of derivedResults) {
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
                  icon: `${BASE_PATH}/images/taipingshan_hero.jpg`,
                });
              } catch (err) {
                console.warn('Notification error:', err);
              }
            }

            addLog({
              timestamp: nowTimeStr,
              status: 'alert',
              date: result.targetDate,
              targetCode: result.targetCode,
              slotLabel: slot.label,
              availableSeats: result.availableSeats,
              message: `${logTitle}${slot.label} (${result.targetDate}) 可售名額為 ${result.availableSeats} 人（符合 ${opSymbol} ${slot.minAvailableSeats} 人，請快點搶票！）`,
              notified: Boolean(data.notificationsConfigured),
              notificationResult: data.notificationsConfigured
                ? 'Telegram 由 GitHub Actions 背景排程處理'
                : '尚未設定 GitHub Actions Secrets',
            });
          }

          prevConditionMetMapRef.current[slot.id] = meetsCondition;
        }

        // Summary log if no alerts triggered
        const anyMet = derivedResults.some((r) => r.isConditionMet);
        if (!anyMet && isManual) {
          const summaryStr = derivedResults
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
      const friendlyMsg = `GitHub Pages 資料暫時無法更新：${errMsg}`;

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
    if (typeof window === 'undefined' || !('Notification' in window)) {
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
          icon: `${BASE_PATH}/images/taipingshan_hero.jpg`,
        });
      } catch (e) {
        console.warn('Simulated notification error:', e);
      }
    }

    addLog({
      timestamp: new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }),
      status: 'test',
      date: targetSlot.targetDate,
      targetCode: targetSlot.targetCode,
      slotLabel: targetSlot.label,
      availableSeats: simulatedSeats,
      message: `【模擬測試】${targetSlot.label} (${targetSlot.targetDate}) 模擬名額釋出 ${simulatedSeats} 人，觸發警報`,
      notified: false,
      notificationResult: '手機模擬已完成；要真正發送 Telegram，請點「Telegram 實測」後執行 Run workflow',
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
              href="https://www.kkholiday.com.tw/EW/GO/GroupList.asp?mGrupCd=ILN34"
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
