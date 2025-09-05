import React from 'react';
import { Key, Calendar, ExternalLink } from 'lucide-react';

interface ApiSetupProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  dateRange: { start: string; end: string };
  onDateRangeChange: (range: { start: string; end: string }) => void;
}

const ApiSetup: React.FC<ApiSetupProps> = ({ 
  apiKey, 
  onApiKeyChange, 
  dateRange, 
  onDateRangeChange 
}) => {
  const setDatePreset = (preset: string) => {
    const end = new Date();
    const start = new Date();
    
    switch (preset) {
      case '1week':
        start.setDate(end.getDate() - 7);
        break;
      case '1month':
        start.setMonth(end.getMonth() - 1);
        break;
      case '3months':
        start.setMonth(end.getMonth() - 3);
        break;
    }
    
    onDateRangeChange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    });
  };

  return (
    <div className="card">
      <div className="flex items-center mb-4">
        <Key className="w-5 h-5 mr-2 text-green-400" />
        <h3 className="text-lg font-semibold text-green-400">API & Date Setup</h3>
      </div>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-green-400 mb-3">
          🔑 Polygon.io API Key:
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          placeholder="PASTE YOUR API KEY HERE"
          className="input-field w-full font-mono"
        />
        {!apiKey && (
          <div className="mt-2 p-2 bg-orange-500/10 border border-orange-500/30 rounded-lg">
            <p className="text-orange-400 text-xs">
              🔗 Need an API key? Get free access at{' '}
              <a 
                href="https://polygon.io" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-orange-400 underline hover:text-orange-300"
              >
                polygon.io
                <ExternalLink className="w-3 h-3 inline ml-1" />
              </a>
            </p>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center mb-3">
          <Calendar className="w-4 h-4 mr-2 text-green-400" />
          <label className="text-sm text-gray-400">Analysis Period:</label>
        </div>
        
        <div className="grid grid-cols-3 gap-2 mb-4">
          <button
            onClick={() => setDatePreset('1week')}
            className="btn-success text-xs py-2"
          >
            Last Week
          </button>
          <button
            onClick={() => setDatePreset('1month')}
            className="btn-success text-xs py-2"
          >
            Last Month
          </button>
          <button
            onClick={() => setDatePreset('3months')}
            className="btn-success text-xs py-2"
          >
            3 Months
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Start:</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => onDateRangeChange({ ...dateRange, start: e.target.value })}
              className="input-field w-full text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">End:</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => onDateRangeChange({ ...dateRange, end: e.target.value })}
              className="input-field w-full text-sm"
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center">
        <div className={`w-3 h-3 rounded-full mr-2 ${apiKey ? 'bg-green-400' : 'bg-red-400'}`} />
        <span className="text-sm text-gray-400">
          {apiKey ? 'API Ready' : 'API Key Required'}
        </span>
      </div>
    </div>
  );
};

export default ApiSetup;