import crypto from 'crypto';
import { getDb, saveDb } from './db.ts';
import { Order, OrderStatus, OrderItem } from '../types/index.ts';

export interface WCOrderPayload {
  id: number;
  status: string;
  billing: {
    first_name: string;
    last_name: string;
    phone: string;
    address_1: string;
    address_2?: string;
    city?: string;
    postcode?: string;
  };
  line_items: Array<{
    id: number;
    name: string;
    variation_id?: number;
    quantity: number;
    price: number | string;
    total: number | string;
    meta_data?: Array<{ key: string; value: any; display_key?: string; display_value?: string }>;
  }>;
  shipping_total?: string | number;
  total?: string | number;
  meta_data?: Array<{ key: string; value: any; display_key?: string; display_value?: string }>;
}

export function verifyWooCommerceWebhookSignature(
  rawBody: string | Buffer,
  signatureHeader?: string,
  secret?: string
): boolean {
  if (!signatureHeader || !secret) return true;
  try {
    const computed = crypto
      .createHmac('sha256', secret)
      .update(typeof rawBody === 'string' ? rawBody : rawBody.toString('utf-8'))
      .digest('base64');
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
}

export function mapSomsStatusToWcStatus(somsStatus: OrderStatus): string {
  switch (somsStatus) {
    case 'pending': return 'processing';
    case 'approved': return 'processing';
    case 'hold': return 'on-hold';
    case 'cancelled': return 'cancelled';
    case 'completed': return 'completed';
    default: return 'processing';
  }
}

/**
 * Extract Size from WooCommerce custom checkout meta or line item meta
 */
function extractSize(item: any, orderPayload: any): string | undefined {
  // 1. Check line item meta
  if (Array.isArray(item.meta_data)) {
    const found = item.meta_data.find((m: any) => {
      const k = String(m.key || m.display_key || '').toLowerCase();
      return k.includes('size') || k.includes('সাইজ') || k === 'pa_size';
    });
    if (found && found.value) return String(found.display_value || found.value);
  }

  // 2. Check Order-level custom checkout meta (CartFlows / Custom fields)
  if (Array.isArray(orderPayload?.meta_data)) {
    const found = orderPayload.meta_data.find((m: any) => {
      const k = String(m.key || m.display_key || '').toLowerCase();
      return k.includes('size') || k.includes('সাইজ');
    });
    if (found && found.value) return String(found.display_value || found.value);
  }

  return undefined;
}

export async function syncOrderToWooCommerce(
  wcOrderId: number,
  updates: {
    status?: OrderStatus;
    cancelReasonText?: string;
    customer_name?: string;
    phone?: string;
    address?: string;
    shipping_fee?: number;
    items_json?: OrderItem[];
  }
): Promise<{ success: boolean; message: string; metaCapiTriggered?: boolean; internalNoteAdded?: boolean }> {
  const db = getDb();
  const settings = db.settings;
  const order = db.orders.find(o => o.id === wcOrderId);
  if (!order) return { success: false, message: `Order #${wcOrderId} not found.` };

  const wcPayload: Record<string, unknown> = {};

  if (updates.status) {
    wcPayload.status = mapSomsStatusToWcStatus(updates.status);
  }

  if (updates.customer_name || updates.phone || updates.address) {
    const nameParts = (updates.customer_name || order.customer_name).trim().split(' ');
    wcPayload.billing = {
      first_name: nameParts[0] || '',
      last_name: nameParts.slice(1).join(' ') || '',
      phone: updates.phone || order.phone,
      address_1: updates.address || order.address,
    };
  }

  if (updates.shipping_fee !== undefined) {
    wcPayload.shipping_lines = [{ method_id: 'flat_rate', method_title: 'Courier', total: String(updates.shipping_fee) }];
  }

  let internalNoteAdded = false;
  if (updates.status === 'cancelled' && updates.cancelReasonText) internalNoteAdded = true;

  if (settings.wc_store_url && settings.wc_consumer_key && settings.wc_consumer_secret) {
    try {
      const baseUrl = settings.wc_store_url.replace(/\/\$/, '');
      const authHeader = 'Basic ' + Buffer.from(`${settings.wc_consumer_key}:${settings.wc_consumer_secret}`).toString('base64');
      const targetUrl = new URL(`${baseUrl}/wp-json/wc/v3/orders/${wcOrderId}`);
      targetUrl.searchParams.set('consumer_key', settings.wc_consumer_key);
      targetUrl.searchParams.set('consumer_secret', settings.wc_consumer_secret);

      const res = await fetch(targetUrl.toString(), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader },
        body: JSON.stringify(wcPayload),
        signal: AbortSignal.timeout(10000),
      });

      if (res.ok && internalNoteAdded) {
        const noteUrl = new URL(`${baseUrl}/wp-json/wc/v3/orders/${wcOrderId}/notes`);
        noteUrl.searchParams.set('consumer_key', settings.wc_consumer_key);
        noteUrl.searchParams.set('consumer_secret', settings.wc_consumer_secret);

        await fetch(noteUrl.toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: authHeader },
          body: JSON.stringify({ note: `[SOMS Cancelled] Reason: ${updates.cancelReasonText}`, customer_note: false }),
        }).catch(() => null);
      }
    } catch (err: any) {
      console.error(`[WC Sync Error]:`, err.message);
    }
  }

  order.wc_sync_status = 'synced';
  order.wc_last_synced_at = new Date().toISOString();
  saveDb();

  return { success: true, message: `Synced #${wcOrderId}`, metaCapiTriggered: updates.status === 'completed', internalNoteAdded };
}

