'use client';

import React, { useState, useMemo } from 'react';
import { TourGroup } from '@/lib/types';
import { Search, ExternalLink, Calendar, ShieldCheck, Target } from 'lucide-react';

interface AllDeparturesTableProps {
  groups: TourGroup[];
  monitoredCodes: string[];
  onSetAsSlot: (group: TourGroup, slotIndex: number) => void;
  isLoading: boolean;
}

export function AllDeparturesTable({
  groups,
  monitoredCodes,
  onSetAsSlot,
  isLoading,
}: AllDeparturesTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'weekend' | 'available' | 'guaranteed'>('all');

  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches = g.code.toLowerCase().includes(q) || g.date.toLowerCase().includes(q);
        if (!matches) return false;
      }

      if (filterType === 'weekend') {
        return g.date.includes('(六)') || g.date.includes('(日)');
      }
      if (filterType === 'available') {
        return g.availableSeats > 0;
      }
      if (filterType === 'guaranteed') {
        return g.isGuaranteed;
      }

      return true;
    });
  }, [groups, searchQuery, filterType]);

  return (
    <div id="all-groups" className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-sky-700" />
            <h2 className="text-xl font-bold text-stone-900">太平山山毛櫸全梯次總覽 (ILN34)</h2>
          </div>
          <p className="text-sm text-stone-500 mt-0.5">
            共抓取到 <span className="font-semibold text-stone-800 font-mono tabular-nums">{groups.length}</span> 個出發梯次，可隨時將任一梯次指定為「梯次 1」或「梯次 2」
          </p>
        </div>

        {/* Search bar */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="搜尋日期 (如 10/31) 或團號..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-600 focus:bg-white"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-stone-100 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
            filterType === 'all'
              ? 'bg-white text-stone-900 shadow-xs font-semibold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          全部梯次 ({groups.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterType('weekend')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
            filterType === 'weekend'
              ? 'bg-white text-stone-900 shadow-xs font-semibold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          僅週末 (六、日)
        </button>
        <button
          type="button"
          onClick={() => setFilterType('available')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
            filterType === 'available'
              ? 'bg-white text-stone-900 shadow-xs font-semibold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          有名額可報名 (&gt;0)
        </button>
        <button
          type="button"
          onClick={() => setFilterType('guaranteed')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
            filterType === 'guaranteed'
              ? 'bg-white text-stone-900 shadow-xs font-semibold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          保證出團梯次
        </button>
      </div>

      {/* Table presentation */}
      <div className="overflow-x-auto rounded-xl border border-stone-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-stone-600 text-xs font-semibold uppercase tracking-wider border-b border-stone-200">
            <tr>
              <th className="py-3 px-4">出發日期</th>
              <th className="py-3 px-4">團號代碼</th>
              <th className="py-3 px-4">總機位 / 可售名額</th>
              <th className="py-3 px-4">售價</th>
              <th className="py-3 px-4">狀態</th>
              <th className="py-3 px-4 text-right">設為監控標的 / 報名</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 bg-white font-mono">
            {filteredGroups.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-stone-500 font-sans text-xs">
                  {isLoading ? '載入梯次資料中...' : '無符合條件的梯次'}
                </td>
              </tr>
            ) : (
              filteredGroups.map((g) => {
                const monitoredIndex = monitoredCodes.indexOf(g.code);
                const isMonitored = monitoredIndex !== -1;
                const hasSeats = g.availableSeats > 0;

                return (
                  <tr
                    key={g.code}
                    className={`transition-colors ${
                      isMonitored
                        ? 'bg-sky-50/70 font-semibold'
                        : 'hover:bg-stone-50/80'
                    }`}
                  >
                    {/* Date */}
                    <td className="py-3.5 px-4 font-sans text-stone-900">
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums font-medium">{g.date}</span>
                        {isMonitored && (
                          <span className={`text-2xs font-bold px-1.5 py-0.5 rounded-sm text-white ${monitoredIndex === 0 ? 'bg-sky-600' : 'bg-purple-600'}`}>
                            梯次 {monitoredIndex + 1}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Group code */}
                    <td className="py-3.5 px-4 text-xs text-stone-600 tabular-nums">
                      {g.code}
                    </td>

                    {/* Total / Available */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 tabular-nums">
                        <span
                          className={`text-sm font-bold ${
                            g.availableSeats > 5
                              ? 'text-emerald-700'
                              : g.availableSeats > 0
                              ? 'text-amber-600'
                              : 'text-stone-400'
                          }`}
                        >
                          {g.availableSeats}
                        </span>
                        <span className="text-xs text-stone-400">/ {g.totalSeats} 人</span>
                      </div>
                    </td>

                    {/* Price */}
                    <td className="py-3.5 px-4 font-sans text-stone-800 text-xs">
                      NT$ {g.price}
                    </td>

                    {/* Status badge */}
                    <td className="py-3.5 px-4 font-sans text-xs">
                      <div className="flex items-center gap-2">
                        {g.isGuaranteed && (
                          <span className="text-emerald-700 text-xs flex items-center gap-0.5">
                            <ShieldCheck className="w-3.5 h-3.5" /> 保證出團
                          </span>
                        )}
                        <span
                          className={`text-xs ${
                            hasSeats ? 'text-emerald-800 font-medium' : 'text-amber-800'
                          }`}
                        >
                          {g.buttonText}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right font-sans">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSetAsSlot(g, 0)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-2xs font-medium text-sky-800 bg-sky-50 hover:bg-sky-100 rounded-md transition-colors cursor-pointer border border-sky-200"
                          title="將此梯次設為監控標的 1"
                        >
                          <Target className="w-2.5 h-2.5" />
                          <span>設為梯次 1</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onSetAsSlot(g, 1)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-2xs font-medium text-purple-800 bg-purple-50 hover:bg-purple-100 rounded-md transition-colors cursor-pointer border border-purple-200"
                          title="將此梯次設為監控標的 2"
                        >
                          <Target className="w-2.5 h-2.5" />
                          <span>設為梯次 2</span>
                        </button>

                        <a
                          href={g.orderUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                            hasSeats
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                          }`}
                        >
                          <span>{hasSeats ? '報名' : '候補'}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
