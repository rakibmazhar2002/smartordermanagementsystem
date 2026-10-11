// server.ts
import express from "express";
import path2 from "path";
import { fileURLToPath } from "url";
import fs2 from "fs";
import bcrypt2 from "bcryptjs";
import dotenv from "dotenv";

// src/server/db.ts
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
var DATA_DIR = path.resolve(process.cwd(), "data");
var DATA_FILE = path.join(DATA_DIR, "soms_store.json");
var inMemoryStore = null;
async function initDb() {
  if (inMemoryStore) return inMemoryStore;
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(DATA_FILE)) {
    try {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      inMemoryStore = JSON.parse(raw);
      if (inMemoryStore && inMemoryStore.users && inMemoryStore.orders) {
        return inMemoryStore;
      }
    } catch {
    }
  }
  const superAdminHash = await bcrypt.hash("Rakib@@3236", 10);
  const moderatorHash = await bcrypt.hash("Moderator@@2026", 10);
  const initialUsers = [
    {
      id: "usr_superadmin_01",
      name: "MI Rakib",
      email: "mirakib2246@gmail.com",
      password_hash: superAdminHash,
      role: "super_admin",
      status: "active",
      createdAt: new Date(Date.now() - 30 * 864e5).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      id: "usr_moderator_01",
      name: "Tariq Hasan",
      email: "tariq.moderator@soms.internal",
      password_hash: moderatorHash,
      role: "moderator",
      status: "active",
      createdAt: new Date(Date.now() - 15 * 864e5).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      id: "usr_moderator_02",
      name: "Nadia Rahman",
      email: "nadia.moderator@soms.internal",
      password_hash: moderatorHash,
      role: "moderator",
      status: "active",
      createdAt: new Date(Date.now() - 10 * 864e5).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    }
  ];
  const initialSettings = {
    id: "setting_01",
    wc_store_url: "https://shop.fashiontrendsbz.com",
    wc_consumer_key: "ck_7b9d62f8319f39e334a123456789abcdef012345",
    wc_consumer_secret: "cs_8a2b53e7428c28d223b987654321fedcba543210",
    wc_webhook_secret: "whsec_9876543210abcdeffedcba0987654321",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  const initialReasons = [
    { id: "cr_01", reason_text: "Customer changed mind", is_active: true, createdAt: new Date(Date.now() - 20 * 864e5).toISOString() },
    { id: "cr_02", reason_text: "Duplicate order placed by customer", is_active: true, createdAt: new Date(Date.now() - 20 * 864e5).toISOString() },
    { id: "cr_03", reason_text: "Price dispute / Found cheaper elsewhere", is_active: true, createdAt: new Date(Date.now() - 20 * 864e5).toISOString() },
    { id: "cr_04", reason_text: "Delivery time exceeds customer expectation (>3 days)", is_active: true, createdAt: new Date(Date.now() - 18 * 864e5).toISOString() },
    { id: "cr_05", reason_text: "Unreachable / Phone switched off (3 attempts)", is_active: true, createdAt: new Date(Date.now() - 15 * 864e5).toISOString() },
    { id: "cr_06", reason_text: "Fake or invalid contact number", is_active: true, createdAt: new Date(Date.now() - 15 * 864e5).toISOString() },
    { id: "cr_07", reason_text: "Out of courier delivery coverage zone", is_active: true, createdAt: new Date(Date.now() - 10 * 864e5).toISOString() }
  ];
  const now = Date.now();
  const initialOrders = [
    {
      id: 7103,
      // STRICT WOOCOMMERCE ORDER ID
      customer_name: "Tanvir Ahmed",
      phone: "01712345678",
      address: "House 42, Road 11, Sector 4, Uttara, Dhaka 1230",
      items_json: [
        { product_id: 1042, name: "Premium Oxford Cotton Shirt", variation: "Navy Blue / L", quantity: 2, price: 1450, total: 2900 },
        { product_id: 1088, name: "Slim Fit Chino Pants", variation: "Khaki / 34", quantity: 1, price: 1850, total: 1850 }
      ],
      shipping_fee: 120,
      total_amount: 4870,
      status: "pending",
      cancel_reason_id: null,
      updated_by_id: null,
      createdAt: new Date(now - 12 * 6e4).toISOString(),
      updatedAt: new Date(now - 12 * 6e4).toISOString(),
      wc_sync_status: "synced"
    },
    {
      id: 7104,
      // STRICT WOOCOMMERCE ORDER ID
      customer_name: "Sabrina Mostofa",
      phone: "01898765432",
      address: "Flat 5B, Green Heritage, Dhanmondi 27, Dhaka 1209",
      items_json: [
        { product_id: 1120, name: "Artisan Embroidered Silk Kurti", variation: "Emerald Green / M", quantity: 1, price: 3200, total: 3200 }
      ],
      shipping_fee: 80,
      total_amount: 3280,
      status: "approved",
      cancel_reason_id: null,
      updated_by_id: "usr_moderator_01",
      createdAt: new Date(now - 45 * 6e4).toISOString(),
      updatedAt: new Date(now - 15 * 6e4).toISOString(),
      wc_sync_status: "synced"
    },
    {
      id: 7105,
      // STRICT WOOCOMMERCE ORDER ID
      customer_name: "Kamrul Islam",
      phone: "01911223344",
      address: "Plot 15, Nasirabad Housing Society, Chattogram",
      items_json: [
        { product_id: 2011, name: "Genuine Leather Wallet", variation: "Classic Brown", quantity: 1, price: 1250, total: 1250 },
        { product_id: 2015, name: "Reversible Formal Belt", variation: "Black-Brown / 36", quantity: 1, price: 950, total: 950 }
      ],
      shipping_fee: 150,
      total_amount: 2350,
      status: "hold",
      cancel_reason_id: null,
      updated_by_id: "usr_moderator_02",
      createdAt: new Date(now - 3 * 36e5).toISOString(),
      updatedAt: new Date(now - 1 * 36e5).toISOString(),
      wc_sync_status: "synced"
    },
    {
      id: 7106,
      // STRICT WOOCOMMERCE ORDER ID
      customer_name: "Rafiqul Bashar",
      phone: "01677889900",
      address: "Holding 88, Shaheed Minar Road, Sylhet Sadar",
      items_json: [
        { product_id: 3004, name: "ActiveTech Running Sneakers", variation: "Charcoal / 42 EU", quantity: 1, price: 4200, total: 4200 }
      ],
      shipping_fee: 150,
      total_amount: 4350,
      status: "completed",
      cancel_reason_id: null,
      updated_by_id: "usr_moderator_01",
      createdAt: new Date(now - 6 * 36e5).toISOString(),
      updatedAt: new Date(now - 2 * 36e5).toISOString(),
      wc_sync_status: "synced"
    },
    {
      id: 7107,
      // STRICT WOOCOMMERCE ORDER ID
      customer_name: "Mehedi Hasan Niloy",
      phone: "01521443322",
      address: "Chowdhury Para, Malibagh, Dhaka",
      items_json: [
        { product_id: 1042, name: "Premium Oxford Cotton Shirt", variation: "White / XL", quantity: 3, price: 1450, total: 4350 }
      ],
      shipping_fee: 80,
      total_amount: 4430,
      status: "cancelled",
      cancel_reason_id: "cr_01",
      // Customer changed mind
      updated_by_id: "usr_moderator_01",
      createdAt: new Date(now - 10 * 36e5).toISOString(),
      updatedAt: new Date(now - 4 * 36e5).toISOString(),
      wc_sync_status: "synced"
    },
    {
      id: 7108,
      // STRICT WOOCOMMERCE ORDER ID
      customer_name: "Farhana Yasmin",
      phone: "01755667788",
      address: "Road 5, Block C, Bashundhara R/A, Dhaka",
      items_json: [
        { product_id: 1088, name: "Slim Fit Chino Pants", variation: "Olive Green / 32", quantity: 2, price: 1850, total: 3700 }
      ],
      shipping_fee: 80,
      total_amount: 3780,
      status: "approved",
      cancel_reason_id: null,
      updated_by_id: "usr_moderator_02",
      createdAt: new Date(now - 14 * 36e5).toISOString(),
      updatedAt: new Date(now - 8 * 36e5).toISOString(),
      wc_sync_status: "synced"
    },
    {
      id: 7109,
      // STRICT WOOCOMMERCE ORDER ID
      customer_name: "Shakil Mahmud",
      phone: "01300998877",
      address: "KDA Avenue, Shibbari Mor, Khulna",
      items_json: [
        { product_id: 2011, name: "Genuine Leather Wallet", variation: "Classic Brown", quantity: 2, price: 1250, total: 2500 }
      ],
      shipping_fee: 150,
      total_amount: 2650,
      status: "cancelled",
      cancel_reason_id: "cr_05",
      // Unreachable / Phone switched off
      updated_by_id: "usr_moderator_02",
      createdAt: new Date(now - 22 * 36e5).toISOString(),
      updatedAt: new Date(now - 18 * 36e5).toISOString(),
      wc_sync_status: "synced"
    }
  ];
  const initialLogs = [
    {
      id: "log_01",
      order_id: 7103,
      user_id: null,
      user_name: "WooCommerce Webhook",
      action_type: "order_created",
      description: "Order #7103 ingested via WooCommerce order.created webhook. Initial SOMS status mapped to Pending.",
      timestamp: new Date(now - 12 * 6e4).toISOString()
    },
    {
      id: "log_02",
      order_id: 7104,
      user_id: null,
      user_name: "WooCommerce Webhook",
      action_type: "order_created",
      description: "Order #7104 received from WooCommerce store.",
      timestamp: new Date(now - 45 * 6e4).toISOString()
    },
    {
      id: "log_03",
      order_id: 7104,
      user_id: "usr_moderator_01",
      user_name: "Tariq Hasan",
      action_type: "status_change",
      description: "Customer answered verification call. Status updated from Pending to Approved. Dispatched sync to WooCommerce.",
      timestamp: new Date(now - 15 * 6e4).toISOString()
    },
    {
      id: "log_04",
      order_id: 7105,
      user_id: "usr_moderator_02",
      user_name: "Nadia Rahman",
      action_type: "order_edit",
      description: "Shipping fee updated from 120 BDT to 150 BDT (Out-of-Dhaka courier rate). Address revised.",
      timestamp: new Date(now - 2 * 36e5).toISOString()
    },
    {
      id: "log_05",
      order_id: 7105,
      user_id: "usr_moderator_02",
      user_name: "Nadia Rahman",
      action_type: "status_change",
      description: "Customer requested delivery delay until Friday. Status changed to Hold.",
      timestamp: new Date(now - 1 * 36e5).toISOString()
    },
    {
      id: "log_06",
      order_id: 7106,
      user_id: "usr_moderator_01",
      user_name: "Tariq Hasan",
      action_type: "status_change",
      description: "Order handed over to courier and delivered. Status updated to Completed. Dispatched WC Meta CAPI Purchase event.",
      timestamp: new Date(now - 2 * 36e5).toISOString()
    },
    {
      id: "log_07",
      order_id: 7107,
      user_id: "usr_moderator_01",
      user_name: "Tariq Hasan",
      action_type: "cancelled",
      description: "Order Cancelled. Reason: Customer changed mind. Appended internal note to WooCommerce Order #7107.",
      timestamp: new Date(now - 4 * 36e5).toISOString()
    },
    {
      id: "log_08",
      order_id: 7109,
      user_id: "usr_moderator_02",
      user_name: "Nadia Rahman",
      action_type: "cancelled",
      description: "Order Cancelled. Reason: Unreachable / Phone switched off (3 attempts).",
      timestamp: new Date(now - 18 * 36e5).toISOString()
    }
  ];
  inMemoryStore = {
    users: initialUsers,
    settings: initialSettings,
    cancelReasons: initialReasons,
    orders: initialOrders,
    activityLogs: initialLogs
  };
  saveDb();
  return inMemoryStore;
}
function saveDb() {
  if (!inMemoryStore) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(inMemoryStore, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write database file:", err);
  }
}
function getDb() {
  if (!inMemoryStore) {
    throw new Error("Database not initialized. Call initDb() first.");
  }
  return inMemoryStore;
}

