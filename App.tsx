import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Country, AnalysisResult, AdsTerm } from './types';
import { analyzeRentalIntent } from './services/geminiService';
import CountrySelector from './components/CountrySelector';
import FanOutGraph from './components/FanOutGraph';
import GroundingSources from './components/GroundingSources';
import CsvUploader from './components/CsvUploader';
import CsvVisualization from './components/CsvVisualization';
import { translations } from './translations';
import { Loader2, TrendingUp, AlertCircle, LayoutDashboard, ArrowRight, RotateCcw, Filter } from 'lucide-react';

const App: React.FC = () => {
  const [selectedCountry, setSelectedCountry] = useState<Country>(Country.NETHERLANDS); // Default to Netherlands per user request context
  const [loading, setLoading] = useState(false);
  
  // App State: 'INPUT' | 'SELECTION' | 'RESULT'
  const [step, setStep] = useState<'INPUT' | 'SELECTION' | 'RESULT'>('INPUT');
  
  const [adsData, setAdsData] = useState<AdsTerm[]>([]);
  const [selectedTerms, setSelectedTerms] = useState<string[]>([]);
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get current translation based on country
  const t = translations[selectedCountry] || translations[Country.UK];

  // Derive visible data based on selected country
  const visibleAdsData = useMemo(() => {
    if (adsData.length === 0) return [];
    
    // Filter by detected country if available
    return adsData.filter(term => {
      // If we detected a country, strictly match. 
      // If no country was detected (undefined), we might choose to show it or hide it. 
      // Given the strict requirement "segmenteren per land", we should probably filter strictly if possible.
      // However, if the CSV didn't contain country codes, we shouldn't show blank.
      // Logic: If term has a country, it MUST match selectedCountry. If term has no country, show it in all (or handle as generic).
      if (term.detectedCountry) {
        return term.detectedCountry === selectedCountry;
      }
      return true; // Show generic/unknown terms for all countries
    });
  }, [adsData, selectedCountry]);

  const handleDataLoaded = (parsedData: AdsTerm[]) => {
    setAdsData(parsedData);
    // Don't auto-select yet, let user see the graph first.
    // Reset selected terms when new data loads
    setSelectedTerms([]);
    setStep('SELECTION');
    setData(null); 
  };

  const toggleTermSelection = (term: string) => {
    setSelectedTerms(prev => 
      prev.includes(term) ? prev.filter(t => t !== term) : [...prev, term]
    );
  };

  const handleGenerateFanOut = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    // Filter the full dataset to only pass selected terms to Gemini
    // We search within adsData to ensure we get the full object
    const seedData = adsData.filter(d => selectedTerms.includes(d.term));

    try {
      const result = await analyzeRentalIntent(selectedCountry, seedData);
      setData(result);
      setStep('RESULT');
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while contacting Gemini.");
    } finally {
      setLoading(false);
    }
  }, [selectedCountry, adsData, selectedTerms]);

  const handleReset = () => {
    setStep('INPUT');
    setAdsData([]);
    setSelectedTerms([]);
    setData(null);
  };

  const handleBackToSelection = () => {
    setStep('SELECTION');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={handleReset}>
             <div className="w-8 h-8 bg-ur-blue rounded-md flex items-center justify-center">
                <LayoutDashboard className="text-white w-5 h-5" />
             </div>
             <div>
                <h1 className="text-lg font-bold text-ur-blue leading-none">{t.title}</h1>
                <p className="text-xs text-slate-500 mt-0.5">{t.subtitle}</p>
             </div>
          </div>
          
          <div className="flex items-center space-x-4">
             {step !== 'INPUT' && (
                <button 
                  onClick={handleReset}
                  className="text-xs text-slate-500 hover:text-ur-blue flex items-center"
                >
                  <RotateCcw className="w-3 h-3 mr-1" /> Reset
                </button>
             )}
             <span className="hidden sm:inline-block text-xs bg-ur-blue/10 text-ur-blue px-2 py-1 rounded font-medium">
               Powered by Google Gemini
             </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Country Selector - Always visible */}
        <div className="mb-6">
           <CountrySelector 
            selected={selectedCountry} 
            onSelect={(c) => {
              setSelectedCountry(c);
              // Clear selection when switching countries to avoid mixing data
              if (step === 'SELECTION') setSelectedTerms([]); 
            }}
            disabled={loading || step === 'RESULT'} 
            label={t.selectRegion}
          />
        </div>

        {/* STEP 1: INPUT */}
        {step === 'INPUT' && (
          <div className="animate-fade-in-up">
            <CsvUploader 
               onDataLoaded={handleDataLoaded} 
               currentDataCount={adsData.length} 
            />
            
            <div className="text-center mt-12 opacity-50">
               <div className="max-w-md mx-auto">
                 <p className="text-sm text-gray-500">
                    Upload your Google Ads Search Term report (.csv). <br/>
                    <strong>Note:</strong> Only terms with > 0 conversions will be analyzed.
                 </p>
               </div>
            </div>
          </div>
        )}

        {/* STEP 2: SELECTION */}
        {step === 'SELECTION' && (
          <div className="animate-fade-in-up space-y-6">
             <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">{t.csvAnalysisTitle}</h2>
                  <p className="text-sm text-gray-500 flex items-center mt-1">
                    <Filter className="w-3 h-3 mr-1" />
                    Showing {visibleAdsData.length} high-intent terms for {selectedCountry}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                    <button 
                       onClick={handleReset}
                       className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                       Cancel
                    </button>
                    <button
                       onClick={handleGenerateFanOut}
                       disabled={selectedTerms.length === 0 || loading}
                       className={`
                          flex items-center px-6 py-2 rounded-lg font-bold text-white shadow-md transition-all
                          ${selectedTerms.length === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-ur-blue hover:bg-ur-lightBlue hover:shadow-lg'}
                       `}
                    >
                       {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                       {t.continueToFanOut}
                    </button>
                </div>
             </div>

             {visibleAdsData.length > 0 ? (
               <CsvVisualization 
                  data={visibleAdsData}
                  selectedTerms={selectedTerms}
                  onToggleTerm={toggleTermSelection}
                  labels={{
                    title: `${t.csvAnalysisTitle} (${selectedCountry})`,
                    subtitle: t.csvAnalysisSubtitle,
                    axisVolume: t.axisVolume,
                    axisResults: t.axisResults,
                    instruction: t.selectInstruction
                  }}
               />
             ) : (
               <div className="bg-white p-12 rounded-xl border border-dashed border-gray-300 text-center">
                  <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-gray-600 font-medium">No conversion data found for {selectedCountry}</h3>
                  <p className="text-sm text-gray-400 mt-2">
                     Try selecting a different country or check your CSV for Campaign names containing "{selectedCountry === 'United Kingdom' ? 'UK' : selectedCountry.substring(0, 2).toUpperCase()}".
                  </p>
               </div>
             )}
          </div>
        )}

        {/* STEP 3: RESULTS (Fan-Out) */}
        {step === 'RESULT' && data && (
          <div className="animate-fade-in-up">
             
             {/* Result Header Navigation */}
             <div className="mb-6 flex items-center justify-between">
                <div>
                   <h2 className="text-lg font-bold text-gray-800 flex items-center">
                     <TrendingUp className="w-5 h-5 mr-2 text-ur-blue" />
                     {t.marketAnalysis}
                   </h2>
                </div>
                <button 
                  onClick={handleBackToSelection}
                  className="text-sm text-ur-blue hover:underline flex items-center font-medium"
                >
                  Change Selection
                </button>
             </div>

             {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Col: Visualization (2/3 width) */}
              <div className="lg:col-span-2 space-y-6">
                <FanOutGraph 
                  country={selectedCountry} 
                  queries={data.fanOutQueries}
                  adsTerms={data.adsTerms} 
                  labels={{
                    title: t.graphTitle,
                    subtitle: t.graphSubtitle,
                    legendContext: t.legendContext,
                    legendQuery: t.legendQuery,
                    noQueries: t.noQueries,
                    noQueriesDesc: t.noQueriesDesc
                  }}
                />
                
                <GroundingSources 
                  sources={data.sources} 
                  queries={data.fanOutQueries.map(q => q.term)}
                  labels={{
                    queriesTitle: t.queries,
                    sourcesTitle: t.sources,
                    noQueries: t.noQueriesFound,
                    noSources: t.noSourcesFound
                  }}
                />
              </div>

              {/* Right Col: Text Analysis (1/3 width) */}
              <div className="lg:col-span-1">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full">
                  <h3 className="text-md font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">
                    {t.execSummary}
                  </h3>
                  <div className="prose prose-sm prose-slate max-w-none">
                    <div className="whitespace-pre-wrap text-gray-600 leading-relaxed">
                      {data.text}
                    </div>
                  </div>
                  
                  {/* Metadata Stats */}
                  <div className="mt-8 pt-4 border-t border-gray-100 grid grid-cols-3 gap-2">
                     <div className="text-center">
                        <span className="block text-xs text-gray-400 uppercase tracking-wide">Seed</span>
                        <span className="text-lg font-bold text-green-600">{data.adsTerms.length}</span>
                     </div>
                     <div className="text-center">
                        <span className="block text-xs text-gray-400 uppercase tracking-wide">{t.queryCount}</span>
                        <span className="text-lg font-bold text-ur-yellow">{data.fanOutQueries.length}</span>
                     </div>
                     <div className="text-center">
                        <span className="block text-xs text-gray-400 uppercase tracking-wide">{t.sourceCount}</span>
                        <span className="text-lg font-bold text-ur-blue">{data.sources.length}</span>
                     </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start text-red-700">
            <AlertCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-sm">Analysis Failed</h3>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

// Add custom animation for entering results
const style = document.createElement('style');
style.innerHTML = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in-up {
    animation: fadeInUp 0.5s ease-out forwards;
  }
`;
document.head.appendChild(style);

export default App;