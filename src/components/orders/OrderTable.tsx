import React, { useState, useEffect } from 'react';
import { Order, OrderStatus, CancelReason } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import { CancelOrderModal } from './CancelOrderModal.tsx';
import { EditOrderModal } from './EditOrderModal.tsx';
import { AuditTimelineModal } from './AuditTimelineModal.tsx';
import {
  Search,
  Copy,
  Check,
  Edit2,
  History,
  CheckCircle,
  PauseCircle,
  XCircle,
  Truck,
  RotateCcw,
  Package,
} from 'lucide-react';

interface OrderTableProps {
  onRefreshTrigger?: number;
}

export const OrderTable: React.FC<OrderTableProps> = ({ onRefreshTrigger }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [counts, setCounts] = useState({
    all: 0,
    pending: 0,
    approved: 0,
    hold: 0,
    completed: 0,
    cancelled: 0,
  });
  const [activeStatus, setActiveStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [cancelReasons, setCancelReasons] = useState<CancelReason[]>([]);

  // Selection for bulk actions
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);

  // Modals state
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [auditingOrder, setAuditingOrder] = useState<Order | null>(null);

  // 1-Click Copy feedback tracker: key -> boolean
  const [copiedKeys, setCopiedKeys] = useState<{ [key: string]: boolean }>({});

  // Notification Banner
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  const fetchOrders = async (statusTab = activeStatus, search = searchQuery) => {
    setIsLoading(true);
    try {
      const res = await api.getOrders({
        status: statusTab === 'all' ? undefined : statusTab,
        search: search.trim() || undefined,
      });
      setOrders(res.orders);
      setCounts(res.counts);
    } catch (err: any) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCancelReasons = async () => {
    try {
      const data = await api.getCancelReasons();
      setCancelReasons(data);
    } catch (err) {
      console.error('Failed to fetch cancel reasons:', err);
    }
  };

  useEffect(() => {
    fetchOrders(activeStatus, searchQuery);
    fetchCancelReasons();
  }, [activeStatus, onRefreshTrigger]);

  // Handle Search submit
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    fetchOrders(activeStatus, val);
  };

  // 1-Click Clipboard Copy Handler with 1.5s morphing checkmark feedback
  const handleCopy = (copyKey: string, textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopiedKeys(prev => ({ ...prev, [copyKey]: true }));
    setTimeout(() => {
      setCopiedKeys(prev => ({ ...prev, [copyKey]: false }));
    }, 1500);
  };

  // Status transitions
  const handleStatusChange = async (orderId: number, nextStatus: OrderStatus) => {
    try {
      // Optimistic update
      setOrders(prev =>
        prev.map(o => (o.id === orderId ? { ...o, status: nextStatus, updatedAt: new Date().toISOString() } : o))
      );

      const res = await api.updateOrderStatus(orderId, nextStatus);

      let msg = `Order #${orderId} set to ${nextStatus.toUpperCase()}`;
      if (res.syncResult?.metaCapiTriggered) {
        msg += ' · Dispatched WooCommerce Meta CAPI Purchase Dispatcher!';
      }
      setNotification({ type: 'success', message: msg });
      setTimeout(() => setNotification(null), 4000);

      // Refresh to keep server counts synchronized
      fetchOrders(activeStatus, searchQuery);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to update order status' });
      fetchOrders(activeStatus, searchQuery);
    }
  };

  // Confirm Cancellation with mandatory root cause
  const handleConfirmCancel = async (orderId: number, reasonId: string) => {
    const res = await api.updateOrderStatus(orderId, 'cancelled', reasonId);
    setNotification({
      type: 'info',
      message: `Order #${orderId} Cancelled. Dispatched to WooCommerce with internal note.`,
    });
    setTimeout(() => setNotification(null), 4000);
    fetchOrders(activeStatus, searchQuery);
  };

  // Save Edit Order
  const handleSaveEdit = async (orderId: number, data: any) => {
    const res = await api.updateOrderDetails(orderId, data);
    setNotification({
      type: 'success',
      message: `Order #${orderId} updated successfully. Dispatched PUT payload to WooCommerce.`,
    });
    setTimeout(() => setNotification(null), 4000);
    fetchOrders(activeStatus, searchQuery);
  };

  // Open Audit Log
  const handleOpenAudit = async (order: Order) => {
    try {
      const fullOrder = await api.getOrder(order.id);
      setAuditingOrder(fullOrder);
    } catch {
      setAuditingOrder(order);
    }
  };

  // Bulk Actions
  const handleBulkStatus = async (status: OrderStatus) => {
    if (selectedOrderIds.length === 0) return;
    try {
      const res = await api.bulkUpdateStatus(selectedOrderIds, status);
      setNotification({
        type: 'success',
        message: `Updated ${res.count} orders to ${status.toUpperCase()} and queued WooCommerce sync.`,
      });
      setSelectedOrderIds([]);
      fetchOrders(activeStatus, searchQuery);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Bulk update failed' });
    }
  };

  const toggleSelectAll = () => {
    if (selectedOrderIds.length === orders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(orders.map(o => o.id));
    }
  };

  const toggleSelectOrder = (id: number) => {
    setSelectedOrderIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Render Status Badge
  const renderStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center text-xs font-semibold text-amber-400 bg-amber-950/40 border border-amber-900/50 px-2 py-0.5 rounded">
            Pending
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 px-2 py-0.5 rounded">
            Approved
          </span>
        );
      case 'hold':
        return (
          <span className="inline-flex items-center text-xs font-semibold text-indigo-400 bg-indigo-950/40 border border-indigo-900/50 px-2 py-0.5 rounded">
            On Hold
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center text-xs font-semibold text-cyan-400 bg-cyan-950/40 border border-cyan-900/50 px-2 py-0.5 rounded">
            Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center text-xs font-semibold text-red-400 bg-red-950/40 border border-red-900/50 px-2 py-0.5 rounded">
            Cancelled
          </span>
        );
      default:
        return <span className="text-xs text-slate-400">{status}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3 rounded-lg text-xs font-medium flex items-center justify-between border ${
            notification.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
              : notification.type === 'info'
              ? 'bg-indigo-950/60 border-indigo-800 text-indigo-200'
              : 'bg-red-950/60 border-red-800 text-red-200'
          }`}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white ml-2 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Control Bar: Status Tabs & High-Speed Search */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-slate-900/90 p-3 rounded-xl border border-slate-800 shadow-sm">
        {/* Status Tabs with live count badges */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0">
          {[
            { key: 'all', label: 'All Orders', count: counts.all },
            { key: 'pending', label: 'Pending', count: counts.pending },
            { key: 'approved', label: 'Approved', count: counts.approved },
            { key: 'hold', label: 'Hold', count: counts.hold },
            { key: 'completed', label: 'Completed', count: counts.completed },
            { key: 'cancelled', label: 'Cancelled', count: counts.cancelled },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveStatus(tab.key);
                fetchOrders(tab.key, searchQuery);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition ${
                activeStatus === tab.key
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`font-mono text-[11px] tabular-nums px-1.5 py-0.2 rounded-full ${
                  activeStatus === tab.key
                    ? 'bg-indigo-700/80 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* High-speed Search by #Order ID, Phone, Customer */}
        <div className="relative min-w-[280px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search by #7103, Phone, or Name..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                fetchOrders(activeStatus, '');
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Bulk Operations Toolbar (Visible when rows selected) */}
      {selectedOrderIds.length > 0 && (
        <div className="flex items-center justify-between p-2.5 bg-indigo-950/40 border border-indigo-800/60 rounded-lg text-xs text-indigo-200 animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">{selectedOrderIds.length} orders selected</span>
            <span className="text-indigo-400">· Ready for bulk operation</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkStatus('approved')}
              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition"
            >
              Bulk Approve
            </button>
            <button
              onClick={() => handleBulkStatus('hold')}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition"
            >
              Bulk Hold
            </button>
            <button
              onClick={() => handleBulkStatus('completed')}
              className="px-2.5 py-1 rounded bg-cyan-700 hover:bg-cyan-600 text-white font-medium transition"
            >
              Bulk Complete
            </button>
            <button
              onClick={() => setSelectedOrderIds([])}
              className="px-2.5 py-1 rounded text-slate-400 hover:text-white transition"
            >
              Cancel Selection
            </button>
          </div>
        </div>
      )}

      {/* High-Density Order Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={orders.length > 0 && selectedOrderIds.length === orders.length}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3">Order ID</th>
                <th className="py-3 px-3">Customer Details & 1-Click Copy</th>
                <th className="py-3 px-3">Delivery Address</th>
                <th className="py-3 px-3">Items & Total</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Quick Operations</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      <span>Loading high-concurrency order ledger...</span>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Package className="w-8 h-8 text-slate-600 mx-auto" />
                      <p className="text-slate-300 font-medium">No matching orders found</p>
                      <p className="text-xs text-slate-500">
                        Try adjusting your search query or status filter.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map(order => {
                  const isSelected = selectedOrderIds.includes(order.id);
                  const nameKey = `name_${order.id}`;
                  const phoneKey = `phone_${order.id}`;
                  const addrKey = `addr_${order.id}`;

                  // Sanitize phone for clean copying
                  const cleanPhone = order.phone.replace(/[^0-9+]/g, '');

                  return (
                    <tr
                      key={order.id}
                      className={`hover:bg-slate-850/70 transition-colors group ${
                        isSelected ? 'bg-indigo-950/20' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOrder(order.id)}
                          className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      {/* STRICT ORDER ID: Native WooCommerce ID Solely (#7103) */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-sm text-indigo-400 tabular-nums">
                            #{order.id}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono tabular-nums">
                          {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Customer Details with 1-Click Copy Buttons */}
                      <td className="py-3 px-3">
                        <div className="space-y-1">
                          {/* Name + 1-Click Copy */}
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-200 truncate max-w-[160px]">
                              {order.customer_name}
                            </span>
                            <button
                              onClick={() => handleCopy(nameKey, order.customer_name)}
                              title="Copy Customer Name"
                              className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition"
                            >
                              {copiedKeys[nameKey] ? (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-400">
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Copied!</span>
                                </span>
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>

                          {/* Phone + 1-Click Copy */}
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-slate-400 text-xs">
                              {order.phone}
                            </span>
                            <button
                              onClick={() => handleCopy(phoneKey, cleanPhone)}
                              title="Copy Sanitized Phone Number"
                              className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition"
                            >
                              {copiedKeys[phoneKey] ? (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-400">
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Copied!</span>
                                </span>
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Delivery Address with 1-Click Copy */}
                      <td className="py-3 px-3 max-w-[240px]">
                        <div className="flex items-start gap-1.5 group/addr">
                          <span className="text-slate-300 text-xs leading-snug line-clamp-2">
                            {order.address}
                          </span>
                          <button
                            onClick={() => handleCopy(addrKey, order.address)}
                            title="Copy Full Delivery Address"
                            className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition shrink-0"
                          >
                            {copiedKeys[addrKey] ? (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-400">
                                <Check className="w-3.5 h-3.5" />
                                <span>Copied!</span>
                              </span>
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Items & Total */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-100 tabular-nums">
                          {order.total_amount.toLocaleString()} ৳
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {order.items_json?.length || 0} items · Ship: {order.shipping_fee} ৳
                        </div>
                        {order.items_json && order.items_json[0] && (
                          <div className="text-[10px] text-slate-500 truncate max-w-[150px]">
                            {order.items_json[0].name} ({order.items_json[0].quantity}x)
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div>{renderStatusBadge(order.status)}</div>
                        {order.cancel_reason && (
                          <div className="text-[10px] text-red-400 mt-1 truncate max-w-[120px]" title={order.cancel_reason.reason_text}>
                            {order.cancel_reason.reason_text}
                          </div>
                        )}
                      </td>

                      {/* Quick Operations Buttons */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* Status buttons based on current state */}
                          {order.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleStatusChange(order.id, 'approved')}
                                title="Confirm Lead (Approve & Sync WC)"
                                className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-600/90 hover:bg-emerald-500 text-white font-medium text-[11px] transition shadow-xs"
                              >
                                <CheckCircle className="w-3 h-3" />
                                <span>Approve</span>
                              </button>

                              <button
                                onClick={() => handleStatusChange(order.id, 'hold')}
                                title="Put Order On Hold"
                                className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] transition"
                              >
                                <PauseCircle className="w-3 h-3 text-indigo-400" />
                                <span>Hold</span>
                              </button>
                            </>
                          )}

                          {order.status === 'approved' && (
                            <>
                              <button
                                onClick={() => handleStatusChange(order.id, 'completed')}
                                title="Mark Completed (Dispatches WC Meta CAPI Purchase Event!)"
                                className="flex items-center gap-1 px-2 py-1 rounded bg-cyan-700 hover:bg-cyan-600 text-white font-medium text-[11px] transition shadow-xs"
                              >
                                <Truck className="w-3 h-3" />
                                <span>Complete</span>
                              </button>

                              <button
                                onClick={() => handleStatusChange(order.id, 'hold')}
                                title="Put Order On Hold"
                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                              >
                                <PauseCircle className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {order.status === 'hold' && (
                            <button
                              onClick={() => handleStatusChange(order.id, 'approved')}
                              title="Resume to Approved"
                              className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-medium text-[11px] transition"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Re-Approve</span>
                            </button>
                          )}

                          {order.status !== 'cancelled' && (
                            <button
                              onClick={() => setCancellingOrder(order)}
                              title="Strict Cancellation Flow"
                              className="p-1 rounded bg-slate-800 hover:bg-red-950/80 hover:text-red-400 text-slate-400 transition"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Edit Details */}
                          <button
                            onClick={() => setEditingOrder(order)}
                            title="Edit Order Details & Items"
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Audit Timeline */}
                          <button
                            onClick={() => handleOpenAudit(order)}
                            title="View Chronological Audit Timeline"
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-indigo-400 transition"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Stats */}
        <div className="px-4 py-3 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing <span className="font-mono font-semibold text-slate-200">{orders.length}</span> orders
            {activeStatus !== 'all' && <span> in status <span className="capitalize text-indigo-400 font-medium">{activeStatus}</span></span>}
          </div>
          <div className="font-mono text-[11px] text-slate-500">
            Zero-Latency SOMS · Two-Way WC Sync Active
          </div>
        </div>
      </div>

      {/* Cancellation Modal */}
      {cancellingOrder && (
        <CancelOrderModal
          order={cancellingOrder}
          cancelReasons={cancelReasons}
          isOpen={Boolean(cancellingOrder)}
          onClose={() => setCancellingOrder(null)}
          onConfirmCancel={handleConfirmCancel}
        />
      )}

      {/* Edit Order Modal */}
      {editingOrder && (
        <EditOrderModal
          order={editingOrder}
          isOpen={Boolean(editingOrder)}
          onClose={() => setEditingOrder(null)}
          onSave={handleSaveEdit}
        />
      )}

      {/* Audit Timeline Modal */}
      {auditingOrder && (
        <AuditTimelineModal
          order={auditingOrder}
          isOpen={Boolean(auditingOrder)}
          onClose={() => setAuditingOrder(null)}
        />
      )}
    </div>
  );
};
