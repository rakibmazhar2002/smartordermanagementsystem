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
import { Footer } from './components/Footer.tsx';
import { OrderTable } from './components/orders/OrderTable.tsx';
import { ExecutiveDashboard } from './components/admin/ExecutiveDashboard.tsx';
import { CancelReasonsManager } from './components/admin/CancelReasonsManager.tsx';
import { ModeratorManager } from './components/admin/ModeratorManager.tsx';
import { WooCommerceSettings } from './components/admin/WooCommerceSettings.tsx';
import { api } from './lib/api.ts';

const AppContent: React.FC = () => {
  const { user, isLoading, isSuperAdmin } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('orders');
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState(false);

  // Auto-redirect moderator to orders if they try to access admin tabs
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
      // If not on orders tab, switch to orders tab
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

  // Moderator restricted from admin sections
  const safeTab = (!isSuperAdmin && currentTab !== 'orders') ? 'orders' : currentTab;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar
        currentTab={safeTab}
        onSelectTab={handleSelectTab}
        onQuickSimulate={handleQuickSimulate}
        isSimulating={isSimulating}
      />

      <main className="grow max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {safeTab === 'orders' && <OrderTable onRefreshTrigger={refreshTrigger} />}
        {safeTab === 'analytics' && isSuperAdmin && <ExecutiveDashboard />}
        {safeTab === 'reasons' && isSuperAdmin && <CancelReasonsManager />}
        {safeTab === 'moderators' && isSuperAdmin && <ModeratorManager />}
        {safeTab === 'settings' && isSuperAdmin && (
          <WooCommerceSettings onOrderCreated={() => setRefreshTrigger(prev => prev + 1)} />
        )}
      </main>

      <Footer />
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
