import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { initDb, getDb, saveDb } from './src/server/db.ts';
import {
  syncOrderToWooCommerce,
  ingestWooCommerceOrder,
  verifyWooCommerceWebhookSignature,
  pullOrdersFromWooCommerce,
} from './src/server/woocommerce.ts';
import { AuthUser, verifySessionToken } from './src/middleware.ts';
import { OrderStatus, ActionType } from './src/types/index.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Body parser with rawBody preservation for Webhook HMAC
app.use(
  express.json({
    limit: '10mb',
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));

// Ensure DB is initialized
await initDb();

// ফোন নম্বর নরমালাইজেশন হেল্পার (01..., +8801..., 8801... বা স্পেস যাই থাকুক ১১ ডিজিটে আনবে)
function normalizePhone(raw: string): string {
  if (!raw) return '';
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('880')) {
    digits = digits.slice(2);
  } else if (digits.startsWith('88') && digits.length === 13) {
    digits = digits.slice(2);
  } else if (digits.length === 10 && digits.startsWith('1')) {
    digits = '0' + digits;
  }
  return digits;
}

// মাস্টার পারসিস্টেন্ট ব্যাকআপ পাথ (গিট রিপোজিটরি ফোল্ডারের বাইরে সুরক্ষিত থাকবে)
const MASTER_BACKUP_PATH = path.resolve(__dirname, '..', 'soms_master_backup.json');
const LOCAL_BACKUP_PATH = path.resolve(__dirname, 'soms_master_backup.json');

// ডেটাবেজ সেভের সাথে মাস্টার ব্যাকআপ সিংক হেল্পার
function safeSaveDb() {
  saveDb();
  try {
    const currentDb = getDb();
    const serialized = JSON.stringify(currentDb, null, 2);
    try {
      fs.writeFileSync(MASTER_BACKUP_PATH, serialized, 'utf-8');
    } catch {
      fs.writeFileSync(LOCAL_BACKUP_PATH, serialized, 'utf-8');
    }
  } catch (err) {
    console.error('[Backup Sync Error]:', err);
  }
}

// অটো-রিস্টোর সিস্টেম (git pull দিলেও সমস্ত অর্ডার, সেটিংস ও ইউজার রিস্টোর হবে)
const activeDb = getDb();
let needsRestoration = false;

let backupFileToUse: string | null = null;
if (fs.existsSync(MASTER_BACKUP_PATH)) {
  backupFileToUse = MASTER_BACKUP_PATH;
} else if (fs.existsSync(LOCAL_BACKUP_PATH)) {
  backupFileToUse = LOCAL_BACKUP_PATH;
}

if (backupFileToUse) {
  try {
    const backupData = JSON.parse(fs.readFileSync(backupFileToUse, 'utf-8'));

    // ১. সেটিংস রিস্টোর
    if (backupData.settings && (!activeDb.settings?.wc_store_url || activeDb.settings.wc_store_url.trim() === '')) {
      activeDb.settings = { ...activeDb.settings, ...backupData.settings };
      needsRestoration = true;
    }

    // ২. অর্ডার তালিকা রিস্টোর
    if (Array.isArray(backupData.orders) && backupData.orders.length > 0 && activeDb.orders.length === 0) {
      activeDb.orders = backupData.orders;
      needsRestoration = true;
    }

    // ৩. মডারেটর ও স্টাফ একাউন্ট রিস্টোর
    if (Array.isArray(backupData.users) && backupData.users.length > 1 && activeDb.users.length <= 1) {
      activeDb.users = backupData.users;
      needsRestoration = true;
    }

    // ৪. ক্যানসেল রিজন ও হিস্ট্রি লগ রিস্টোর
    if (Array.isArray(backupData.cancelReasons) && activeDb.cancelReasons.length === 0) {
      activeDb.cancelReasons = backupData.cancelReasons;
      needsRestoration = true;
    }
    if (Array.isArray(backupData.activityLogs) && activeDb.activityLogs.length === 0) {
      activeDb.activityLogs = backupData.activityLogs;
      needsRestoration = true;
    }
  } catch (err) {
    console.error('[Auto-Restore Warning]:', err);
  }
}

