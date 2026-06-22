import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { authApi } from '../api/auth.api';
import toast from 'react-hot-toast';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter all credentials');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      if (res.success && res.data) {
        login(res.data.user, res.data.token, res.data.refreshToken);
        toast.success(`Welcome back, ${res.data.user.name}!`);
        navigate('/');
      } else {
        toast.error(res.error || 'Authentication failed');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-[#070A13] px-4">
      {/* Background radial highlight */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.04),transparent_50%)] pointer-events-none" />

      <div className="w-full max-w-md p-8 rounded-2xl glass-panel border border-slate-700/60 shadow-2xl relative z-10">
        {/* Title Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-xl bg-sky-500 items-center justify-center font-black text-xl text-white shadow-xl shadow-sky-500/25 mb-4">
            IK
          </div>
          <h2 className="text-2xl font-bold text-slate-100 bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
            IKIP Operations Login
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Industrial Knowledge Intelligence Platform
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full glass-input text-slate-200"
              placeholder="operator@plant.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Security Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full glass-input text-slate-200"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-sky-500/10 hover:shadow-sky-500/20 active:scale-[0.99] transition-all disabled:opacity-50 disabled:pointer-events-none mt-2"
          >
            {loading ? 'Authenticating...' : 'Sign In to Plant Console'}
          </button>
        </form>

        <div className="text-center mt-6 text-[10px] text-slate-500">
          AUTHORIZED PLANT PERSONNEL ONLY • ROLE-BASED ACCESS CONTROL ENFORCED
        </div>
      </div>
    </div>
  );
};
export default Login;
