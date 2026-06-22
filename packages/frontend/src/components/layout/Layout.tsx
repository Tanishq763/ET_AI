import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { useNotificationStore } from '../../store/notification.store';
import { useSocket } from '../../hooks/useSocket';
import {
  LayoutDashboard,
  MessageSquare,
  Library,
  Network,
  ShieldCheck,
  Wrench,
  ScanLine,
  LogOut,
  Bell,
  User
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  
  // Initialize Socket.IO connection hook
  useSocket();

  const alerts = useNotificationStore((state) => state.alerts);
  const unreadAlertsCount = alerts.filter((a) => !a.dismissed).length;

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'AI Copilot', path: '/copilot', icon: MessageSquare },
    { name: 'Document Library', path: '/documents', icon: Library },
    { name: 'Knowledge Graph', path: '/kg', icon: Network },
    { name: 'Compliance Radar', path: '/compliance', icon: ShieldCheck },
    { name: 'Maintenance Intel', path: '/maintenance', icon: Wrench },
    { name: 'Field Tag Scanner', path: '/scanner', icon: ScanLine },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-[#0F172A] text-slate-100 overflow-hidden font-sans">
      {/* --- Desktop Sidebar --- */}
      <aside className="hidden md:flex flex-col w-64 glass-panel border-r border-slate-700/50">
        {/* Title Logo */}
        <div className="p-6 border-b border-slate-700/50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center font-bold text-white shadow-lg shadow-sky-500/25">
            IK
          </div>
          <div>
            <h1 className="font-extrabold text-lg leading-tight bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
              IKIP Platform
            </h1>
            <span className="text-[10px] text-slate-400 tracking-widest uppercase">
              Plant Intelligence
            </span>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-sky-500/10 text-sky-400 border-l-4 border-sky-400 shadow-md shadow-sky-500/5'
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-sky-400' : 'text-slate-400'} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Profile Card and Action */}
        <div className="p-4 border-t border-slate-700/50 space-y-3">
          {user && (
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-800/30">
              <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center">
                <User size={18} className="text-slate-300" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-slate-200 truncate">{user.name}</p>
                <p className="text-[10px] text-slate-400 font-medium truncate">{user.role}</p>
              </div>
            </div>
          )}
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* --- Main Content Area --- */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-slate-800 glass-panel">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-slate-100 hidden md:block">
              {menuItems.find((m) => m.path === location.pathname)?.name || 'Asset View'}
            </h2>
            {/* Mobile Header Logo */}
            <div className="flex items-center gap-2 md:hidden">
              <div className="w-6 h-6 rounded-md bg-sky-500 flex items-center justify-center font-bold text-[10px] text-white">
                IK
              </div>
              <h1 className="font-extrabold text-sm text-sky-400">IKIP Mobile</h1>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-4">
            {/* Notification Bell Badge */}
            <button className="relative p-2 rounded-lg bg-slate-800 hover:bg-slate-700/70 transition-colors text-slate-300">
              <Bell size={18} />
              {unreadAlertsCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center animate-pulse">
                  {unreadAlertsCount}
                </span>
              )}
            </button>

            {/* Plant Status Indicator */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
              Plant Unit-3 Connected
            </div>
          </div>
        </header>

        {/* Page Inner Content */}
        <main className="flex-1 overflow-y-auto bg-[#0B0F19] relative">
          {children}
        </main>

        {/* --- Mobile Bottom Nav Bar --- */}
        <footer className="md:hidden h-16 border-t border-slate-800 glass-panel flex items-center justify-around px-4 z-50">
          {menuItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 p-1 text-slate-400 ${
                  isActive ? 'text-sky-400' : 'hover:text-slate-200'
                }`}
              >
                <Icon size={18} />
                <span className="text-[9px] font-medium">{item.name.split(' ')[0]}</span>
              </Link>
            );
          })}
        </footer>
      </div>
    </div>
  );
};
export default Layout;
