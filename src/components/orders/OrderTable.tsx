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
  Package,
  RotateCw,
  CloudDownload,
  Clock,
  Calendar,
  Hash,
  ChevronDown,
  PhoneCall,
  Lock,
  MessageSquare,
  X,
  Send,
} from 'lucide-react';

interface OrderTableProps {
  onRefreshTrigger?: number;
}

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; dot: string; text: string; bgBtn: string; hoverBg: string }
> = {
  pending: {
    label: 'Pending',
    dot: 'bg-amber-400',
    text: 'text-amber-400',
    bgBtn: 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20',
    hoverBg: 'hover:bg-amber-500/10',
  },
  approved: {
    label: 'Approved',
    dot: 'bg-emerald-400',
    text: 'text-emerald-400',
    bgBtn: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20',
    hoverBg: 'hover:bg-emerald-500/10',
  },
  hold: {
    label: 'On Hold',
    dot: 'bg-indigo-400',
    text: 'text-indigo-400',
    bgBtn: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20',
    hoverBg: 'hover:bg-indigo-500/10',
  },
  completed: {
    label: 'Completed',
    dot: 'bg-cyan-400',
    text: 'text-cyan-400',
    bgBtn: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20',
    hoverBg: 'hover:bg-cyan-500/10',
  },
  cancelled: {
    label: 'Cancelled',
    dot: 'bg-rose-400',
    text: 'text-rose-400',
    bgBtn: 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20',
    hoverBg: 'hover:bg-rose-500/10',
  },
};

// আপনার নির্ধারিত কঠোর স্ট্যাটাস রুলস
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['approved', 'hold', 'cancelled'], // পেন্ডিং থেকে এপ্রুভ, হোল্ড ও ক্যানসেল
  approved: ['completed'],                    // এপ্রুভ থেকে শুধুমাত্র কমপ্লিট
  hold: ['approved', 'cancelled'],            // হোল্ড থেকে শুধুমাত্র এপ্রুভ ও ক্যানসেল
  completed: [],                              // কমপ্লিট হলে লকড
  cancelled: [],                              // ক্যানসেল হলে লকড
};

