import React, { useState } from 'react';
import { Order, OrderItem } from '../../types/index.ts';
import { X, Save, Edit3, Plus, Trash2, Lock } from 'lucide-react';

interface EditOrderModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    orderId: number,
    data: {
      customer_name: string;
      phone: string;
      address: string;
      shipping_fee: number;
      items_json: OrderItem[];
    }
  ) => Promise<void>;
}

export const EditOrderModal: React.FC<EditOrderModalProps> = ({
  order,
  isOpen,
  onClose,
  onSave,
}) => {
  const [customerName, setCustomerName] = useState(order.customer_name);
  const [phone] = useState(order.phone); // ফোন নম্বর সুরক্ষিত রাখা হলো
  const [address, setAddress] = useState(order.address);
  const [shippingFee, setShippingFee] = useState<number>(order.shipping_fee);
  const [items, setItems] = useState<OrderItem[]>(
    JSON.parse(JSON.stringify(order.items_json || []))
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleItemChange = (index: number, field: 'quantity' | 'price', value: any) => {
    const updated = [...items];
    const item = { ...updated[index] };
    if (field === 'quantity') item.quantity = Math.max(1, parseInt(value, 10) || 1);
    if (field === 'price') item.price = Math.max(0, parseFloat(value) || 0);
    item.total = item.quantity * item.price;
    updated[index] = item;
    setItems(updated);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        product_id: Math.floor(Math.random() * 8000) + 1000,
        name: 'Additional Product Item',
        quantity: 1,
        price: 500,
        total: 500,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const grandTotal = subtotal + Number(shippingFee);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !address.trim()) {
      setErrorMessage('Customer name and delivery address are required.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await onSave(order.id, {
        customer_name: customerName.trim(),
        phone: phone || order.phone,
        address: address.trim(),
        shipping_fee: Number(shippingFee),
        items_json: items,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update order details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-950/70 border border-indigo-800/80 flex items-center justify-center text-indigo-400">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                Edit WooCommerce Order #{order.id}
              </h2>
              <p className="text-xs text-slate-400">
                2-Way Outbound Synchronization with WooCommerce REST API
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

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 grow">
          {errorMessage && (
            <div className="p-3 bg-red-950/60 border border-red-800 text-red-200 text-xs rounded-lg">
              {errorMessage}
            </div>
          )}

          {/* Customer Credentials (নাম এডিটেবল, মোবাইল আন-এডিটেবল) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Customer Name
              </label>
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Customer Phone
                </label>
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> Read-only
                </span>
              </div>
              <input
                type="text"
                value={phone}
                readOnly
                title="Mobile number cannot be edited"
                className="w-full px-3 py-2 text-sm bg-slate-950/60 border border-slate-800/80 rounded-lg text-slate-400 font-mono cursor-not-allowed select-all focus:outline-none"
              />
            </div>
          </div>

          {/* Full Street Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Full Street Address
            </label>
            <textarea
              rows={2}
              value={address}
              onChange={e => setAddress(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none"
            />
          </div>

          {/* Order Items & Quantities */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300">
                Order Items & Quantities
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1 text-[11px] font-medium text-indigo-400 hover:text-indigo-300 transition"
              >
                <Plus className="w-3 h-3" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-slate-950 border border-slate-800/80"
                >
                  {/* Product Full Name (Uneditable, Wraps nicely up to 2 lines) */}
                  <div className="grow min-w-0 pr-1">
                    <p
                      className="text-xs font-medium text-slate-200 leading-snug line-clamp-2 break-words select-text"
                      title={item.name}
                    >
                      {item.name}
                    </p>
                  </div>

                  {/* Quantity, Price, Line Total & Action */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-16">
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                        placeholder="Qty"
                        title="Quantity"
                        className="w-full px-2 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded text-center text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="w-24">
                      <input
                        type="number"
                        min={0}
                        value={item.price}
                        onChange={e => handleItemChange(idx, 'price', e.target.value)}
                        placeholder="Price"
                        title="Price per unit"
                        className="w-full px-2 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded text-right text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="w-20 text-right text-xs font-mono font-bold text-slate-200 tabular-nums">
                      {item.total.toLocaleString()} ৳
                    </div>

                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1.5 text-slate-500 hover:text-red-400 rounded transition shrink-0"
                        title="Remove Item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing summary */}
          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Items Subtotal:</span>
              <span className="font-mono tabular-nums text-slate-200">{subtotal.toLocaleString()} ৳</span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Shipping Fee:</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  value={shippingFee}
                  onChange={e => setShippingFee(parseFloat(e.target.value) || 0)}
                  className="w-20 px-2 py-0.5 text-xs bg-slate-900 border border-slate-800 rounded text-right text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-slate-500 text-xs">৳</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-sm font-semibold">
              <span className="text-white">Calculated Order Total:</span>
              <span className="font-mono tabular-nums text-emerald-400 text-base">{grandTotal.toLocaleString()} ৳</span>
            </div>
          </div>

          {/* Footer buttons (Save) */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition shadow-md shadow-indigo-600/20 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