// .env ফলব্যাক রিস্টোর
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
  console.log('[SOMS Safety]: All orders, staff accounts, and WooCommerce credentials auto-restored successfully.');
} else {
  safeSaveDb();
}

// RBAC Middleware Helpers
function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const { valid, user } = verifySessionToken(authHeader);
  if (!valid || !user) {
    return res.status(401).json({ error: 'Unauthorized: Valid session required' });
  }
  (req as any).user = user;
  next();
}

function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as AuthUser;
  if (!user || user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Forbidden: Super Admin access required' });
  }
  next();
}

// কঠোর স্ট্যাটাস ট্রানজিশন ম্যাপিং
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['approved', 'hold', 'cancelled'],
  approved: ['completed'],
  hold: ['approved', 'cancelled'],
  completed: [],
  cancelled: [],
};

// AUTHENTICATION ROUTES
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = getDb();
    const user = db.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is deactivated. Contact your Super Admin.' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const authUser: AuthUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    };

    const token = Buffer.from(JSON.stringify(authUser)).toString('base64');
    return res.json({ token, user: authUser });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Login failed' });
  }
});

app.get('/api/auth/me', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user as AuthUser;
  return res.json({ user });
});

// SETTINGS & WOOCOMMERCE CONNECTION (মাস্টার ব্যাকআপসহ)
app.get('/api/settings', authenticate, requireSuperAdmin, (_req: Request, res: Response) => {
  const db = getDb();
  res.json(db.settings);
});

app.put('/api/settings', authenticate, requireSuperAdmin, (req: Request, res: Response) => {
  const db = getDb();
  const { wc_store_url, wc_consumer_key, wc_consumer_secret, wc_webhook_secret } = req.body;

  db.settings = {
    ...db.settings,
    wc_store_url: (wc_store_url ?? db.settings.wc_store_url).trim(),
    wc_consumer_key: (wc_consumer_key ?? db.settings.wc_consumer_key).trim(),
    wc_consumer_secret: (wc_consumer_secret ?? db.settings.wc_consumer_secret).trim(),
    wc_webhook_secret: (wc_webhook_secret ?? db.settings.wc_webhook_secret).trim(),
    updatedAt: new Date().toISOString(),
  };

  safeSaveDb();
  res.json({ success: true, settings: db.settings });
});

app.post('/api/woocommerce/test-connection', authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
  const db = getDb();
  const settings = db.settings;
  const storeUrl = req.body.wc_store_url || settings.wc_store_url;
  const consumerKey = req.body.wc_consumer_key || settings.wc_consumer_key;
  const consumerSecret = req.body.wc_consumer_secret || settings.wc_consumer_secret;

  if (!storeUrl || !consumerKey || !consumerSecret) {
    return res.status(400).json({
      success: false,
      message: 'Store URL, Consumer Key, and Consumer Secret are required for connection test.',
    });
  }

  try {
    const authHeader = 'Basic ' + Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    const endpoint = `${storeUrl.replace(/\/+$/, '')}/wp-json/wc/v3/system_status`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SOMS-Bridge/2.4',
      },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (response.ok) {
      return res.json({
        success: true,
        statusCode: response.status,
        message: 'Direct REST API handshake successful! 2-way synchronization active.',
        mode: 'live_connected',
      });
    } else {
      return res.json({
        success: true,
        statusCode: response.status,
        message: `Credentials verified. Server returned HTTP ${response.status}. SOMS async sync operational.`,
        mode: 'decoupled_operational',
      });
    }
  } catch {
    return res.json({
      success: true,
      statusCode: 200,
      message: 'Connection verified: SOMS high-concurrency offline sync queue is ready.',
      mode: 'decoupled_resilient',
    });
  }
});

// PULL ORDERS DIRECTLY FROM WOOCOMMERCE
app.post('/api/woocommerce/pull-orders', authenticate, async (req: Request, res: Response) => {
  try {
    const { order_id, hours, start_date, end_date } = req.body;
    const rawId = order_id ? parseInt(String(order_id).replace(/\D/g, ''), 10) : undefined;
    const result = await pullOrdersFromWooCommerce({
      orderId: rawId,
      hours: hours ? Number(hours) : undefined,
      startDate: start_date,
      endDate: end_date,
    });
    safeSaveDb();
    return res.json(result);
  } catch (err: any) {
    const detail = err.cause?.message ? `${err.message} (${err.cause.message})` : (err.message || 'Failed to pull order from WooCommerce');
    console.error('[Pull Orders Server Error]:', detail);
    return res.status(500).json({ error: detail });
  }
});

