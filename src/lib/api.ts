/**
 * SOMS High-Speed Zero-Latency API Client
 */
import {
  User,
  Setting,
  CancelReason,
  Order,
  OrderStatus,
  OrderItem,
  ExecutiveAnalyticsData,
} from '../types/index.ts';

const TOKEN_KEY = 'soms_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || data.message || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export const api = {
  // Auth
  async login(email: string, password: string) {
    const res = await request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(res.token);
    return res;
  },

  async getMe() {
    return request<{ user: User }>('/api/auth/me');
  },

  // Settings
  async getSettings() {
    return request<Setting>('/api/settings');
  },

  async updateSettings(settings: Partial<Setting>) {
    return request<{ success: boolean; settings: Setting }>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  async testWooCommerceConnection(data?: Partial<Setting>) {
    return request<{
      success: boolean;
      statusCode?: number;
      message: string;
      mode?: string;
    }>('/api/woocommerce/test-connection', {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  },

  // Webhook Simulator
  async simulateWebhookOrder() {
    return request<{ success: boolean; message: string; order: Order }>('/api/webhooks/woocommerce/simulate-test', {
      method: 'POST',
    });
  },

  // Cancel Reasons
  async getCancelReasons() {
    return request<CancelReason[]>('/api/cancel-reasons');
  },

  async createCancelReason(reason_text: string, is_active: boolean = true) {
    return request<CancelReason>('/api/cancel-reasons', {
      method: 'POST',
      body: JSON.stringify({ reason_text, is_active }),
    });
  },

  async updateCancelReason(id: string, data: { reason_text?: string; is_active?: boolean }) {
    return request<CancelReason>(`/api/cancel-reasons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteCancelReason(id: string) {
    return request<{ success: boolean; message: string }>(`/api/cancel-reasons/${id}`, {
      method: 'DELETE',
    });
  },

  // Users (Moderator accounts)
  async getUsers() {
    return request<User[]>('/api/users');
  },

  async createUser(data: { name: string; email: string; password: string; role?: string; status?: string }) {
    return request<User>('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateUser(id: string, data: Partial<User & { password?: string }>) {
    return request<User>(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Orders
  async getOrders(params?: { status?: string; search?: string }) {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    return request<{
      orders: Order[];
      counts: {
        all: number;
        pending: number;
        approved: number;
        hold: number;
        completed: number;
        cancelled: number;
      };
    }>(`/api/orders?${query.toString()}`);
  },

  async getOrder(id: number) {
    return request<Order>(`/api/orders/${id}`);
  },

  async updateOrderStatus(id: number, status: OrderStatus, cancel_reason_id?: string) {
    return request<{
      success: boolean;
      order: Order;
      syncResult: { success: boolean; message: string; metaCapiTriggered?: boolean };
    }>(`/api/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, cancel_reason_id }),
    });
  },

  async updateOrderDetails(
    id: number,
    details: {
      customer_name?: string;
      phone?: string;
      address?: string;
      shipping_fee?: number;
      items_json?: OrderItem[];
    }
  ) {
    return request<{
      success: boolean;
      order: Order;
      syncResult: { success: boolean; message: string };
      diffs: string[];
    }>(`/api/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(details),
    });
  },

  async bulkUpdateStatus(order_ids: number[], status: OrderStatus) {
    return request<{ success: boolean; count: number }>('/api/orders/bulk-status', {
      method: 'POST',
      body: JSON.stringify({ order_ids, status }),
    });
  },

  // Analytics
  async getAnalytics(params?: { range?: string; startDate?: string; endDate?: string }) {
    const query = new URLSearchParams();
    if (params?.range) query.set('range', params.range);
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    return request<ExecutiveAnalyticsData>(`/api/analytics?${query.toString()}`);
  },
};
