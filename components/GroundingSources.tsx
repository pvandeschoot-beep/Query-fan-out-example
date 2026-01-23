import React from 'react';
import { GroundingSource } from '../types';
import { ExternalLink, Search } from 'lucide-react';

interface GroundingSourcesProps {
  sources: GroundingSource[];
  queries: string[];
  labels: {
    queriesTitle: string;
    sourcesTitle: string;
    noQueries: string;
    noSources: string;
  }
}

const GroundingSources: React.FC<GroundingSourcesProps> = ({ sources, queries, labels }) => {
  if (sources.length === 0 && queries.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      {/* Generated Queries List */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
         <h3 className="text-sm font-semibold text-gray-800 flex items-center mb-4">
            <Search className="w-4 h-4 mr-2 text-ur-blue" />
            {labels.queriesTitle}
         </h3>
         {queries.length > 0 ? (
             <ul className="space-y-2">
                 {queries.map((q, idx) => (
                     <li key={idx} className="text-sm text-gray-600 flex items-start">
                        <span className="text-ur-lightBlue mr-2 font-mono text-xs mt-0.5">0{idx + 1}</span>
                        {q}
                     </li>
                 ))}
             </ul>
         ) : (
             <p className="text-sm text-gray-400 italic">{labels.noQueries}</p>
         )}
      </div>

      {/* Actual Web Sources */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center mb-4">
          <ExternalLink className="w-4 h-4 mr-2 text-ur-blue" />
          {labels.sourcesTitle}
        </h3>
        {sources.length > 0 ? (
          <div className="space-y-3">
            {sources.map((source, index) => (
              <a
                key={index}
                href={source.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 rounded-lg bg-gray-50 hover:bg-ur-blue/5 transition-colors border border-transparent hover:border-ur-blue/20 group"
              >
                <div className="text-sm font-medium text-gray-700 group-hover:text-ur-blue truncate">
                  {source.title}
                </div>
                <div className="text-xs text-gray-400 mt-1 truncate">
                  {source.uri}
                </div>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">{labels.noSources}</p>
         )}
      </div>
    </div>
  );
};

export default GroundingSources;