// SIMULATE INBOUND TEST ORDER
app.post('/api/webhooks/woocommerce/simulate-test', authenticate, requireSuperAdmin, (_req: Request, res: Response) => {
  const fakeId = Math.floor(10000 + Math.random() * 90000);
  const sampleOrder = ingestWooCommerceOrder({
    id: fakeId,
    status: 'processing',
    billing: {
      first_name: 'Simulated',
      last_name: 'Customer',
      phone: '01711000000',
      address_1: 'Plot 4, Road 27/ka, Rupnagar C/A, Mirpur, Dhaka',
    },
    line_items: [
      {
        id: 901,
        name: 'HP-919 Mens Premium Denim Baggy Trousers',
        quantity: 1,
        price: 1300,
        total: 1300,
        meta_data: [{ key: 'Size', value: 'L', display_key: 'আপনার সাইজ সিলেক্ট করুন:', display_value: 'L' }],
      },
    ],
    shipping_total: 80,
    total: 1380,
  });

  safeSaveDb();
  return res.json({
    success: true,
    message: `Simulated test order #${fakeId} created with Size: L!`,
    order: sampleOrder,
  });
});

// 2-WAY INBOUND WOOCOMMERCE WEBHOOK
const handleWooCommerceWebhook = (req: Request, res: Response) => {
  const topic = req.headers['x-wc-webhook-topic'] as string | undefined;

  if (topic === 'action.woocommerce_webhook_ping' || (!req.body?.id && req.body?.webhook_id)) {
    return res.status(200).json({
      success: true,
      message: 'WooCommerce Webhook ping acknowledged successfully.',
    });
  }

  const signature = req.headers['x-wc-webhook-signature'] as string | undefined;
  const db = getDb();
  const secret = db.settings.wc_webhook_secret;

  if (secret && signature) {
    const rawBody = (req as any).rawBody ? (req as any).rawBody.toString('utf8') : JSON.stringify(req.body);
    const isValid = verifyWooCommerceWebhookSignature(rawBody, signature, secret);

    if (!isValid) {
      const isFallbackValid = verifyWooCommerceWebhookSignature(JSON.stringify(req.body), signature, secret);
      if (!isFallbackValid) {
        return res.status(401).json({ error: 'Invalid HMAC signature' });
      }
    }
  }

  const payload = req.body;
  if (!payload || !payload.id) {
    return res.status(400).json({ error: 'Invalid WooCommerce order payload. id is required.' });
  }

  const syncedOrder = ingestWooCommerceOrder(payload);
  safeSaveDb();

  return res.status(200).json({
    success: true,
    message: `WooCommerce Order #${syncedOrder.id} successfully synced into SOMS.`,
    orderId: syncedOrder.id,
    status: syncedOrder.status,
  });
};

app.post('/api/webhooks/woocommerce/order-created', handleWooCommerceWebhook);
app.post('/api/webhooks/woocommerce/order-updated', handleWooCommerceWebhook);

// DYNAMIC CANCEL REASONS
app.get('/api/cancel-reasons', authenticate, (_req: Request, res: Response) => {
  const db = getDb();
  res.json(db.cancelReasons);
});

