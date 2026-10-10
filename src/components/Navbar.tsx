import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  ShoppingCart,
  BarChart3,
  AlertCircle,
  Users,
  Settings,
  LogOut,
  RefreshCw,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onQuickSimulate?: () => void;
  isSimulating?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onQuickSimulate,
  isSimulating,
}) => {
  const { user, logout, isSuperAdmin } = useAuth();

  const menuItems = [
    {
      id: 'orders',
      label: 'Orders',
      icon: ShoppingCart,
      adminOnly: false,
    },
    {
      id: 'analytics',
      label: 'Dashboard / Analytics',
      icon: BarChart3,
      adminOnly: true,
    },
    {
      id: 'reasons',
      label: 'Cancel Reasons',
      icon: AlertCircle,
      adminOnly: true,
    },
    {
      id: 'moderators',
      label: 'Moderators',
      icon: Users,
      adminOnly: true,
    },
    {
      id: 'settings',
      label: 'WooCommerce API',
      icon: Settings,
      adminOnly: true,
    },
  ];

  return (
    <aside className="w-64 min-w-[256px] h-screen bg-[#161a26] border-r border-slate-800 flex flex-col justify-between shrink-0 select-none">
      <div>
        {/* User Profile Card (Screenshot UI Pattern) */}
        <div className="p-4 flex items-center gap-3 border-b border-slate-800/80 bg-[#121622]">
          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-indigo-500/30 overflow-hidden shrink-0">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AR'}
          </div>
          <div className="overflow-hidden">
            <h4 className="text-xs font-semibold text-white truncate">
              {user?.name || 'Admin- Rakib'}
            </h4>
            <p className="text-[10px] text-slate-400 font-medium capitalize">
              {user?.role === 'super_admin' ? 'Super Admin' : 'Moderator'}
            </p>
          </div>
        </div>

        {/* Brand Header */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-slate-800/50">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-sm tracking-wide text-white">SOMS Core</span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
            v2.4
          </span>
        </div>

        {/* Vertical Nav List */}
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-220px)]">
          {menuItems.map((item) => {
            if (item.adminOnly && !isSuperAdmin) return null;
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-80" />}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Footer Actions: Simulate Lead & Logout */}
      <div className="p-3 border-t border-slate-800/80 space-y-2 bg-[#121622]">
        {onQuickSimulate && (
          <button
            onClick={onQuickSimulate}
            disabled={isSimulating}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-800/60 rounded-lg transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
            <span>Simulate Lead</span>
          </button>
        )}

        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-red-400 hover:bg-red-950/40 transition"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};
