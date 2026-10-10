/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Smart Order Management System (SOMS)
 * Developed by MI Rakib
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { LoginView } from './components/auth/LoginView.tsx';
import { Navbar } from './components/Navbar.tsx';
import { OrderTable } from './components/orders/OrderTable.tsx';
import { ExecutiveDashboard } from './components/admin/ExecutiveDashboard.tsx';
import { CancelReasonsManager } from './components/admin/CancelReasonsManager.tsx';
import { ModeratorManager } from './components/admin/ModeratorManager.tsx';
import { WooCommerceSettings } from './components/admin/WooCommerceSettings.tsx';
import { api } from './lib/api.ts';
import { Menu } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, isLoading, isSuperAdmin } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('orders');
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState(false);

  const handleSelectTab = (tab: string) => {
    if (!isSuperAdmin && tab !== 'orders') {
      setCurrentTab('orders');
      return;
    }
    setCurrentTab(tab);
  };

  const handleQuickSimulate = async () => {
    setIsSimulating(true);
    try {
      const res = await api.simulateWebhookOrder();
      setRefreshTrigger(prev => prev + 1);
      setCurrentTab('orders');
      alert(`WooCommerce order.created Webhook Ingested!\nNative Order ID #${res.order.id} for "${res.order.customer_name}" stored in SOMS.`);
    } catch (err: any) {
      alert(`Simulation failed: ${err.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono">Initializing SOMS Zero-Latency Core...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  const safeTab = (!isSuperAdmin && currentTab !== 'orders') ? 'orders' : currentTab;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* ১. বামপাশের ভার্টিক্যাল সাইডবার */}
      <Navbar
        currentTab={safeTab}
        onSelectTab={handleSelectTab}
        onQuickSimulate={handleQuickSimulate}
        isSimulating={isSimulating}
      />

      {/* ২. ডানপাশের ফুল স্ক্রিন কন্টেন্ট এরিয়া */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Top Header Bar */}
        <header className="h-14 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <button className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-sm font-semibold text-slate-200 capitalize tracking-wide">
              {safeTab === 'orders'
                ? 'Orders Ledger'
                : safeTab === 'analytics'
                ? 'Executive Analytics'
                : safeTab === 'reasons'
                ? 'Cancellation Reasons'
                : safeTab === 'moderators'
                ? 'Moderators Directory'
                : 'WooCommerce API Bridge'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded-full">
              Live Sync
            </span>
          </div>
        </header>

        {/* Full-width Scrollable Main Workspace */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 w-full">
          {safeTab === 'orders' && <OrderTable onRefreshTrigger={refreshTrigger} />}
          {safeTab === 'analytics' && isSuperAdmin && <ExecutiveDashboard />}
          {safeTab === 'reasons' && isSuperAdmin && <CancelReasonsManager />}
          {safeTab === 'moderators' && isSuperAdmin && <ModeratorManager />}
          {safeTab === 'settings' && isSuperAdmin && (
            <WooCommerceSettings onOrderCreated={() => setRefreshTrigger(prev => prev + 1)} />
          )}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