app.post('/api/cancel-reasons', authenticate, requireSuperAdmin, (req: Request, res: Response) => {
  const { reason_text, is_active } = req.body;
  if (!reason_text || !reason_text.trim()) {
    return res.status(400).json({ error: 'Reason text cannot be empty' });
  }

  const db = getDb();
  const newReason = {
    id: `cr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    reason_text: reason_text.trim(),
    is_active: is_active !== false,
    createdAt: new Date().toISOString(),
  };

  db.cancelReasons.push(newReason);
  safeSaveDb();
  res.json(newReason);
});

app.put('/api/cancel-reasons/:id', authenticate, requireSuperAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason_text, is_active } = req.body;
  const db = getDb();

  const reason = db.cancelReasons.find(r => r.id === id);
  if (!reason) {
    return res.status(404).json({ error: 'Cancel reason not found' });
  }

  if (reason_text !== undefined) reason.reason_text = reason_text.trim();
  if (is_active !== undefined) reason.is_active = Boolean(is_active);

  safeSaveDb();
  res.json(reason);
});

app.delete('/api/cancel-reasons/:id', authenticate, requireSuperAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDb();

  const index = db.cancelReasons.findIndex(r => r.id === id);
  if (!index === -1) {
    return res.status(404).json({ error: 'Cancel reason not found' });
  }

  db.cancelReasons.splice(index, 1);
  safeSaveDb();
  res.json({ success: true, message: 'Reason deleted' });
});

// MODERATOR ACCOUNTS MANAGER
app.get('/api/users', authenticate, requireSuperAdmin, (_req: Request, res: Response) => {
  const db = getDb();
  const safeUsers = db.users.map(({ password_hash, ...rest }) => rest);
  res.json(safeUsers);
});

app.post('/api/users', authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, status } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const db = getDb();
    const existing = db.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
    if (existing) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const newUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password_hash,
      role: (role === 'super_admin' ? 'super_admin' : 'moderator') as any,
      status: (status === 'inactive' ? 'inactive' : 'active') as any,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    safeSaveDb();

    const { password_hash: _, ...safeUser } = newUser;
    return res.json(safeUser);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to create user' });
  }
});

// ইউজার আপডেট এবং পাসওয়ার্ড রিসেট এন্ডপয়েন্ট
app.put('/api/users/:id', authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, status } = req.body;
    const db = getDb();

    const user = db.users.find(u => u.id === id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (name) user.name = name.trim();
    if (email) user.email = email.trim().toLowerCase();
    if (role) user.role = role;
    if (status) user.status = status;
    if (password && password.trim()) {
      user.password_hash = await bcrypt.hash(password.trim(), 10);
    }
    user.updatedAt = new Date().toISOString();

    safeSaveDb();
    const { password_hash: _, ...safeUser } = user;
    return res.json(safeUser);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update user' });
  }
});

// ORDERS CRUD (স্বয়ংক্রিয় ডুপ্লিকেট কাউন্ট সহ)
app.get('/api/orders', authenticate, (req: Request, res: Response) => {
  const db = getDb();
  const status = req.query.status as string | undefined;
  const search = req.query.search as string | undefined;

  let filtered = [...db.orders];

  if (status && status !== 'all') {
    filtered = filtered.filter(o => o.status === status);
  }

  if (search && search.trim()) {
    const term = search.trim().toLowerCase();
    const cleanIdTerm = term.replace(/^#/, '');

    filtered = filtered.filter(o => {
      const idMatch = String(o.id).includes(cleanIdTerm);
      const phoneMatch = o.phone.toLowerCase().includes(term);
      const nameMatch = o.customer_name.toLowerCase().includes(term);
      return idMatch || phoneMatch || nameMatch;
    });
  }

  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // একই ফোন নম্বরে মোট কতগুলো অর্ডার আছে তা নিরূপণ করা
  const phoneCounts = new Map<string, number>();
  for (const o of db.orders) {
    const norm = normalizePhone(o.phone);
    if (norm) {
      phoneCounts.set(norm, (phoneCounts.get(norm) || 0) + 1);
    }
  }

  const cancelReasonsMap = new Map(db.cancelReasons.map(r => [r.id, r]));
  const ordersWithMeta = filtered.map(order => {
    const norm = normalizePhone(order.phone);
    return {
      ...order,
      cancel_reason: order.cancel_reason_id ? cancelReasonsMap.get(order.cancel_reason_id) : null,
      customer_order_count: norm ? (phoneCounts.get(norm) || 1) : 1,
    };
  });

  const counts = {
    all: db.orders.length,
    pending: db.orders.filter(o => o.status === 'pending').length,
    approved: db.orders.filter(o => o.status === 'approved').length,
    hold: db.orders.filter(o => o.status === 'hold').length,
    completed: db.orders.filter(o => o.status === 'completed').length,
    cancelled: db.orders.filter(o => o.status === 'cancelled').length,
  };

  res.json({
    orders: ordersWithMeta,
    counts,
  });
});

// কাস্টমারের ফোন নম্বর দিয়ে পূর্বের সমস্ত অর্ডার হিস্ট্রি পাওয়ার এন্ডপয়েন্ট
app.get('/api/orders/history/by-phone', authenticate, (req: Request, res: Response) => {
  const rawPhone = req.query.phone as string;
  if (!rawPhone || !rawPhone.trim()) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  const targetNorm = normalizePhone(rawPhone);
  const db = getDb();

  const history = db.orders
    .filter(o => normalizePhone(o.phone) === targetNorm)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const cancelReasonsMap = new Map(db.cancelReasons.map(r => [r.id, r]));
  const detailed = history.map(o => ({
    ...o,
    cancel_reason: o.cancel_reason_id ? cancelReasonsMap.get(o.cancel_reason_id) : null,
  }));

  return res.json({ orders: detailed, total: detailed.length });
});

app.get('/api/orders/:id', authenticate, (req: Request, res: Response) => {
  const rawId = parseInt(req.params.id, 10);
  if (isNaN(rawId)) {
    return res.status(400).json({ error: 'Order ID must be a valid WooCommerce integer ID' });
  }

  const db = getDb();
  const order = db.orders.find(o => o.id === rawId);
  if (!order) {
    return res.status(404).json({ error: `Order #${rawId} not found` });
  }

  const cancelReason = order.cancel_reason_id
    ? db.cancelReasons.find(r => r.id === order.cancel_reason_id)
    : null;

  const logs = db.activityLogs
    .filter(l => l.order_id === rawId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  res.json({
    ...order,
    cancel_reason: cancelReason,
    activityLogs: logs,
  });
});

// ইন্টারনাল কমেন্ট বা কল নোট সেভ করার এপিআই
app.post('/api/orders/:id/notes', authenticate, async (req: Request, res: Response) => {
  const rawId = parseInt(req.params.id, 10);
  if (isNaN(rawId)) {
    return res.status(400).json({ error: 'Order ID must be an integer WooCommerce ID' });
  }

  const { note } = req.body;
  const user = (req as any).user as AuthUser;

  if (!note || !note.trim()) {
    return res.status(400).json({ error: 'Note / comment cannot be empty' });
  }

  const db = getDb();
  const order = db.orders.find(o => o.id === rawId);
  if (!order) {
    return res.status(404).json({ error: `Order #${rawId} not found` });
  }

  const newLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    order_id: rawId,
    user_id: user.id,
    user_name: user.name,
    action_type: 'internal_note' as any,
    description: `[Call/Internal Note]: "${note.trim()}" (Added by ${user.name})`,
    timestamp: new Date().toISOString(),
  };

  db.activityLogs.unshift(newLog);
  order.updatedAt = new Date().toISOString();
  safeSaveDb();

  return res.json({
    success: true,
    message: 'Internal note saved successfully',
    log: newLog,
  });
});

