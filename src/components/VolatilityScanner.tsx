import { useState } from 'react';
import { Search, Zap } from 'lucide-react';

interface VolatileDay {
  date: string;
  movePercent: number;
  moveAmount: number;
  direction: 'UP' | 'DOWN';
  volume: number;
  openPrice: number;
  closePrice: number;
}

interface VolatilityScannerProps {
  ticker: string;
  apiKey: string;
  onDaySelected: (day: VolatileDay) => void;
  results: VolatileDay[];
  setResults: (results: VolatileDay[]) => void;
}

const VolatilityScanner: React.FC<VolatilityScannerProps> = ({ 
  ticker, 
  apiKey, 
  onDaySelected, 
  results, 
  setResults 
}) => {
  const [scanning, setScanning] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [filters, setFilters] = useState({
    moveRange: '0.10-0.50' as string,
    direction: 'both' as 'up' | 'down' | 'both'
  });

  const scanForVolatileDays = async () => {
    if (!ticker || !apiKey) {
      alert('❌ Please select ticker and enter API key');
      return;
    }

    setScanning(true);
    setResults([]);
    
    try {
      const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${dateRange.start}/${dateRange.end}?adjusted=true&sort=asc&apikey=${apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status !== 'OK' && data.status !== 'DELAYED') {
        throw new Error(data.error || 'Failed to scan data');
      }
      
      if (!data.results || data.results.length === 0) {
        throw new Error('No data available for this period');
      }
      
      const volatileDays: VolatileDay[] = [];
      
      data.results.forEach((day: any) => {
        const date = new Date(day.t).toISOString().split('T')[0];
        const moveAmount = Math.abs(day.c - day.o);
        const movePercent = (Math.abs(day.c - day.o) / day.o) * 100;
        const direction = day.c > day.o ? 'UP' : 'DOWN';
        
        // Parse move range (e.g., "0.10-0.50" -> min: 0.10, max: 0.50)
        const [minMove, maxMove] = filters.moveRange.split('-').map(parseFloat);
        
        // Check if this day meets our range criteria
        if (movePercent >= minMove && movePercent <= maxMove) {
          if (filters.direction === 'both' || 
              (filters.direction === 'up' && direction === 'UP') ||
              (filters.direction === 'down' && direction === 'DOWN')) {
            volatileDays.push({
              date,
              movePercent,
              moveAmount,
              direction,
              volume: day.v,
              openPrice: day.o,
              closePrice: day.c
            });
          }
        }
      });
      
      setResults(volatileDays.sort((a, b) => b.movePercent - a.movePercent));
      
    } catch (error) {
      alert(`❌ Error: ${(error as Error).message}`);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="p-6 h-full flex flex-col">
      
      {/* Scanner Setup */}
      <div className="bg-gray-700 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-blue-400 mb-4">
          📊 Find Movement Days
        </h2>
        <p className="text-gray-300 mb-6">
          Find days where {ticker || 'stocks'} moved up/down any amount - even small 0.10% moves can be profitable for 0DTE options
        </p>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">From:</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              className="input-field w-full"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">To:</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              className="input-field w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Move Range:</label>
            <select
              value={filters.moveRange}
              onChange={(e) => setFilters({...filters, moveRange: e.target.value})}
              className="input-field w-full"
            >
              <option value="0.05-0.20">0.05% - 0.20% (Tiny moves)</option>
              <option value="0.10-0.50">0.10% - 0.50% (Small moves)</option>
              <option value="0.20-1.00">0.20% - 1.00% (Medium moves)</option>
              <option value="0.50-2.00">0.50% - 2.00% (Good moves)</option>
              <option value="1.00-3.00">1.00% - 3.00% (Strong moves)</option>
              <option value="2.00-5.00">2.00% - 5.00% (Big moves)</option>
              <option value="3.00-10.00">3.00% - 10.00% (Huge moves)</option>
              <option value="0.05-10.00">0.05% - 10.00% (All moves)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Direction:</label>
            <select
              value={filters.direction}
              onChange={(e) => setFilters({...filters, direction: e.target.value as any})}
              className="input-field w-full"
            >
              <option value="both">📊 Up & Down</option>
              <option value="up">📈 Only Up</option>
              <option value="down">📉 Only Down</option>
            </select>
          </div>
        </div>

        <button
          onClick={scanForVolatileDays}
          disabled={scanning || !ticker || !apiKey}
          className="w-full btn-primary py-3 disabled:opacity-50"
        >
          {scanning ? (
            <span>🔄 Scanning...</span>
          ) : (
            <span><Zap className="w-5 h-5 inline mr-2" />FIND MOVEMENT DAYS</span>
          )}
        </button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-hidden">
        {results.length === 0 ? (
          <div className="bg-gray-700 rounded-lg p-8 text-center h-full flex items-center justify-center">
            <div className="text-gray-400">
              <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-bold mb-2">Ready to Find Opportunities</h3>
              <p>Scan for days with big moves perfect for 0DTE options</p>
            </div>
          </div>
        ) : (
          <div className="bg-gray-700 rounded-lg p-4 h-full flex flex-col">
            <h3 className="text-lg font-bold text-green-400 mb-4">
              📈 Movement Days Found ({results.length})
            </h3>
            
            <div className="flex-1 overflow-y-auto space-y-3">
              {results.map((day, index) => (
                <div
                  key={day.date}
                  onClick={() => onDaySelected(day)}
                  className={`bg-gray-600 rounded-lg p-4 cursor-pointer transition-all hover:bg-gray-500 border-l-4 ${
                    day.direction === 'UP' ? 'border-green-400' : 'border-red-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <span className="bg-gray-500 text-white text-xs px-2 py-1 rounded font-bold">
                        #{index + 1}
                      </span>
                      <div>
                        <div className="font-bold text-white">
                          {new Date(day.date).toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </div>
                        <div className="text-xs text-gray-400">{day.date}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xl font-bold ${day.direction === 'UP' ? 'text-green-400' : 'text-red-400'}`}>
                        {day.direction === 'UP' ? '+' : '-'}{day.movePercent.toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-400">
                        ${day.moveAmount.toFixed(2)} move
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Open:</span> ${day.openPrice.toFixed(2)}
                    </div>
                    <div>
                      <span className="text-gray-400">Close:</span> ${day.closePrice.toFixed(2)}
                    </div>
                  </div>
                  
                  <div className="mt-2 text-center">
                    <span className="bg-orange-400 text-black px-3 py-1 rounded-full text-xs font-bold">
                      💰 CLICK TO ANALYZE OPTIONS
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VolatilityScanner;