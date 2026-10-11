import React, { useState } from 'react';
import { Order, OrderItem } from '../../types/index.ts';
import { X, Save, Edit3, Plus, Trash2, Lock, Tag, BadgePercent } from 'lucide-react';

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
      discount?: number;
      discount_amount?: number;
      total_amount?: number;
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
  const [customerName, setCustomerName] = useState(order.customer_name || '');
  const [phone] = useState(order.phone || ''); // ফোন নম্বর লকড
  const [address, setAddress] = useState(order.address || '');
  const [shippingFee, setShippingFee] = useState<number>(Number(order.shipping_fee) || 0);
  
  // ডিসকাউন্ট স্টেট (আগের ডিসকাউন্ট থাকলে তা নিয়ে আসবে)
  const [discount, setDiscount] = useState<number>(
    Number((order as any).discount_amount ?? (order as any).discount ?? 0)
  );

  // প্রোডাক্ট ও সাইজ স্টেট ইনিশিয়ালাইজেশন
  const [items, setItems] = useState<OrderItem[]>(() => {
    const rawItems = order.items_json ? JSON.parse(JSON.stringify(order.items_json)) : [];
    return rawItems.map((item: any) => {
      let initialVariation = item.variation || item.size || '';
      // প্রোডাক্টের নামের শেষে (M) বা (L) থাকলে তা সাইজ হিসেবে পিক করবে
      if (!initialVariation && item.name) {
        const match = item.name.match(/\(([^)]+)\)\$/);
        if (match) {
          initialVariation = match[1].trim();
        }
      }
      const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
      const prc = Math.max(0, parseFloat(item.price) || 0);
      return {
        ...item,
        variation: initialVariation,
        quantity: qty,
        price: prc,
        total: qty * prc,
      };
    });
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // প্রোডাক্ট ফিল্ড হ্যান্ডলার (নাম, সাইজ, রেট, কোয়ান্টিটি)
  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    const item = { ...updated[index] };

    if (field === 'quantity') {
      item.quantity = Math.max(1, parseInt(value, 10) || 1);
      item.total = item.quantity * (Number(item.price) || 0);
    } else if (field === 'price') {
      item.price = Math.max(0, parseFloat(value) || 0);
      item.total = (Number(item.quantity) || 1) * item.price;
    } else if (field === 'variation') {
      item.variation = value;
      // নামের শেষে যদি আগের সাইজ থাকে তা স্বয়ংক্রিয়ভাবে নতুন সাইজ দিয়ে রিপ্লেস হবে
      if (item.name && /\([^)]+\)\$/.test(item.name.trim())) {
        item.name = item.name.trim().replace(/\([^)]+\)\$/, `(${value})`);
      }
    } else if (field === 'name') {
      item.name = value;
    } else {
      (item as any)[field] = value;
    }

    updated[index] = item;
    setItems(updated);
  };

  // নতুন আইটেম যোগ করা
  const handleAddItem = () => {
    setItems([
      ...items,
      {
        product_id: Math.floor(Math.random() * 8000) + 1000,
        name: '',
        variation: 'M',
        quantity: 1,
        price: 0,
        total: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // ক্যালকুলেশন: সাবটোটাল + শিপিং - ডিসকাউন্ট
  const subtotal = items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const grandTotal = Math.max(0, subtotal + Number(shippingFee) - Number(discount));

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
        shipping_fee: Number(shippingFee) || 0,
        discount: Number(discount) || 0,
        discount_amount: Number(discount) || 0,
        total_amount: grandTotal,
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
                Edit Order #{order.id}
              </h2>
              <p className="text-xs text-slate-400">
                Local Custom Edit (No WooCommerce Sync)
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

          {/* Customer Credentials */}
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

          {/* Order Items & Sizes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300">
                Order Items & Sizes
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

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800/90 space-y-2.5"
                >
                  {/* Product Name & Delete */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Product Name (e.g. Denim Baggy Trousers)"
                      value={item.name}
                      onChange={e => handleItemChange(idx, 'name', e.target.value)}
                      className="grow px-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />

                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-900 transition shrink-0"
                        title="Remove Item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Size Dropdown, Quantity, Price & Total */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 text-xs">
                    {/* Size Selector with 4XL Preset */}
                    <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 grow sm:grow-0 sm:w-44">
                      <Tag className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <input
                        list={`size-options-${idx}`}
                        type="text"
                        placeholder="Size (e.g. 4XL)"
                        value={item.variation || ''}
                        onChange={e => handleItemChange(idx, 'variation', e.target.value)}
                        className="w-full bg-transparent text-amber-300 font-semibold placeholder-slate-500 focus:outline-none text-xs"
                      />
                      <datalist id={`size-options-${idx}`}>
                        <option value="M" />
                        <option value="L" />
                        <option value="XL" />
                        <option value="2XL" />
                        <option value="3XL" />
                        <option value="4XL" />
                        <option value="28" />
                        <option value="30" />
                        <option value="32" />
                        <option value="34" />
                        <option value="36" />
                        <option value="38" />
                      </datalist>
                    </div>

                    {/* Quantity */}
                    <div className="w-20">
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                        placeholder="Qty"
                        title="Quantity"
                        className="w-full px-2 py-1 text-xs bg-slate-900 border border-slate-800 rounded-lg text-center text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Price */}
                    <div className="w-24">
                      <input
                        type="number"
                        min={0}
                        value={item.price}
                        onChange={e => handleItemChange(idx, 'price', e.target.value)}
                        placeholder="Price"
                        title="Price per unit"
                        className="w-full px-2 py-1 text-xs bg-slate-900 border border-slate-800 rounded-lg text-right text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Total */}
                    <div className="w-24 text-right font-mono font-bold text-slate-200 tabular-nums shrink-0">
                      {(Number(item.total) || 0).toLocaleString()} ৳
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Calculation Summary */}
          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Items Subtotal:</span>
              <span className="font-mono tabular-nums text-slate-200">{subtotal.toLocaleString()} ৳</span>
            </div>

            {/* Editable Shipping Fee */}
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Shipping Fee:</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  value={shippingFee}
                  onChange={e => setShippingFee(parseFloat(e.target.value) || 0)}
                  className="w-24 px-2 py-0.5 text-xs bg-slate-900 border border-slate-800 rounded text-right text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-slate-500 text-xs">৳</span>
              </div>
            </div>

            {/* Editable Discount Field */}
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1 text-rose-400 font-medium">
                <BadgePercent className="w-3.5 h-3.5" /> Discount:
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  value={discount}
                  onChange={e => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0"
                  className="w-24 px-2 py-0.5 text-xs bg-slate-900 border border-slate-800 rounded text-right text-rose-300 font-mono focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
                <span className="text-slate-500 text-xs">৳</span>
              </div>
            </div>

            {/* Grand Total */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-sm font-semibold">
              <span className="text-white">Calculated Order Total:</span>
              <span className="font-mono tabular-nums text-emerald-400 text-base">{grandTotal.toLocaleString()} ৳</span>
            </div>
          </div>

          {/* Footer buttons */}
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
