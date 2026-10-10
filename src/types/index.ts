/**
 * Shared Type Definitions for Smart Order Management System (SOMS)
 * STRICT ORDER ID SPECIFICATION:
 * Order ID is always and solely the integer WooCommerce Order ID (e.g. 7103).
 */

export type Role = 'super_admin' | 'moderator';
export type UserStatus = 'active' | 'inactive';
export type OrderStatus = 'pending' | 'approved' | 'hold' | 'cancelled' | 'completed';
export type ActionType = 'status_change' | 'order_edit' | 'order_created' | 'cancelled';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Setting {
  id: string;
  wc_store_url: string;
  wc_consumer_key: string;
  wc_consumer_secret: string;
  wc_webhook_secret: string;
  updatedAt: string;
}

export interface CancelReason {
  id: string;
  reason_text: string;
  is_active: boolean;
  createdAt: string;
}

export interface OrderItem {
  product_id: number;
  name: string;
  variation?: string;
  quantity: number;
  price: number;
  total: number;
}

export interface OrderActivityLog {
  id: string;
  order_id: number; // Strictly WooCommerce Order ID
  user_id?: string | null;
  user_name: string;
  action_type: ActionType;
  description: string;
  timestamp: string;
}

export interface Order {
  id: number; // Strictly native WooCommerce Order ID (e.g. 7103)
  customer_name: string;
  phone: string;
  address: string;
  items_json: OrderItem[];
  total_amount: number;
  shipping_fee: number;
  status: OrderStatus;
  cancel_reason_id?: string | null;
  cancel_reason?: CancelReason | null;
  updated_by_id?: string | null;
  updated_by?: User | null;
  createdAt: string;
  updatedAt: string;
  activityLogs?: OrderActivityLog[];
  wc_sync_status?: 'synced' | 'pending' | 'failed';
  wc_last_synced_at?: string;
}

export interface ModeratorPerformanceMetric {
  moderator_id: string;
  moderator_name: string;
  calls_made: number;
  confirmations: number;
  edits: number;
  cancellations: number;
  total_actions: number;
}

export interface CancellationRootCauseItem {
  reason_id: string;
  reason_text: string;
  count: number;
  percentage: number;
}

export interface ExecutiveAnalyticsData {
  pulse: {
    total: number;
    pending: number;
    approved: number;
    hold: number;
    completed: number;
    cancelled: number;
    pendingPercent: number;
    approvedPercent: number;
    holdPercent: number;
    completedPercent: number;
    cancelledPercent: number;
    grossRevenue: number;
  };
  moderatorPerformance: ModeratorPerformanceMetric[];
  rootCauses: CancellationRootCauseItem[];
  dateRange: {
    preset: 'today' | 'yesterday' | 'last7days' | 'thismonth' | 'custom';
    startDate: string;
    endDate: string;
  };
}
