import React, { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
// @ts-ignore
import cola from 'cytoscape-cola';

cytoscape.use(cola);

interface NodeData {
  id: string;
  label: string;
  type: string;
  properties?: any;
}

interface EdgeData {
  id: string;
  source: string;
  target: string;
  label: string;
}

interface GraphCanvasProps {
  nodes: NodeData[];
  edges: EdgeData[];
  onNodeClick?: (node: NodeData) => void;
  layoutName?: string;
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  nodes,
  edges,
  onNodeClick,
  layoutName = 'cola'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Transform data for Cytoscape
    const cyNodes = nodes.map((n) => ({
      data: {
        id: n.id,
        label: n.label,
        type: n.type,
        properties: n.properties || {},
      },
    }));

    const cyEdges = edges.map((e) => ({
      data: {
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
      },
    }));

    // Setup stylesheet
    const stylesheet: any[] = [
      {
        selector: 'node',
        style: {
          'label': 'data(label)',
          'color': '#E2E8F0',
          'font-size': '10px',
          'text-valign': 'center',
          'text-halign': 'center',
          'text-wrap': 'wrap',
          'text-max-width': '80px',
          'width': '50px',
          'height': '50px',
          'background-color': '#475569',
          'border-width': '2px',
          'border-color': '#64748B',
          'font-family': 'Inter, sans-serif',
          'font-weight': 'bold',
          'overlay-opacity': 0,
          'transition-property': 'background-color, border-color',
          'transition-duration': 0.2
        },
      },
      {
        selector: 'node[type="EQUIPMENT"]',
        style: {
          'background-color': '#0284C7', // Sky blue
          'border-color': '#0EA5E9',
          'width': '60px',
          'height': '60px',
        },
      },
      {
        selector: 'node[type="DOCUMENT"]',
        style: {
          'background-color': '#D97706', // Orange
          'border-color': '#F59E0B',
        },
      },
      {
        selector: 'node[type="CHUNK"]',
        style: {
          'background-color': '#7C3AED', // Purple
          'border-color': '#8B5CF6',
          'width': '40px',
          'height': '40px',
        },
      },
      {
        selector: 'node[type="GAP"]',
        style: {
          'background-color': '#DC2626', // Red
          'border-color': '#EF4444',
        },
      },
      {
        selector: 'node[type="INCIDENT"]',
        style: {
          'background-color': '#B45309', // Dark yellow/amber
          'border-color': '#D97706',
        },
      },
      {
        selector: 'edge',
        style: {
          'width': 1.5,
          'line-color': '#334155',
          'target-arrow-color': '#334155',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'label': 'data(label)',
          'font-size': '8px',
          'color': '#64748B',
          'text-background-opacity': 0.8,
          'text-background-color': '#0F172A',
          'text-background-padding': '3px',
          'text-background-shape': 'roundrectangle',
          'font-family': 'Inter, sans-serif',
          'arrow-scale': 0.8,
        },
      },
      {
        selector: 'node:selected',
        style: {
          'border-width': '4px',
          'border-color': '#38BDF8',
          'background-color': '#0369A1',
        },
      },
    ];

    const cy = cytoscape({
      container: containerRef.current,
      elements: [...cyNodes, ...cyEdges],
      style: stylesheet,
      layout: {
        name: layoutName as any,
        animate: true,
        randomize: false,
        maxSimulationTime: 1500,
        nodeSpacing: 40,
        edgeLength: 100,
      } as any,
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
    });

    cyRef.current = cy;

    // Node selection/click
    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      if (onNodeClick) {
        onNodeClick({
          id: node.data('id'),
          label: node.data('label'),
          type: node.data('type'),
          properties: node.data('properties'),
        });
      }
    });

    // Clean up
    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [nodes, edges, layoutName, onNodeClick]);

  const handleZoomIn = () => {
    cyRef.current?.zoom(cyRef.current.zoom() * 1.2);
  };

  const handleZoomOut = () => {
    cyRef.current?.zoom(cyRef.current.zoom() * 0.8);
  };

  const handleFit = () => {
    cyRef.current?.fit();
    cyRef.current?.center();
  };

  return (
    <div className="relative w-full h-full">
      {/* Container */}
      <div ref={containerRef} className="w-full h-full bg-[#090D1A]" />

      {/* Floating Canvas Controls */}
      <div className="absolute bottom-4 left-4 flex gap-1.5 p-1.5 rounded-lg glass-panel bg-slate-950/80 border-slate-800">
        <button 
          onClick={handleZoomIn} 
          className="w-8 h-8 flex items-center justify-center text-xs font-bold text-slate-300 hover:text-white bg-slate-900 rounded border border-slate-800 hover:bg-slate-800"
        >
          +
        </button>
        <button 
          onClick={handleZoomOut} 
          className="w-8 h-8 flex items-center justify-center text-xs font-bold text-slate-300 hover:text-white bg-slate-900 rounded border border-slate-800 hover:bg-slate-800"
        >
          -
        </button>
        <button 
          onClick={handleFit} 
          className="px-2.5 h-8 flex items-center justify-center text-[10px] font-bold text-slate-300 hover:text-white bg-slate-900 rounded border border-slate-800 hover:bg-slate-800"
        >
          Fit Canvas
        </button>
      </div>
    </div>
  );
};

export default GraphCanvas;