export function ingestWooCommerceOrder(payload: any): Order {
  const db = getDb();
  const wcOrderId = payload.id;

  const existing = db.orders.find(o => o.id === wcOrderId);

  const customerName = `${payload.billing?.first_name || ''} ${payload.billing?.last_name || ''}`.trim() || 'Guest Customer';
  const phone = payload.billing?.phone || '';
  const address = [payload.billing?.address_1, payload.billing?.address_2, payload.billing?.city].filter(Boolean).join(', ') || 'Address not specified';

  const items: OrderItem[] = (payload.line_items || []).map((item: any) => {
    const size = extractSize(item, payload);
    return {
      product_id: item.id || 1000,
      name: size ? `${item.name} (${size})` : (item.name || 'Store Item'),
      variation: size ? `Size: ${size}` : (item.variation_id ? `Var #${item.variation_id}` : undefined),
      quantity: item.quantity || 1,
      price: Number(item.price) || 0,
      total: Number(item.total) || (Number(item.price) * (item.quantity || 1)),
    };
  });

  const shippingFee = Number(payload.shipping_total) || 80;
  const totalAmount = Number(payload.total) || items.reduce((acc, i) => acc + i.total, 0) + shippingFee;

  if (existing) {
    existing.items_json = items;
    existing.customer_name = customerName;
    existing.phone = phone;
    existing.address = address;
    existing.total_amount = totalAmount;
    existing.shipping_fee = shippingFee;
    existing.updatedAt = new Date().toISOString();
    saveDb();
    return existing;
  }

  const newOrder: Order = {
    id: wcOrderId,
    customer_name: customerName,
    phone,
    address,
    items_json: items,
    shipping_fee: shippingFee,
    total_amount: totalAmount,
    status: 'pending',
    cancel_reason_id: null,
    updated_by_id: null,
    createdAt: new Date(payload.date_created || Date.now()).toISOString(),
    updatedAt: new Date().toISOString(),
    wc_sync_status: 'synced',
    wc_last_synced_at: new Date().toISOString(),
  };

  db.orders.unshift(newOrder);

  db.activityLogs.unshift({
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    order_id: wcOrderId,
    user_id: null,
    user_name: 'WooCommerce Webhook',
    action_type: 'order_created',
    description: `Order #${wcOrderId} ingested with size details.`,
    timestamp: new Date().toISOString(),
  });

  saveDb();
  return newOrder;
}

export async function pullOrdersFromWooCommerce(orderId?: number): Promise<{ success: boolean; count: number; message: string }> {
  const db = getDb();
  const settings = db.settings;

  if (!settings.wc_store_url || !settings.wc_consumer_key || !settings.wc_consumer_secret) {
    throw new Error('WooCommerce API credentials not configured in settings.');
  }

  const baseUrl = settings.wc_store_url.replace(/\/\$/, '');
  const authHeader = 'Basic ' + Buffer.from(`${settings.wc_consumer_key}:${settings.wc_consumer_secret}`).toString('base64');

  let targetUrl: URL;
  if (orderId) {
    targetUrl = new URL(`${baseUrl}/wp-json/wc/v3/orders/${orderId}`);
  } else {
    targetUrl = new URL(`${baseUrl}/wp-json/wc/v3/orders`);
    targetUrl.searchParams.set('per_page', '20');
    targetUrl.searchParams.set('orderby', 'date');
    targetUrl.searchParams.set('order', 'desc');
  }

  targetUrl.searchParams.set('consumer_key', settings.wc_consumer_key);
  targetUrl.searchParams.set('consumer_secret', settings.wc_consumer_secret);

  const res = await fetch(targetUrl.toString(), {
    headers: { Authorization: authHeader, Accept: 'application/json' },
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`WooCommerce REST API returned HTTP ${res.status}: ${errorText}`);
  }

  const data = await res.json();
  const list = Array.isArray(data) ? data : [data];
  let imported = 0;

  for (const item of list) {
    if (item && item.id) {
      ingestWooCommerceOrder(item);
      imported++;
    }
  }

  return {
    success: true,
    count: imported,
    message: orderId
      ? `Order #${orderId} pulled successfully from WooCommerce!`
      : `Successfully pulled ${imported} orders from WooCommerce!`,
  };
}