// দ্রুত কমেন্ট দেওয়ার প্রিসেট চিপস
const QUICK_COMMENT_PRESETS = [
  '📞 ১ম বার কল - রিসিভ করেনি',
  '📞 ২য় বার কল - রিং হয়ে কেটে গেছে',
  '⏰ পরে কল করতে বলেছে',
  '💬 হোয়াটসঅ্যাপে মেসেজ পাঠানো হয়েছে',
  '🚫 নম্বর বন্ধ / সংযোগ সম্ভব নয়',
  '📍 ডেলিভারি ঠিকানা কনফার্ম করা হয়েছে',
];

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

  const [activeStatus, setActiveStatus] = useState<string>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [cancelReasons, setCancelReasons] = useState<CancelReason[]>([]);

  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [openDropdownOrderId, setOpenDropdownOrderId] = useState<number | null>(null);

  // Pull Order Modal States
  const [isPullModalOpen, setIsPullModalOpen] = useState(false);
  const [pullMode, setPullMode] = useState<'id' | 'last24' | 'custom'>('id');
  const [pullOrderIdInput, setPullOrderIdInput] = useState('');
  const [pullStartDate, setPullStartDate] = useState('');
  const [pullEndDate, setPullEndDate] = useState('');
  const [isPulling, setIsPulling] = useState(false);

  // Modals state
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [auditingOrder, setAuditingOrder] = useState<Order | null>(null);

  // Internal Comment Modal States
  const [commentingOrder, setCommentingOrder] = useState<Order | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const [copiedKeys, setCopiedKeys] = useState<{ [key: string]: boolean }>({});
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.status-dropdown-wrapper')) {
        setOpenDropdownOrderId(null);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const fetchOrders = async (statusTab = activeStatus, search = searchQuery, silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await api.getOrders({
        status: statusTab === 'all' ? undefined : statusTab,
        search: search.trim() || undefined,
      });
      setOrders(res.orders);
      setCounts(res.counts);
    } catch (err: any) {
      if (!silent) console.error('Failed to fetch orders:', err);
    } finally {
      if (!silent) setIsLoading(false);
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

    const pollTimer = setInterval(() => {
      fetchOrders(activeStatus, searchQuery, true);
    }, 5000);

    return () => clearInterval(pollTimer);
  }, [activeStatus, searchQuery, onRefreshTrigger]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    fetchOrders(activeStatus, val);
  };

  const handleCopy = (copyKey: string, textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopiedKeys(prev => ({ ...prev, [copyKey]: true }));
    setTimeout(() => {
      setCopiedKeys(prev => ({ ...prev, [copyKey]: false }));
    }, 1500);
  };

  const handleStatusChange = async (orderId: number, nextStatus: OrderStatus) => {
    setOpenDropdownOrderId(null);
    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) return;

    const allowed = ALLOWED_TRANSITIONS[targetOrder.status] || [];
    if (!allowed.includes(nextStatus)) {
      setNotification({
        type: 'error',
        message: `${targetOrder.status.toUpperCase()} থেকে ${nextStatus.toUpperCase()} এ স্ট্যাটাস নেওয়া অনুমোদিত নয়।`,
      });
      setTimeout(() => setNotification(null), 4000);
      return;
    }

    try {
      setOrders(prev =>
        prev.map(o => (o.id === orderId ? { ...o, status: nextStatus, updatedAt: new Date().toISOString() } : o))
      );

      await api.updateOrderStatus(orderId, nextStatus);
      setNotification({ type: 'success', message: `Order #${orderId} updated to ${nextStatus.toUpperCase()}` });
      setTimeout(() => setNotification(null), 4000);
      fetchOrders(activeStatus, searchQuery, true);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to update order status' });
      fetchOrders(activeStatus, searchQuery);
    }
  };

  const handleConfirmCancel = async (orderId: number, reasonId: string) => {
    await api.updateOrderStatus(orderId, 'cancelled', reasonId);
    setNotification({ type: 'info', message: `Order #${orderId} Cancelled.` });
    setTimeout(() => setNotification(null), 4000);
    fetchOrders(activeStatus, searchQuery, true);
  };

  const handleSaveEdit = async (orderId: number, data: any) => {
    await api.updateOrderDetails(orderId, data);
    setNotification({ type: 'success', message: `Order #${orderId} updated successfully.` });
    setTimeout(() => setNotification(null), 4000);
    fetchOrders(activeStatus, searchQuery, true);
  };

  const handleOpenAudit = async (order: Order) => {
    try {
      const fullOrder = await api.getOrder(order.id);
      setAuditingOrder(fullOrder);
    } catch {
      setAuditingOrder(order);
    }
  };

  // ইন্টারনাল কমেন্ট সেভ করার সাবমিট হ্যান্ডলার
  const handleSaveComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentingOrder || !commentText.trim()) return;
    setIsSubmittingComment(true);

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token') || '';
      const res = await fetch(`/api/orders/${commentingOrder.id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ note: commentText.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save comment');

      setNotification({
        type: 'success',
        message: `Order #${commentingOrder.id}-এ ইন্টার্নাল নোট যুক্ত হয়েছে।`,
      });
      setTimeout(() => setNotification(null), 4000);
      setCommentingOrder(null);
      setCommentText('');
      fetchOrders(activeStatus, searchQuery, true);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to save comment' });
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handlePullOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPulling(true);
    try {
      let payload: any = {};

      if (pullMode === 'id') {
        if (!pullOrderIdInput.trim()) {
          throw new Error('দয়া করে অর্ডার আইডিটি লিখুন (যেমন: 12463)।');
        }
        payload = { orderId: pullOrderIdInput.trim() };
      } else if (pullMode === 'last24') {
        payload = { hours: 24 };
      } else if (pullMode === 'custom') {
        if (!pullStartDate) {
          throw new Error('শুরুর তারিখ ও সময় নির্বাচন করুন।');
        }
        payload = {
          startDate: new Date(pullStartDate).toISOString(),
          endDate: pullEndDate ? new Date(pullEndDate).toISOString() : undefined,
        };
      }

      const res = await api.pullOrders(payload);
      setNotification({ type: 'success', message: res.message });
      setIsPullModalOpen(false);
      setPullOrderIdInput('');
      setPullStartDate('');
      setPullEndDate('');
      fetchOrders(activeStatus, searchQuery);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Pull order failed.' });
    } finally {
      setIsPulling(false);
    }
  };

  const handleBulkStatus = async (status: OrderStatus) => {
    if (selectedOrderIds.length === 0) return;
    try {
      const res = await api.bulkUpdateStatus(selectedOrderIds, status);
      setNotification({ type: 'success', message: `Updated ${res.count} orders.` });
      setSelectedOrderIds([]);
      fetchOrders(activeStatus, searchQuery, true);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Bulk update failed' });
    }
  };

  const toggleSelectAll = () => {
    if (selectedOrderIds.length === orders.length) setSelectedOrderIds([]);
    else setSelectedOrderIds(orders.map(o => o.id));
  };

  const toggleSelectOrder = (id: number) => {
    setSelectedOrderIds(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]));
  };

  return (
    <div className="space-y-4">
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
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white ml-2 text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Row 1: Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 select-none">
        {[
          { key: 'pending', label: 'Pending', count: counts.pending },
          { key: 'all', label: 'All', count: counts.all },
          { key: 'approved', label: 'Approved', count: counts.approved },
          { key: 'hold', label: 'Hold', count: counts.hold },
          { key: 'completed', label: 'Completed', count: counts.completed },
          { key: 'cancelled', label: 'Cancelled', count: counts.cancelled },
        ].map(tab => {
          const isActive = activeStatus === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveStatus(tab.key);
                fetchOrders(tab.key, searchQuery);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-all border shadow-xs ${
                isActive
                  ? 'bg-teal-600 text-white border-teal-500 shadow-md shadow-teal-900/30 font-semibold'
                  : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white hover:bg-slate-850'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`font-mono text-[11px] tabular-nums px-2 py-0.5 rounded border ${
                  isActive
                    ? 'bg-teal-700/80 text-white border-teal-400/40 font-bold'
                    : 'bg-slate-800 text-slate-400 border-slate-700/80 font-normal'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Row 2: Search Bar & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchOrders(activeStatus, searchQuery)}
            title="Reload Orders"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition border border-slate-700/60"
          >
            <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsPullModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition shadow-xs"
            title="Sync Missed Orders Directly from WooCommerce"
          >
            <CloudDownload className="w-4 h-4" />
            <span>Pull Order</span>
          </button>

          <span className="text-xs text-slate-400 font-medium hidden sm:inline ml-1">
            Showing <strong className="text-white font-mono">{orders.length}</strong> orders
          </span>
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search by #Order ID, Phone, Customer..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500 transition"
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

      {/* Bulk Operations Toolbar */}
      {selectedOrderIds.length > 0 && (
        <div className="flex items-center justify-between p-2.5 bg-indigo-950/40 border border-indigo-800/60 rounded-lg text-xs text-indigo-200">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">{selectedOrderIds.length} orders selected</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => handleBulkStatus('approved')} className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium">Bulk Approve</button>
            <button onClick={() => handleBulkStatus('hold')} className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium">Bulk Hold</button>
            <button onClick={() => handleBulkStatus('completed')} className="px-2.5 py-1 rounded bg-cyan-700 hover:bg-cyan-600 text-white font-medium">Bulk Complete</button>
            <button onClick={() => setSelectedOrderIds([])} className="px-2.5 py-1 rounded text-slate-400 hover:text-white">Cancel</button>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-visible shadow-xl">
        <div className="overflow-x-auto min-h-[360px]">
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
                <th className="py-3 px-3">Items & Size Details</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                      <span>Loading orders ledger...</span>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Package className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-300 font-medium">No matching orders found</p>
                  </td>
                </tr>
              ) : (
                orders.map((order, index) => {
                  const isSelected = selectedOrderIds.includes(order.id);
                  const nameKey = `name_${order.id}`;
                  const phoneKey = `phone_${order.id}`;
                  const addrKey = `addr_${order.id}`;
                  const cleanPhone = order.phone.replace(/[^0-9+]/g, '');

                  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                  const isDropdownOpen = openDropdownOrderId === order.id;
                  const isNearBottom = index >= orders.length - 2 && orders.length > 3;

                  // Completed বা Cancelled হলে ফাইনাল লক
                  const isStatusLocked = order.status === 'completed' || order.status === 'cancelled';
                  const availableTargets = ALLOWED_TRANSITIONS[order.status] || [];

                  return (
                    <tr
                      key={order.id}
                      className={`hover:bg-slate-850/70 transition-colors group ${
                        isSelected ? 'bg-indigo-950/20' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOrder(order.id)}
                          className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-mono font-bold text-sm text-indigo-400 tabular-nums">
                          #{order.id}
                        </span>
                        <div className="text-[10px] text-slate-500 font-mono tabular-nums">
                          {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-200 truncate max-w-[160px]">{order.customer_name}</span>
                            <button onClick={() => handleCopy(nameKey, order.customer_name)} className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800">
                              {copiedKeys[nameKey] ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          
                          {/* ফোন নম্বর, ১-ক্লিক কপি এবং MicroSIP সরাসরি কল বাটন */}
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-slate-400 text-xs">{order.phone}</span>
                            
                            <button onClick={() => handleCopy(phoneKey, cleanPhone)} className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800" title="Copy Number">
                              {copiedKeys[phoneKey] ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>

                            {/* MicroSIP / PC কলিং অ্যাপ ট্রিগার বাটন */}
                            <a
                              href={`tel:${cleanPhone}`}
                              title={`Direct Call via MicroSIP (${cleanPhone})`}
                              className="p-1 rounded text-slate-500 hover:text-emerald-400 hover:bg-emerald-950/50 transition cursor-pointer"
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 max-w-[240px]">
                        <div className="flex items-start gap-1.5">
                          <span className="text-slate-300 text-xs leading-snug line-clamp-2">{order.address}</span>
                          <button onClick={() => handleCopy(addrKey, order.address)} className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800 shrink-0">
                            {copiedKeys[addrKey] ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-slate-100 tabular-nums">
                          {order.total_amount.toLocaleString()} ৳
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {order.items_json?.length || 0} items · Ship: {order.shipping_fee} ৳
                        </div>

                        <div className="space-y-1 mt-1 max-w-[240px]">
                          {(order.items_json || []).map((item, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                              <span className="truncate">{item.name}</span>
                              <span className="font-mono text-slate-500">x{item.quantity}</span>
                              {item.variation && (
                                <span className="px-1.5 py-0.2 rounded bg-indigo-950 border border-indigo-700/70 text-indigo-300 font-bold text-[10px] whitespace-nowrap">
                                  {item.variation}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* শর্তাধীন ও লকড স্ট্যাটাস ড্রপডাউন */}
                      <td className="py-3 px-3 whitespace-nowrap relative status-dropdown-wrapper">
                        <div className="relative inline-block text-left">
                          {isStatusLocked ? (
                            <div
                              title={`${order.status.toUpperCase()} স্ট্যাটাস চূড়ান্ত এবং লকড রয়েছে।`}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-not-allowed opacity-85 select-none ${cfg.bgBtn}`}
                            >
                              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                              <span>{cfg.label}</span>
                              <Lock className="w-3 h-3 opacity-60 ml-0.5 text-slate-400" />
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdownOrderId(isDropdownOpen ? null : order.id);
                              }}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition shadow-sm ${cfg.bgBtn}`}
                            >
                              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                              <span>{cfg.label}</span>
                              <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-0.5" />
                            </button>
                          )}

                          {isDropdownOpen && !isStatusLocked && (
                            <div
                              className={`absolute left-0 ${
                                isNearBottom ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                              } w-36 bg-[#0c101c] border border-slate-700/90 rounded-xl shadow-2xl py-1 z-50 backdrop-blur-md animate-in fade-in zoom-in-95`}
                            >
                              {availableTargets.map((stKey) => {
                                const stCfg = STATUS_CONFIG[stKey];

                                return (
                                  <button
                                    key={stKey}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (stKey === 'cancelled') {
                                        setOpenDropdownOrderId(null);
                                        setCancellingOrder(order);
                                      } else {
                                        handleStatusChange(order.id, stKey);
                                      }
                                    }}
                                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition ${stCfg.hoverBg}`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className={`w-2 h-2 rounded-full ${stCfg.dot}`} />
                                      <span className={stCfg.text}>{stCfg.label}</span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions: Edit, Internal Comment/Note, Audit History */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* ১। এডিট বাটন */}
                          <button
                            onClick={() => setEditingOrder(order)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                            title="Edit Order"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* ২। ইন্টার্নাল কমেন্ট / কলিং নোট বাটন (সব স্ট্যাটাসেই উন্মুক্ত) */}
                          <button
                            onClick={() => {
                              setCommentingOrder(order);
                              setCommentText('');
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-400 transition"
                            title="Add Internal Call Note / Comment"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>

                          {/* ৩। হিস্ট্রি ও অডিট টাইমলাইন বাটন */}
                          <button
                            onClick={() => handleOpenAudit(order)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-indigo-400 transition"
                            title="View Audit Timeline & Comments Log"
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
      </div>

      {/* Internal Comments / Call Notes Modal */}
      {commentingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#121624] border border-slate-800 rounded-xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-950/60 border border-amber-800/80 flex items-center justify-center text-amber-400">
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Add Call Note / Comment #{commentingOrder.id}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {commentingOrder.customer_name} ({commentingOrder.phone})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCommentingOrder(null)}
                className="text-slate-400 hover:text-white p-1 rounded transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveComment} className="p-5 space-y-4">
              {/* Quick Preset Buttons */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                  Quick Presets (1-Tap Selection):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_COMMENT_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCommentText(prev => (prev ? `${prev}; ${preset}` : preset))}
                      className="px-2 py-1 text-[11px] rounded bg-slate-900 border border-slate-800 hover:border-amber-500/50 hover:text-amber-300 text-slate-300 transition text-left"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Comment / Internal Notes:
                </label>
                <textarea
                  rows={3}
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="যেমন: ৩য় বার কল করা হয়েছে, কাস্টমার বলেছে সন্ধ্যা ৭টায় ডেলিভারি কনফার্ম করবে..."
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-amber-500 transition resize-none placeholder-slate-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCommentingOrder(null)}
                  disabled={isSubmittingComment}
                  className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-850 hover:bg-slate-800 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingComment || !commentText.trim()}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition shadow-sm disabled:opacity-50"
                >
                  {isSubmittingComment ? (
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Save Note</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Advanced Pull Order Modal */}
      {isPullModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-[#161a26] border border-slate-800 rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <CloudDownload className="w-4 h-4 text-indigo-400" />
                <span>Pull Orders from WooCommerce</span>
              </div>
              <button onClick={() => setIsPullModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setPullMode('id')}
                className={`py-1.5 text-xs font-medium rounded-md flex items-center justify-center gap-1.5 transition ${
                  pullMode === 'id' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Hash className="w-3.5 h-3.5" />
                <span>Order ID</span>
              </button>
              <button
                type="button"
                onClick={() => setPullMode('last24')}
                className={`py-1.5 text-xs font-medium rounded-md flex items-center justify-center gap-1.5 transition ${
                  pullMode === 'last24' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Last 24 Hours</span>
              </button>
              <button
                type="button"
                onClick={() => setPullMode('custom')}
                className={`py-1.5 text-xs font-medium rounded-md flex items-center justify-center gap-1.5 transition ${
                  pullMode === 'custom' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Custom Range</span>
              </button>
            </div>

            <form onSubmit={handlePullOrderSubmit} className="space-y-4">
              {pullMode === 'id' && (
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1.5">
                    WooCommerce Order ID
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="যেমন: 12463"
                    value={pullOrderIdInput}
                    onChange={(e) => setPullOrderIdInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              )}

              {pullMode === 'last24' && (
                <div className="p-3 bg-indigo-950/20 border border-indigo-900/40 rounded-lg text-xs space-y-1">
                  <p className="font-semibold text-indigo-300 flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    সর্বশেষ ২৪ ঘণ্টার সমস্ত অর্ডার সিংক হবে
                  </p>
                </div>
              )}

              {pullMode === 'custom' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-300 font-medium block mb-1.5">
                      শুরুর তারিখ ও সময় (From Date & Time)
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={pullStartDate}
                      onChange={(e) => setPullStartDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-300 font-medium block mb-1.5">
                      শেষ তারিখ ও সময় (To Date & Time - ঐচ্ছিক)
                    </label>
                    <input
                      type="datetime-local"
                      value={pullEndDate}
                      onChange={(e) => setPullEndDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPullModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPulling}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 disabled:opacity-50"
                >
                  {isPulling && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isPulling ? 'Pulling...' : 'Pull Now'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {cancellingOrder && (
        <CancelOrderModal
          order={cancellingOrder}
          cancelReasons={cancelReasons}
          isOpen={Boolean(cancellingOrder)}
          onClose={() => setCancellingOrder(null)}
          onConfirmCancel={handleConfirmCancel}
        />
      )}

      {editingOrder && (
        <EditOrderModal
          order={editingOrder}
          isOpen={Boolean(editingOrder)}
          onClose={() => setEditingOrder(null)}
          onSave={handleSaveEdit}
        />
      )}

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
