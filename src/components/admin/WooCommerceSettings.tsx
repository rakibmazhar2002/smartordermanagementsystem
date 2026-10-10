import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api.ts';
import { Setting } from '../../types/index.ts';
import {
  Link2,
  Save,
  CheckCircle2,
  Copy,
  Check,
  Zap,
  Globe,
  Radio,
} from 'lucide-react';

interface WooCommerceSettingsProps {
  onOrderCreated?: () => void;
}

export const WooCommerceSettings: React.FC<WooCommerceSettingsProps> = ({ onOrderCreated }) => {
  const [settings, setSettings] = useState<Setting>({
    id: '',
    wc_store_url: '',
    wc_consumer_key: '',
    wc_consumer_secret: '',
    wc_webhook_secret: '',
    updatedAt: '',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    mode?: string;
  } | null>(null);

  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const webhookEndpointUrl = `${window.location.origin}/api/webhooks/woocommerce/order-created`;

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const res = await api.updateSettings(settings);
      setSettings(res.settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await api.testWooCommerceConnection(settings);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Handshake failed',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSimulateWebhook = async () => {
    setIsSimulating(true);
    try {
      const res = await api.simulateWebhookOrder();
      alert(`WooCommerce Inbound Webhook Test Successful!\nCreated Order #${res.order.id} for "${res.order.customer_name}".`);
      if (onOrderCreated) {
        onOrderCreated();
      }
    } catch (err: any) {
      alert(`Simulation failed: ${err.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleCopyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookEndpointUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="py-12 text-center text-xs text-slate-500">
        Loading connection settings...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-950/70 border border-indigo-800/80 flex items-center justify-center text-indigo-400">
            <Link2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">WooCommerce REST API & Webhook Gateway</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Decoupled two-way synchronization bridge with native WooCommerce Order IDs
            </p>
          </div>
        </div>

        <button
          onClick={handleSimulateWebhook}
          disabled={isSimulating}
          className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition shadow-sm whitespace-nowrap self-start sm:self-auto"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>{isSimulating ? 'Simulating...' : 'Simulate Inbound Order'}</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>WooCommerce credentials saved successfully.</span>
        </div>
      )}

      {/* Main Connection Form */}
      <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Globe className="w-4 h-4 text-indigo-400" />
            <span>Store REST API Credentials</span>
          </h2>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg text-xs font-medium border border-slate-700 transition"
            >
              <Radio className={`w-3.5 h-3.5 ${isTesting ? 'animate-pulse text-indigo-400' : ''}`} />
              <span>{isTesting ? 'Testing Handshake...' : 'Live Test Connection'}</span>
            </button>
          </div>
        </div>

        {/* Handshake Result Box */}
        {testResult && (
          <div
            className={`p-3.5 rounded-lg border text-xs space-y-1 ${
              testResult.success
                ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                : 'bg-red-950/40 border-red-800/80 text-red-300'
            }`}
          >
            <div className="font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>{testResult.success ? 'Connection Validated' : 'Handshake Notice'}</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-300">{testResult.message}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              WooCommerce Store URL
            </label>
            <input
              type="url"
              value={settings.wc_store_url}
              onChange={e => setSettings({ ...settings, wc_store_url: e.target.value })}
              placeholder="https://yourstore.com"
              required
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Consumer Key (ck_...)
            </label>
            <input
              type="text"
              value={settings.wc_consumer_key}
              onChange={e => setSettings({ ...settings, wc_consumer_key: e.target.value })}
              placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              required
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Consumer Secret (cs_...)
            </label>
            <input
              type="password"
              value={settings.wc_consumer_secret}
              onChange={e => setSettings({ ...settings, wc_consumer_secret: e.target.value })}
              placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              required
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Webhook Secret (Optional HMAC Signature Verification)
            </label>
            <input
              type="text"
              value={settings.wc_webhook_secret}
              onChange={e => setSettings({ ...settings, wc_webhook_secret: e.target.value })}
              placeholder="whsec_xxxxxxxxxxxxxxxxxxxxxx"
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition shadow-md shadow-indigo-600/20 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>

      {/* Inbound Webhook Instructions */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 shadow-xl">
        <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <span>Inbound Webhook Setup Guide (WooCommerce)</span>
        </h2>

        <p className="text-xs text-slate-400 leading-relaxed">
          In your WordPress Admin under <strong className="text-slate-200">WooCommerce &gt; Settings &gt; Advanced &gt; Webhooks</strong>, create a new webhook with Topic: <span className="font-mono text-indigo-300">Order created</span> and paste the delivery URL below:
        </p>

        <div className="flex items-center gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-indigo-300">
          <span className="truncate grow">{webhookEndpointUrl}</span>
          <button
            type="button"
            onClick={handleCopyWebhookUrl}
            className="flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[11px] font-sans font-medium transition shrink-0"
          >
            {copiedWebhook ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy URL</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-[11px] text-slate-400">
          <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80">
            <div className="font-semibold text-slate-200 mb-1">1. Topic: Order Created</div>
            <div>Triggers immediately when a customer submits checkout. Mapped directly to SOMS Pending.</div>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80">
            <div className="font-semibold text-slate-200 mb-1">2. Zero Latency Subdomain</div>
            <div>Order stored using native WooCommerce Order ID without locking your WordPress MySQL.</div>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/80">
            <div className="font-semibold text-slate-200 mb-1">3. Two-Way Sync</div>
            <div>Moderator updates, cancel notes, and Meta CAPI Purchase events dispatch back automatically.</div>
          </div>
        </div>
      </div>
    </div>
  );
};
