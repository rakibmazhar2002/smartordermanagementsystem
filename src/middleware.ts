/**
 * SOMS Authentication & RBAC Middleware
 * Enforces role-based access control:
 * - super_admin: Full access to Executive Analytics, Settings, Cancel Reasons, Users, and Orders
 * - moderator: Restricted exclusively to high-density Order processing; auto-redirects from admin routes
 */

export type Role = 'super_admin' | 'moderator';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: 'active' | 'inactive';
}

export interface RoutePermissions {
  path: string;
  allowedRoles: Role[];
  description: string;
}

export const ROUTE_PERMISSIONS: RoutePermissions[] = [
  { path: '/orders', allowedRoles: ['super_admin', 'moderator'], description: 'High-density Order Operations Table' },
  { path: '/analytics', allowedRoles: ['super_admin'], description: 'Super Admin Executive Analytics Dashboard' },
  { path: '/settings', allowedRoles: ['super_admin'], description: 'WooCommerce API & Webhook Configuration' },
  { path: '/reasons', allowedRoles: ['super_admin'], description: 'Dynamic Cancel Reasons Manager' },
  { path: '/moderators', allowedRoles: ['super_admin'], description: 'Moderator Accounts Management' },
];

export function canAccessRoute(user: AuthUser | null, routePath: string): { allowed: boolean; redirectUrl?: string } {
  if (!user) {
    return { allowed: false, redirectUrl: '/login' };
  }

  if (user.status !== 'active') {
    return { allowed: false, redirectUrl: '/login?error=account_deactivated' };
  }

  const matchingRule = ROUTE_PERMISSIONS.find(rule => routePath.startsWith(rule.path));
  if (!matchingRule) {
    return { allowed: true };
  }

  if (matchingRule.allowedRoles.includes(user.role)) {
    return { allowed: true };
  }

  // Moderator restricted from admin sections -> auto-redirect to /orders
  if (user.role === 'moderator') {
    return { allowed: false, redirectUrl: '/orders' };
  }

  return { allowed: false, redirectUrl: '/orders' };
}

/**
 * Server-side Express RBAC Middleware Helpers
 */
export function verifySessionToken(tokenHeader?: string): { valid: boolean; user?: AuthUser } {
  if (!tokenHeader) return { valid: false };
  try {
    const raw = tokenHeader.replace(/^Bearer\s+/i, '');
    const decoded = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8')) as AuthUser;
    if (decoded && decoded.id && decoded.email && decoded.role) {
      return { valid: true, user: decoded };
    }
  } catch {
    // invalid token
  }
  return { valid: false };
}
