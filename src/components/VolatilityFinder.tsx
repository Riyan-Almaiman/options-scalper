import { useState } from 'react';
import { Search, TrendingUp, TrendingDown, Zap } from 'lucide-react';

interface VolatileDay {
  date: string;
  movePercent: number;
  moveAmount: number;
  direction: 'UP' | 'DOWN';
  volume: number;
  openPrice: number;
  closePrice: number;
}

interface VolatilityFinderProps {
  ticker: string;
  apiKey: string;
  onDaySelected: (day: VolatileDay) => void;
  scanResults: VolatileDay[];
  setScanResults: (results: VolatileDay[]) => void;
}

const VolatilityFinder: React.FC<VolatilityFinderProps> = ({ 
  ticker, 
  apiKey, 
  onDaySelected, 
  scanResults, 
  setScanResults 
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [filters, setFilters] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0],
    minMovePercent: 2.0, // 2% minimum move
    minMoveAmount: 5.0,  // $5 minimum move
    direction: 'both' as 'up' | 'down' | 'both'
  });

  const scanForVolatileDays = async () => {
    if (!ticker || !apiKey) {
      alert('❌ Please select ticker and enter API key');
      return;
    }

    setIsScanning(true);
    setScanResults([]);
    
    try {
      // Get daily data for the date range
      const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${filters.startDate}/${filters.endDate}?adjusted=true&sort=asc&apikey=${apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status !== 'OK' && data.status !== 'DELAYED') {
        throw new Error(data.error || 'Failed to scan data');
      }
      
      if (!data.results || data.results.length === 0) {
        throw new Error('No data available for this period');
      }
      
      // Find volatile days
      const volatileDays: VolatileDay[] = [];
      
      data.results.forEach((day: any) => {
        const date = new Date(day.t).toISOString().split('T')[0];
        const moveAmount = Math.abs(day.c - day.o);
        const movePercent = (moveAmount / day.o) * 100;
        const direction = day.c > day.o ? 'UP' : 'DOWN';
        
        // Check if this day meets our criteria
        const meetsMinMove = movePercent >= filters.minMovePercent || moveAmount >= filters.minMoveAmount;
        const meetsDirection = filters.direction === 'both' || 
                              (filters.direction === 'up' && direction === 'UP') ||
                              (filters.direction === 'down' && direction === 'DOWN');
        
        if (meetsMinMove && meetsDirection) {
          volatileDays.push({
            date: date,
            movePercent: movePercent,
            moveAmount: moveAmount,
            direction: direction,
            volume: day.v,
            openPrice: day.o,
            closePrice: day.c
          });
        }
      });
      
      // Sort by move percentage (biggest moves first)
      const sortedDays = volatileDays.sort((a, b) => b.movePercent - a.movePercent);
      setScanResults(sortedDays);
      
    } catch (error) {
      alert(`❌ Scan Error: ${(error as Error).message}`);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      
      {/* Scanner Controls */}
      <div className="bg-gray-700 rounded-lg p-6 mb-4">
        <div className="flex items-center mb-4">
          <Search className="w-6 h-6 mr-3 text-blue-400" />
          <h2 className="text-xl font-bold text-blue-400">Find Volatile Days</h2>
        </div>
        
        <p className="text-gray-300 mb-6">
          Scan historical data to find days where {ticker || 'your stock'} had big moves that would have been perfect for 0DTE options
        </p>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Start Date:</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({...filters, startDate: e.target.value})}
              className="input-field w-full"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">End Date:</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({...filters, endDate: e.target.value})}
              className="input-field w-full"
            />
          </div>
        </div>

        {/* Movement Filters */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Min % Move:</label>
            <select
              value={filters.minMovePercent}
              onChange={(e) => setFilters({...filters, minMovePercent: parseFloat(e.target.value)})}
              className="input-field w-full"
            >
              <option value={0.5}>0.5%+</option>
              <option value={1.0}>1.0%+</option>
              <option value={2.0}>2.0%+</option>
              <option value={3.0}>3.0%+</option>
              <option value={5.0}>5.0%+</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-2">Min $ Move:</label>
            <select
              value={filters.minMoveAmount}
              onChange={(e) => setFilters({...filters, minMoveAmount: parseFloat(e.target.value)})}
              className="input-field w-full"
            >
              <option value={1.0}>$1.00+</option>
              <option value={3.0}>$3.00+</option>
              <option value={5.0}>$5.00+</option>
              <option value={10.0}>$10.00+</option>
              <option value={20.0}>$20.00+</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Direction:</label>
            <select
              value={filters.direction}
              onChange={(e) => setFilters({...filters, direction: e.target.value as any})}
              className="input-field w-full"
            >
              <option value="both">📊 Both Up & Down</option>
              <option value="up">📈 Only Up Days</option>
              <option value="down">📉 Only Down Days</option>
            </select>
          </div>
        </div>

        {/* Scan Button */}
        <button
          onClick={scanForVolatileDays}
          disabled={isScanning || !ticker || !apiKey}
          className="w-full btn-primary py-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isScanning ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
              Scanning {ticker} for volatile days...
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <Zap className="w-6 h-6 mr-2" />
              SCAN FOR BIG MOVE DAYS
            </div>
          )}
        </button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-hidden">
        {scanResults.length === 0 && !isScanning ? (
          <div className="bg-gray-700 rounded-lg p-8 text-center h-full flex items-center justify-center">
            <div className="text-gray-400">
              <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-bold mb-2">Ready to Scan</h3>
              <p>Find days where {ticker || 'your stock'} had massive moves</p>
              <p className="text-sm mt-2">Perfect for analyzing 0DTE option opportunities</p>
            </div>
          </div>
        ) : (
          <div className="bg-gray-700 rounded-lg p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-green-400">
                🎯 Volatile Days Found ({scanResults.length})
              </h3>
              {scanResults.length > 0 && (
                <span className="text-xs text-gray-400">
                  Click any day to analyze options
                </span>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2">
              {scanResults.map((day, index) => (
                <div
                  key={day.date}
                  onClick={() => onDaySelected(day)}
                  className={`bg-gray-600 rounded-lg p-4 cursor-pointer transition-all duration-200 hover:bg-gray-500 border-l-4 ${
                    day.direction === 'UP' ? 'border-green-400 hover:border-green-300' : 'border-red-400 hover:border-red-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="bg-gray-500 text-white text-xs px-2 py-1 rounded font-bold">
                        #{index + 1}
                      </span>
                      <div className="flex items-center">
                        {day.direction === 'UP' ? (
                          <TrendingUp className="w-4 h-4 text-green-400 mr-1" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-400 mr-1" />
                        )}
                        <span className="font-bold text-white">
                          {day.movePercent.toFixed(1)}% {day.direction}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${day.direction === 'UP' ? 'text-green-400' : 'text-red-400'}`}>
                        ${day.moveAmount.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-400">move</div>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-400 mb-2">
                    📅 {new Date(day.date).toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
                    <div>
                      <span className="text-gray-400">Open:</span> ${day.openPrice.toFixed(2)}
                    </div>
                    <div>
                      <span className="text-gray-400">Close:</span> ${day.closePrice.toFixed(2)}
                    </div>
                    <div>
                      <span className="text-gray-400">Volume:</span> {(day.volume / 1000000).toFixed(1)}M
                    </div>
                    <div className={`font-bold ${day.direction === 'UP' ? 'text-green-400' : 'text-red-400'}`}>
                      💰 Options Gold!
                    </div>
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

export default VolatilityFinder;