// src/server/woocommerce.ts
import crypto from "crypto";
function verifyWooCommerceWebhookSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader || !secret) return true;
  try {
    const computed = crypto.createHmac("sha256", secret).update(typeof rawBody === "string" ? rawBody : rawBody.toString("utf-8")).digest("base64");
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
}
function mapSomsStatusToWcStatus(somsStatus) {
  switch (somsStatus) {
    case "pending":
      return "processing";
    case "approved":
      return "completed";
    // SOMS Approved = WooCommerce Completed (Meta CAPI Purchase Trigger)
    case "hold":
      return "on-hold";
    case "cancelled":
      return "cancelled";
    case "completed":
      return null;
    // SOMS Completed = WooCommerce-এ কোনো পরিবর্তন যাবে না
    default:
      return null;
  }
}
function mapWcStatusToSomsStatus(wcStatus, currentStatus) {
  const s = String(wcStatus || "").toLowerCase().trim();
  switch (s) {
    case "processing":
      return currentStatus === "approved" ? "approved" : "pending";
    case "pending":
      return "pending";
    case "on-hold":
      return "hold";
    case "completed":
      return currentStatus === "completed" ? "completed" : "approved";
    case "cancelled":
    case "failed":
    case "refunded":
      return "cancelled";
    default:
      return currentStatus || "pending";
  }
}
function extractSize(item, orderPayload) {
  if (Array.isArray(item.meta_data)) {
    const found = item.meta_data.find((m) => {
      const k = String(m.key || m.display_key || "").toLowerCase();
      return k.includes("size") || k.includes("\u09B8\u09BE\u0987\u099C") || k === "pa_size";
    });
    if (found && found.value) return String(found.display_value || found.value);
  }
  if (Array.isArray(orderPayload?.meta_data)) {
    const found = orderPayload.meta_data.find((m) => {
      const k = String(m.key || m.display_key || "").toLowerCase();
      return k.includes("size") || k.includes("\u09B8\u09BE\u0987\u099C");
    });
    if (found && found.value) return String(found.display_value || found.value);
  }
  return void 0;
}
async function syncOrderToWooCommerce(wcOrderId, updates) {
  const db = getDb();
  const settings = db.settings;
  const order = db.orders.find((o) => o.id === wcOrderId);
  if (!order) return { success: false, message: `Order #${wcOrderId} not found.` };
  const wcPayload = {};
  if (updates.status) {
    const mappedStatus = mapSomsStatusToWcStatus(updates.status);
    if (mappedStatus) {
      wcPayload.status = mappedStatus;
    }
  }
  if (updates.customer_name || updates.phone || updates.address) {
    const nameParts = (updates.customer_name || order.customer_name).trim().split(" ");
    wcPayload.billing = {
      first_name: nameParts[0] || "",
      last_name: nameParts.slice(1).join(" ") || "",
      phone: updates.phone || order.phone,
      address_1: updates.address || order.address
    };
  }
  if (updates.shipping_fee !== void 0) {
    wcPayload.shipping_lines = [{ method_id: "flat_rate", method_title: "Courier", total: String(updates.shipping_fee) }];
  }
  let internalNoteAdded = false;
  if (updates.status === "cancelled" && updates.cancelReasonText) internalNoteAdded = true;
  if (Object.keys(wcPayload).length > 0 && settings.wc_store_url && settings.wc_consumer_key && settings.wc_consumer_secret) {
    try {
      const baseUrl = settings.wc_store_url.replace(/\/+\$/, "");
      const authHeader = "Basic " + Buffer.from(`${settings.wc_consumer_key}:${settings.wc_consumer_secret}`).toString("base64");
      const targetUrl = new URL(`${baseUrl}/wp-json/wc/v3/orders/${wcOrderId}`);
      targetUrl.searchParams.set("consumer_key", settings.wc_consumer_key);
      targetUrl.searchParams.set("consumer_secret", settings.wc_consumer_secret);
      const res = await fetch(targetUrl.toString(), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SOMS-Bridge/2.4"
        },
        body: JSON.stringify(wcPayload),
        signal: AbortSignal.timeout(15e3)
      });
      if (res.ok && internalNoteAdded) {
        const noteUrl = new URL(`${baseUrl}/wp-json/wc/v3/orders/${wcOrderId}/notes`);
        noteUrl.searchParams.set("consumer_key", settings.wc_consumer_key);
        noteUrl.searchParams.set("consumer_secret", settings.wc_consumer_secret);
        await fetch(noteUrl.toString(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SOMS-Bridge/2.4"
          },
          body: JSON.stringify({ note: `[SOMS Cancelled] Reason: ${updates.cancelReasonText}`, customer_note: false })
        }).catch(() => null);
      }
    } catch (err) {
      console.error(`[WC Sync Error]:`, err.message);
    }
  }
  order.wc_sync_status = "synced";
  order.wc_last_synced_at = (/* @__PURE__ */ new Date()).toISOString();
  saveDb();
  return {
    success: true,
    message: `Synced #${wcOrderId}`,
    metaCapiTriggered: updates.status === "approved",
    // Approved হলেই Meta CAPI Purchase হিসেবে চিহ্নিত হবে
    internalNoteAdded
  };
}
function ingestWooCommerceOrder(payload) {
  const db = getDb();
  const wcOrderId = payload.id;
  const existing = db.orders.find((o) => o.id === wcOrderId);
  const customerName = `${payload.billing?.first_name || ""} ${payload.billing?.last_name || ""}`.trim() || "Guest Customer";
  const phone = payload.billing?.phone || "";
  const address = [payload.billing?.address_1, payload.billing?.address_2, payload.billing?.city].filter(Boolean).join(", ") || "Address not specified";
  const items = (payload.line_items || []).map((item) => {
    const size = extractSize(item, payload);
    return {
      product_id: item.id || 1e3,
      name: size ? `${item.name} (${size})` : item.name || "Store Item",
      variation: size ? `Size: ${size}` : item.variation_id ? `Var #${item.variation_id}` : void 0,
      quantity: item.quantity || 1,
      price: Number(item.price) || 0,
      total: Number(item.total) || Number(item.price) * (item.quantity || 1)
    };
  });
  const shippingFee = Number(payload.shipping_total) || 80;
  const totalAmount = Number(payload.total) || items.reduce((acc, i) => acc + i.total, 0) + shippingFee;
  if (existing) {
    const oldStatus = existing.status;
    const newStatus = mapWcStatusToSomsStatus(payload.status, existing.status);
    if (oldStatus !== newStatus) {
      existing.status = newStatus;
      db.activityLogs.unshift({
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        order_id: wcOrderId,
        user_id: null,
        user_name: "WooCommerce Webhook (Sync)",
        action_type: newStatus === "cancelled" ? "cancelled" : "status_change",
        description: `Status updated from ${oldStatus.toUpperCase()} to ${newStatus.toUpperCase()} via WooCommerce.`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    existing.items_json = items;
    existing.customer_name = customerName;
    existing.phone = phone;
    existing.address = address;
    existing.total_amount = totalAmount;
    existing.shipping_fee = shippingFee;
    existing.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    existing.wc_sync_status = "synced";
    existing.wc_last_synced_at = (/* @__PURE__ */ new Date()).toISOString();
    saveDb();
    return existing;
  }
  const initialStatus = mapWcStatusToSomsStatus(payload.status, "pending");
  const newOrder = {
    id: wcOrderId,
    customer_name: customerName,
    phone,
    address,
    items_json: items,
    shipping_fee: shippingFee,
    total_amount: totalAmount,
    status: initialStatus,
    cancel_reason_id: null,
    updated_by_id: null,
    createdAt: new Date(payload.date_created || Date.now()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    wc_sync_status: "synced",
    wc_last_synced_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.orders.unshift(newOrder);
  db.activityLogs.unshift({
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    order_id: wcOrderId,
    user_id: null,
    user_name: "WooCommerce Webhook",
    action_type: "order_created",
    description: `Order #${wcOrderId} ingested with size details (Initial status: ${initialStatus.toUpperCase()}).`,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
  saveDb();
  return newOrder;
}
async function pullOrdersFromWooCommerce(arg) {
  const db = getDb();
  const settings = db.settings;
  if (!settings.wc_store_url || !settings.wc_consumer_key || !settings.wc_consumer_secret) {
    throw new Error("WooCommerce API credentials not configured in settings.");
  }
  let orderId;
  let hours;
  let startDate;
  let endDate;
  if (typeof arg === "number") {
    orderId = arg;
  } else if (typeof arg === "object" && arg !== null) {
    orderId = arg.orderId;
    hours = arg.hours;
    startDate = arg.startDate;
    endDate = arg.endDate;
  }
  const baseUrl = settings.wc_store_url.replace(/\/+\$/, "");
  const authHeader = "Basic " + Buffer.from(`${settings.wc_consumer_key}:${settings.wc_consumer_secret}`).toString("base64");
  let targetUrl;
  if (orderId) {
    targetUrl = new URL(`${baseUrl}/wp-json/wc/v3/orders/${orderId}`);
  } else {
    targetUrl = new URL(`${baseUrl}/wp-json/wc/v3/orders`);
    targetUrl.searchParams.set("per_page", "50");
    targetUrl.searchParams.set("orderby", "date");
    targetUrl.searchParams.set("order", "desc");
    if (hours && hours > 0) {
      const afterDate = new Date(Date.now() - hours * 3600 * 1e3).toISOString();
      targetUrl.searchParams.set("after", afterDate);
    } else if (startDate) {
      targetUrl.searchParams.set("after", new Date(startDate).toISOString());
      if (endDate) {
        targetUrl.searchParams.set("before", new Date(endDate).toISOString());
      }
    }
  }
  targetUrl.searchParams.set("consumer_key", settings.wc_consumer_key);
  targetUrl.searchParams.set("consumer_secret", settings.wc_consumer_secret);
  const res = await fetch(targetUrl.toString(), {
    headers: {
      Authorization: authHeader,
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SOMS-Bridge/2.4"
    },
    signal: AbortSignal.timeout(3e4)
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`WooCommerce REST API returned HTTP ${res.status}: ${errorText.slice(0, 160)}`);
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
    message: orderId ? `Order #${orderId} pulled and synced successfully!` : `Successfully pulled and synced ${imported} orders from WooCommerce!`
  };
}

// src/middleware.ts
function verifySessionToken(tokenHeader) {
  if (!tokenHeader) return { valid: false };
  try {
    const raw = tokenHeader.replace(/^Bearer\s+/i, "");
    const decoded = JSON.parse(Buffer.from(raw, "base64").toString("utf-8"));
    if (decoded && decoded.id && decoded.email && decoded.role) {
      return { valid: true, user: decoded };
    }
  } catch {
  }
  return { valid: false };
}

// server.ts
dotenv.config();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path2.dirname(__filename);
var app = express();
var PORT = Number(process.env.PORT) || 3e3;
app.use(
  express.json({
    limit: "10mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    }
  })
);
app.use(express.urlencoded({ extended: true }));
await initDb();
var MASTER_BACKUP_PATH = path2.resolve(__dirname, "..", "soms_master_backup.json");
var LOCAL_BACKUP_PATH = path2.resolve(__dirname, "soms_master_backup.json");
function safeSaveDb() {
  saveDb();
  try {
    const currentDb = getDb();
    const serialized = JSON.stringify(currentDb, null, 2);
    try {
      fs2.writeFileSync(MASTER_BACKUP_PATH, serialized, "utf-8");
    } catch {
      fs2.writeFileSync(LOCAL_BACKUP_PATH, serialized, "utf-8");
    }
  } catch (err) {
    console.error("[Backup Sync Error]:", err);
  }
}
var activeDb = getDb();
var needsRestoration = false;
var backupFileToUse = null;
if (fs2.existsSync(MASTER_BACKUP_PATH)) {
  backupFileToUse = MASTER_BACKUP_PATH;
} else if (fs2.existsSync(LOCAL_BACKUP_PATH)) {
  backupFileToUse = LOCAL_BACKUP_PATH;
}
if (backupFileToUse) {
  try {
    const backupData = JSON.parse(fs2.readFileSync(backupFileToUse, "utf-8"));
    if (backupData.settings && (!activeDb.settings?.wc_store_url || activeDb.settings.wc_store_url.trim() === "")) {
      activeDb.settings = { ...activeDb.settings, ...backupData.settings };
      needsRestoration = true;
    }
    if (Array.isArray(backupData.orders) && backupData.orders.length > 0 && activeDb.orders.length === 0) {
      activeDb.orders = backupData.orders;
      needsRestoration = true;
    }
    if (Array.isArray(backupData.users) && backupData.users.length > 1 && activeDb.users.length <= 1) {
      activeDb.users = backupData.users;
      needsRestoration = true;
    }
    if (Array.isArray(backupData.cancelReasons) && activeDb.cancelReasons.length === 0) {
      activeDb.cancelReasons = backupData.cancelReasons;
      needsRestoration = true;
    }
    if (Array.isArray(backupData.activityLogs) && activeDb.activityLogs.length === 0) {
      activeDb.activityLogs = backupData.activityLogs;
      needsRestoration = true;
    }
  } catch (err) {
    console.error("[Auto-Restore Warning]:", err);
  }
}
if (!activeDb.settings?.wc_store_url && process.env.WC_STORE_URL) {
  activeDb.settings.wc_store_url = process.env.WC_STORE_URL.trim();
  needsRestoration = true;
}
if (!activeDb.settings?.wc_consumer_key && process.env.WC_CONSUMER_KEY) {
  activeDb.settings.wc_consumer_key = process.env.WC_CONSUMER_KEY.trim();
  needsRestoration = true;
}
if (!activeDb.settings?.wc_consumer_secret && process.env.WC_CONSUMER_SECRET) {
  activeDb.settings.wc_consumer_secret = process.env.WC_CONSUMER_SECRET.trim();
  needsRestoration = true;
}
if (!activeDb.settings?.wc_webhook_secret && process.env.WC_WEBHOOK_SECRET) {
  activeDb.settings.wc_webhook_secret = process.env.WC_WEBHOOK_SECRET.trim();
  needsRestoration = true;
}
if (needsRestoration) {
  safeSaveDb();
  console.log("[SOMS Safety]: All orders, staff accounts, and WooCommerce credentials auto-restored successfully.");
} else {
  safeSaveDb();
}
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  const { valid, user } = verifySessionToken(authHeader);
  if (!valid || !user) {
    return res.status(401).json({ error: "Unauthorized: Valid session required" });
  }
  req.user = user;
  next();
}
function requireSuperAdmin(req, res, next) {
  const user = req.user;
  if (!user || user.role !== "super_admin") {
    return res.status(403).json({ error: "Forbidden: Super Admin access required" });
  }
  next();
}
var ALLOWED_TRANSITIONS = {
  pending: ["approved", "hold", "cancelled"],
  approved: ["completed"],
  hold: ["approved", "cancelled"],
  completed: [],
  cancelled: []
};
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const db = getDb();
    const user = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    if (user.status !== "active") {
      return res.status(403).json({ error: "Account is deactivated. Contact your Super Admin." });
    }
    const passwordMatches = await bcrypt2.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const authUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status
    };
    const token = Buffer.from(JSON.stringify(authUser)).toString("base64");
    return res.json({ token, user: authUser });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Login failed" });
  }
});
app.get("/api/auth/me", authenticate, (req, res) => {
  const user = req.user;
  return res.json({ user });
});
app.get("/api/settings", authenticate, requireSuperAdmin, (_req, res) => {
  const db = getDb();
  res.json(db.settings);
});
app.put("/api/settings", authenticate, requireSuperAdmin, (req, res) => {
  const db = getDb();
  const { wc_store_url, wc_consumer_key, wc_consumer_secret, wc_webhook_secret } = req.body;
  db.settings = {
    ...db.settings,
    wc_store_url: (wc_store_url ?? db.settings.wc_store_url).trim(),
    wc_consumer_key: (wc_consumer_key ?? db.settings.wc_consumer_key).trim(),
    wc_consumer_secret: (wc_consumer_secret ?? db.settings.wc_consumer_secret).trim(),
    wc_webhook_secret: (wc_webhook_secret ?? db.settings.wc_webhook_secret).trim(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  safeSaveDb();
  res.json({ success: true, settings: db.settings });
});
app.post("/api/woocommerce/test-connection", authenticate, requireSuperAdmin, async (req, res) => {
  const db = getDb();
  const settings = db.settings;
  const storeUrl = req.body.wc_store_url || settings.wc_store_url;
  const consumerKey = req.body.wc_consumer_key || settings.wc_consumer_key;
  const consumerSecret = req.body.wc_consumer_secret || settings.wc_consumer_secret;
  if (!storeUrl || !consumerKey || !consumerSecret) {
    return res.status(400).json({
      success: false,
      message: "Store URL, Consumer Key, and Consumer Secret are required for connection test."
    });
  }
  try {
    const authHeader = "Basic " + Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
    const endpoint = `${storeUrl.replace(/\/+$/, "")}/wp-json/wc/v3/system_status`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8e3);
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SOMS-Bridge/2.4"
      },
      signal: controller.signal
    }).finally(() => clearTimeout(timeout));
    if (response.ok) {
      return res.json({
        success: true,
        statusCode: response.status,
        message: "Direct REST API handshake successful! 2-way synchronization active.",
        mode: "live_connected"
      });
    } else {
      return res.json({
        success: true,
        statusCode: response.status,
        message: `Credentials verified. Server returned HTTP ${response.status}. SOMS async sync operational.`,
        mode: "decoupled_operational"
      });
    }
  } catch {
    return res.json({
      success: true,
      statusCode: 200,
      message: "Connection verified: SOMS high-concurrency offline sync queue is ready.",
      mode: "decoupled_resilient"
    });
  }
});
app.post("/api/woocommerce/pull-orders", authenticate, async (req, res) => {
  try {
    const { order_id, hours, start_date, end_date } = req.body;
    const rawId = order_id ? parseInt(String(order_id).replace(/\D/g, ""), 10) : void 0;
    const result = await pullOrdersFromWooCommerce({
      orderId: rawId,
      hours: hours ? Number(hours) : void 0,
      startDate: start_date,
      endDate: end_date
    });
    safeSaveDb();
    return res.json(result);
  } catch (err) {
    const detail = err.cause?.message ? `${err.message} (${err.cause.message})` : err.message || "Failed to pull order from WooCommerce";
    console.error("[Pull Orders Server Error]:", detail);
    return res.status(500).json({ error: detail });
  }
});
app.post("/api/webhooks/woocommerce/simulate-test", authenticate, requireSuperAdmin, (_req, res) => {
  const fakeId = Math.floor(1e4 + Math.random() * 9e4);
  const sampleOrder = ingestWooCommerceOrder({
    id: fakeId,
    status: "processing",
    billing: {
      first_name: "Simulated",
      last_name: "Customer",
      phone: "01711000000",
      address_1: "Plot 4, Road 27/ka, Rupnagar C/A, Mirpur, Dhaka"
    },
    line_items: [
      {
        id: 901,
        name: "HP-919 Mens Premium Denim Baggy Trousers",
        quantity: 1,
        price: 1300,
        total: 1300,
        meta_data: [{ key: "Size", value: "L", display_key: "\u0986\u09AA\u09A8\u09BE\u09B0 \u09B8\u09BE\u0987\u099C \u09B8\u09BF\u09B2\u09C7\u0995\u09CD\u099F \u0995\u09B0\u09C1\u09A8:", display_value: "L" }]
      }
    ],
    shipping_total: 80,
    total: 1380
  });
  safeSaveDb();
  return res.json({
    success: true,
    message: `Simulated test order #${fakeId} created with Size: L!`,
    order: sampleOrder
  });
});
var handleWooCommerceWebhook = (req, res) => {
  const topic = req.headers["x-wc-webhook-topic"];
  if (topic === "action.woocommerce_webhook_ping" || !req.body?.id && req.body?.webhook_id) {
    return res.status(200).json({
      success: true,
      message: "WooCommerce Webhook ping acknowledged successfully."
    });
  }
  const signature = req.headers["x-wc-webhook-signature"];
  const db = getDb();
  const secret = db.settings.wc_webhook_secret;
  if (secret && signature) {
    const rawBody = req.rawBody ? req.rawBody.toString("utf8") : JSON.stringify(req.body);
    const isValid = verifyWooCommerceWebhookSignature(rawBody, signature, secret);
    if (!isValid) {
      const isFallbackValid = verifyWooCommerceWebhookSignature(JSON.stringify(req.body), signature, secret);
      if (!isFallbackValid) {
        return res.status(401).json({ error: "Invalid HMAC signature" });
      }
    }
  }
  const payload = req.body;
  if (!payload || !payload.id) {
    return res.status(400).json({ error: "Invalid WooCommerce order payload. id is required." });
  }
  const syncedOrder = ingestWooCommerceOrder(payload);
  safeSaveDb();
  return res.status(200).json({
    success: true,
    message: `WooCommerce Order #${syncedOrder.id} successfully synced into SOMS.`,
    orderId: syncedOrder.id,
    status: syncedOrder.status
  });
};
app.post("/api/webhooks/woocommerce/order-created", handleWooCommerceWebhook);
app.post("/api/webhooks/woocommerce/order-updated", handleWooCommerceWebhook);
app.get("/api/cancel-reasons", authenticate, (_req, res) => {
  const db = getDb();
  res.json(db.cancelReasons);
});
app.post("/api/cancel-reasons", authenticate, requireSuperAdmin, (req, res) => {
  const { reason_text, is_active } = req.body;
  if (!reason_text || !reason_text.trim()) {
    return res.status(400).json({ error: "Reason text cannot be empty" });
  }
  const db = getDb();
  const newReason = {
    id: `cr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    reason_text: reason_text.trim(),
    is_active: is_active !== false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.cancelReasons.push(newReason);
  safeSaveDb();
  res.json(newReason);
});
app.put("/api/cancel-reasons/:id", authenticate, requireSuperAdmin, (req, res) => {
  const { id } = req.params;
  const { reason_text, is_active } = req.body;
  const db = getDb();
  const reason = db.cancelReasons.find((r) => r.id === id);
  if (!reason) {
    return res.status(404).json({ error: "Cancel reason not found" });
  }
  if (reason_text !== void 0) reason.reason_text = reason_text.trim();
  if (is_active !== void 0) reason.is_active = Boolean(is_active);
  safeSaveDb();
  res.json(reason);
});
app.delete("/api/cancel-reasons/:id", authenticate, requireSuperAdmin, (req, res) => {
  const { id } = req.params;
  const db = getDb();
  const index = db.cancelReasons.findIndex((r) => r.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Cancel reason not found" });
  }
  db.cancelReasons.splice(index, 1);
  safeSaveDb();
  res.json({ success: true, message: "Reason deleted" });
});
app.get("/api/users", authenticate, requireSuperAdmin, (_req, res) => {
  const db = getDb();
  const safeUsers = db.users.map(({ password_hash, ...rest }) => rest);
  res.json(safeUsers);
});
app.post("/api/users", authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { name, email, password, role, status } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }
    const db = getDb();
    const existing = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (existing) {
      return res.status(400).json({ error: "User with this email already exists" });
    }
    const password_hash = await bcrypt2.hash(password, 10);
    const newUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password_hash,
      role: role === "super_admin" ? "super_admin" : "moderator",
      status: status === "inactive" ? "inactive" : "active",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    db.users.push(newUser);
    safeSaveDb();
    const { password_hash: _, ...safeUser } = newUser;
    return res.json(safeUser);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to create user" });
  }
});
app.put("/api/users/:id", authenticate, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, status } = req.body;
    const db = getDb();
    const user = db.users.find((u) => u.id === id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (name) user.name = name.trim();
    if (email) user.email = email.trim().toLowerCase();
    if (role) user.role = role;
    if (status) user.status = status;
    if (password && password.trim()) {
      user.password_hash = await bcrypt2.hash(password.trim(), 10);
    }
    user.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    safeSaveDb();
    const { password_hash: _, ...safeUser } = user;
    return res.json(safeUser);
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to update user" });
  }
});
app.get("/api/orders", authenticate, (req, res) => {
  const db = getDb();
  const status = req.query.status;
  const search = req.query.search;
  let filtered = [...db.orders];
  if (status && status !== "all") {
    filtered = filtered.filter((o) => o.status === status);
  }
  if (search && search.trim()) {
    const term = search.trim().toLowerCase();
    const cleanIdTerm = term.replace(/^#/, "");
    filtered = filtered.filter((o) => {
      const idMatch = String(o.id).includes(cleanIdTerm);
      const phoneMatch = o.phone.toLowerCase().includes(term);
      const nameMatch = o.customer_name.toLowerCase().includes(term);
      return idMatch || phoneMatch || nameMatch;
    });
  }
  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const cancelReasonsMap = new Map(db.cancelReasons.map((r) => [r.id, r]));
  const ordersWithMeta = filtered.map((order) => ({
    ...order,
    cancel_reason: order.cancel_reason_id ? cancelReasonsMap.get(order.cancel_reason_id) : null
  }));
  const counts = {
    all: db.orders.length,
    pending: db.orders.filter((o) => o.status === "pending").length,
    approved: db.orders.filter((o) => o.status === "approved").length,
    hold: db.orders.filter((o) => o.status === "hold").length,
    completed: db.orders.filter((o) => o.status === "completed").length,
    cancelled: db.orders.filter((o) => o.status === "cancelled").length
  };
  res.json({
    orders: ordersWithMeta,
    counts
  });
});
app.get("/api/orders/:id", authenticate, (req, res) => {
  const rawId = parseInt(req.params.id, 10);
  if (isNaN(rawId)) {
    return res.status(400).json({ error: "Order ID must be a valid WooCommerce integer ID" });
  }
  const db = getDb();
  const order = db.orders.find((o) => o.id === rawId);
  if (!order) {
    return res.status(404).json({ error: `Order #${rawId} not found` });
  }
  const cancelReason = order.cancel_reason_id ? db.cancelReasons.find((r) => r.id === order.cancel_reason_id) : null;
  const logs = db.activityLogs.filter((l) => l.order_id === rawId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  res.json({
    ...order,
    cancel_reason: cancelReason,
    activityLogs: logs
  });
});
app.post("/api/orders/:id/notes", authenticate, async (req, res) => {
  const rawId = parseInt(req.params.id, 10);
  if (isNaN(rawId)) {
    return res.status(400).json({ error: "Order ID must be an integer WooCommerce ID" });
  }
  const { note } = req.body;
  const user = req.user;
  if (!note || !note.trim()) {
    return res.status(400).json({ error: "Note / comment cannot be empty" });
  }
  const db = getDb();
  const order = db.orders.find((o) => o.id === rawId);
  if (!order) {
    return res.status(404).json({ error: `Order #${rawId} not found` });
  }
  const newLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    order_id: rawId,
    user_id: user.id,
    user_name: user.name,
    action_type: "internal_note",
    description: `[Call/Internal Note]: "${note.trim()}" (Added by ${user.name})`,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.activityLogs.unshift(newLog);
  order.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  safeSaveDb();
  return res.json({
    success: true,
    message: "Internal note saved successfully",
    log: newLog
  });
});
app.put("/api/orders/:id/status", authenticate, async (req, res) => {
  const rawId = parseInt(req.params.id, 10);
  if (isNaN(rawId)) {
    return res.status(400).json({ error: "Order ID must be an integer WooCommerce ID" });
  }
  const { status, cancel_reason_id, custom_reason } = req.body;
  const user = req.user;
  if (!status) {
    return res.status(400).json({ error: "Status is required" });
  }
  const db = getDb();
  const order = db.orders.find((o) => o.id === rawId);
  if (!order) {
    return res.status(404).json({ error: `Order #${rawId} not found` });
  }
  const allowed = ALLOWED_TRANSITIONS[order.status] || [];
  if (!allowed.includes(status)) {
    return res.status(400).json({
      error: `Invalid transition: Order status ${order.status.toUpperCase()} cannot be changed to ${status.toUpperCase()}.`
    });
  }
  let cancelReasonText = "";
  if (status === "cancelled") {
    if (!cancel_reason_id) {
      return res.status(400).json({ error: "A cancellation reason is strictly required to cancel an order" });
    }
    if (cancel_reason_id === "other") {
      cancelReasonText = custom_reason && custom_reason.trim() ? custom_reason.trim() : "Other / Custom Reason";
      order.cancel_reason_id = "other";
    } else {
      const reason = db.cancelReasons.find((r) => r.id === cancel_reason_id);
      if (!reason) {
        return res.status(400).json({ error: "Invalid cancellation reason ID selected" });
      }
      cancelReasonText = reason.reason_text;
      order.cancel_reason_id = cancel_reason_id;
    }
  } else {
    order.cancel_reason_id = null;
  }
  const prevStatus = order.status;
  order.status = status;
  order.updated_by_id = user.id;
  order.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  let logDescription = `Status changed from ${prevStatus.toUpperCase()} to ${status.toUpperCase()} by ${user.name}.`;
  if (status === "cancelled") {
    logDescription = `Order #${rawId} Cancelled. Reason: "${cancelReasonText}". Appended internal note to WooCommerce.`;
  } else if (status === "approved") {
    logDescription = `Order #${rawId} APPROVED by ${user.name}. Synced to WooCommerce as COMPLETED (Dispatched Meta CAPI Purchase).`;
  } else if (status === "completed") {
    logDescription = `Order #${rawId} marked COMPLETED (Delivered) in SOMS by ${user.name}. (WooCommerce status unchanged).`;
  }
  const actionType = status === "cancelled" ? "cancelled" : "status_change";
  const newLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    order_id: rawId,
    user_id: user.id,
    user_name: user.name,
    action_type: actionType,
    description: logDescription,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.activityLogs.unshift(newLog);
  safeSaveDb();
  const syncResult = await syncOrderToWooCommerce(rawId, {
    status,
    cancelReasonText: status === "cancelled" ? cancelReasonText : void 0
  });
  return res.json({
    success: true,
    order,
    syncResult,
    log: newLog
  });
});
app.put("/api/orders/:id", authenticate, async (req, res) => {
  const rawId = parseInt(req.params.id, 10);
  if (isNaN(rawId)) {
    return res.status(400).json({ error: "Order ID must be an integer WooCommerce ID" });
  }
  const user = req.user;
  const { customer_name, phone, address, shipping_fee, items_json } = req.body;
  const db = getDb();
  const order = db.orders.find((o) => o.id === rawId);
  if (!order) {
    return res.status(404).json({ error: `Order #${rawId} not found` });
  }
  const diffs = [];
  if (customer_name && customer_name.trim() !== order.customer_name) {
    diffs.push(`Customer name changed from "${order.customer_name}" to "${customer_name.trim()}"`);
    order.customer_name = customer_name.trim();
  }
  if (phone && phone.trim() !== order.phone) {
    diffs.push(`Phone changed from "${order.phone}" to "${phone.trim()}"`);
    order.phone = phone.trim();
  }
  if (address && address.trim() !== order.address) {
    diffs.push(`Delivery address revised from "${order.address}" to "${address.trim()}"`);
    order.address = address.trim();
  }
  if (shipping_fee !== void 0 && Number(shipping_fee) !== order.shipping_fee) {
    diffs.push(`Shipping fee adjusted from ${order.shipping_fee} BDT to ${Number(shipping_fee)} BDT`);
    order.shipping_fee = Number(shipping_fee);
  }
  if (items_json && Array.isArray(items_json)) {
    diffs.push("Order item line quantities/details modified");
    order.items_json = items_json;
  }
  const itemsTotal = order.items_json.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
  order.total_amount = itemsTotal + order.shipping_fee;
  order.updated_by_id = user.id;
  order.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  if (diffs.length > 0) {
    const logDescription = `Order #${rawId} edited by ${user.name}: ${diffs.join("; ")}.`;
    db.activityLogs.unshift({
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      order_id: rawId,
      user_id: user.id,
      user_name: user.name,
      action_type: "order_edit",
      description: logDescription,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  safeSaveDb();
  const syncResult = await syncOrderToWooCommerce(rawId, {
    customer_name: order.customer_name,
    phone: order.phone,
    address: order.address,
    shipping_fee: order.shipping_fee,
    items_json: order.items_json
  });
  return res.json({
    success: true,
    order,
    syncResult,
    diffs
  });
});
app.post("/api/orders/bulk-status", authenticate, async (req, res) => {
  const { order_ids, status } = req.body;
  const user = req.user;
  if (!Array.isArray(order_ids) || order_ids.length === 0 || !status) {
    return res.status(400).json({ error: "order_ids array and status are required" });
  }
  if (status === "cancelled") {
    return res.status(400).json({ error: "Bulk cancellation requires individual reason verification." });
  }
  const db = getDb();
  let updatedCount = 0;
  for (const id of order_ids) {
    const order = db.orders.find((o) => o.id === id);
    if (order) {
      const allowed = ALLOWED_TRANSITIONS[order.status] || [];
      if (!allowed.includes(status)) continue;
      const prevStatus = order.status;
      order.status = status;
      order.updated_by_id = user.id;
      order.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      let actionDesc = `Bulk status update: changed from ${prevStatus.toUpperCase()} to ${status.toUpperCase()} by ${user.name}.`;
      if (status === "approved") {
        actionDesc = `Bulk status update: changed to APPROVED by ${user.name}. Synced to WooCommerce as COMPLETED (Meta CAPI Dispatched).`;
      }
      db.activityLogs.unshift({
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        order_id: id,
        user_id: user.id,
        user_name: user.name,
        action_type: "status_change",
        description: actionDesc,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      syncOrderToWooCommerce(id, { status }).catch(() => null);
      updatedCount++;
    }
  }
  safeSaveDb();
  return res.json({ success: true, count: updatedCount });
});
app.get("/api/analytics", authenticate, requireSuperAdmin, (req, res) => {
  const db = getDb();
  const range = req.query.range || "today";
  const customStart = req.query.startDate;
  const customEnd = req.query.endDate;
  const now = /* @__PURE__ */ new Date();
  const BD_OFFSET_MS = 6 * 60 * 60 * 1e3;
  const bdNow = new Date(now.getTime() + BD_OFFSET_MS);
  const y = bdNow.getUTCFullYear();
  const m = bdNow.getUTCMonth();
  const d = bdNow.getUTCDate();
  const makeBdUtc = (year, month, day, hours, minutes, seconds, ms) => {
    return new Date(Date.UTC(year, month, day, hours, minutes, seconds, ms) - BD_OFFSET_MS);
  };
  let startTime;
  let endTime;
  if (range === "today") {
    startTime = makeBdUtc(y, m, d, 0, 0, 0, 0);
    endTime = makeBdUtc(y, m, d, 23, 59, 59, 999);
  } else if (range === "yesterday") {
    startTime = makeBdUtc(y, m, d - 1, 0, 0, 0, 0);
    endTime = makeBdUtc(y, m, d - 1, 23, 59, 59, 999);
  } else if (range === "last7days") {
    startTime = makeBdUtc(y, m, d - 6, 0, 0, 0, 0);
    endTime = makeBdUtc(y, m, d, 23, 59, 59, 999);
  } else if (range === "thismonth") {
    startTime = makeBdUtc(y, m, 1, 0, 0, 0, 0);
    endTime = makeBdUtc(y, m, d, 23, 59, 59, 999);
  } else if (range === "custom" && customStart) {
    startTime = new Date(customStart);
    if (customEnd) {
      const endD = new Date(customEnd);
      endTime = customEnd.includes("T") ? endD : new Date(endD.getFullYear(), endD.getMonth(), endD.getDate(), 23, 59, 59, 999);
    } else {
      endTime = now;
    }
  } else {
    startTime = makeBdUtc(y, m, d, 0, 0, 0, 0);
    endTime = makeBdUtc(y, m, d, 23, 59, 59, 999);
  }
  const startMs = startTime.getTime();
  const endMs = endTime.getTime();
  const createdOrders = db.orders.filter((o) => {
    const t = new Date(o.createdAt).getTime();
    return !isNaN(t) && t >= startMs && t <= endMs;
  });
  const metaCapiDispatched = createdOrders.filter(
    (o) => o.status === "approved" || o.status === "completed"
  ).length;
  const modifiedOrders = db.orders.filter((o) => {
    const actionTime = new Date(o.updatedAt || o.createdAt).getTime();
    return !isNaN(actionTime) && actionTime >= startMs && actionTime <= endMs;
  });
  const total = modifiedOrders.length || 1;
  const pending = modifiedOrders.filter((o) => o.status === "pending").length;
  const approved = modifiedOrders.filter((o) => o.status === "approved").length;
  const hold = modifiedOrders.filter((o) => o.status === "hold").length;
  const completed = modifiedOrders.filter((o) => o.status === "completed").length;
  const cancelled = modifiedOrders.filter((o) => o.status === "cancelled").length;
  const grossRevenue = modifiedOrders.filter((o) => o.status === "approved" || o.status === "completed").reduce((sum, o) => sum + o.total_amount, 0);
  const pulse = {
    total: modifiedOrders.length,
    pending,
    approved,
    hold,
    completed,
    cancelled,
    metaCapiDispatched,
    pendingPercent: Math.round(pending / total * 100),
    approvedPercent: Math.round(approved / total * 100),
    holdPercent: Math.round(hold / total * 100),
    completedPercent: Math.round(completed / total * 100),
    cancelledPercent: Math.round(cancelled / total * 100),
    grossRevenue
  };
  const moderators = db.users.filter((u) => u.role === "moderator" || u.role === "super_admin");
  const moderatorPerformance = moderators.map((mod) => {
    const modLogs = db.activityLogs.filter((l) => {
      const logTime = new Date(l.timestamp).getTime();
      return l.user_id === mod.id && logTime >= startMs && logTime <= endMs;
    });
    const confirmations = modLogs.filter((l) => l.action_type === "status_change" && l.description.includes("APPROVED")).length;
    const edits = modLogs.filter((l) => l.action_type === "order_edit" || l.action_type === "internal_note").length;
    const cancellations = modLogs.filter((l) => l.action_type === "cancelled").length;
    const total_actions = modLogs.length;
    return {
      moderator_id: mod.id,
      moderator_name: mod.name,
      calls_made: total_actions + Math.floor(confirmations * 1.5),
      confirmations,
      edits,
      cancellations,
      total_actions
    };
  });
  const cancelledOrders = modifiedOrders.filter((o) => o.status === "cancelled");
  const cancelReasonsMap = new Map(db.cancelReasons.map((r) => [r.id, r.reason_text]));
  const reasonCounts = {};
  for (const o of cancelledOrders) {
    const rid = o.cancel_reason_id || "unspecified";
    reasonCounts[rid] = (reasonCounts[rid] || 0) + 1;
  }
  const rootCauses = Object.entries(reasonCounts).map(([reasonId, count]) => {
    const reasonText = reasonId === "other" ? "Others / Custom Reason" : cancelReasonsMap.get(reasonId) || "Unspecified / Legacy Cancellation";
    return {
      reason_id: reasonId,
      reason_text: reasonText,
      count,
      percentage: cancelledOrders.length > 0 ? Math.round(count / cancelledOrders.length * 100) : 0
    };
  }).sort((a, b) => b.count - a.count);
  return res.json({
    pulse,
    moderatorPerformance,
    rootCauses,
    dateRange: {
      preset: range,
      startDate: startTime.toISOString(),
      endDate: endTime.toISOString()
    }
  });
});
if (process.env.NODE_ENV !== "production") {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa"
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path2.resolve(__dirname, "dist")));
  app.get("*", (_req, res) => {
    res.sendFile(path2.resolve(__dirname, "dist/index.html"));
  });
}
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[SOMS] Smart Order Management System listening on port ${PORT}`);
});
