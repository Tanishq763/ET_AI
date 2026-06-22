import React, { useEffect, useState, useCallback } from 'react';
import { plantApi } from '../api/plant.api';
import { useAuthStore } from '../store/auth.store';
import {
  ShieldCheck,
  Zap,
  Download,
  RefreshCw,
  FileText,
  CheckCircle,
  X,
  ChevronRight,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

export const ComplianceRadar: React.FC = () => {
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [gaps, setGaps] = useState<any[]>([]);
  const [gapsLoading, setGapsLoading] = useState(false);
  const [selectedGap, setSelectedGap] = useState<any | null>(null);

  // Filters
  const [selectedReg, setSelectedReg] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalGaps, setTotalGaps] = useState(0);

  const user = useAuthStore((state) => state.user);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await plantApi.getComplianceDashboard();
      if (res.success && res.data) {
        setDashboard(res.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load compliance status');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchGaps = useCallback(async () => {
    setGapsLoading(true);
    try {
      const res = await plantApi.listComplianceGaps({
        regulationCode: selectedReg,
        complianceStatus: selectedStatus,
        page,
        limit: 10
      });
      if (res.success) {
        setGaps(res.data || []);
        setTotalGaps(res.pagination.total || 0);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load compliance gaps');
    } finally {
      setGapsLoading(false);
    }
  }, [selectedReg, selectedStatus, page]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    fetchGaps();
  }, [fetchGaps]);

  const handleTriggerScan = async () => {
    setScanning(true);
    toast.loading('Compliance checking engine started...', { id: 'scan-active' });
    try {
      const res = await plantApi.triggerComplianceScan();
      if (res.success) {
        toast.success('Compliance scan queued successfully! AI agents are scanning SOPs against OISD guidelines.', { id: 'scan-active', duration: 5000 });
        // Refresh after short delay
        setTimeout(() => {
          fetchDashboardData();
          fetchGaps();
        }, 3000);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to start compliance scanner', { id: 'scan-active' });
    } finally {
      setScanning(false);
    }
  };

  const getSeverityColor = (level: string) => {
    switch (level) {
      case 'Critical':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'High':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'Medium':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'Low':
      default:
        return 'text-slate-400 bg-slate-800 border-slate-700';
    }
  };

  const isAuthorizedToScan = user && ['SuperAdmin', 'PlantAdmin'].includes(user.role);

  return (
    <div className="p-6 space-y-6">
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* --- Action Header Center --- */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl glass-panel">
        <div>
          <h3 className="text-sm font-semibold text-slate-200 font-sans flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-400" />
            Compliance Gap Scanning Radar
          </h3>
          <p className="text-xs text-slate-500">Cross-reference active plant operating procedures against Factory Act & safety codes</p>
        </div>
        
        <div className="flex gap-2">
          {isAuthorizedToScan ? (
            <button
              onClick={handleTriggerScan}
              disabled={scanning}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-slate-950 rounded-lg transition-all shadow-lg shadow-emerald-500/10 disabled:opacity-40"
            >
              {scanning ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Running AI Scanner...
                </>
              ) : (
                <>
                  <RefreshCw size={14} />
                  Trigger Compliance Scan
                </>
              )}
            </button>
          ) : (
            <div className="text-[10px] text-slate-500 max-w-xs text-right border border-slate-850 p-2 rounded-lg bg-slate-950/20">
              Only SuperAdmin/PlantAdmin can run manual regulatory sweeps.
            </div>
          )}
        </div>
      </div>

      {/* --- Score Cards & Regulations --- */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-48 gap-2 text-slate-500 text-xs">
          <Loader2 size={24} className="animate-spin text-emerald-400" />
          Accessing compliance registry...
        </div>
      ) : (
        dashboard && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
            {/* KPI 1: Overall Score */}
            <div className="lg:col-span-1 p-5 rounded-2xl glass-card relative overflow-hidden flex flex-col justify-between h-40">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Overall Compliance Score</span>
                <h3 className="text-4xl font-extrabold mt-1 text-slate-100">{dashboard.complianceScore || 100}%</h3>
              </div>
              <div className="text-[10px] text-slate-500 flex items-center gap-1.5 pt-2 border-t border-slate-800/60">
                <CheckCircle size={12} className="text-emerald-400" />
                {dashboard.totalChecks || 24} total regulatory requirements mapped
              </div>
            </div>

            {/* In-depth details for each mapped regulation code */}
            {dashboard.regulationBreakdown &&
              Object.entries(dashboard.regulationBreakdown).map(([code, data]: any) => (
                <div key={code} className="p-5 rounded-2xl glass-card flex flex-col justify-between h-40">
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-sky-400 font-mono">{code}</span>
                      <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60">
                        {data.score}% Score
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2.5 leading-relaxed font-sans">
                      {code === 'OISD-118' ? 'Safety layout rules for pressurized liquefied gases.' : code === 'PESO-RULES' ? 'Petroleum & Explosives safety rules and design codes.' : 'Factory Act safety guidelines, health, and welfare clauses.'}
                    </p>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-500 pt-2 border-t border-slate-800/60">
                    <span>{data.gapsCount || 0} gaps found</span>
                    <a
                      href={plantApi.getAuditPackageUrl(code)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sky-400 flex items-center gap-1 hover:underline font-bold"
                    >
                      <Download size={10} /> Export Audit PDF
                    </a>
                  </div>
                </div>
              ))}
          </div>
        )
      )}

      {/* --- Main Checklist and Gaps table --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Gaps Index Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-2xl glass-panel space-y-5 flex flex-col h-full min-h-[300px]">
            
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Non-Conformity Gap Log</h3>
                <p className="text-xs text-slate-500">Active discrepancies found by compliance checker agents</p>
              </div>
              
              <div className="flex gap-2">
                <select
                  value={selectedReg}
                  onChange={(e) => { setSelectedReg(e.target.value); setPage(1); }}
                  className="glass-input text-xs py-1.5 bg-slate-950/40"
                >
                  <option value="">All Regulations</option>
                  <option value="OISD-118">OISD-118</option>
                  <option value="PESO-RULES">PESO Rules</option>
                  <option value="FACTORY-ACT">Factory Act</option>
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
                  className="glass-input text-xs py-1.5 bg-slate-950/40"
                >
                  <option value="">All Statuses</option>
                  <option value="Open">Open Gaps</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-x-auto">
              {gapsLoading ? (
                <div className="flex flex-col items-center justify-center h-48 gap-2 text-slate-500 text-xs">
                  <Loader2 size={20} className="animate-spin text-sky-400" />
                  Accessing discrepancy indexes...
                </div>
              ) : gaps.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 gap-2 text-slate-500 text-xs">
                  <CheckCircle size={20} className="text-emerald-400" />
                  All processes compliant! No gaps detected.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                      <th className="pb-3 pl-2">Clause Reference</th>
                      <th className="pb-3">Regulation</th>
                      <th className="pb-3">Severity</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 pr-2 text-right">Remediation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {gaps.map((gap) => (
                      <tr 
                        key={gap._id} 
                        onClick={() => setSelectedGap(gap)}
                        className={`hover:bg-slate-900/10 text-xs text-slate-300 cursor-pointer ${
                          selectedGap?._id === gap._id ? 'bg-slate-800/35 border-l-2 border-sky-400' : ''
                        }`}
                      >
                        <td className="py-3 pl-2 font-mono font-bold text-slate-200">
                          {gap.clauseCode}
                        </td>
                        <td className="py-3 text-slate-400">{gap.regulationCode}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold border ${getSeverityColor(gap.severity)}`}>
                            {gap.severity}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            gap.status === 'Resolved' ? 'text-emerald-400 bg-emerald-500/5' : 'text-rose-400 bg-rose-500/5 animate-pulse'
                          }`}>
                            {gap.status}
                          </span>
                        </td>
                        <td className="py-3 pr-2 text-right">
                          <button className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white inline-flex items-center gap-1 text-[10px]">
                            Detail <ChevronRight size={10} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {totalGaps > 10 && (
              <div className="flex justify-between items-center pt-4 border-t border-slate-800/40 text-xs text-slate-500 mt-4">
                <span>Showing {gaps.length} of {totalGaps} gaps</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:text-white disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page * 10 >= totalGaps}
                    className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:text-white disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Selected Gap Remediation Card */}
        <div className="lg:col-span-1 space-y-6">
          {selectedGap ? (
            <div className="p-6 rounded-2xl glass-panel space-y-5 flex flex-col h-full relative">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-800 text-sky-400 border border-slate-700/60 font-mono">
                    {selectedGap.clauseCode}
                  </span>
                  <h4 className="text-xs font-bold text-slate-200 mt-1.5 font-mono">{selectedGap.regulationCode}</h4>
                </div>
                <button
                  onClick={() => setSelectedGap(null)}
                  className="text-xs text-slate-500 hover:text-slate-300"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-4 flex-1">
                {/* Severity */}
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Clause Violation Description</span>
                  <p className="text-xs text-slate-300 font-medium leading-relaxed bg-slate-950/20 p-3 rounded-lg border border-slate-850">
                    {selectedGap.description || 'Discrepancy detected between standard requirements and document.'}
                  </p>
                </div>

                {/* Non Conformity Details */}
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Procedural Non-Conformity</span>
                  <p className="text-xs text-slate-400 leading-relaxed bg-slate-950/20 p-3 rounded-lg border border-slate-850">
                    {selectedGap.detectedGap || 'No manual instructions found for this regulatory item.'}
                  </p>
                </div>

                {/* Remediative SOP Actions */}
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Remediative SOP Action Recommendation</span>
                  <div className="p-3.5 bg-emerald-500/5 border border-emerald-500/10 rounded-lg text-xs text-slate-300 leading-relaxed flex gap-2">
                    <Zap size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-emerald-400">AI Remediation:</strong>
                      <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">{selectedGap.remediationRecommendation || 'Update startup steps in SOP.'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* PDF Download Package Button */}
              <div className="pt-4 border-t border-slate-850 mt-4">
                <a
                  href={plantApi.getAuditPackageUrl(selectedGap.regulationCode)}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Download size={12} />
                  Download Evidence PDF Package
                </a>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-2xl glass-panel text-center py-16 text-slate-500 flex flex-col items-center justify-center gap-2">
              <FileText size={28} className="text-slate-650" />
              <div>
                <h4 className="text-xs font-bold text-slate-300">Remediation Insight Panel</h4>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                  Select a non-conformity gap clause from the log table to display procedural violations and recommended remediation steps.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
export default ComplianceRadar;
