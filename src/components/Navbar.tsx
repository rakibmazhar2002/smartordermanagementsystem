import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { LogOut, Layers, RefreshCw } from 'lucide-react';

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

  return (
    <header className="border-b border-slate-800 bg-slate-950/95 sticky top-0 z-40 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark (Single text element) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onSelectTab('orders')}
            className="flex items-center gap-2 font-bold text-base tracking-tight text-white hover:text-indigo-400 transition whitespace-nowrap shrink-0"
          >
            <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20">
              <Layers className="w-4 h-4" />
            </div>
            <span>SOMS</span>
          </button>
          <span className="text-xs px-2 py-0.5 rounded text-slate-400 bg-slate-900 border border-slate-800 font-mono hidden sm:inline">
            v2.4
          </span>
        </div>

        {/* Zone 2: Navigation Links (single-line whitespace-nowrap) */}
        <nav className="hidden md:flex items-center gap-1 overflow-x-auto text-sm font-medium">
          <button
            onClick={() => onSelectTab('orders')}
            className={`px-3 py-1.5 rounded-md transition whitespace-nowrap shrink-0 ${
              currentTab === 'orders'
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            Orders
          </button>

          {isSuperAdmin && (
            <>
              <button
                onClick={() => onSelectTab('analytics')}
                className={`px-3 py-1.5 rounded-md transition whitespace-nowrap shrink-0 ${
                  currentTab === 'analytics'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                Executive Analytics
              </button>

              <button
                onClick={() => onSelectTab('reasons')}
                className={`px-3 py-1.5 rounded-md transition whitespace-nowrap shrink-0 ${
                  currentTab === 'reasons'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                Cancel Reasons
              </button>

              <button
                onClick={() => onSelectTab('moderators')}
                className={`px-3 py-1.5 rounded-md transition whitespace-nowrap shrink-0 ${
                  currentTab === 'moderators'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                Moderators
              </button>

              <button
                onClick={() => onSelectTab('settings')}
                className={`px-3 py-1.5 rounded-md transition whitespace-nowrap shrink-0 ${
                  currentTab === 'settings'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                WooCommerce API
              </button>
            </>
          )}
        </nav>

        {/* Zone 3: Primary Action & User Profile */}
        <div className="flex items-center gap-3 shrink-0">
          {onQuickSimulate && (
            <button
              onClick={onQuickSimulate}
              disabled={isSimulating}
              title="Simulate inbound order.created webhook from WooCommerce"
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-800/60 rounded-md transition whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
              <span>Simulate Lead</span>
            </button>
          )}

          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-slate-200 truncate max-w-[130px]">{user?.name}</div>
              <div className="text-[11px] text-slate-400 capitalize">
                {user?.role === 'super_admin' ? 'Super Admin' : 'Moderator'}
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-900 rounded-md transition whitespace-nowrap shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile navigation tab strip */}
      <div className="md:hidden flex items-center gap-1 px-4 py-2 border-t border-slate-800/60 overflow-x-auto text-xs">
        <button
          onClick={() => onSelectTab('orders')}
          className={`px-2.5 py-1 rounded whitespace-nowrap shrink-0 ${
            currentTab === 'orders' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400'
          }`}
        >
          Orders
        </button>
        {isSuperAdmin && (
          <>
            <button
              onClick={() => onSelectTab('analytics')}
              className={`px-2.5 py-1 rounded whitespace-nowrap shrink-0 ${
                currentTab === 'analytics' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400'
              }`}
            >
              Analytics
            </button>
            <button
              onClick={() => onSelectTab('reasons')}
              className={`px-2.5 py-1 rounded whitespace-nowrap shrink-0 ${
                currentTab === 'reasons' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400'
              }`}
            >
              Cancel Reasons
            </button>
            <button
              onClick={() => onSelectTab('moderators')}
              className={`px-2.5 py-1 rounded whitespace-nowrap shrink-0 ${
                currentTab === 'moderators' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400'
              }`}
            >
              Moderators
            </button>
            <button
              onClick={() => onSelectTab('settings')}
              className={`px-2.5 py-1 rounded whitespace-nowrap shrink-0 ${
                currentTab === 'settings' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400'
              }`}
            >
              WC API
            </button>
          </>
        )}
      </div>
    </header>
  );
};
