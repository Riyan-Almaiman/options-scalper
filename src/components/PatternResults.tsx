import React from 'react';
import { Trophy, TrendingUp, TrendingDown, Clock, DollarSign, Target } from 'lucide-react';

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

interface PatternResultsProps {
  patterns: Pattern[];
  stockData: StockData[];
  onPatternClick?: (pattern: Pattern) => void;
  selectedPattern?: Pattern | null;
  contractsCount?: number;
}

const PatternResults: React.FC<PatternResultsProps> = ({ patterns, onPatternClick, selectedPattern, contractsCount = 1 }) => {
  const successfulPatterns = patterns.filter(p => p.success);
  
  if (patterns.length === 0) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <Target className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-400">No patterns analyzed yet</p>
        </div>
      </div>
    );
  }

  const stats = {
    totalPatterns: successfulPatterns.length,
    winRate: patterns.length > 0 ? (successfulPatterns.length / patterns.length) * 100 : 0,
    avgProfit: successfulPatterns.length > 0 
      ? successfulPatterns.reduce((sum, p) => sum + p.estimatedProfit, 0) / successfulPatterns.length 
      : 0,
    bestProfit: successfulPatterns.length > 0 
      ? Math.max(...successfulPatterns.map(p => p.estimatedProfit)) 
      : 0,
    avgHoldTime: successfulPatterns.length > 0
      ? successfulPatterns.reduce((sum, p) => sum + p.holdMinutes, 0) / successfulPatterns.length
      : 0,
    callsVsPuts: successfulPatterns.length > 0
      ? (successfulPatterns.filter(p => p.direction === 'CALL').length / successfulPatterns.length) * 100
      : 50
  };

  return (
    <div className="space-y-6">
      
      {/* Statistics Cards */}
      <div className="card">
        <div className="flex items-center mb-4">
          <Trophy className="w-5 h-5 mr-2 text-orange-400" />
          <h3 className="text-lg font-semibold text-green-400">Pattern Statistics</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{stats.totalPatterns}</div>
            <div className="text-xs text-gray-400">Profitable Patterns</div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <div className={`text-2xl font-bold ${stats.winRate >= 50 ? 'text-green-400' : 'text-orange-400'}`}>
              {stats.winRate.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-400">Win Rate</div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-400">
              ${stats.avgProfit.toFixed(0)}
            </div>
            <div className="text-xs text-gray-400">Avg Profit</div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-400">
              {stats.avgHoldTime.toFixed(1)}m
            </div>
            <div className="text-xs text-gray-400">Avg Hold</div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-gray-800 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Strategy Preference:</span>
            <div className="flex items-center space-x-2">
              <div className="flex items-center">
                <TrendingUp className="w-4 h-4 text-green-400 mr-1" />
                <span className="text-sm">{stats.callsVsPuts.toFixed(0)}% Calls</span>
              </div>
              <span className="text-gray-400">•</span>
              <div className="flex items-center">
                <TrendingDown className="w-4 h-4 text-red-400 mr-1" />
                <span className="text-sm">{(100 - stats.callsVsPuts).toFixed(0)}% Puts</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Patterns */}
      <div className="card">
        <div className="flex items-center mb-4">
          <DollarSign className="w-5 h-5 mr-2 text-green-400" />
          <h3 className="text-lg font-semibold text-green-400">Top Money-Makers</h3>
        </div>
        
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {successfulPatterns.slice(0, 10).map((pattern, index) => (
            <div
              key={index}
              onClick={() => onPatternClick?.(pattern)}
              className={`pattern-card ${pattern.direction === 'PUT' ? 'pattern-card-bearish' : ''} ${
                selectedPattern === pattern ? 'ring-2 ring-green-400 bg-green-400/10' : ''
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center">
                  <span className="bg-gray-600 text-white text-xs px-2 py-1 rounded-full mr-2">
                    #{index + 1}
                  </span>
                  <span className="font-semibold text-sm">
                    {pattern.direction === 'CALL' ? '📈' : '📉'} {pattern.direction}
                  </span>
                </div>
                <div className="bg-green-400 text-black px-3 py-1 rounded-full font-bold text-sm">
                  +${(pattern.estimatedProfit * contractsCount).toFixed(0)}
                </div>
              </div>
              
              <div className="text-xs text-gray-400 mb-2">
                {pattern.date} • {pattern.time} EST
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-400">Entry:</span> 
                  <span className="ml-1 font-mono">${pattern.entryPrice.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-400">Exit:</span>
                  <span className="ml-1 font-mono">${pattern.exitPrice.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-400">Move:</span>
                  <span className="ml-1 font-mono">{pattern.movePercent.toFixed(2)}%</span>
                </div>
                <div>
                  <span className="text-gray-400">Hold:</span>
                  <span className="ml-1 font-mono">{pattern.holdMinutes}m</span>
                </div>
              </div>
            </div>
          ))}
          
          {successfulPatterns.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <Target className="w-8 h-8 mx-auto mb-2" />
              <p>No profitable patterns found</p>
              <p className="text-xs">Try adjusting your filters</p>
            </div>
          )}
        </div>
      </div>

      {/* Trading Insights */}
      {successfulPatterns.length > 0 && (
        <div className="card">
          <div className="flex items-center mb-4">
            <Clock className="w-5 h-5 mr-2 text-orange-400" />
            <h3 className="text-lg font-semibold text-green-400">Trading Insights</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
              <span className="text-sm text-gray-300">Best Single Trade:</span>
              <span className="font-bold text-green-400">+${stats.bestProfit.toFixed(0)}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
              <span className="text-sm text-gray-300">Total Potential:</span>
              <span className="font-bold text-green-400">
                +${successfulPatterns.reduce((sum, p) => sum + p.estimatedProfit, 0).toFixed(0)}
              </span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
              <span className="text-sm text-gray-300">Trades Per Day:</span>
              <span className="font-bold text-white">
                {(successfulPatterns.length / new Set(patterns.map(p => p.date)).size).toFixed(1)}
              </span>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
            <p className="text-orange-400 text-sm font-semibold mb-1">💡 Pro Tip:</p>
            <p className="text-xs text-gray-300">
              These are estimated profits based on typical 0DTE option leverage. 
              Real profits depend on IV, spreads, and exact timing.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatternResults;