import React, { useState } from 'react';
import { CancelReason, Order } from '../../types/index.ts';
import { X, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface CancelOrderModalProps {
  order: Order;
  cancelReasons: CancelReason[];
  isOpen: boolean;
  onClose: () => void;
  onConfirmCancel: (orderId: number, reasonId: string) => Promise<void>;
}

export const CancelOrderModal: React.FC<CancelOrderModalProps> = ({
  order,
  cancelReasons,
  isOpen,
  onClose,
  onConfirmCancel,
}) => {
  const [selectedReasonId, setSelectedReasonId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const activeReasons = cancelReasons.filter(r => r.is_active);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReasonId) {
      setErrorMessage('A cancellation reason must be selected before submitting.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await onConfirmCancel(order.id, selectedReasonId);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to cancel order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-950/70 border border-red-800/80 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                Cancel WooCommerce Order #{order.id}
              </h2>
              <p className="text-xs text-slate-400">
                Customer: {order.customer_name} ({order.phone})
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3.5 bg-red-950/30 border border-red-900/40 rounded-lg text-xs text-red-300 space-y-1">
            <p className="font-semibold text-red-200">Strict Cancellation Governance:</p>
            <p>
              Cancelling Order #{order.id} will update its status to <span className="font-mono">cancelled</span>, dispatch an outbound WooCommerce REST API call, and append the selected reason as an internal order note in WooCommerce.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-900/50 border border-red-700 text-red-200 text-xs rounded-lg">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Mandatory Cancellation Root Cause <span className="text-red-400">*</span>
            </label>
            <select
              value={selectedReasonId}
              onChange={e => {
                setSelectedReasonId(e.target.value);
                setErrorMessage(null);
              }}
              required
              className="w-full px-3 py-2.5 text-sm bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
            >
              <option value="" disabled>
                -- Select Root Cause Reason --
              </option>
              {activeReasons.map(r => (
                <option key={r.id} value={r.id}>
                  {r.reason_text}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Submission remains strictly disabled until a valid category is chosen.
            </p>
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={!selectedReasonId || isSubmitting}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg transition shadow-md shadow-red-600/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span>Syncing Cancellation...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirm Cancellation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
