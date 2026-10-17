import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api.ts';
import { ExecutiveAnalyticsData } from '../../types/index.ts';
import {
  TrendingUp,
  DollarSign,
  UserCheck,
  AlertOctagon,
  Calendar,
  RefreshCw,
  Clock,
  CheckCircle2,
  PauseCircle,
  Truck,
  XCircle,
  Zap,
} from 'lucide-react';

export const ExecutiveDashboard: React.FC = () => {
  const [data, setData] = useState<ExecutiveAnalyticsData | null>(null);
  const [selectedRange, setSelectedRange] = useState<string>('today');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = async (range = selectedRange) => {
    setIsLoading(true);
    try {
      const res = await api.getAnalytics({
        range,
        startDate: range === 'custom' ? customStart : undefined,
        endDate: range === 'custom' ? customEnd : undefined,
      });
      setData(res);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(selectedRange);
  }, [selectedRange]);

  const handleRangeChange = (rangeKey: string) => {
    setSelectedRange(rangeKey);
  };

  const handleApplyCustom = () => {
    if (customStart && customEnd) {
      fetchAnalytics('custom');
    }
  };

  const getRangeLabel = () => {
    switch (selectedRange) {
      case 'today':
        return "Today's Pulse";
      case 'yesterday':
        return "Yesterday's Pulse";
      case 'last7days':
        return "Last 7 Days' Pulse";
      case 'thismonth':
        return "This Month's Pulse";
      case 'custom':
        return "Custom Range Pulse";
      default:
        return "Performance Pulse";
    }
  };

  if (!data && isLoading) {
    return (
      <div className="py-20 text-center text-slate-500">
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span>Generating executive analytics ledger...</span>
        </div>
      </div>
    );
  }

  const pulse = (data?.pulse as any) || {
    total: 0,
    pending: 0,
    approved: 0,
    hold: 0,
    completed: 0,
    cancelled: 0,
    metaCapiDispatched: 0,
    pendingPercent: 0,
    approvedPercent: 0,
    holdPercent: 0,
    completedPercent: 0,
    cancelledPercent: 0,
    grossRevenue: 0,
  };

  return (
    <div className="space-y-6">
      {/* Executive Header & Date Range Filter Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-md">
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-400" />
            <span>Executive Analytics & Moderator Performance</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Volume & Conversion Health (Order Created Date) · Operations & Moderation (Live Staff Productivity)
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { key: 'today', label: 'Today' },
            { key: 'yesterday', label: 'Yesterday' },
            { key: 'last7days', label: 'Last 7 Days' },
            { key: 'thismonth', label: 'This Month' },
            { key: 'custom', label: 'Custom' },
          ].map(r => (
            <button
              key={r.key}
              onClick={() => handleRangeChange(r.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition ${
                selectedRange === r.key
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800'
              }`}
            >
              {r.label}
            </button>
          ))}

          <button
            onClick={() => fetchAnalytics(selectedRange)}
            title="Refresh analytics"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-950 border border-slate-800 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Custom Range Drawer */}
      {selectedRange === 'custom' && (
        <div className="flex items-center gap-3 p-3 bg-slate-900/80 border border-slate-800 rounded-lg text-xs">
          <Calendar className="w-4 h-4 text-indigo-400" />
          <span className="text-slate-300 font-medium">Select Range:</span>
          <input
            type="date"
            value={customStart}
            onChange={e => setCustomStart(e.target.value)}
            className="px-2 py-1 bg-slate-950 border border-slate-800 rounded text-slate-200 text-xs"
          />
          <span className="text-slate-500">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={e => setCustomEnd(e.target.value)}
            className="px-2 py-1 bg-slate-950 border border-slate-800 rounded text-slate-200 text-xs"
          />
          <button
            onClick={handleApplyCustom}
            className="px-3 py-1 bg-indigo-600 text-white rounded text-xs font-semibold hover:bg-indigo-500 transition"
          >
            Apply Range
          </button>
        </div>
      )}

      {/* SECTION 1: Dynamic Pulse Title - KPI Metric Cards (Order Created Date) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            {getRangeLabel()} · Volume & Conversion Health
          </div>
          <span className="text-[11px] text-teal-400 font-medium hidden sm:inline">
            ✓ All Pulse metrics reflect Order Created Date
          </span>
        </div>

        {/* 7 Metric Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {/* 1. Total (Order Created Date) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Total Ingested</span>
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold font-mono text-white tabular-nums">
                {pulse.total}
              </div>
              <div className="text-[11px] text-indigo-400 font-medium mt-0.5">Order Created Date</div>
            </div>
          </div>

          {/* 2. Pending (Order Created Date) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Awaiting Call</span>
              <Clock className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold font-mono text-amber-400 tabular-nums">
                {pulse.pending}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                <span className="font-mono tabular-nums">{pulse.pendingPercent}%</span> of created
              </div>
            </div>
          </div>

          {/* 3. Approved (Order Created Date) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Approved</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
                {pulse.approved}
              </div>
              <div className="text-[11px] text-emerald-400 font-medium mt-0.5">
                <span className="font-mono tabular-nums">{pulse.approvedPercent}%</span> (Created Date)
              </div>
            </div>
          </div>

          {/* 4. On Hold (Order Created Date) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>On Hold</span>
              <PauseCircle className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold font-mono text-indigo-400 tabular-nums">
                {pulse.hold}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                <span className="font-mono tabular-nums">{pulse.holdPercent}%</span> delayed
              </div>
            </div>
          </div>

          {/* 5. Completed (Order Created Date) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Completed</span>
              <Truck className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold font-mono text-cyan-400 tabular-nums">
                {pulse.completed}
              </div>
              <div className="text-[11px] text-cyan-400 font-medium mt-0.5">Courier Delivered</div>
            </div>
          </div>

          {/* 6. Meta CAPI Dispatched */}
          <div className="bg-slate-900 border border-violet-900/60 bg-gradient-to-b from-slate-900 to-violet-950/20 rounded-xl p-3.5 flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between text-violet-300 text-xs">
              <span className="font-medium">Meta CAPI Dispatched</span>
              <Zap className="w-3.5 h-3.5 text-violet-400" />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold font-mono text-violet-400 tabular-nums">
                {pulse.metaCapiDispatched ?? pulse.approved}
              </div>
              <div className="text-[11px] text-violet-400/90 font-medium mt-0.5">Order Created Date</div>
            </div>
          </div>

          {/* 7. Cancelled (Order Created Date) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Cancelled</span>
              <XCircle className="w-3.5 h-3.5 text-red-400" />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold font-mono text-red-400 tabular-nums">
                {pulse.cancelled}
              </div>
              <div className="text-[11px] text-red-400/80 font-medium mt-0.5">Order Created Date</div>
            </div>
          </div>
        </div>

        {/* Gross Revenue banner */}
        <div className="mt-3 bg-gradient-to-r from-slate-900 to-indigo-950/40 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-950/80 border border-emerald-800/80 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400">Confirmed Gross Pipeline Revenue (Order Created Window)</div>
              <div className="text-xl font-bold font-mono text-white tabular-nums">
                {pulse.grossRevenue.toLocaleString()} BDT
              </div>
            </div>
          </div>
          <div className="text-right text-xs text-slate-400 hidden sm:block">
            <span>Approved & Delivered Orders Created in this Window</span>
          </div>
        </div>
      </div>

      {/* SECTION 2: Moderator Performance & Cancellation Root Cause */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Moderator Performance Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-semibold text-white">
                Moderator Operations & Output
              </h2>
            </div>
            <span className="text-[11px] text-slate-500">Live Staff Productivity (Action Date)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-2">Staff Member</th>
                  <th className="py-2.5 px-2 text-right">Calls</th>
                  <th className="py-2.5 px-2 text-right">Hold</th>
                  <th className="py-2.5 px-2 text-right">Approved</th>
                  <th className="py-2.5 px-2 text-right">Completed</th>
                  <th className="py-2.5 px-2 text-right">Cancelled</th>
                  <th className="py-2.5 px-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono tabular-nums">
                {data?.moderatorPerformance && data.moderatorPerformance.length > 0 ? (
                  data.moderatorPerformance.map(mod => {
                    const m = mod as any;
                    return (
                      <tr key={m.moderator_id} className="hover:bg-slate-850/50 transition-colors">
                        <td className="py-2.5 px-2 font-sans font-medium text-slate-200">
                          {m.moderator_name}
                        </td>
                        <td className="py-2.5 px-2 text-right text-amber-300 font-semibold">
                          {m.calls_made ?? 0}
                        </td>
                        <td className="py-2.5 px-2 text-right text-indigo-400 font-semibold">
                          {m.hold ?? 0}
                        </td>
                        <td className="py-2.5 px-2 text-right text-emerald-400 font-bold">
                          {m.approved ?? m.confirmations ?? 0}
                        </td>
                        <td className="py-2.5 px-2 text-right text-cyan-400 font-semibold">
                          {m.completed ?? 0}
                        </td>
                        <td className="py-2.5 px-2 text-right text-rose-400 font-semibold">
                          {m.cancellations ?? 0}
                        </td>
                        <td className="py-2.5 px-2 text-right text-slate-400">
                          {m.total_actions ?? 0}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-500 font-sans">
                      No moderator activities recorded in this timeframe.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cancellation Root-Cause Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-red-400" />
              <h2 className="text-sm font-semibold text-white">
                Cancellation Root-Cause Analysis
              </h2>
            </div>
            <span className="text-[11px] text-slate-500">Reason Breakdown (Order Created Date)</span>
          </div>

          <div className="space-y-3 pt-1">
            {data?.rootCauses && data.rootCauses.length > 0 ? (
              data.rootCauses.map(cause => (
                <div key={cause.reason_id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 truncate max-w-[280px]">
                      {cause.reason_text}
                    </span>
                    <span className="font-mono text-slate-400 tabular-nums">
                      {cause.count} ({cause.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className="bg-red-500/80 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(cause.percentage, 4)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs">
                No orders created in this window have been cancelled.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
