import React from 'react';
import { Order, OrderActivityLog } from '../../types/index.ts';
import { X, History, User, Clock, ArrowRight, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';

interface AuditTimelineModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AuditTimelineModal: React.FC<AuditTimelineModalProps> = ({
  order,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !order) return null;

  const logs = order.activityLogs || [];

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'order_created':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-400">
            <Sparkles className="w-3 h-3" />
            <span>Order Ingestion</span>
          </span>
        );
      case 'status_change':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            <span>Status Transition</span>
          </span>
        );
      case 'order_edit':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400">
            <ArrowRight className="w-3 h-3" />
            <span>Details Revision</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-400">
            <ShieldAlert className="w-3 h-3" />
            <span>Cancellation</span>
          </span>
        );
      default:
        return <span className="text-[11px] text-slate-400">{action}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-950/70 border border-indigo-800/80 flex items-center justify-center text-indigo-400">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                Audit Timeline: Order #{order.id}
              </h2>
              <p className="text-xs text-slate-400">
                Native WooCommerce Audit Trail · Chronological Field-Level Diff History
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-6 overflow-y-auto space-y-4 grow">
          {logs.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-500">
              No previous audit records found for WooCommerce Order #{order.id}.
            </div>
          ) : (
            <div className="relative border-l border-slate-800 ml-3 space-y-6">
              {logs.map((log: OrderActivityLog) => (
                <div key={log.id} className="relative pl-6">
                  {/* Timeline dot */}
                  <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-slate-950 border-2 border-indigo-500" />

                  <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3.5 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        {getActionBadge(log.action_type)}
                        <span className="text-slate-600 text-xs" aria-hidden="true">·</span>
                        <div className="flex items-center gap-1 text-xs text-slate-300 font-medium">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{log.user_name}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono tabular-nums">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      {log.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div>
            Total Logged Events: <span className="font-mono text-slate-200">{logs.length}</span>
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
