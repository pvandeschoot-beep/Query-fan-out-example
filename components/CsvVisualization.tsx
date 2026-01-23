import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { AdsTerm } from '../types';
import { MousePointer2, CheckCircle } from 'lucide-react';

interface CsvVisualizationProps {
  data: AdsTerm[];
  selectedTerms: string[];
  onToggleTerm: (term: string) => void;
  labels: {
    title: string;
    subtitle: string;
    axisVolume: string;
    axisResults: string;
    instruction: string;
  };
}

const CsvVisualization: React.FC<CsvVisualizationProps> = ({ 
  data, 
  selectedTerms, 
  onToggleTerm, 
  labels 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [hoveredTerm, setHoveredTerm] = useState<AdsTerm | null>(null);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: 500
        });
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 40, right: 40, bottom: 60, left: 60 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Scales
    const xMax = d3.max(data, d => d.clicks) || 10;
    const yMax = d3.max(data, d => d.conversions) || 10;
    
    // Add some padding to axes
    const xScale = d3.scaleLinear()
      .domain([0, xMax * 1.1])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([0, yMax * 1.1])
      .range([height, 0]);

    // Gridlines
    const makeXGrid = () => d3.axisBottom(xScale).ticks(5);
    const makeYGrid = () => d3.axisLeft(yScale).ticks(5);

    g.append("g")
      .attr("class", "grid opacity-10")
      .attr("transform", `translate(0,${height})`)
      .call(makeXGrid().tickSize(-height).tickFormat(() => ""));

    g.append("g")
      .attr("class", "grid opacity-10")
      .call(makeYGrid().tickSize(-width).tickFormat(() => ""));

    // Axes
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(5))
      .attr("font-size", "10px")
      .attr("color", "#64748b");

    g.append("g")
      .call(d3.axisLeft(yScale).ticks(5))
      .attr("font-size", "10px")
      .attr("color", "#64748b");

    // Axis Labels
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", height + 40)
      .text(labels.axisVolume)
      .attr("fill", "#64748b")
      .attr("font-size", "12px");

    g.append("text")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("y", -45)
      .attr("x", -height / 2)
      .text(labels.axisResults)
      .attr("fill", "#64748b")
      .attr("font-size", "12px");

    // Bubbles
    const circles = g.selectAll("circle")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", d => xScale(d.clicks))
      .attr("cy", d => yScale(d.conversions))
      .attr("r", d => {
        // Size variation based on clicks, but capped
        const base = 5;
        const extra = Math.min((d.clicks / xMax) * 15, 15);
        return base + extra;
      })
      .attr("fill", d => selectedTerms.includes(d.term) ? "#00549F" : "#cbd5e1")
      .attr("fill-opacity", d => selectedTerms.includes(d.term) ? 0.8 : 0.5)
      .attr("stroke", d => selectedTerms.includes(d.term) ? "#003366" : "#94a3b8")
      .attr("stroke-width", d => selectedTerms.includes(d.term) ? 2 : 1)
      .attr("cursor", "pointer")
      .on("mouseover", (event, d) => {
        setHoveredTerm(d);
        d3.select(event.currentTarget).attr("stroke", "#FFD100").attr("stroke-width", 3);
      })
      .on("mouseout", (event, d) => {
        setHoveredTerm(null);
        const isSelected = selectedTerms.includes(d.term);
        d3.select(event.currentTarget)
            .attr("stroke", isSelected ? "#003366" : "#94a3b8")
            .attr("stroke-width", isSelected ? 2 : 1);
      })
      .on("click", (event, d) => {
        onToggleTerm(d.term);
      });

  }, [data, selectedTerms, dimensions, labels, onToggleTerm]);

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <div>
           <h3 className="text-sm font-semibold text-gray-800">{labels.title}</h3>
           <p className="text-xs text-gray-500">{labels.subtitle}</p>
        </div>
        <div className="flex items-center text-xs text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            <MousePointer2 className="w-3 h-3 mr-2" />
            {labels.instruction}
        </div>
      </div>
      
      <div ref={containerRef} className="relative w-full">
        <svg ref={svgRef} width={dimensions.width} height={dimensions.height} className="block" />
        
        {/* Tooltip Overlay */}
        {hoveredTerm && (
          <div 
             className="absolute pointer-events-none bg-gray-900/90 text-white text-xs p-2 rounded shadow-lg z-20"
             style={{ 
               // Simple positioning, could be improved with exact coordinates from event
               left: 60, 
               top: 20 
             }}
          >
             <div className="font-bold mb-1">{hoveredTerm.term}</div>
             <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-gray-300">
               <span>Clicks:</span> <span className="text-white text-right">{hoveredTerm.clicks}</span>
               <span>Conv:</span> <span className="text-white text-right font-bold">{hoveredTerm.conversions}</span>
             </div>
          </div>
        )}
      </div>

      {/* Selected Terms Footer */}
      <div className="bg-gray-50 p-3 border-t border-gray-100 max-h-32 overflow-y-auto">
         <div className="flex items-center mb-2">
            <CheckCircle className="w-3 h-3 text-green-600 mr-2" />
            <span className="text-xs font-semibold text-gray-600">
                {selectedTerms.length} {labels.title.includes('Prestaties') ? 'Geselecteerde Termen' : 'Selected Terms'}
            </span>
         </div>
         <div className="flex flex-wrap gap-2">
            {selectedTerms.map(t => (
                <span key={t} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-600 shadow-sm">
                    {t}
                </span>
            ))}
            {selectedTerms.length === 0 && (
                <span className="text-xs text-gray-400 italic">Click circles above to select seeds.</span>
            )}
         </div>
      </div>
    </div>
  );
};

export default CsvVisualization;