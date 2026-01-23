import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Country, Node, Link, AdsTerm, GeneratedTerm } from '../types';

interface FanOutGraphProps {
  country: Country;
  queries: GeneratedTerm[];
  adsTerms: AdsTerm[];
  labels: {
    title: string;
    subtitle: string;
    legendContext: string;
    legendQuery: string;
    noQueries: string;
    noQueriesDesc: string;
  };
}

const FanOutGraph: React.FC<FanOutGraphProps> = ({ country, queries, adsTerms, labels }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: 600
        });
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); 
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!svgRef.current || (queries.length === 0 && adsTerms.length === 0)) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); 

    const width = dimensions.width;
    const height = dimensions.height;

    // 1. Process CSV Data (Proven)
    // Scale size based on conversions (or clicks if 0 conv).
    const maxConv = Math.max(...adsTerms.map(t => t.conversions), 1);
    const maxClicks = Math.max(...adsTerms.map(t => t.clicks), 1);
    
    const csvNodes: Node[] = adsTerms.map(term => {
      // Basic normalization logic for visualization size
      let sizeScore = 10;
      if (term.conversions > 0) {
        sizeScore = 15 + (term.conversions / maxConv) * 25; // 15 to 40
      } else {
        sizeScore = 5 + (term.clicks / maxClicks) * 10; // 5 to 15
      }

      return {
        id: term.term,
        group: 2, // CSV
        val: sizeScore,
        data: term
      };
    });

    // 2. Process Gemini Data (Opportunity)
    const geminiNodes: Node[] = queries.map(q => ({
      id: q.term,
      group: 1, // Gemini
      val: 8, // Standard size for predictions
      data: q
    }));

    const rootNode: Node = { id: `United Rentals\n${country}`, group: 0, val: 30 };

    const nodes: Node[] = [rootNode, ...csvNodes, ...geminiNodes];

    // Links: Root -> CSV, Root -> Gemini
    const links: Link[] = [
      ...csvNodes.map(n => ({ source: rootNode.id, target: n.id })),
      ...geminiNodes.map(n => ({ source: rootNode.id, target: n.id }))
    ];

    const simulation = d3.forceSimulation(nodes as any)
      .force("link", d3.forceLink(links as any).id((d: any) => d.id).distance(d => {
         // CSV nodes closer to root (Core), Gemini nodes further out (Expansion)
         return (d.target as any).group === 2 ? 100 : 180;
      }))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius((d: any) => d.val + 5));

    // Define markers
    const defs = svg.append("defs");
    defs.append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 25)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#cbd5e1");

    const link = svg.append("g")
      .attr("stroke", "#cbd5e1")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", 1);

    const nodeGroup = svg.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .call((d3.drag() as any)
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended))
      .on("click", (event, d) => {
        setSelectedNode(d);
        event.stopPropagation();
      });

    // Circles
    nodeGroup.append("circle")
      .attr("r", d => d.val)
      .attr("fill", d => {
        if (d.group === 0) return "#00549F"; // Root Blue
        if (d.group === 2) return "#22c55e"; // CSV Green
        return "#FFD100"; // Gemini Yellow
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .attr("class", "cursor-pointer hover:stroke-gray-400 transition-all");

    // Labels
    nodeGroup.append("text")
      .text(d => d.id)
      .attr("x", d => d.group === 0 ? 0 : d.val + 4)
      .attr("y", d => d.group === 0 ? d.val + 15 : 4)
      .attr("text-anchor", d => d.group === 0 ? "middle" : "start")
      .style("font-size", d => d.group === 0 ? "14px" : "10px")
      .style("font-weight", d => d.group === 0 || d.group === 2 ? "bold" : "normal")
      .style("fill", "#334155")
      .style("pointer-events", "none")
      .style("text-shadow", "0 1px 2px rgba(255,255,255,0.8)");

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      nodeGroup
        .attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
    
    // Clear selection on bg click
    svg.on("click", () => setSelectedNode(null));

    return () => {
      simulation.stop();
    };
  }, [queries, adsTerms, country, dimensions]);

  // If no data
  if (queries.length === 0 && adsTerms.length === 0) {
    return (
      <div className="h-[500px] w-full flex items-center justify-center bg-white border border-gray-100 rounded-xl text-gray-400">
        <div className="text-center">
            <p>{labels.noQueries}</p>
            <p className="text-sm mt-2">{labels.noQueriesDesc}</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative">
      <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm p-3 rounded-lg border border-gray-100 shadow-sm pointer-events-none">
        <h3 className="text-sm font-semibold text-gray-700">{labels.title}</h3>
        <p className="text-xs text-gray-500 mb-2">{labels.subtitle}</p>
        <div className="flex flex-col space-y-1 text-xs">
           <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-green-500 mr-2 border border-white"></span>
              <span className="text-gray-700 font-medium">Proven Results (CSV)</span>
           </div>
           <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-ur-yellow mr-2 border border-white"></span>
              <span className="text-gray-700 font-medium">Opportunity (Fan-Out)</span>
           </div>
        </div>
      </div>
      
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} className="w-full touch-action-none bg-slate-50/50" />
      
      {/* Node Detail Tooltip */}
      {selectedNode && (
        <div className="absolute bottom-4 left-4 right-4 md:right-auto md:w-64 bg-white/95 backdrop-blur p-4 rounded-lg border border-gray-200 shadow-lg text-sm z-20 animate-fade-in-up">
           <h4 className="font-bold text-gray-800 border-b border-gray-100 pb-2 mb-2 break-words">
             {selectedNode.id}
           </h4>
           {selectedNode.group === 2 ? (
             <div className="space-y-1 text-gray-600">
               <div className="flex justify-between">
                 <span>Type:</span>
                 <span className="font-semibold text-green-600">Proven (Ads Data)</span>
               </div>
               <div className="flex justify-between">
                 <span>Clicks:</span>
                 <span className="font-mono">{(selectedNode.data as AdsTerm).clicks}</span>
               </div>
               <div className="flex justify-between">
                 <span>Conversions:</span>
                 <span className="font-mono font-bold">{(selectedNode.data as AdsTerm).conversions}</span>
               </div>
               <div className="flex justify-between">
                 <span>Cost:</span>
                 <span className="font-mono">€{(selectedNode.data as AdsTerm).cost.toFixed(2)}</span>
               </div>
             </div>
           ) : selectedNode.group === 1 ? (
             <div className="space-y-1 text-gray-600">
                <div className="flex justify-between">
                  <span>Type:</span>
                  <span className="font-semibold text-ur-yellow">Opportunity</span>
                </div>
                <p className="text-xs italic mt-2 text-gray-500">
                  This query was generated by Gemini based on your market data as a potential expansion area.
                </p>
             </div>
           ) : (
             <div className="text-gray-500 italic">Root Context Node</div>
           )}
        </div>
      )}
    </div>
  );
};

export default FanOutGraph;