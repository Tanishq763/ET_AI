import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { plantApi } from '../api/plant.api';
import { GraphCanvas } from '../components/kg/GraphCanvas';
import { marked } from 'marked';
import {
  Settings,
  AlertCircle,
  Cpu,
  Wrench,
  ChevronRight,
  Sparkles,
  Search,
  ArrowLeft,
  FileText,
  Check,
  TrendingUp,
  Loader2,
  AlertTriangle,
  History,
  Network,
  ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';

export const EquipmentPassport: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const tag = searchParams.get('tag');

  // --- Equipment List State ---
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [totalList, setTotalList] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);

  // --- Single Passport State ---
  const [passportData, setPassportData] = useState<any | null>(null);
  const [passportLoading, setPassportLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'docs' | 'wos' | 'incidents' | 'specs'>('docs');

  // --- AI RCA Modal State ---
  const [rcaLoading, setRcaLoading] = useState<Record<string, boolean>>({});
  const [rcaData, setRcaData] = useState<Record<string, any>>({});

  // --- AI Incident Analysis State ---
  const [incidentLoading, setIncidentLoading] = useState<Record<string, boolean>>({});
  const [incidentData, setIncidentData] = useState<Record<string, any>>({});

  // 1. Fetch Equipment List
  const fetchEquipmentList = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await plantApi.listEquipment({
        search: searchQuery,
        equipmentClass: filterClass,
        operationalStatus: filterStatus,
        page,
        limit: 10
      });
      if (res.success) {
        setEquipmentList(res.data || []);
        setTotalList(res.total || 0);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load assets');
    } finally {
      setListLoading(false);
    }
  }, [searchQuery, filterClass, filterStatus, page]);

  // 2. Fetch Single Passport details
  const fetchPassportDetails = useCallback(async (equipmentTag: string) => {
    setPassportLoading(true);
    try {
      const res = await plantApi.getEquipmentPassport(equipmentTag);
      if (res.success && res.data) {
        setPassportData(res.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load asset passport');
      setSearchParams({}); // reset parameter to go back to list
    } finally {
      setPassportLoading(false);
    }
  }, [setSearchParams]);

  useEffect(() => {
    if (tag) {
      fetchPassportDetails(tag);
    } else {
      fetchEquipmentList();
    }
  }, [tag, fetchEquipmentList, fetchPassportDetails]);

  // 3. Trigger RCA
  const handleTriggerRCA = async (woId: string) => {
    setRcaLoading((prev) => ({ ...prev, [woId]: true }));
    try {
      const res = await plantApi.getWorkOrderRCA(woId);
      if (res.success && res.data) {
        setRcaData((prev) => ({ ...prev, [woId]: res.data }));
        toast.success('RCA Diagnostics complete');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to run RCA workflow');
    } finally {
      setRcaLoading((prev) => ({ ...prev, [woId]: false }));
    }
  };

  // 4. Trigger Incident analysis
  const handleAnalyzeIncident = async (incidentId: string) => {
    setIncidentLoading((prev) => ({ ...prev, [incidentId]: true }));
    try {
      const res = await plantApi.getIncidentAnalysis(incidentId);
      if (res.success && res.data) {
        setIncidentData((prev) => ({ ...prev, [incidentId]: res.data }));
        toast.success('Systemic Incident Patterns Extracted');
      }
    } catch (err) {
      console.error(err);
      toast.error('Lessons learned pipeline failed');
    } finally {
      setIncidentLoading((prev) => ({ ...prev, [incidentId]: false }));
    }
  };

  const getCriticalityBadge = (level: string) => {
    switch (level) {
      case 'Critical':
        return <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-rose-500/10 border border-rose-500/20 text-rose-400 uppercase tracking-wider">Critical</span>;
      case 'High':
        return <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500/10 border border-amber-500/20 text-amber-400 uppercase tracking-wider">High</span>;
      case 'Medium':
        return <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-sky-500/10 border border-sky-500/20 text-sky-400 uppercase tracking-wider">Medium</span>;
      case 'Low':
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-slate-800 border border-slate-700 text-slate-400 uppercase tracking-wider">Low</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Operating':
        return <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider"><Check size={10} /> Operating</span>;
      case 'Standby':
        return <span className="flex items-center gap-1 text-[9px] font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Standby</span>;
      case 'Maintenance':
        return <span className="flex items-center gap-1 text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse"><Wrench size={10} /> Maintenance</span>;
      case 'Tripped':
      default:
        return <span className="flex items-center gap-1 text-[9px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider"><AlertTriangle size={10} /> Tripped</span>;
    }
  };

  // --- Render Equipment Table List (If tag is not set) ---
  if (!tag) {
    return (
      <div className="p-6 space-y-6">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-wrap gap-4 items-center justify-between p-4 rounded-xl glass-panel">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Equipment Passport Registry</h3>
            <p className="text-xs text-slate-500">Access Mean Time Between Failures (MTBF), specification sheets, and RCA trees</p>
          </div>
          
          <div className="flex flex-wrap gap-2.5">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                placeholder="Search tag (e.g. P-101)..."
                className="glass-input text-xs pl-9 w-48 sm:w-60 bg-slate-950/40"
              />
            </div>
            
            <select
              value={filterClass}
              onChange={(e) => { setFilterClass(e.target.value); setPage(1); }}
              className="glass-input text-xs bg-slate-950/40"
            >
              <option value="">All Classes</option>
              <option value="Pump">Pumps</option>
              <option value="Vessel">Vessels</option>
              <option value="Exchanger">Exchangers</option>
              <option value="Compressor">Compressors</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              className="glass-input text-xs bg-slate-950/40"
            >
              <option value="">All Statuses</option>
              <option value="Operating">Operating</option>
              <option value="Standby">Standby</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Tripped">Tripped</option>
            </select>
          </div>
        </div>

        <div className="p-6 rounded-2xl glass-panel">
          {listLoading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-2 text-slate-500 text-xs">
              <Loader2 size={24} className="animate-spin text-sky-400" />
              Loading asset registry...
            </div>
          ) : equipmentList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-2 text-slate-500 text-xs">
              <Cpu size={24} />
              No equipment found in database
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    <th className="pb-3 pl-2">Tag ID</th>
                    <th className="pb-3">Description</th>
                    <th className="pb-3">Class</th>
                    <th className="pb-3">Criticality</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">MTBF (Hrs)</th>
                    <th className="pb-3">Location</th>
                    <th className="pb-3 pr-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {equipmentList.map((eq) => (
                    <tr key={eq._id} className="hover:bg-slate-900/10 text-xs text-slate-300">
                      <td className="py-3 pl-2 font-mono font-bold text-sky-400">
                        {eq.tag}
                      </td>
                      <td className="py-3 text-slate-200 font-medium max-w-[200px] truncate">{eq.description}</td>
                      <td className="py-3 text-slate-400">{eq.equipmentClass}</td>
                      <td className="py-3">{getCriticalityBadge(eq.criticality)}</td>
                      <td className="py-3">{getStatusBadge(eq.operationalStatus)}</td>
                      <td className="py-3 font-mono text-slate-400">
                        {eq.mtbf ? `${Math.round(eq.mtbf)} h` : 'No failures'}
                      </td>
                      <td className="py-3 text-slate-500">{eq.location}</td>
                      <td className="py-3 pr-2 text-right">
                        <button
                          onClick={() => setSearchParams({ tag: eq.tag })}
                          className="flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 text-[10px] font-bold rounded-lg transition-colors ml-auto"
                        >
                          Passport
                          <ChevronRight size={10} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalList > 10 && (
            <div className="flex justify-between items-center pt-4 border-t border-slate-800/40 text-xs text-slate-500 mt-4">
              <span>Showing {equipmentList.length} of {totalList} assets</span>
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
                  disabled={page * 10 >= totalList}
                  className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:text-white disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- Render Single Passport Detail View ---
  return (
    <div className="p-6 space-y-6">
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Back button & Title Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={() => setSearchParams({})}
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Asset Registry
        </button>

        <button
          onClick={() => navigate(`/copilot`, { state: { prefilledQuery: `Show me operating manual for ${tag}` } })}
          className="flex items-center gap-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold rounded-lg transition-colors shadow-lg shadow-sky-500/10"
        >
          <Sparkles size={12} />
          Ask Copilot about {tag}
        </button>
      </div>

      {passportLoading ? (
        <div className="flex flex-col items-center justify-center h-96 gap-2 text-slate-500 text-xs">
          <Loader2 size={32} className="animate-spin text-sky-400" />
          Reading passport file system...
        </div>
      ) : !passportData ? (
        <div className="p-6 rounded-2xl glass-panel text-center text-slate-400 py-12">
          <AlertCircle size={32} className="mx-auto text-red-400 mb-2" />
          No passport record found for {tag}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Card Header Strip */}
          <div className="p-6 rounded-2xl glass-panel relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black text-slate-100 font-mono">{passportData.equipment.tag}</h2>
                {getStatusBadge(passportData.equipment.operationalStatus)}
                {getCriticalityBadge(passportData.equipment.criticality)}
              </div>
              <p className="text-sm font-medium text-slate-300">{passportData.equipment.description}</p>
              <div className="flex gap-4 text-[10px] text-slate-500">
                <span>Class: <strong className="text-slate-400">{passportData.equipment.equipmentClass}</strong></span>
                <span>•</span>
                <span>Location: <strong className="text-slate-400">{passportData.equipment.location}</strong></span>
              </div>
            </div>

            {/* Micro KPIs Strip */}
            <div className="flex gap-4 self-stretch md:self-auto">
              <div className="flex-1 md:flex-initial p-4 rounded-xl bg-slate-950/40 border border-slate-850 flex flex-col justify-between h-20 w-32">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1">
                  <TrendingUp size={10} className="text-sky-400" /> MTBF
                </span>
                <span className="text-xl font-bold font-mono text-slate-200">
                  {passportData.equipment.mtbf ? `${Math.round(passportData.equipment.mtbf)}h` : 'No failures'}
                </span>
              </div>
              <div className="flex-1 md:flex-initial p-4 rounded-xl bg-slate-950/40 border border-slate-850 flex flex-col justify-between h-20 w-32">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1">
                  <History size={10} className="text-sky-400" /> Failures
                </span>
                <span className="text-xl font-bold font-mono text-slate-200">
                  {passportData.incidents.length + passportData.workOrders.filter((w: any) => w.woType === 'Corrective').length}
                </span>
              </div>
            </div>
          </div>

          {/* Sub-layout: Split 3D KG Subgraph and Details Tab */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Cytoscape Micro Subgraph Canvas Card */}
            <div className="lg:col-span-1 p-5 rounded-2xl glass-panel flex flex-col gap-4 h-[450px]">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">P&ID Topological Context</h4>
                <p className="text-[10px] text-slate-500">Extracted equipment neighbors & connectivity loops</p>
              </div>
              
              <div className="flex-1 border border-slate-800 rounded-xl overflow-hidden relative">
                {passportData.kgSubgraph.nodes.length === 0 ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-slate-500 text-[10px] gap-2">
                    <Network size={24} />
                    No connectivity loops linked in Graph
                  </div>
                ) : (
                  <GraphCanvas
                    nodes={passportData.kgSubgraph.nodes}
                    edges={passportData.kgSubgraph.edges}
                    layoutName="cose"
                  />
                )}
              </div>
            </div>

            {/* Tabs details section */}
            <div className="lg:col-span-2 p-6 rounded-2xl glass-panel flex flex-col h-[450px] overflow-hidden">
              
              {/* Tab Selector */}
              <div className="flex border-b border-slate-850 pb-3 gap-1 overflow-x-auto">
                {[
                  { id: 'docs', label: 'Documents', icon: FileText },
                  { id: 'wos', label: 'Work Orders / RCA', icon: Wrench },
                  { id: 'incidents', label: 'Incident Patterns', icon: AlertCircle },
                  { id: 'specs', label: 'Specifications', icon: Settings },
                ].map((t) => {
                  const Icon = t.icon;
                  const active = activeTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id as any)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                        active ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Icon size={12} />
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {/* Tab Inner Feed */}
              <div className="flex-1 overflow-y-auto pt-4 pr-1">
                
                {/* 1. Related Documents */}
                {activeTab === 'docs' && (
                  <div className="space-y-3">
                    {passportData.kgSubgraph.nodes.filter((n: any) => n.type === 'DOCUMENT').length === 0 ? (
                      <div className="text-center py-16 text-xs text-slate-500">
                        No manual or operating sheets linked directly to this asset.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {passportData.kgSubgraph.nodes
                          .filter((n: any) => n.type === 'DOCUMENT')
                          .map((doc: any, idx: number) => (
                            <div key={idx} className="p-3 bg-slate-950/30 rounded-xl border border-slate-850 flex justify-between items-center gap-2">
                              <div className="overflow-hidden">
                                <span className="text-[9px] uppercase tracking-wider bg-slate-800 border border-slate-700/50 px-1 rounded text-slate-400 block w-max mb-1">
                                  {doc.properties?._label || 'DOCUMENT'}
                                </span>
                                <h5 className="text-xs font-bold text-slate-200 truncate">{doc.label}</h5>
                              </div>
                              <button
                                onClick={() => navigate(`/documents`, { state: { searchTitle: doc.label } })}
                                className="p-2 rounded hover:bg-slate-800 text-slate-400 hover:text-sky-400 shrink-0"
                                title="Go to library"
                              >
                                <ExternalLink size={12} className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Work Orders & RCA */}
                {activeTab === 'wos' && (
                  <div className="space-y-4">
                    {passportData.workOrders.length === 0 ? (
                      <div className="text-center py-16 text-xs text-slate-500">
                        No work order records found for this equipment.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {passportData.workOrders.map((wo: any) => {
                          const hasRca = rcaData[wo._id] || wo.aiRcaSuggestion;
                          const rca = rcaData[wo._id] || { rca: wo.aiRcaSuggestion, confidence: wo.aiRcaConfidence };

                          return (
                            <div key={wo._id} className="p-4 bg-slate-950/20 border border-slate-850 rounded-xl space-y-3">
                              <div className="flex justify-between items-start gap-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-200 font-mono">#{wo.woNumber || wo._id.substring(18)}</span>
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/50">{wo.woType}</span>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                      wo.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    }`}>{wo.status}</span>
                                  </div>
                                  <h5 className="text-xs font-bold text-slate-300 mt-1">{wo.title}</h5>
                                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{wo.description}</p>
                                </div>

                                {wo.woType === 'Corrective' && wo.status === 'Completed' && (
                                  <button
                                    onClick={() => handleTriggerRCA(wo._id)}
                                    disabled={rcaLoading[wo._id]}
                                    className="px-3 py-1 bg-sky-500 hover:bg-sky-400 text-slate-950 hover:text-slate-950 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 shadow-md shrink-0 disabled:opacity-40"
                                  >
                                    {rcaLoading[wo._id] ? (
                                      <>
                                        <Loader2 size={10} className="animate-spin" />
                                        Diagnosing...
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles size={10} />
                                        {hasRca ? 'View RCA' : 'Run 5-Whys'}
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>

                              {/* RCA recommendations display */}
                              {hasRca && (
                                <div className="p-3.5 bg-slate-950/60 border border-sky-500/10 rounded-lg space-y-2 mt-2">
                                  <div className="flex justify-between items-center border-b border-slate-850 pb-1.5 text-[10px]">
                                    <span className="font-bold text-sky-400 flex items-center gap-1">
                                      <Sparkles size={10} />
                                      AI Root Cause Diagnostic (5-Whys)
                                    </span>
                                    <span className="text-slate-500">
                                      Confidence: 
                                      <span className={`font-extrabold uppercase ml-1 ${
                                        rca.confidence === 'High' ? 'text-emerald-400' : 'text-amber-400'
                                      }`}>{rca.confidence || 'Medium'}</span>
                                    </span>
                                  </div>
                                  <div 
                                    className="prose prose-invert prose-xs text-[11px] leading-relaxed text-slate-300 max-w-none font-mono" 
                                    dangerouslySetInnerHTML={{ __html: marked.parse(rca.rca || '') as string }}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Incident History & AI Patterns */}
                {activeTab === 'incidents' && (
                  <div className="space-y-4">
                    {passportData.incidents.length === 0 ? (
                      <div className="text-center py-16 text-xs text-slate-500">
                        No incidents registered for this asset.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {passportData.incidents.map((inc: any) => {
                          const analysis = incidentData[inc._id];
                          const isLoading = incidentLoading[inc._id];

                          return (
                            <div key={inc._id} className="p-4 bg-slate-950/20 border border-slate-850 rounded-xl space-y-3">
                              <div className="flex justify-between items-start gap-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                                      inc.severity === 'Critical' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    }`}>{inc.severity} Severity</span>
                                    <span className="text-[10px] text-slate-500">{new Date(inc.occurredAt).toLocaleDateString()}</span>
                                  </div>
                                  <h5 className="text-xs font-bold text-slate-300 mt-1">{inc.title}</h5>
                                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{inc.description}</p>
                                </div>

                                <button
                                  onClick={() => handleAnalyzeIncident(inc._id)}
                                  disabled={isLoading}
                                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold rounded-lg border border-slate-700 flex items-center gap-1 shrink-0 disabled:opacity-40"
                                >
                                  {isLoading ? (
                                    <>
                                      <Loader2 size={10} className="animate-spin" />
                                      Scanning...
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles size={10} className="text-amber-500" />
                                      {analysis ? 'Re-Analyze' : 'Analyze Patterns'}
                                    </>
                                  )}
                                </button>
                              </div>

                              {/* Lessons analysis output */}
                              {analysis && (
                                <div className="p-3.5 bg-slate-950/60 border border-amber-500/10 rounded-lg space-y-2 mt-2">
                                  <div className="flex items-center gap-1.5 border-b border-slate-850 pb-1.5 text-[10px] font-bold text-amber-400">
                                    <AlertTriangle size={10} />
                                    Systemic Pattern Warnings & Recommendations
                                  </div>
                                  
                                  {analysis.patterns.length > 0 ? (
                                    <div className="space-y-1.5">
                                      {analysis.patterns.map((p: string, idx: number) => (
                                        <p key={idx} className="text-[10px] text-slate-300 leading-relaxed">• {p}</p>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-[10px] text-slate-500">No repetitive failure pattern detected in historical databases.</p>
                                  )}

                                  {analysis.similarIncidents?.length > 0 && (
                                    <div className="pt-2 text-[9px] text-slate-500 flex gap-2">
                                      <span>Matched Similar Incidents:</span>
                                      <span className="font-semibold text-slate-400">{analysis.similarIncidents.join(', ')}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Specifications */}
                {activeTab === 'specs' && (
                  <div className="border border-slate-850 rounded-xl overflow-hidden bg-slate-950/20 max-w-full">
                    <table className="w-full text-left text-xs border-collapse">
                      <tbody>
                        <tr className="border-b border-slate-900">
                          <td className="py-2.5 px-3 font-semibold text-slate-500 uppercase tracking-wider text-[9px] w-32">Manufacture Date</td>
                          <td className="py-2.5 px-3 text-slate-300">
                            {passportData.equipment.manufactureDate ? new Date(passportData.equipment.manufactureDate).toLocaleDateString() : 'N/A'}
                          </td>
                        </tr>
                        <tr className="border-b border-slate-900">
                          <td className="py-2.5 px-3 font-semibold text-slate-500 uppercase tracking-wider text-[9px] w-32">Design Capacity</td>
                          <td className="py-2.5 px-3 text-slate-300">{passportData.equipment.designCapacity || 'N/A'}</td>
                        </tr>
                        <tr className="border-b border-slate-900">
                          <td className="py-2.5 px-3 font-semibold text-slate-500 uppercase tracking-wider text-[9px] w-32">Operating Limits</td>
                          <td className="py-2.5 px-3 text-slate-300">{passportData.equipment.operatingLimits || 'N/A'}</td>
                        </tr>
                        <tr className="border-b border-slate-900">
                          <td className="py-2.5 px-3 font-semibold text-slate-500 uppercase tracking-wider text-[9px] w-32">Asset UUID</td>
                          <td className="py-2.5 px-3 text-slate-300 font-mono text-[10px] break-all select-all">{passportData.equipment._id}</td>
                        </tr>
                        <tr className="border-b border-slate-900">
                          <td className="py-2.5 px-3 font-semibold text-slate-500 uppercase tracking-wider text-[9px] w-32">Plant Owner ID</td>
                          <td className="py-2.5 px-3 text-slate-300 font-mono text-[10px] break-all">{passportData.equipment.plant}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
export default EquipmentPassport;