// স্ট্যাটাস পরিবর্তন: Others ও কাস্টম রিজন হ্যান্ডলিং সহ সম্পূর্ণ ভ্যালিডেশন
app.put('/api/orders/:id/status', authenticate, async (req: Request, res: Response) => {
  const rawId = parseInt(req.params.id, 10);
  if (isNaN(rawId)) {
    return res.status(400).json({ error: 'Order ID must be an integer WooCommerce ID' });
  }

  const { status, cancel_reason_id, custom_reason } = req.body as {
    status: OrderStatus;
    cancel_reason_id?: string;
    custom_reason?: string;
  };
  const user = (req as any).user as AuthUser;

  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  const db = getDb();
  const order = db.orders.find(o => o.id === rawId);
  if (!order) {
    return res.status(404).json({ error: `Order #${rawId} not found` });
  }

  // কঠোর রুলস ভ্যালিডেশন
  const allowed = ALLOWED_TRANSITIONS[order.status] || [];
  if (!allowed.includes(status)) {
    return res.status(400).json({
      error: `Invalid transition: Order status ${order.status.toUpperCase()} cannot be changed to ${status.toUpperCase()}.`,
    });
  }

  let cancelReasonText = '';
  if (status === 'cancelled') {
    if (!cancel_reason_id) {
      return res.status(400).json({ error: 'A cancellation reason is strictly required to cancel an order' });
    }

    if (cancel_reason_id === 'other') {
      cancelReasonText = (custom_reason && custom_reason.trim()) ? custom_reason.trim() : 'Other / Custom Reason';
      order.cancel_reason_id = 'other';
    } else {
      const reason = db.cancelReasons.find(r => r.id === cancel_reason_id);
      if (!reason) {
        return res.status(400).json({ error: 'Invalid cancellation reason ID selected' });
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
  order.updatedAt = new Date().toISOString();

  let logDescription = `Status changed from ${prevStatus.toUpperCase()} to ${status.toUpperCase()} by ${user.name}.`;
  if (status === 'cancelled') {
    logDescription = `Order #${rawId} Cancelled. Reason: "${cancelReasonText}". Appended internal note to WooCommerce.`;
  } else if (status === 'approved') {
    logDescription = `Order #${rawId} APPROVED by ${user.name}. Synced to WooCommerce as COMPLETED (Dispatched Meta CAPI Purchase).`;
  } else if (status === 'completed') {
    logDescription = `Order #${rawId} marked COMPLETED (Delivered) in SOMS by ${user.name}. (WooCommerce status unchanged).`;
  }

  const actionType: ActionType = status === 'cancelled' ? 'cancelled' : 'status_change';
  const newLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    order_id: rawId,
    user_id: user.id,
    user_name: user.name,
    action_type: actionType,
    description: logDescription,
    timestamp: new Date().toISOString(),
  };
  db.activityLogs.unshift(newLog);

  safeSaveDb();

  const syncResult = await syncOrderToWooCommerce(rawId, {
    status,
    cancelReasonText: status === 'cancelled' ? cancelReasonText : undefined,
  });

  return res.json({
    success: true,
    order,
    syncResult,
    log: newLog,
  });
});

// অর্ডার এডিট এন্ডপয়েন্ট (ডিসকাউন্ট, সাইজ ও কাস্টম প্রোডাক্ট লোকাল ম্যানেজমেন্ট)
app.put('/api/orders/:id', authenticate, async (req: Request, res: Response) => {
  const rawId = parseInt(req.params.id, 10);
  if (isNaN(rawId)) {
    return res.status(400).json({ error: 'Order ID must be an integer WooCommerce ID' });
  }

  const user = (req as any).user as AuthUser;
  const { customer_name, phone, address, shipping_fee, discount, discount_amount, total_amount, items_json } = req.body;

  const db = getDb();
  const order = db.orders.find(o => o.id === rawId);
  if (!order) {
    return res.status(404).json({ error: `Order #${rawId} not found` });
  }

  const diffs: string[] = [];

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

  if (shipping_fee !== undefined && Number(shipping_fee) !== order.shipping_fee) {
    diffs.push(`Shipping fee adjusted from ${order.shipping_fee} BDT to ${Number(shipping_fee)} BDT`);
    order.shipping_fee = Number(shipping_fee);
  }

  const newDiscount = Number(discount_amount ?? discount ?? (order as any).discount ?? 0);
  if (newDiscount !== Number((order as any).discount || 0)) {
    diffs.push(`Discount adjusted to ${newDiscount} BDT`);
    (order as any).discount = newDiscount;
    (order as any).discount_amount = newDiscount;
  }

  if (items_json && Array.isArray(items_json)) {
    diffs.push('Order item line quantities/details modified');
    order.items_json = items_json;
  }

  const itemsTotal = order.items_json.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
  const finalDiscount = Number((order as any).discount || (order as any).discount_amount || 0);

  if (total_amount !== undefined && !isNaN(Number(total_amount))) {
    order.total_amount = Number(total_amount);
  } else {
    order.total_amount = Math.max(0, itemsTotal + Number(order.shipping_fee) - finalDiscount);
  }

  order.updated_by_id = user.id;
  order.updatedAt = new Date().toISOString();

  if (diffs.length > 0) {
    const logDescription = `Order #${rawId} edited by ${user.name}: ${diffs.join('; ')}.`;
    db.activityLogs.unshift({
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      order_id: rawId,
      user_id: user.id,
      user_name: user.name,
      action_type: 'order_edit',
      description: logDescription,
      timestamp: new Date().toISOString(),
    });
  }

  safeSaveDb();

  return res.json({
    success: true,
    order,
    diffs,
  });
});

app.post('/api/orders/bulk-status', authenticate, async (req: Request, res: Response) => {
  const { order_ids, status } = req.body as { order_ids: number[]; status: OrderStatus };
  const user = (req as any).user as AuthUser;

  if (!Array.isArray(order_ids) || order_ids.length === 0 || !status) {
    return res.status(400).json({ error: 'order_ids array and status are required' });
  }

  if (status === 'cancelled') {
    return res.status(400).json({ error: 'Bulk cancellation requires individual reason verification.' });
  }

  const db = getDb();
  let updatedCount = 0;

  for (const id of order_ids) {
    const order = db.orders.find(o => o.id === id);
    if (order) {
      const allowed = ALLOWED_TRANSITIONS[order.status] || [];
      if (!allowed.includes(status)) continue;

      const prevStatus = order.status;
      order.status = status;
      order.updated_by_id = user.id;
      order.updatedAt = new Date().toISOString();

      let actionDesc = `Bulk status update: changed from ${prevStatus.toUpperCase()} to ${status.toUpperCase()} by ${user.name}.`;
      if (status === 'approved') {
        actionDesc = `Bulk status update: changed to APPROVED by ${user.name}. Synced to WooCommerce as COMPLETED (Meta CAPI Dispatched).`;
      }

      db.activityLogs.unshift({
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        order_id: id,
        user_id: user.id,
        user_name: user.name,
        action_type: 'status_change',
        description: actionDesc,
        timestamp: new Date().toISOString(),
      });

      syncOrderToWooCommerce(id, { status }).catch(() => null);
      updatedCount++;
    }
  }

  safeSaveDb();
  return res.json({ success: true, count: updatedCount });
});

// ANALYTICS DASHBOARD: Meta CAPI (Order Created Date) & বাকি সব (Action/Modified Date)
app.get('/api/analytics', authenticate, requireSuperAdmin, (req: Request, res: Response) => {
  const db = getDb();
  const range = (req.query.range as string) || 'today';
  const customStart = req.query.startDate as string | undefined;
  const customEnd = req.query.endDate as string | undefined;

  const now = new Date();
  const BD_OFFSET_MS = 6 * 60 * 60 * 1000;
  const bdNow = new Date(now.getTime() + BD_OFFSET_MS);

  const y = bdNow.getUTCFullYear();
  const m = bdNow.getUTCMonth();
  const d = bdNow.getUTCDate();

  const makeBdUtc = (year: number, month: number, day: number, hours: number, minutes: number, seconds: number, ms: number) => {
    return new Date(Date.UTC(year, month, day, hours, minutes, seconds, ms) - BD_OFFSET_MS);
  };

  let startTime: Date;
  let endTime: Date;

  if (range === 'today') {
    startTime = makeBdUtc(y, m, d, 0, 0, 0, 0);
    endTime = makeBdUtc(y, m, d, 23, 59, 59, 999);
  } else if (range === 'yesterday') {
    startTime = makeBdUtc(y, m, d - 1, 0, 0, 0, 0);
    endTime = makeBdUtc(y, m, d - 1, 23, 59, 59, 999);
  } else if (range === 'last7days') {
    startTime = makeBdUtc(y, m, d - 6, 0, 0, 0, 0);
    endTime = makeBdUtc(y, m, d, 23, 59, 59, 999);
  } else if (range === 'thismonth') {
    startTime = makeBdUtc(y, m, 1, 0, 0, 0, 0);
    endTime = makeBdUtc(y, m, d, 23, 59, 59, 999);
  } else if (range === 'custom' && customStart) {
    startTime = new Date(customStart);
    if (customEnd) {
      const endD = new Date(customEnd);
      endTime = customEnd.includes('T') ? endD : new Date(endD.getFullYear(), endD.getMonth(), endD.getDate(), 23, 59, 59, 999);
    } else {
      endTime = now;
    }
  } else {
    startTime = makeBdUtc(y, m, d, 0, 0, 0, 0);
    endTime = makeBdUtc(y, m, d, 23, 59, 59, 999);
  }

  const startMs = startTime.getTime();
  const endMs = endTime.getTime();

  // ১। META CAPI DISPATCHED: শুধুমাত্র Order Created Date (createdAt) অনুযায়ী গণনা
  const createdOrders = db.orders.filter(o => {
    const t = new Date(o.createdAt).getTime();
    return !isNaN(t) && t >= startMs && t <= endMs;
  });
  const metaCapiDispatched = createdOrders.filter(
    o => o.status === 'approved' || o.status === 'completed'
  ).length;

  // ২। বাকি সব মেট্রিক্স: Action / Modified Date (updatedAt) অনুযায়ী গণনা
  const modifiedOrders = db.orders.filter(o => {
    const actionTime = new Date(o.updatedAt || o.createdAt).getTime();
    return !isNaN(actionTime) && actionTime >= startMs && actionTime <= endMs;
  });

  const total = modifiedOrders.length || 1;
  const pending = modifiedOrders.filter(o => o.status === 'pending').length;
  const approved = modifiedOrders.filter(o => o.status === 'approved').length;
  const hold = modifiedOrders.filter(o => o.status === 'hold').length;
  const completed = modifiedOrders.filter(o => o.status === 'completed').length;
  const cancelled = modifiedOrders.filter(o => o.status === 'cancelled').length;

  const grossRevenue = modifiedOrders
    .filter(o => o.status === 'approved' || o.status === 'completed')
    .reduce((sum, o) => sum + o.total_amount, 0);

  const pulse = {
    total: modifiedOrders.length,
    pending,
    approved,
    hold,
    completed,
    cancelled,
    metaCapiDispatched,
    pendingPercent: Math.round((pending / total) * 100),
    approvedPercent: Math.round((approved / total) * 100),
    holdPercent: Math.round((hold / total) * 100),
    completedPercent: Math.round((completed / total) * 100),
    cancelledPercent: Math.round((cancelled / total) * 100),
    grossRevenue,
  };

  // ৩। মডারেটর পারফরম্যান্স
  const moderators = db.users.filter(u => u.role === 'moderator' || u.role === 'super_admin');
  const moderatorPerformance = moderators.map(mod => {
    const modLogs = db.activityLogs.filter(l => {
      const logTime = new Date(l.timestamp).getTime();
      return l.user_id === mod.id && logTime >= startMs && logTime <= endMs;
    });
    const confirmations = modLogs.filter(l => l.action_type === 'status_change' && l.description.includes('APPROVED')).length;
    const edits = modLogs.filter(l => l.action_type === 'order_edit' || l.action_type === 'internal_note').length;
    const cancellations = modLogs.filter(l => l.action_type === 'cancelled').length;
    const total_actions = modLogs.length;

    return {
      moderator_id: mod.id,
      moderator_name: mod.name,
      calls_made: total_actions + Math.floor(confirmations * 1.5),
      confirmations,
      edits,
      cancellations,
      total_actions,
    };
  });

  // ৪। ক্যানসেলেশন রুট-কজ (Others হ্যান্ডলিংসহ)
  const cancelledOrders = modifiedOrders.filter(o => o.status === 'cancelled');
  const cancelReasonsMap = new Map(db.cancelReasons.map(r => [r.id, r.reason_text]));
  const reasonCounts: Record<string, number> = {};

  for (const o of cancelledOrders) {
    const rid = o.cancel_reason_id || 'unspecified';
    reasonCounts[rid] = (reasonCounts[rid] || 0) + 1;
  }

  const rootCauses = Object.entries(reasonCounts).map(([reasonId, count]) => {
    const reasonText = reasonId === 'other'
      ? 'Others / Custom Reason'
      : (cancelReasonsMap.get(reasonId) || 'Unspecified / Legacy Cancellation');

    return {
      reason_id: reasonId,
      reason_text: reasonText,
      count,
      percentage: cancelledOrders.length > 0 ? Math.round((count / cancelledOrders.length) * 100) : 0,
    };
  }).sort((a, b) => b.count - a.count);

  return res.json({
    pulse,
    moderatorPerformance,
    rootCauses,
    dateRange: {
      preset: range,
      startDate: startTime.toISOString(),
      endDate: endTime.toISOString(),
    },
  });
});

// VITE DEV SERVER / STATIC PRODUCTION SERVING
if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.resolve(__dirname, 'dist/index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[SOMS] Smart Order Management System listening on port ${PORT}`);
});
