import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { kgApi } from '../api/kg.api';
import { GraphCanvas } from '../components/kg/GraphCanvas';
import {
  Network,
  Play,
  Search,
  HelpCircle,
  Sparkles,
  Cpu,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

export const KnowledgeGraph: React.FC = () => {
  const navigate = useNavigate();
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Search parameters
  const [searchTag, setSearchTag] = useState('P-101');
  
  // Custom Cypher parameters
  const [isCypherMode, setIsCypherMode] = useState(false);
  const [cypherQuery, setCypherQuery] = useState(
    'MATCH (e:Equipment)-[r]-(m) RETURN e, r, m LIMIT 25'
  );

  // Selected node details
  const [selectedNode, setSelectedNode] = useState<any | null>(null);

  const fetchSubgraph = async () => {
    if (!searchTag.trim()) return;
    setLoading(true);
    setSelectedNode(null);
    try {
      // First try to fetch as equipment tag subgraph
      let res;
      if (searchTag.toUpperCase().startsWith('MATCH ') || searchTag.toUpperCase().startsWith('MATCH\n')) {
        // Fallback or override to Cypher if they typed Cypher in search
        res = await kgApi.runCypher(searchTag);
      } else {
        res = await kgApi.getEquipmentSubgraph(searchTag.toUpperCase());
      }
      
      if (res.success && res.data) {
        if (res.data.nodes) {
          setNodes(res.data.nodes);
          setEdges(res.data.edges || []);
          toast.success(`Loaded ${res.data.nodes.length} nodes and ${res.data.edges?.length || 0} connections`);
        } else if (Array.isArray(res.data)) {
          // Cypher query raw output
          parseRawCypherResults(res.data);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load subgraph. Asset tag may not exist in graph.');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteCypher = async () => {
    if (!cypherQuery.trim()) return;
    setLoading(true);
    setSelectedNode(null);
    try {
      const res = await kgApi.runCypher(cypherQuery);
      if (res.success && res.data) {
        parseRawCypherResults(res.data);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Cypher query execution failed');
    } finally {
      setLoading(false);
    }
  };

  // Helper to parse Cypher results containing nodes and relationships into cytoscape format
  const parseRawCypherResults = (records: any[]) => {
    const nodesMap = new Map<string, any>();
    const edgesList: any[] = [];

    // Parse Neo4j records
    records.forEach((record) => {
      Object.values(record).forEach((val: any) => {
        if (!val) return;
        
        // Node parser
        if (val.labels && val.identity && val.properties) {
          const id = val.identity.low !== undefined ? val.identity.low.toString() : val.identity.toString();
          nodesMap.set(id, {
            id,
            label: val.properties.tag || val.properties.title || val.properties.name || val.properties.id || val.labels[0] || id,
            type: val.labels[0],
            properties: Object.keys(val.properties).reduce((acc, key) => {
              const pVal = val.properties[key];
              acc[key] = typeof pVal === 'object' && pVal.low !== undefined ? pVal.low : pVal;
              return acc;
            }, { _identity: id, _label: val.labels[0] } as Record<string, any>),
          });
        }
        
        // Relationship parser
        if (val.start && val.end && val.type && val.identity) {
          const id = val.identity.low !== undefined ? val.identity.low.toString() : val.identity.toString();
          const source = val.start.low !== undefined ? val.start.low.toString() : val.start.toString();
          const target = val.end.low !== undefined ? val.end.low.toString() : val.end.toString();
          edgesList.push({
            id,
            source,
            target,
            label: val.type,
          });
        }
      });
    });

    const parsedNodes = Array.from(nodesMap.values());
    setNodes(parsedNodes);
    setEdges(edgesList);
    toast.success(`Cypher returned ${parsedNodes.length} nodes and ${edgesList.length} connections`);
  };

  useEffect(() => {
    fetchSubgraph();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const presets = [
    {
      name: 'Entire Equipment Class list',
      query: 'MATCH (e:Equipment) RETURN e LIMIT 20'
    },
    {
      name: 'Piping Loops & Instruments connected',
      query: 'MATCH (e:Equipment)-[r:CONNECTED_TO]-(i:Instrument) RETURN e, r, i LIMIT 30'
    },
    {
      name: 'Non-Conformity Gaps by Regulation',
      query: 'MATCH (g:Gap)-[r:VIOLATES]-(c:Compliance) RETURN g, r, c LIMIT 20'
    },
    {
      name: 'Incidents linked to Equipment tags',
      query: 'MATCH (i:Incident)-[r:OCCURRED_ON]-(e:Equipment) RETURN i, r, e LIMIT 20'
    }
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-[#070B13] overflow-hidden relative">
      
      {/* --- Left Operations Panel --- */}
      <aside className="w-80 border-r border-slate-800/80 glass-panel p-5 flex flex-col gap-5 shrink-0 z-10 overflow-y-auto">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">KG Graph Explorer</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Visualize Neo4j plant ontology and asset links</p>
        </div>

        {/* Toggle Mode */}
        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setIsCypherMode(false)}
            className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded-md transition-colors ${
              !isCypherMode ? 'bg-sky-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tag Search
          </button>
          <button
            onClick={() => setIsCypherMode(true)}
            className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded-md transition-colors ${
              isCypherMode ? 'bg-sky-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Cypher Console
          </button>
        </div>

        {/* Search Mode Panel */}
        {!isCypherMode ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Asset Tag Search</label>
              <div className="relative">
                <Search size={12} className="absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  value={searchTag}
                  onChange={(e) => setSearchTag(e.target.value)}
                  placeholder="e.g. P-101, V-102"
                  className="w-full glass-input text-xs pl-8.5 bg-slate-950/40"
                  onKeyDown={(e) => e.key === 'Enter' && fetchSubgraph()}
                />
              </div>
            </div>

            <button
              onClick={fetchSubgraph}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 rounded-lg transition-colors border border-slate-700 flex items-center justify-center gap-1.5"
            >
              <Search size={12} />
              Query Neighbors
            </button>
          </div>
        ) : (
          // Cypher Mode Panel
          <div className="space-y-4 flex-1 flex flex-col min-h-0">
            <div className="space-y-2 flex-1 flex flex-col min-h-0">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
                <span>Write Cypher Query</span>
                <span title="Neo4j Cypher Read-Only Console" className="cursor-pointer">
                  <HelpCircle size={10} className="text-slate-500 hover:text-slate-300" />
                </span>
              </label>
              <textarea
                value={cypherQuery}
                onChange={(e) => setCypherQuery(e.target.value)}
                className="w-full flex-1 glass-input text-xs font-mono bg-slate-950/80 resize-none p-3 leading-relaxed border-slate-800 focus:border-sky-500/50"
                placeholder="MATCH (n) RETURN n LIMIT 10"
              />
            </div>

            <button
              onClick={handleExecuteCypher}
              className="w-full py-2 bg-sky-500 hover:bg-sky-400 text-xs font-bold text-slate-950 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-sky-500/10"
            >
              <Play size={12} fill="currentColor" />
              Execute Cypher
            </button>

            {/* Presets List */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Query Presets</span>
              <div className="flex flex-col gap-1.5">
                {presets.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setCypherQuery(preset.query);
                      toast.success(`Loaded preset: ${preset.name}`);
                    }}
                    className="p-2 text-left rounded-lg bg-slate-900/55 hover:bg-slate-800/60 text-[10px] text-slate-400 hover:text-slate-200 transition-colors border border-slate-850"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="pt-4 border-t border-slate-850 mt-auto">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Node Type Legend</span>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2.5 h-2.5 rounded bg-[#0284C7]" />
              Equipment
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2.5 h-2.5 rounded bg-[#D97706]" />
              Document
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2.5 h-2.5 rounded bg-[#7C3AED]" />
              Chunk
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2.5 h-2.5 rounded bg-[#DC2626]" />
              Compliance Gap
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2.5 h-2.5 rounded bg-[#B45309]" />
              Incident
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2.5 h-2.5 rounded bg-slate-650" />
              Other Node
            </div>
          </div>
        </div>
      </aside>

      {/* --- Main Graph Canvas --- */}
      <section className="flex-1 h-full relative overflow-hidden">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#070B13]/70 z-10 gap-2 text-slate-400">
            <Loader2 size={32} className="animate-spin text-sky-400" />
            <span className="text-xs">Traversing Neo4j database graph...</span>
          </div>
        ) : nodes.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto gap-3 text-slate-500">
            <Network size={40} className="text-slate-650" />
            <div>
              <h4 className="text-sm font-bold text-slate-300">No Graph Data Displayed</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Enter an equipment tag like <code className="text-sky-400 font-mono">P-101</code> in the panel search, or execute a query preset to build the Cytoscape topology.
              </p>
            </div>
          </div>
        ) : null}

        <GraphCanvas
          nodes={nodes}
          edges={edges}
          onNodeClick={(node) => setSelectedNode(node)}
          layoutName="cola"
        />
      </section>

      {/* --- Right Details Sidebar --- */}
      {selectedNode && (
        <aside className="w-80 border-l border-slate-800/80 glass-panel p-5 flex flex-col gap-4 shrink-0 z-10 overflow-y-auto">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="overflow-hidden pr-2">
              <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-800 text-sky-400 border border-slate-700/60">
                {selectedNode.type}
              </span>
              <h3 className="text-sm font-bold text-slate-100 truncate mt-1.5" title={selectedNode.label}>
                {selectedNode.label}
              </h3>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              Close
            </button>
          </div>

          {/* Properties Table */}
          <div className="flex-1 min-h-0 space-y-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Node Properties</span>
            <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-950/20 max-h-[300px] overflow-y-auto">
              <table className="w-full text-left text-[11px] border-collapse">
                <tbody>
                  {Object.entries(selectedNode.properties || {})
                    .filter(([key]) => !key.startsWith('_'))
                    .map(([key, val]) => (
                      <tr key={key} className="border-b border-slate-900 hover:bg-slate-900/10">
                        <td className="py-2.5 px-3 font-semibold text-slate-500 uppercase tracking-wider text-[9px] w-24 truncate">{key}</td>
                        <td className="py-2.5 px-3 text-slate-300 break-all select-all font-mono leading-relaxed">
                          {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Quick Actions Panel */}
            <div className="space-y-2 pt-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Asset Quick Actions</span>
              <div className="flex flex-col gap-2">
                {selectedNode.type === 'Equipment' && (selectedNode.properties?.tag || selectedNode.label) && (
                  <button
                    onClick={() => navigate(`/maintenance?tag=${encodeURIComponent(selectedNode.properties.tag || selectedNode.label)}`)}
                    className="w-full py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Cpu size={12} />
                    View Asset Passport
                  </button>
                )}

                <button
                  onClick={() => {
                    const tag = selectedNode.properties?.tag || selectedNode.label;
                    navigate(`/copilot`, { state: { prefilledQuery: `What details are associated with asset ${tag}?` } });
                    // To automatically trigger the query, we can put it in location state and let Copilot grab it
                  }}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs rounded-lg transition-colors border border-slate-700 flex items-center justify-center gap-1.5"
                >
                  <Sparkles size={12} className="text-sky-400" />
                  Ask Copilot about this
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}

    </div>
  );
};
export default KnowledgeGraph;
