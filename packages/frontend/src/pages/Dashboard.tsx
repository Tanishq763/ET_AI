import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { plantApi } from '../api/plant.api';
import { useNotificationStore } from '../store/notification.store';
import {
  FileText,
  ClipboardList,
  Percent,
  TrendingDown,
  Upload,
  QrCode,
  Sparkles,
  ArrowRight,
  Flame
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState<any>({ downtime: 0, openWOs: 0, complianceScore: 100, docsIngested: 0 });
  const [alerts, setAlerts] = useState<any[]>([]);
  const liveAlerts = useNotificationStore((state) => state.alerts);
  const dismissAlert = useNotificationStore((state) => state.dismissAlert);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const kpiRes = await plantApi.getKPIs();
        if (kpiRes.success) setKpis(kpiRes.data);

        const alertRes = await plantApi.getAlerts();
        if (alertRes.success) setAlerts(alertRes.data);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      }
    };
    fetchDashboardData();
  }, []);

  const activeAlerts = [...liveAlerts.filter((a) => !a.dismissed), ...alerts];

  // Mock Downtime trend data
  const trendData = [
    { name: 'Jan', Hours: 45 },
    { name: 'Feb', Hours: 38 },
    { name: 'Mar', Hours: 65 },
    { name: 'Apr', Hours: 24 },
    { name: 'May', Hours: 18 },
    { name: 'Jun', Hours: kpis.downtime || 12 },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Radial Highlight */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* --- Action Center Quickbar --- */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl glass-panel">
        <div>
          <h3 className="text-sm font-semibold text-slate-300">Plant Operation Actions</h3>
          <p className="text-xs text-slate-500">Quickly upload operating manuals, document compliance, or start diagnostics</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/documents')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg transition-colors border border-slate-700"
          >
            <Upload size={14} />
            Upload Document
          </button>
          <button
            onClick={() => navigate('/scanner')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg transition-colors border border-slate-700"
          >
            <QrCode size={14} />
            Scan Asset Tag
          </button>
          <button
            onClick={() => navigate('/copilot')}
            className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-xs font-bold text-white rounded-lg transition-colors shadow-lg shadow-sky-500/10"
          >
            <Sparkles size={14} />
            Ask RAG Copilot
          </button>
        </div>
      </div>

      {/* --- KPI Cards Grid --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Docs */}
        <div className="p-5 rounded-2xl glass-card relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Indexed Documents</span>
              <h3 className="text-3xl font-bold mt-1 text-slate-100">{kpis.docsIngested}</h3>
            </div>
            <div className="p-3 bg-sky-500/10 text-sky-400 rounded-xl">
              <FileText size={20} />
            </div>
          </div>
          <div className="text-[10px] text-slate-500 mt-4">Verified & mapped to Knowledge Graph</div>
        </div>

        {/* Card 2: Open WOs */}
        <div className="p-5 rounded-2xl glass-card">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Work Orders</span>
              <h3 className="text-3xl font-bold mt-1 text-slate-100">{kpis.openWOs}</h3>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
              <ClipboardList size={20} />
            </div>
          </div>
          <div className="text-[10px] text-slate-500 mt-4">Pending corrective & preventive maintenance</div>
        </div>

        {/* Card 3: Compliance */}
        <div className="p-5 rounded-2xl glass-card">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Compliance Index</span>
              <h3 className="text-3xl font-bold mt-1 text-slate-100">{kpis.complianceScore}%</h3>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <Percent size={20} />
            </div>
          </div>
          <div className="text-[10px] text-slate-500 mt-4">Mapped Factory Act / OISD standards</div>
        </div>

        {/* Card 4: Downtime */}
        <div className="p-5 rounded-2xl glass-card">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Downtime Hours</span>
              <h3 className="text-3xl font-bold mt-1 text-slate-100">{kpis.downtime}h</h3>
            </div>
            <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl">
              <TrendingDown size={20} />
            </div>
          </div>
          <div className="text-[10px] text-slate-500 mt-4">Lost operational hours this month</div>
        </div>
      </div>

      {/* --- Main Dashboard Sections --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Charts & Trends Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-2xl glass-panel space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">Plant Downtime Trend</h3>
              <p className="text-xs text-slate-500">Corrective failure impact trends over the last 6 months</p>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={11} />
                  <YAxis stroke="#64748B" fontSize={11} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: 8 }}
                    labelStyle={{ color: '#94A3B8', fontSize: 11 }}
                    itemStyle={{ color: '#0EA5E9', fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="Hours" stroke="#0EA5E9" fillOpacity={1} fill="url(#colorHours)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Compliance Matrix Map */}
          <div className="p-6 rounded-2xl glass-panel space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Regulatory Compliance Radar Matrix</h3>
                <p className="text-xs text-slate-500">Audit gaps assessed across primary industrial standards</p>
              </div>
              <button 
                onClick={() => navigate('/compliance')}
                className="text-xs text-sky-400 flex items-center gap-1 hover:underline"
              >
                Go to Radar
                <ArrowRight size={12} />
              </button>
            </div>

            {/* Custom Interactive CSS Heatmap Grid */}
            <div className="grid grid-cols-4 gap-2.5">
              {[
                { name: 'OISD-118 Cl 4.1', status: 'Compliant' },
                { name: 'OISD-118 Cl 4.2', status: 'Partially' },
                { name: 'OISD-118 Cl 4.3', status: 'Compliant' },
                { name: 'PESO Rules Cl 7', status: 'NonCompliant' },
                { name: 'PESO Rules Cl 8', status: 'Compliant' },
                { name: 'Factory Act Sec 7', status: 'Compliant' },
                { name: 'Factory Act Sec 12', status: 'Partially' },
                { name: 'MoEF Guidelines', status: 'Compliant' },
              ].map((cell, idx) => {
                let badgeColor = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
                if (cell.status === 'Partially') badgeColor = 'bg-amber-500/10 border-amber-500/30 text-amber-400';
                if (cell.status === 'NonCompliant') badgeColor = 'bg-rose-500/10 border-rose-500/30 text-rose-400';

                return (
                  <div 
                    key={idx} 
                    className={`p-3 rounded-xl border flex flex-col justify-between h-20 ${badgeColor} transition-transform hover:scale-[1.02] cursor-pointer`}
                    onClick={() => navigate('/compliance')}
                  >
                    <span className="text-[10px] font-bold truncate">{cell.name}</span>
                    <span className="text-[9px] uppercase tracking-wider font-semibold">{cell.status}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* AI Pushed Alerts Panel */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl glass-panel flex flex-col h-full space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Flame size={16} className="text-amber-500 animate-pulse" />
                AI Real-Time Insights & Warnings
              </h3>
              <p className="text-xs text-slate-500">Live intelligence notifications pushed from plants</p>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto max-h-[550px]">
              {activeAlerts.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-500">
                  No active safety alerts. Plant is operating within normal boundaries.
                </div>
              ) : (
                activeAlerts.map((alert) => (
                  <div 
                    key={alert.id || alert._id} 
                    className={`p-4 rounded-xl border ${
                      alert.urgency === 'Critical' || alert.type === 'compliance'
                        ? 'bg-rose-500/5 border-rose-500/20'
                        : 'bg-amber-500/5 border-amber-500/20'
                    } relative group`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                        alert.urgency === 'Critical' || alert.type === 'compliance'
                          ? 'bg-rose-500/15 text-rose-400'
                          : 'bg-amber-500/15 text-amber-400'
                      }`}>
                        {alert.urgency || 'High'}
                      </span>
                      <button 
                        onClick={() => dismissAlert(alert.id)}
                        className="text-[10px] text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Dismiss
                      </button>
                    </div>
                    <h4 className="text-xs font-bold text-slate-200 mt-2">{alert.title}</h4>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{alert.message}</p>
                    <span className="text-[9px] text-slate-500 mt-3 block">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
export default Dashboard;
