import React from 'react';
import { TrendingUp, TrendingDown, Clock } from 'lucide-react';

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

interface SimplePatternListProps {
  patterns: Pattern[];
  onPatternClick?: (pattern: Pattern) => void;
  selectedPattern?: Pattern | null;
  contractsCount: number;
}

const SimplePatternList: React.FC<SimplePatternListProps> = ({ 
  patterns, 
  onPatternClick, 
  selectedPattern,
  contractsCount 
}) => {
  const successfulPatterns = patterns.filter(p => p.success);

  if (successfulPatterns.length === 0) {
    return (
      <div className="bg-gray-700 rounded-lg p-8 text-center h-full flex items-center justify-center">
        <div className="text-gray-400">
          <div className="text-4xl mb-4">📈</div>
          <p>No profitable patterns found</p>
          <p className="text-sm mt-2">Try a different date</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-green-400">
          💰 Profitable Trades ({successfulPatterns.length})
        </h3>
      </div>
      
      <div className="space-y-2 h-[calc(100vh-300px)] overflow-y-auto">
        {successfulPatterns.slice(0, 15).map((pattern, index) => {
          // Calculate realistic option prices
          const strikePrice = Math.round(pattern.entryPrice);
          
          // Entry option price calculation
          const entryIntrinsic = pattern.direction === 'CALL' 
            ? Math.max(0, pattern.entryPrice - strikePrice)
            : Math.max(0, strikePrice - pattern.entryPrice);
          const entryTimeValue = 0.50; // Typical 0DTE time value
          const entryOptionPrice = entryIntrinsic + entryTimeValue;
          
          // Exit option price calculation  
          const exitIntrinsic = pattern.direction === 'CALL'
            ? Math.max(0, pattern.exitPrice - strikePrice) 
            : Math.max(0, strikePrice - pattern.exitPrice);
          const exitTimeValue = Math.max(0.05, entryTimeValue - (pattern.holdMinutes * 0.02)); // Time decay
          const exitOptionPrice = exitIntrinsic + exitTimeValue;
          
          // Real profit calculation
          const profitPerContract = (exitOptionPrice - entryOptionPrice) * 100; // 100 shares per contract
          const totalCost = entryOptionPrice * contractsCount * 100;
          const totalProfit = profitPerContract * contractsCount;
          const isSelected = selectedPattern === pattern;
          
          return (
            <div
              key={index}
              onClick={() => onPatternClick?.(pattern)}
              className={`bg-gray-600 rounded-lg p-3 cursor-pointer transition-all duration-200 hover:bg-gray-500 ${
                isSelected ? 'ring-2 ring-green-400 bg-green-400/10' : ''
              } ${pattern.direction === 'PUT' ? 'border-l-2 border-red-400' : 'border-l-2 border-green-400'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="bg-gray-500 text-white text-xs px-2 py-1 rounded font-bold">
                    #{index + 1}
                  </span>
                  <div className="flex items-center">
                    {pattern.direction === 'CALL' ? (
                      <TrendingUp className="w-4 h-4 text-green-400 mr-1" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-400 mr-1" />
                    )}
                    <span className="font-bold text-white text-sm">
                      {pattern.direction}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-green-400 font-bold">
                    +${totalProfit.toFixed(0)}
                  </div>
                  <div className="text-xs text-gray-400">
                    {((totalProfit / totalCost) * 100).toFixed(0)}% gain
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-300 mb-2">
                <div>
                  <span className="text-gray-400">Option Entry:</span> ${entryOptionPrice.toFixed(2)}
                </div>
                <div>
                  <span className="text-gray-400">Option Exit:</span> ${exitOptionPrice.toFixed(2)}
                </div>
                <div>
                  <span className="text-gray-400">Stock Move:</span> ${pattern.stockMove.toFixed(2)}
                </div>
                <div>
                  <span className="text-gray-400">Hold Time:</span> {pattern.holdMinutes}m
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center text-gray-400">
                  <Clock className="w-3 h-3 mr-1" />
                  {pattern.time}
                </div>
                
                {isSelected && (
                  <div className="bg-green-400 text-black px-2 py-1 rounded text-xs font-bold">
                    SELECTED
                  </div>
                )}
              </div>

              {/* Cost Breakdown - Only for selected pattern */}
              {isSelected && (
                <div className="mt-3 pt-2 border-t border-gray-500">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-gray-400">
                      Cost: <span className="text-orange-400 font-bold">${totalCost.toFixed(0)}</span>
                    </div>
                    <div className="text-gray-400">
                      Profit: <span className="text-green-400 font-bold">+${totalProfit.toFixed(0)}</span>
                    </div>
                    <div className="text-gray-400">
                      Per Contract: <span className="text-white font-bold">${profitPerContract.toFixed(0)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SimplePatternList;