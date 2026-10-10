import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { User, Setting, CancelReason, Order, OrderActivityLog } from '../types/index.ts';

interface StoreData {
  users: (User & { password_hash: string })[];
  settings: Setting;
  cancelReasons: CancelReason[];
  orders: Order[];
  activityLogs: OrderActivityLog[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'soms_store.json');

// Initialize in-memory cache
let inMemoryStore: StoreData | null = null;

export async function initDb(): Promise<StoreData> {
  if (inMemoryStore) return inMemoryStore;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DATA_FILE)) {
    try {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      inMemoryStore = JSON.parse(raw);
      if (inMemoryStore && inMemoryStore.users && inMemoryStore.orders) {
        return inMemoryStore;
      }
    } catch {
      // Re-seed if corrupted
    }
  }

  // Initial Seed
  const superAdminHash = await bcrypt.hash('Rakib@@3236', 10);
  const moderatorHash = await bcrypt.hash('Moderator@@2026', 10);

  const initialUsers: (User & { password_hash: string })[] = [
    {
      id: 'usr_superadmin_01',
      name: 'MI Rakib',
      email: 'mirakib2246@gmail.com',
      password_hash: superAdminHash,
      role: 'super_admin',
      status: 'active',
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'usr_moderator_01',
      name: 'Tariq Hasan',
      email: 'tariq.moderator@soms.internal',
      password_hash: moderatorHash,
      role: 'moderator',
      status: 'active',
      createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'usr_moderator_02',
      name: 'Nadia Rahman',
      email: 'nadia.moderator@soms.internal',
      password_hash: moderatorHash,
      role: 'moderator',
      status: 'active',
      createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const initialSettings: Setting = {
    id: 'setting_01',
    wc_store_url: 'https://shop.fashiontrendsbz.com',
    wc_consumer_key: 'ck_7b9d62f8319f39e334a123456789abcdef012345',
    wc_consumer_secret: 'cs_8a2b53e7428c28d223b987654321fedcba543210',
    wc_webhook_secret: 'whsec_9876543210abcdeffedcba0987654321',
    updatedAt: new Date().toISOString(),
  };

  const initialReasons: CancelReason[] = [
    { id: 'cr_01', reason_text: 'Customer changed mind', is_active: true, createdAt: new Date(Date.now() - 20 * 86400000).toISOString() },
    { id: 'cr_02', reason_text: 'Duplicate order placed by customer', is_active: true, createdAt: new Date(Date.now() - 20 * 86400000).toISOString() },
    { id: 'cr_03', reason_text: 'Price dispute / Found cheaper elsewhere', is_active: true, createdAt: new Date(Date.now() - 20 * 86400000).toISOString() },
    { id: 'cr_04', reason_text: 'Delivery time exceeds customer expectation (>3 days)', is_active: true, createdAt: new Date(Date.now() - 18 * 86400000).toISOString() },
    { id: 'cr_05', reason_text: 'Unreachable / Phone switched off (3 attempts)', is_active: true, createdAt: new Date(Date.now() - 15 * 86400000).toISOString() },
    { id: 'cr_06', reason_text: 'Fake or invalid contact number', is_active: true, createdAt: new Date(Date.now() - 15 * 86400000).toISOString() },
    { id: 'cr_07', reason_text: 'Out of courier delivery coverage zone', is_active: true, createdAt: new Date(Date.now() - 10 * 86400000).toISOString() },
  ];

  // Seed realistic WooCommerce orders with STRICT NATIVE WOOCOMMERCE IDs:
  const now = Date.now();
  const initialOrders: Order[] = [
    {
      id: 7103, // STRICT WOOCOMMERCE ORDER ID
      customer_name: 'Tanvir Ahmed',
      phone: '01712345678',
      address: 'House 42, Road 11, Sector 4, Uttara, Dhaka 1230',
      items_json: [
        { product_id: 1042, name: 'Premium Oxford Cotton Shirt', variation: 'Navy Blue / L', quantity: 2, price: 1450, total: 2900 },
        { product_id: 1088, name: 'Slim Fit Chino Pants', variation: 'Khaki / 34', quantity: 1, price: 1850, total: 1850 },
      ],
      shipping_fee: 120,
      total_amount: 4870,
      status: 'pending',
      cancel_reason_id: null,
      updated_by_id: null,
      createdAt: new Date(now - 12 * 60000).toISOString(),
      updatedAt: new Date(now - 12 * 60000).toISOString(),
      wc_sync_status: 'synced',
    },
    {
      id: 7104, // STRICT WOOCOMMERCE ORDER ID
      customer_name: 'Sabrina Mostofa',
      phone: '01898765432',
      address: 'Flat 5B, Green Heritage, Dhanmondi 27, Dhaka 1209',
      items_json: [
        { product_id: 1120, name: 'Artisan Embroidered Silk Kurti', variation: 'Emerald Green / M', quantity: 1, price: 3200, total: 3200 },
      ],
      shipping_fee: 80,
      total_amount: 3280,
      status: 'approved',
      cancel_reason_id: null,
      updated_by_id: 'usr_moderator_01',
      createdAt: new Date(now - 45 * 60000).toISOString(),
      updatedAt: new Date(now - 15 * 60000).toISOString(),
      wc_sync_status: 'synced',
    },
    {
      id: 7105, // STRICT WOOCOMMERCE ORDER ID
      customer_name: 'Kamrul Islam',
      phone: '01911223344',
      address: 'Plot 15, Nasirabad Housing Society, Chattogram',
      items_json: [
        { product_id: 2011, name: 'Genuine Leather Wallet', variation: 'Classic Brown', quantity: 1, price: 1250, total: 1250 },
        { product_id: 2015, name: 'Reversible Formal Belt', variation: 'Black-Brown / 36', quantity: 1, price: 950, total: 950 },
      ],
      shipping_fee: 150,
      total_amount: 2350,
      status: 'hold',
      cancel_reason_id: null,
      updated_by_id: 'usr_moderator_02',
      createdAt: new Date(now - 3 * 3600000).toISOString(),
      updatedAt: new Date(now - 1 * 3600000).toISOString(),
      wc_sync_status: 'synced',
    },
    {
      id: 7106, // STRICT WOOCOMMERCE ORDER ID
      customer_name: 'Rafiqul Bashar',
      phone: '01677889900',
      address: 'Holding 88, Shaheed Minar Road, Sylhet Sadar',
      items_json: [
        { product_id: 3004, name: 'ActiveTech Running Sneakers', variation: 'Charcoal / 42 EU', quantity: 1, price: 4200, total: 4200 },
      ],
      shipping_fee: 150,
      total_amount: 4350,
      status: 'completed',
      cancel_reason_id: null,
      updated_by_id: 'usr_moderator_01',
      createdAt: new Date(now - 6 * 3600000).toISOString(),
      updatedAt: new Date(now - 2 * 3600000).toISOString(),
      wc_sync_status: 'synced',
    },
    {
      id: 7107, // STRICT WOOCOMMERCE ORDER ID
      customer_name: 'Mehedi Hasan Niloy',
      phone: '01521443322',
      address: 'Chowdhury Para, Malibagh, Dhaka',
      items_json: [
        { product_id: 1042, name: 'Premium Oxford Cotton Shirt', variation: 'White / XL', quantity: 3, price: 1450, total: 4350 },
      ],
      shipping_fee: 80,
      total_amount: 4430,
      status: 'cancelled',
      cancel_reason_id: 'cr_01', // Customer changed mind
      updated_by_id: 'usr_moderator_01',
      createdAt: new Date(now - 10 * 3600000).toISOString(),
      updatedAt: new Date(now - 4 * 3600000).toISOString(),
      wc_sync_status: 'synced',
    },
    {
      id: 7108, // STRICT WOOCOMMERCE ORDER ID
      customer_name: 'Farhana Yasmin',
      phone: '01755667788',
      address: 'Road 5, Block C, Bashundhara R/A, Dhaka',
      items_json: [
        { product_id: 1088, name: 'Slim Fit Chino Pants', variation: 'Olive Green / 32', quantity: 2, price: 1850, total: 3700 },
      ],
      shipping_fee: 80,
      total_amount: 3780,
      status: 'approved',
      cancel_reason_id: null,
      updated_by_id: 'usr_moderator_02',
      createdAt: new Date(now - 14 * 3600000).toISOString(),
      updatedAt: new Date(now - 8 * 3600000).toISOString(),
      wc_sync_status: 'synced',
    },
    {
      id: 7109, // STRICT WOOCOMMERCE ORDER ID
      customer_name: 'Shakil Mahmud',
      phone: '01300998877',
      address: 'KDA Avenue, Shibbari Mor, Khulna',
      items_json: [
        { product_id: 2011, name: 'Genuine Leather Wallet', variation: 'Classic Brown', quantity: 2, price: 1250, total: 2500 },
      ],
      shipping_fee: 150,
      total_amount: 2650,
      status: 'cancelled',
      cancel_reason_id: 'cr_05', // Unreachable / Phone switched off
      updated_by_id: 'usr_moderator_02',
      createdAt: new Date(now - 22 * 3600000).toISOString(),
      updatedAt: new Date(now - 18 * 3600000).toISOString(),
      wc_sync_status: 'synced',
    },
  ];

  const initialLogs: OrderActivityLog[] = [
    {
      id: 'log_01',
      order_id: 7103,
      user_id: null,
      user_name: 'WooCommerce Webhook',
      action_type: 'order_created',
      description: 'Order #7103 ingested via WooCommerce order.created webhook. Initial SOMS status mapped to Pending.',
      timestamp: new Date(now - 12 * 60000).toISOString(),
    },
    {
      id: 'log_02',
      order_id: 7104,
      user_id: null,
      user_name: 'WooCommerce Webhook',
      action_type: 'order_created',
      description: 'Order #7104 received from WooCommerce store.',
      timestamp: new Date(now - 45 * 60000).toISOString(),
    },
    {
      id: 'log_03',
      order_id: 7104,
      user_id: 'usr_moderator_01',
      user_name: 'Tariq Hasan',
      action_type: 'status_change',
      description: 'Customer answered verification call. Status updated from Pending to Approved. Dispatched sync to WooCommerce.',
      timestamp: new Date(now - 15 * 60000).toISOString(),
    },
    {
      id: 'log_04',
      order_id: 7105,
      user_id: 'usr_moderator_02',
      user_name: 'Nadia Rahman',
      action_type: 'order_edit',
      description: 'Shipping fee updated from 120 BDT to 150 BDT (Out-of-Dhaka courier rate). Address revised.',
      timestamp: new Date(now - 2 * 3600000).toISOString(),
    },
    {
      id: 'log_05',
      order_id: 7105,
      user_id: 'usr_moderator_02',
      user_name: 'Nadia Rahman',
      action_type: 'status_change',
      description: 'Customer requested delivery delay until Friday. Status changed to Hold.',
      timestamp: new Date(now - 1 * 3600000).toISOString(),
    },
    {
      id: 'log_06',
      order_id: 7106,
      user_id: 'usr_moderator_01',
      user_name: 'Tariq Hasan',
      action_type: 'status_change',
      description: 'Order handed over to courier and delivered. Status updated to Completed. Dispatched WC Meta CAPI Purchase event.',
      timestamp: new Date(now - 2 * 3600000).toISOString(),
    },
    {
      id: 'log_07',
      order_id: 7107,
      user_id: 'usr_moderator_01',
      user_name: 'Tariq Hasan',
      action_type: 'cancelled',
      description: 'Order Cancelled. Reason: Customer changed mind. Appended internal note to WooCommerce Order #7107.',
      timestamp: new Date(now - 4 * 3600000).toISOString(),
    },
    {
      id: 'log_08',
      order_id: 7109,
      user_id: 'usr_moderator_02',
      user_name: 'Nadia Rahman',
      action_type: 'cancelled',
      description: 'Order Cancelled. Reason: Unreachable / Phone switched off (3 attempts).',
      timestamp: new Date(now - 18 * 3600000).toISOString(),
    },
  ];

  inMemoryStore = {
    users: initialUsers,
    settings: initialSettings,
    cancelReasons: initialReasons,
    orders: initialOrders,
    activityLogs: initialLogs,
  };

  saveDb();
  return inMemoryStore;
}

export function saveDb(): void {
  if (!inMemoryStore) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(inMemoryStore, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write database file:', err);
  }
}

export function getDb(): StoreData {
  if (!inMemoryStore) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return inMemoryStore;
}
