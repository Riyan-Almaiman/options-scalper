import { useState, useEffect } from 'react';
import { Target } from 'lucide-react';

interface VolatileDay {
  date: string;
  movePercent: number;
  moveAmount: number;
  direction: 'UP' | 'DOWN';
  volume: number;
  openPrice: number;
  closePrice: number;
}

interface OptionOpportunity {
  strike: number;
  type: 'CALL' | 'PUT';
  entryPrice: number;
  exitPrice: number;
  entryTime: string;
  exitTime: string;
  profit: number;
  profitPercent: number;
  holdMinutes: number;
}

interface SelectedOption {
  strike: number;
  type: 'CALL' | 'PUT';
  expiryDate: string;
  originalTradingDay: string;
}

interface AdvancedScannerProps {
  ticker: string;
  selectedDay: VolatileDay;
  apiKey: string;
  selectedOption?: SelectedOption | null;
  onOptionSelect?: (option: SelectedOption) => void;
}

const AdvancedScanner: React.FC<AdvancedScannerProps> = ({ ticker, selectedDay, apiKey, selectedOption, onOptionSelect }) => {
  const [opportunities, setOpportunities] = useState<OptionOpportunity[]>([]);
  const [scanning, setScanning] = useState(false);
  const [contracts, setContracts] = useState(1);
  
  // Calculate time until expiry during trading day
  const getTimeToExpiry = (currentTime: string, tradingDate: string) => {
    const now = new Date(`${tradingDate} ${currentTime}`);
    const marketClose = new Date(`${tradingDate} 16:00:00`); // 4 PM EST
    const msLeft = marketClose.getTime() - now.getTime();
    const hoursLeft = Math.max(0, msLeft / (1000 * 60 * 60));
    return hoursLeft;
  };

  const scanOptionsForDay = async () => {
    if (!ticker || !apiKey || !selectedDay) return;
    
    setScanning(true);
    try {
      // Load minute data for the selected volatile day
      const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/minute/${selectedDay.date}/${selectedDay.date}?adjusted=true&sort=asc&apikey=${apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK' && data.results) {
        // Analyze for option opportunities
        const minuteData = data.results.map((item: any) => ({
          timestamp: new Date(item.t),
          close: item.c,
          volume: item.v
        }));

        const opportunities: OptionOpportunity[] = [];
        const strikePrice = Math.round(selectedDay.openPrice);

        // Look for profitable entry/exit points
        for (let i = 30; i < minuteData.length - 30; i++) { // Skip first/last 30 minutes
          const entry = minuteData[i];
          
          for (let j = i + 1; j <= Math.min(i + 60, minuteData.length - 1); j++) { // Max 1 hour hold
            const exit = minuteData[j];
            const stockMove = exit.close - entry.close;
            const holdMinutes = j - i;
            
            // Calculate option profit for both CALLS and PUTS
            const callProfit = selectedDay.direction === 'UP' && stockMove > 0.05 ? stockMove * 15 : 0;
            const putProfit = selectedDay.direction === 'DOWN' && stockMove < -0.05 ? Math.abs(stockMove) * 15 : 0;
            
            if (callProfit > 10) {
              opportunities.push({
                strike: strikePrice,
                type: 'CALL',
                entryPrice: 0.50,
                exitPrice: 0.50 + (stockMove * 15 / 100),
                entryTime: entry.timestamp.toLocaleTimeString("en-US", {timeZone: "America/New_York"}),
                exitTime: exit.timestamp.toLocaleTimeString("en-US", {timeZone: "America/New_York"}),
                profit: callProfit,
                profitPercent: (callProfit / 50) * 100,
                holdMinutes: holdMinutes
              });
            }
            
            if (putProfit > 10) {
              opportunities.push({
                strike: strikePrice,
                type: 'PUT',
                entryPrice: 0.50,
                exitPrice: 0.50 + (Math.abs(stockMove) * 15 / 100),
                entryTime: entry.timestamp.toLocaleTimeString("en-US", {timeZone: "America/New_York"}),
                exitTime: exit.timestamp.toLocaleTimeString("en-US", {timeZone: "America/New_York"}),
                profit: putProfit,
                profitPercent: (putProfit / 50) * 100,
                holdMinutes: holdMinutes
              });
            }
          }
        }
        
        // Sort by profit and take top opportunities
        setOpportunities(opportunities.sort((a, b) => b.profit - a.profit).slice(0, 20));
      }
      
    } catch (error) {
      console.error('Options scan error:', error);
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    scanOptionsForDay();
  }, [selectedDay, ticker, apiKey]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-orange-400">
          💰 Option Opportunities
        </h3>
        <button
          onClick={scanOptionsForDay}
          disabled={scanning}
          className="btn-success text-xs py-1 px-2"
        >
          {scanning ? '🔄' : '🔍'} Scan
        </button>
      </div>

      {/* Day Info with Expiry Details */}
      <div className="bg-gray-600 rounded-lg p-4 mb-4">
        <div className="text-center mb-3">
          <h4 className="text-orange-400 font-bold text-lg">
            🔥 0DTE Options Analysis
          </h4>
          <p className="text-xs text-gray-300 mt-1">
            All options expire SAME DAY at 4:00 PM EST
          </p>
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-300">📅 Trading Date:</span>
            <span className="text-white font-bold">
              {new Date(selectedDay.date).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
              })}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-300">⏰ Expiry Date:</span>
            <span className="text-red-400 font-bold">
              {selectedDay.date} 4:00 PM EST
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-300">📊 Stock Move:</span>
            <span className={`font-bold ${selectedDay.direction === 'UP' ? 'text-green-400' : 'text-red-400'}`}>
              {selectedDay.movePercent.toFixed(1)}% {selectedDay.direction} (${selectedDay.moveAmount.toFixed(2)})
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-300">🎯 Strike Focus:</span>
            <span className="text-orange-400 font-bold">
              ${Math.round(selectedDay.openPrice)} (ATM at open)
            </span>
          </div>
        </div>
      </div>

      {/* Contracts Input */}
      <div className="bg-gray-600 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-300">Position Size:</span>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={contracts}
              onChange={(e) => setContracts(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              max="100"
              className="input-field w-16 text-center text-sm py-1 px-1"
            />
            <span className="text-gray-300 text-sm">contracts</span>
          </div>
        </div>
      </div>

      {/* Opportunities List */}
      <div className="flex-1 overflow-y-auto">
        {opportunities.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{scanning ? 'Scanning for opportunities...' : 'No profitable opportunities found'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {opportunities.map((opp, index) => {
              const isSelected = selectedOption?.strike === opp.strike && selectedOption?.type === opp.type;
              
              return (
                <div
                  key={index}
                  onClick={() => {
                    // Lock in this specific option for navigation
                    onOptionSelect?.({
                      strike: opp.strike,
                      type: opp.type,
                      expiryDate: selectedDay.date, // Same day expiry for 0DTE
                      originalTradingDay: selectedDay.date
                    });
                  }}
                  className={`bg-gray-600 rounded-lg p-3 border-l-4 ${
                    opp.type === 'CALL' ? 'border-green-400' : 'border-red-400'
                  } hover:bg-gray-500 transition-colors cursor-pointer ${
                    isSelected ? 'ring-2 ring-orange-400 bg-orange-400/10' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="bg-gray-500 text-white text-xs px-2 py-1 rounded">
                        #{index + 1}
                      </span>
                      <span className={`font-bold text-sm ${
                        opp.type === 'CALL' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {opp.type}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-green-400 font-bold">
                        +${(opp.profit * contracts).toFixed(0)}
                      </div>
                      <div className="text-xs text-gray-400">
                        {opp.profitPercent.toFixed(0)}% gain
                      </div>
                    </div>
                  </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-gray-300 mb-2">
                  <div>Entry: ${opp.entryPrice.toFixed(2)}</div>
                  <div>Exit: ${opp.exitPrice.toFixed(2)}</div>
                  <div>Time: {opp.entryTime}</div>
                  <div>Hold: {opp.holdMinutes}m</div>
                </div>

                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div className="text-gray-400">
                    🎯 ${opp.strike} Strike
                  </div>
                  <div className="text-gray-400">
                    💳 ${(opp.entryPrice * contracts * 100).toFixed(0)} cost
                  </div>
                  <div className="text-red-400 font-bold">
                    ⏰ Expires: {selectedDay.date} 4PM
                  </div>
                  <div className="text-orange-400">
                    ⚡ {getTimeToExpiry(opp.entryTime, selectedDay.date).toFixed(1)}h until worthless
                  </div>
                </div>
                
                  {isSelected && (
                    <div className="mt-2 pt-2 border-t border-orange-400/30">
                      <p className="text-orange-400 text-xs font-bold text-center">
                        🔒 LOCKED: This exact option will show when navigating days
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedScanner;