import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { Layers, ShieldCheck, ArrowRight, UserCheck } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 mb-4">
          <Layers className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Smart Order Management System
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Decoupled WooCommerce Engine · Zero Latency Operations
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8 shadow-2xl">
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-950/60 border border-red-800/80 text-xs text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="mirakib2246@gmail.com"
                required
                className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition shadow-md shadow-indigo-600/20 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In to SOMS</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick-fill credentials for demo testing */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <div className="text-[11px] font-medium text-slate-400 mb-3 text-center uppercase tracking-wider">
              Quick One-Click Test Accounts
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('mirakib2246@gmail.com', 'Rakib@@3236')}
                className="flex flex-col items-start p-2.5 rounded-lg border border-indigo-900/60 bg-indigo-950/30 hover:bg-indigo-950/60 transition text-left group"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Super Admin</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 truncate w-full">mirakib2246@gmail.com</div>
                <div className="text-[10px] text-slate-500 font-mono">Rakib@@3236</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('tariq.moderator@soms.internal', 'Moderator@@2026')}
                className="flex flex-col items-start p-2.5 rounded-lg border border-slate-800 bg-slate-950/50 hover:bg-slate-800/50 transition text-left group"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Moderator</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 truncate w-full">tariq.moderator@soms...</div>
                <div className="text-[10px] text-slate-500 font-mono">Moderator@@2026</div>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-500">
          Developed by{' '}
          <a
            href="https://www.facebook.com/m.rakibmazhar/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-indigo-400 hover:text-indigo-300 transition"
          >
            MI Rakib
          </a>
        </div>
      </div>
    </div>
  );
};
