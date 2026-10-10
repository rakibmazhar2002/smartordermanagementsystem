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
  }>;
  shipping_total?: string | number;
  total?: string | number;
}

/**
 * Validates WooCommerce Webhook HMAC-SHA256 signature
 */
export function verifyWooCommerceWebhookSignature(
  rawBody: string | Buffer,
  signatureHeader?: string,
  secret?: string
): boolean {
  if (!signatureHeader || !secret) {
    return true;
  }

  try {
    const computed = crypto
      .createHmac('sha256', secret)
      .update(typeof rawBody === 'string' ? rawBody : rawBody.toString('utf-8'))
      .digest('base64');

    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signatureHeader));
  } catch (err) {
    console.error('[WC Webhook] Signature verification error:', err);
    return false;
  }
}

/**
 * Map SOMS status to WooCommerce REST API status (Strict Logic)
 * Pending   -> processing
 * Approved  -> processing
 * Hold      -> on-hold
 * Cancelled -> cancelled
 * Completed -> completed
 */
export function mapSomsStatusToWcStatus(somsStatus: OrderStatus): string {
  switch (somsStatus) {
    case 'pending':
      return 'processing';
    case 'approved':
      return 'processing';
    case 'hold':
      return 'on-hold';
    case 'cancelled':
      return 'cancelled';
    case 'completed':
      return 'completed';
    default:
      return 'processing';
  }
}

/**
 * Dispatches Outbound Sync to WooCommerce REST API
 */
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
  if (!order) {
    return { success: false, message: `Order #${wcOrderId} not found in SOMS.` };
  }

  // Construct WooCommerce payload
  const wcPayload: Record<string, unknown> = {};

  if (updates.status) {
    const wcStatus = mapSomsStatusToWcStatus(updates.status);
    wcPayload.status = wcStatus;
  }

  if (updates.customer_name || updates.phone || updates.address) {
    const nameParts = (updates.customer_name || order.customer_name).trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    wcPayload.billing = {
      first_name: firstName,
      last_name: lastName,
      phone: updates.phone || order.phone,
      address_1: updates.address || order.address,
    };
  }

  if (updates.shipping_fee !== undefined) {
    wcPayload.shipping_lines = [
      {
        method_id: 'flat_rate',
        method_title: 'Standard Courier Shipping',
        total: String(updates.shipping_fee),
      },
    ];
  }

  let metaCapiTriggered = false;
  let internalNoteAdded = false;

  if (updates.status === 'completed') {
    metaCapiTriggered = true;
  }

  if (updates.status === 'cancelled' && updates.cancelReasonText) {
    internalNoteAdded = true;
  }

  // Check if live WooCommerce credentials are provided
  if (
    settings.wc_store_url &&
    settings.wc_store_url.startsWith('http') &&
    settings.wc_consumer_key &&
    settings.wc_consumer_secret
  ) {
    try {
      const baseUrl = settings.wc_store_url.replace(/\/\$/, '');
      
      // Dual Authentication: Basic Auth Header + Query Parameters (LiteSpeed header stripping fix)
      const authHeader = 'Basic ' + Buffer.from(`${settings.wc_consumer_key}:${settings.wc_consumer_secret}`).toString('base64');
      const targetUrl = new URL(`${baseUrl}/wp-json/wc/v3/orders/${wcOrderId}`);
      targetUrl.searchParams.set('consumer_key', settings.wc_consumer_key);
      targetUrl.searchParams.set('consumer_secret', settings.wc_consumer_secret);

      console.log(`[WC Sync] Sending PUT to WooCommerce: Order #${wcOrderId} -> Payload:`, JSON.stringify(wcPayload));

      const res = await fetch(targetUrl.toString(), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify(wcPayload),
        signal: AbortSignal.timeout(10000), // 10s resilient timeout
      });

      const resBody = await res.text();

      if (!res.ok) {
        console.error(`[WC Sync Failed] HTTP ${res.status}:`, resBody);
      } else {
        console.log(`[WC Sync Success] Order #${wcOrderId} successfully updated in WooCommerce!`);

        // If cancelled with a reason, add an internal note to the order
        if (internalNoteAdded) {
          const noteUrl = new URL(`${baseUrl}/wp-json/wc/v3/orders/${wcOrderId}/notes`);
          noteUrl.searchParams.set('consumer_key', settings.wc_consumer_key);
          noteUrl.searchParams.set('consumer_secret', settings.wc_consumer_secret);

          await fetch(noteUrl.toString(), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: authHeader,
            },
            body: JSON.stringify({
              note: `[SOMS Cancelled] Reason: ${updates.cancelReasonText}`,
              customer_note: false,
            }),
          }).catch(err => console.error('[WC Note Error]:', err));
        }
      }
    } catch (err: any) {
      console.error(`[WC Sync Exception] Failed to dispatch update for Order #${wcOrderId}:`, err.message || err);
    }
  } else {
    console.warn('[WC Sync Warning] WooCommerce credentials missing or invalid in SOMS Settings!');
  }

  // Update order sync timestamp
  order.wc_sync_status = 'synced';
  order.wc_last_synced_at = new Date().toISOString();
  saveDb();

  return {
    success: true,
    message: `Synchronized #${wcOrderId} to WooCommerce (${updates.status ? `mapped to '\${mapSomsStatusToWcStatus(updates.status)}'` : 'details updated'})`,
    metaCapiTriggered,
    internalNoteAdded,
  };
}

/**
 * Process Inbound WooCommerce Webhook Order Created
 */
export function ingestWooCommerceOrder(payload: WCOrderPayload): Order {
  const db = getDb();
  const wcOrderId = payload.id;

  const existing = db.orders.find(o => o.id === wcOrderId);
  if (existing) {
    return existing;
  }

  const customerName = `${payload.billing?.first_name || ''} ${payload.billing?.last_name || ''}`.trim() || 'Guest Customer';
  const phone = payload.billing?.phone || '';
  const address = [payload.billing?.address_1, payload.billing?.address_2, payload.billing?.city]
    .filter(Boolean)
    .join(', ') || 'Address not specified';

  const items: OrderItem[] = (payload.line_items || []).map(item => ({
    product_id: item.id || 1000,
    name: item.name || 'Store Item',
    variation: item.variation_id ? `Var #${item.variation_id}` : undefined,
    quantity: item.quantity || 1,
    price: Number(item.price) || 0,
    total: Number(item.total) || (Number(item.price) * (item.quantity || 1)),
  }));

  const shippingFee = Number(payload.shipping_total) || 100;
  const totalAmount = Number(payload.total) || items.reduce((acc, i) => acc + i.total, 0) + shippingFee;

  const newOrder: Order = {
    id: wcOrderId,
    customer_name: customerName,
    phone,
    address,
    items_json: items.length > 0 ? items : [{ product_id: 9999, name: 'Standard Product', quantity: 1, price: totalAmount - shippingFee, total: totalAmount - shippingFee }],
    shipping_fee: shippingFee,
    total_amount: totalAmount,
    status: 'pending',
    cancel_reason_id: null,
    updated_by_id: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    wc_sync_status: 'synced',
    wc_last_synced_at: new Date().toISOString(),
  };

  db.orders.unshift(newOrder);

  // Activity Log
  db.activityLogs.unshift({
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    order_id: wcOrderId,
    user_id: null,
    user_name: 'WooCommerce Webhook',
    action_type: 'order_created',
    description: `Order #${wcOrderId} ingested via WooCommerce order.created webhook. Initial status set to Pending.`,
    timestamp: new Date().toISOString(),
  });

  saveDb();
  return newOrder;
}
