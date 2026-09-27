'use client';

import React from 'react';
import { CheckLog } from '@/lib/types';
import { History, Trash2, CheckCircle2, AlertTriangle, Sparkles, AlertCircle } from 'lucide-react';

interface ActivityLogsProps {
  logs: CheckLog[];
  onClearLogs: () => void;
}

export function ActivityLogs({ logs, onClearLogs }: ActivityLogsProps) {
  return (
    <div id="logs" className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-stone-200 pb-4">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-emerald-700" />
          <h2 className="text-lg font-bold text-stone-900">即時監控日誌與推播紀錄</h2>
        </div>

        {logs.length > 0 && (
          <button
            type="button"
            onClick={onClearLogs}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>清除日誌</span>
          </button>
        )}
      </div>

      {logs.length === 0 ? (
        <div className="py-12 text-center text-stone-400 text-xs">
          尚無監控紀錄，啟動監控或點擊「手動重整」後將即時記錄於此。
        </div>
      ) : (
        <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
          {logs.map((log) => {
            const isAlert = log.status === 'alert';
            const isTest = log.status === 'test';
            const isError = log.status === 'error';

            return (
              <div
                key={log.id}
                className={`p-3.5 rounded-xl border text-xs flex items-start justify-between gap-3 transition-colors ${
                  isAlert
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-medium'
                    : isTest
                    ? 'bg-amber-50 border-amber-200 text-amber-950'
                    : isError
                    ? 'bg-red-50 border-red-200 text-red-950'
                    : 'bg-stone-50/70 border-stone-200 text-stone-800'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {isAlert ? (
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : isTest ? (
                    <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  ) : isError ? (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                  )}

                  <div className="space-y-0.5">
                    <div className="font-semibold text-stone-900 flex items-center gap-2">
                      <span>{log.message}</span>
                      {log.notified && (
                        <span className="text-2xs font-semibold text-white bg-emerald-700 px-1.5 py-0.5 rounded-sm">
                          LINE 推播已送達
                        </span>
                      )}
                    </div>
                    {log.notificationResult && (
                      <p className="text-stone-500 font-mono text-2xs">
                        {log.notificationResult}
                      </p>
                    )}
                  </div>
                </div>

                <div className="shrink-0 text-stone-400 font-mono text-2xs tabular-nums text-right">
                  {log.timestamp.split(' ')[1] || log.timestamp}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
