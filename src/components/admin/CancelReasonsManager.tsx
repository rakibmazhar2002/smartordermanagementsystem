import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api.ts';
import { CancelReason } from '../../types/index.ts';
import { Plus, Edit2, Trash2, Check, X, ShieldAlert } from 'lucide-react';

export const CancelReasonsManager: React.FC = () => {
  const [reasons, setReasons] = useState<CancelReason[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newReasonText, setNewReasonText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchReasons = async () => {
    setIsLoading(true);
    try {
      const data = await api.getCancelReasons();
      setReasons(data);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to fetch cancel reasons' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReasons();
  }, []);

  const handleCreateReason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReasonText.trim()) return;

    try {
      const created = await api.createCancelReason(newReasonText.trim(), true);
      setReasons(prev => [...prev, created]);
      setNewReasonText('');
      setMessage({ type: 'success', text: 'New cancellation root cause added.' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to add reason' });
    }
  };

  const handleToggleActive = async (reason: CancelReason) => {
    try {
      const updated = await api.updateCancelReason(reason.id, { is_active: !reason.is_active });
      setReasons(prev => prev.map(r => (r.id === reason.id ? updated : r)));
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to toggle status' });
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingText.trim()) return;
    try {
      const updated = await api.updateCancelReason(id, { reason_text: editingText.trim() });
      setReasons(prev => prev.map(r => (r.id === id ? updated : r)));
      setEditingId(null);
      setMessage({ type: 'success', text: 'Reason updated successfully.' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update reason' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this cancellation reason?')) return;
    try {
      await api.deleteCancelReason(id);
      setReasons(prev => prev.filter(r => r.id !== id));
      setMessage({ type: 'success', text: 'Reason deleted.' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete reason' });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-950/70 border border-red-800/80 flex items-center justify-center text-red-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Dynamic Cancel Reasons Manager</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Enforce strict root-cause compliance across all moderator order operations
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-xs font-medium ${
            message.type === 'success'
              ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-200'
              : 'bg-red-950/60 border border-red-800 text-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Add New Reason Form */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
        <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
          Add New Root Cause
        </h2>
        <form onSubmit={handleCreateReason} className="flex gap-2">
          <input
            type="text"
            value={newReasonText}
            onChange={e => setNewReasonText(e.target.value)}
            placeholder="e.g. Courier unable to contact customer after 3 attempts"
            className="grow px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
          />
          <button
            type="submit"
            disabled={!newReasonText.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Reason</span>
          </button>
        </form>
      </div>

      {/* Reasons List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs">
          <span className="font-semibold text-white">Active & Inactive Reason Catalog</span>
          <span className="text-slate-400">{reasons.length} configured items</span>
        </div>

        <div className="divide-y divide-slate-800/80">
          {isLoading ? (
            <div className="py-8 text-center text-xs text-slate-500">
              Loading cancel reasons...
            </div>
          ) : reasons.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No cancel reasons configured yet.
            </div>
          ) : (
            reasons.map(reason => (
              <div
                key={reason.id}
                className="p-3.5 flex items-center justify-between gap-4 hover:bg-slate-850/40 transition"
              >
                {editingId === reason.id ? (
                  <div className="flex items-center gap-2 grow">
                    <input
                      type="text"
                      value={editingText}
                      onChange={e => setEditingText(e.target.value)}
                      className="grow px-2 py-1 text-xs bg-slate-950 border border-slate-700 rounded text-white"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveEdit(reason.id)}
                      className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-500 transition"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 grow min-w-0">
                    <span
                      className={`text-xs ${
                        reason.is_active ? 'text-slate-200' : 'text-slate-500 line-through'
                      }`}
                    >
                      {reason.reason_text}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 shrink-0">
                  {/* Active Toggle */}
                  <button
                    onClick={() => handleToggleActive(reason)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                      reason.is_active
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                    }`}
                  >
                    {reason.is_active ? 'Active' : 'Inactive'}
                  </button>

                  <button
                    onClick={() => {
                      setEditingId(reason.id);
                      setEditingText(reason.reason_text);
                    }}
                    className="p-1 text-slate-400 hover:text-white rounded transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDelete(reason.id)}
                    className="p-1 text-slate-500 hover:text-red-400 rounded transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
