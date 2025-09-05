import React, { useState } from 'react';
import { Search, Zap, Filter } from 'lucide-react';

interface StockData {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Pattern {
  date: string;
  time: string;
  entryPrice: number;
  exitPrice: number;
  stockMove: number;
  movePercent: number;
  holdMinutes: number;
  direction: 'CALL' | 'PUT';
  estimatedProfit: number;
  volume: number;
  success: boolean;
}

interface PatternAnalyzerProps {
  ticker: string;
  apiKey: string;
  dateRange: { start: string; end: string };
  onDataLoaded: (data: StockData[]) => void;
  onPatternsFound: (patterns: Pattern[]) => void;
  isLoading: boolean;
  onLoadingChange: (loading: boolean) => void;
}

const PatternAnalyzer: React.FC<PatternAnalyzerProps> = ({
  ticker,
  apiKey,
  dateRange,
  onDataLoaded,
  onPatternsFound,
  isLoading,
  onLoadingChange
}) => {
  const [filters, setFilters] = useState({
    minMove: 0.10,
    maxHoldTime: 15,
    minVolume: 1000
  });

  const loadHistoricalData = async (ticker: string, startDate: string, endDate: string, apiKey: string) => {
    const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/minute/${startDate}/${endDate}?adjusted=true&sort=asc&apikey=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'OK' && data.status !== 'DELAYED') {
      throw new Error(data.error || 'Failed to load historical data');
    }
    
    if (!data.results || data.results.length === 0) {
      throw new Error('No historical data available for this period');
    }
    
    const allData = data.results.map((item: any) => ({
      timestamp: new Date(item.t),
      open: item.o,
      high: item.h,
      low: item.l,
      close: item.c,
      volume: item.v,
    }));

    // Filter for market hours only (9:30 AM - 4:00 PM EST)
    const marketHoursData = allData.filter((item: StockData) => {
      const easternTime = new Date(item.timestamp.toLocaleString("en-US", {timeZone: "America/New_York"}));
      const hour = easternTime.getHours();
      const minute = easternTime.getMinutes();
      const currentTime = hour * 60 + minute;
      
      const marketOpen = 9 * 60 + 30; // 9:30 AM
      const marketClose = 16 * 60;    // 4:00 PM
      
      return currentTime >= marketOpen && currentTime < marketClose;
    });

    return marketHoursData;
  };

  const findProfitablePatterns = (stockData: StockData[]) => {
    const patterns: Pattern[] = [];
    
    for (let i = 5; i < stockData.length - filters.maxHoldTime; i++) {
      const entry = stockData[i];
      
      if (entry.volume < filters.minVolume) continue;
      
      // Look ahead for profitable exits
      for (let j = i + 1; j <= Math.min(i + filters.maxHoldTime, stockData.length - 1); j++) {
        const exit = stockData[j];
        const holdMinutes = j - i;
        const stockMove = Math.abs(exit.close - entry.close);
        
        if (stockMove >= filters.minMove) {
          const direction = exit.close > entry.close ? 'CALL' : 'PUT';
          const movePercent = (stockMove / entry.close) * 100;
          
          // Estimate option leverage based on move size
          let leverage = 10;
          if (movePercent < 0.1) leverage = 8;
          else if (movePercent < 0.2) leverage = 15;
          else if (movePercent < 0.5) leverage = 20;
          else leverage = 25;
          
          const estimatedProfit = stockMove * leverage;
          
          patterns.push({
            date: entry.timestamp.toDateString(),
            time: entry.timestamp.toLocaleTimeString("en-US", {timeZone: "America/New_York"}),
            entryPrice: entry.close,
            exitPrice: exit.close,
            stockMove: stockMove,
            movePercent: movePercent,
            holdMinutes: holdMinutes,
            direction: direction,
            estimatedProfit: estimatedProfit,
            volume: entry.volume,
            success: estimatedProfit >= 10 // $10+ profit target
          });
          
          break; // Take first profitable exit
        }
      }
    }
    
    return patterns.sort((a, b) => b.estimatedProfit - a.estimatedProfit);
  };

  const analyzePatterns = async () => {
    if (!ticker || !apiKey) {
      alert('❌ Please select ticker and enter API key');
      return;
    }

    onLoadingChange(true);
    
    try {
      const stockData = await loadHistoricalData(ticker, dateRange.start, dateRange.end, apiKey);
      onDataLoaded(stockData);
      
      const foundPatterns = findProfitablePatterns(stockData);
      onPatternsFound(foundPatterns);
      
    } catch (error) {
      alert(`❌ Error: ${(error as Error).message}`);
    } finally {
      onLoadingChange(false);
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Search className="w-5 h-5 mr-2 text-green-400" />
          <h3 className="text-lg font-semibold text-green-400">Pattern Analysis</h3>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <Filter className="w-4 h-4 mr-2 text-gray-400" />
            <span className="text-sm text-gray-400">Filters</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm text-gray-400 mb-2">Min Stock Move:</label>
          <select
            value={filters.minMove}
            onChange={(e) => setFilters({...filters, minMove: parseFloat(e.target.value)})}
            className="input-field w-full"
          >
            <option value={0.05}>$0.05+</option>
            <option value={0.10}>$0.10+</option>
            <option value={0.20}>$0.20+</option>
            <option value={0.50}>$0.50+</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">Max Hold Time:</label>
          <select
            value={filters.maxHoldTime}
            onChange={(e) => setFilters({...filters, maxHoldTime: parseInt(e.target.value)})}
            className="input-field w-full"
          >
            <option value={5}>5 minutes</option>
            <option value={10}>10 minutes</option>
            <option value={15}>15 minutes</option>
            <option value={30}>30 minutes</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">Min Volume:</label>
          <select
            value={filters.minVolume}
            onChange={(e) => setFilters({...filters, minVolume: parseInt(e.target.value)})}
            className="input-field w-full"
          >
            <option value={500}>500+</option>
            <option value={1000}>1,000+</option>
            <option value={5000}>5,000+</option>
            <option value={10000}>10,000+</option>
          </select>
        </div>
      </div>

      {/* Analysis Button */}
      <button
        onClick={analyzePatterns}
        disabled={isLoading || !ticker || !apiKey}
        className={`w-full py-4 rounded-lg font-bold text-lg transition-all duration-200 ${
          isLoading 
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
            : 'btn-primary hover:shadow-2xl'
        }`}
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black mr-3"></div>
            Analyzing Historical Data...
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <Zap className="w-6 h-6 mr-2" />
            FIND PROFITABLE PATTERNS
          </div>
        )}
      </button>

      {/* Quick Info */}
      <div className="mt-4 p-4 bg-gray-800 rounded-lg border border-green-400/20">
        <h4 className="text-green-400 font-semibold mb-2">What This Finds:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-300">
          <div>• Entry/exit times that made money</div>
          <div>• Best hold times for maximum profit</div>
          <div>• Call vs Put success rates</div>
          <div>• Volume patterns for better fills</div>
        </div>
      </div>
    </div>
  );
};

export default PatternAnalyzer;