import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api.ts';
import { User } from '../../types/index.ts';
import { Users, UserPlus, KeyRound, Shield, CheckCircle2, XCircle, X } from 'lucide-react';

export const ModeratorManager: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'moderator' | 'super_admin'>('moderator');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // পাসওয়ার্ড রিসেট স্টেট
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to fetch users' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) return;

    try {
      const created = await api.createUser({
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
        role,
        status: 'active',
      });
      setUsers(prev => [...prev, created]);
      setShowAddModal(false);
      setName('');
      setEmail('');
      setPassword('');
      setMessage({ type: 'success', text: `Staff account created for ${created.name}.` });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to create user' });
    }
  };

  const handleToggleStatus = async (user: User) => {
    const nextStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      const updated = await api.updateUser(user.id, { status: nextStatus });
      setUsers(prev => prev.map(u => (u.id === user.id ? updated : u)));
      setMessage({
        type: 'success',
        text: `Account for ${user.name} is now ${nextStatus}.`,
      });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update status' });
    }
  };

  // পাসওয়ার্ড রিসেট সাবমিট
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser || !newPassword.trim()) return;
    setIsResetting(true);

    try {
      await api.updateUser(resettingUser.id, { password: newPassword.trim() });
      setMessage({
        type: 'success',
        text: `${resettingUser.name}-এর নতুন পাসওয়ার্ড সফলভাবে সেট হয়েছে।`,
      });
      setResettingUser(null);
      setNewPassword('');
      setTimeout(() => setMessage(null), 3500);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'পাসওয়ার্ড রিসেট করা যায়নি।' });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-950/70 border border-indigo-800/80 flex items-center justify-center text-indigo-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Staff & Moderator Accounts</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Control access to the high-density order processing floor
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition shadow-sm"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>New Moderator</span>
        </button>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-xs font-medium ${
            message.type === 'success'
              ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-200'
              : 'bg-red-950/60 border border-red-800 text-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-[10px] text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Loading accounts ledger...
                  </td>
                </tr>
              ) : (
                users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-850/50 transition">
                    <td className="py-3 px-4 font-semibold text-slate-200">
                      {u.name}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {u.email}
                    </td>
                    <td className="py-3 px-4">
                      {u.role === 'super_admin' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-400">
                          <Shield className="w-3 h-3" />
                          <span>Super Admin</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-300">
                          Moderator
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                          u.status === 'active' ? 'text-emerald-400' : 'text-slate-500'
                        }`}
                      >
                        {u.status === 'active' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        <span className="capitalize">{u.status}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {/* রিসেট পাসওয়ার্ড বাটন */}
                        <button
                          onClick={() => {
                            setResettingUser(u);
                            setNewPassword('');
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-400 transition"
                          title="Reset Password"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>

                        {u.role !== 'super_admin' && (
                          <button
                            onClick={() => handleToggleStatus(u)}
                            className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                              u.status === 'active'
                                ? 'bg-slate-800 text-slate-400 hover:text-red-400'
                                : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                            }`}
                          >
                            {u.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full shadow-2xl overflow-hidden p-6 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-indigo-400" />
              <span>Create Staff Member</span>
            </h2>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Asif Mahmud"
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Login Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="asif.moderator@soms.internal"
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Role
                </label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="moderator">Moderator (Orders floor only)</option>
                  <option value="super_admin">Super Admin (Full system control)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 rounded text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#121624] border border-slate-800 rounded-xl max-w-sm w-full shadow-2xl overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-950/60 border border-amber-800/80 flex items-center justify-center text-amber-400">
                  <KeyRound className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Reset Password</h3>
                  <p className="text-[11px] text-slate-400 truncate max-w-[200px]">
                    {resettingUser.name} ({resettingUser.email})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setResettingUser(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="নতুন পাসওয়ার্ড দিন..."
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResettingUser(null)}
                  disabled={isResetting}
                  className="px-3.5 py-1.5 rounded text-xs text-slate-400 hover:text-white bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResetting || !newPassword.trim()}
                  className="px-4 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {isResetting ? 'Updating...' : 'Set Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
