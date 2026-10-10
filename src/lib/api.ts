import { Order, OrderStatus, CancelReason } from '../types/index.ts';

export const TOKEN_KEY = 'soms_token';

export const getStoredToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setStoredToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const removeStoredToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

const getAuthHeader = () => {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const api = {
  // Dual-Signature Login: handles both api.login(email, password) AND api.login({ email, password })
  login: async (arg1: any, arg2?: string) => {
    let payload: { email: string; password: string } = { email: '', password: '' };

    if (typeof arg1 === 'string') {
      payload = { email: arg1.trim(), password: arg2 || '' };
    } else if (typeof arg1 === 'object' && arg1 !== null) {
      payload = {
        email: (arg1.email || arg1.username || '').trim(),
        password: arg1.password || '',
      };
    }

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Login failed' }));
      throw new Error(err.error || 'Login failed');
    }
    return res.json();
  },

  getMe: async () => {
    const res = await fetch('/api/auth/me', {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Not authenticated');
    return res.json();
  },

  getOrders: async (params?: { status?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    if (params?.search) query.set('search', params.search);

    const res = await fetch(`/api/orders?${query.toString()}`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to fetch orders');
    return res.json();
  },

  getOrder: async (id: number) => {
    const res = await fetch(`/api/orders/${id}`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to fetch order');
    return res.json();
  },

  updateOrderStatus: async (id: number, status: OrderStatus, cancelReasonId?: string) => {
    const res = await fetch(`/api/orders/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ status, cancel_reason_id: cancelReasonId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Update failed' }));
      throw new Error(err.error || 'Failed to update order status');
    }
    return res.json();
  },

  updateOrderDetails: async (id: number, data: any) => {
    const res = await fetch(`/api/orders/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Update failed' }));
      throw new Error(err.error || 'Failed to update order');
    }
    return res.json();
  },

  bulkUpdateStatus: async (orderIds: number[], status: OrderStatus) => {
    const res = await fetch('/api/orders/bulk-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ order_ids: orderIds, status }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Bulk update failed' }));
      throw new Error(err.error || 'Bulk update failed');
    }
    return res.json();
  },

  pullOrders: async (orderId?: number | string) => {
    const res = await fetch('/api/woocommerce/pull-orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ order_id: orderId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Pull failed' }));
      throw new Error(err.error || 'Failed to pull orders');
    }
    return res.json();
  },

  getCancelReasons: async () => {
    const res = await fetch('/api/cancel-reasons', {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to fetch cancel reasons');
    return res.json();
  },

  addCancelReason: async (reason_text: string) => {
    const res = await fetch('/api/cancel-reasons', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ reason_text }),
    });
    if (!res.ok) throw new Error('Failed to add cancel reason');
    return res.json();
  },

  updateCancelReason: async (id: string, data: any) => {
    const res = await fetch(`/api/cancel-reasons/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update reason');
    return res.json();
  },

  deleteCancelReason: async (id: string) => {
    const res = await fetch(`/api/cancel-reasons/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to delete reason');
    return res.json();
  },

  getUsers: async () => {
    const res = await fetch('/api/users', {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },

  addUser: async (data: any) => {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to add user' }));
      throw new Error(err.error || 'Failed to add user');
    }
    return res.json();
  },

  updateUser: async (id: string, data: any) => {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update user');
    return res.json();
  },

  getSettings: async () => {
    const res = await fetch('/api/settings', {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  updateSettings: async (settings: any) => {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  },

  testWcConnection: async (settings?: any) => {
    const res = await fetch('/api/woocommerce/test-connection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(settings || {}),
    });
    return res.json();
  },

  getAnalytics: async (params?: { range?: string; startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams(params as any);
    const res = await fetch(`/api/analytics?${query.toString()}`, {
      headers: getAuthHeader(),
    });
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
  },
};
