import React, { useCallback } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, XCircle } from 'lucide-react';
import { AdsTerm } from '../types';
import { parseAdsCsv } from '../utils/csvParser';

interface CsvUploaderProps {
  onDataLoaded: (data: AdsTerm[]) => void;
  currentDataCount: number;
}

const CsvUploader: React.FC<CsvUploaderProps> = ({ onDataLoaded, currentDataCount }) => {
  const [error, setError] = React.useState<string | null>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = parseAdsCsv(text);
        if (parsed.length === 0) {
          setError("No valid data found. Check CSV headers.");
        } else {
          onDataLoaded(parsed);
        }
      } catch (err: any) {
        setError(err.message || "Failed to parse CSV");
      }
    };

    reader.readAsText(file);
  }, [onDataLoaded]);

  return (
    <div className="mb-6 p-4 bg-white rounded-xl border border-dashed border-gray-300 hover:border-ur-blue transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
            <div className={`p-2 rounded-lg ${currentDataCount > 0 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                {currentDataCount > 0 ? <CheckCircle2 className="w-6 h-6" /> : <FileSpreadsheet className="w-6 h-6" />}
            </div>
            <div>
                <h3 className="text-sm font-semibold text-gray-800">
                    {currentDataCount > 0 ? 'Google Ads Data Loaded' : 'Upload Search Terms CSV'}
                </h3>
                <p className="text-xs text-gray-500">
                    {currentDataCount > 0 
                        ? `${currentDataCount} terms loaded from ${fileName}` 
                        : 'Use .csv export with "Search term", "Clicks", "Conversions" columns'
                    }
                </p>
                {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            </div>
        </div>
        
        <label className="cursor-pointer">
            <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
            <span className="flex items-center px-3 py-1.5 text-xs font-medium bg-gray-50 border border-gray-200 rounded-md text-gray-600 hover:bg-gray-100 transition-colors">
                <Upload className="w-3 h-3 mr-2" />
                {currentDataCount > 0 ? 'Replace File' : 'Select File'}
            </span>
        </label>
      </div>
    </div>
  );
};

export default CsvUploader;