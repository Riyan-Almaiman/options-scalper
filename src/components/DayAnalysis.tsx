import { useState, useEffect } from 'react';
import { BarChart3, ArrowLeft, ArrowRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface VolatileDay {
  date: string;
  movePercent: number;
  moveAmount: number;
  direction: 'UP' | 'DOWN';
  volume: number;
  openPrice: number;
  closePrice: number;
}

interface SelectedOption {
  strike: number;
  type: 'CALL' | 'PUT';
  expiryDate: string;
  currentViewDate: string;
}

interface DayAnalysisProps {
  ticker: string;
  apiKey: string;
  volatileDay: VolatileDay;
  selectedOption: SelectedOption | null;
  onOptionSelect: (strike: number, type: 'CALL' | 'PUT', expiryDate: string) => void;
}

const DayAnalysis: React.FC<DayAnalysisProps> = ({ 
  ticker, 
  apiKey, 
  volatileDay, 
  selectedOption, 
  onOptionSelect 
}) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewingDate, setViewingDate] = useState(volatileDay.date);
  const [availableOptions, setAvailableOptions] = useState<any[]>([]);
  const [contracts, setContracts] = useState(1);
  const [chartMode, setChartMode] = useState<'stock' | 'option'>('stock');

  // Load minute data for any specific date
  const loadDayData = async (targetDate: string) => {
    if (!ticker || !apiKey) return;
    
    setLoading(true);
    try {
      const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/minute/${targetDate}/${targetDate}?adjusted=true&sort=asc&apikey=${apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status !== 'OK' && data.status !== 'DELAYED') {
        throw new Error('No data available');
      }
      
      if (!data.results || data.results.length === 0) {
        setChartData([]);
        return;
      }
      
      const minuteData = data.results.map((item: any) => ({
        timestamp: new Date(item.t),
        close: item.c,
        volume: item.v,
      }));

      // Filter for market hours
      const marketData = minuteData.filter((item: any) => {
        const easternTime = new Date(item.timestamp.toLocaleString("en-US", {timeZone: "America/New_York"}));
        const hour = easternTime.getHours();
        const minute = easternTime.getMinutes();
        const currentTime = hour * 60 + minute;
        return currentTime >= 570 && currentTime < 960;
      });

      // Create chart data based on what we want to show
      const chartPoints = marketData.map((item: any) => {
        const time = item.timestamp.toLocaleTimeString("en-US", {
          timeZone: "America/New_York",
          hour: 'numeric',
          minute: '2-digit'
        });
        
        
        // Check if we want to show option prices (not just that option is selected)
        if (chartMode === 'option' && selectedOption) {
          // Calculate option price for the specific selected option
          const intrinsicValue = selectedOption.type === 'CALL' 
            ? Math.max(0, item.close - selectedOption.strike)
            : Math.max(0, selectedOption.strike - item.close);
          
          // Days until expiry calculation
          const currentDate = new Date(targetDate);
          const expiryDate = new Date(selectedOption.expiryDate);
          const daysToExpiry = Math.max(0, Math.floor((expiryDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)));
          
          // Realistic time value calculation
          let timeValue = 0;
          if (daysToExpiry === 0) {
            // 0DTE - very low time value, decays fast
            const minutesIntoDay = marketData.indexOf(item);
            const totalMinutes = marketData.length || 390;
            const timeProgress = minutesIntoDay / totalMinutes;
            
            // Distance from strike affects time value
            const distanceFromStrike = Math.abs(item.close - selectedOption.strike);
            const baseTimeValue = Math.max(0.02, 0.10 - distanceFromStrike * 0.01);
            timeValue = baseTimeValue * Math.max(0.01, 1 - timeProgress * 2); // Fast decay
          } else if (daysToExpiry > 0) {
            // Multi-day options have more time value
            const baseTimeValue = Math.sqrt(daysToExpiry / 365) * 0.15;
            const distanceFromStrike = Math.abs(item.close - selectedOption.strike);
            timeValue = baseTimeValue * Math.max(0.3, 1 - distanceFromStrike * 0.02);
          }
          
          return {
            time,
            price: Math.max(0.01, intrinsicValue + timeValue),
            stockPrice: item.close,
            volume: item.volume,
            daysToExpiry,
            expired: daysToExpiry < 0
          };
        }
        
        // Stock price mode
        return {
          time,
          price: item.close,
          volume: item.volume
        };
      });

      setChartData(chartPoints);
      
    } catch (error) {
      alert(`❌ Error: ${(error as Error).message}`);
      setChartData([]);
    } finally {
      setLoading(false);
    }
  };

  // Generate available option strikes for the original volatile day
  useEffect(() => {
    const strikes = [];
    const basePrice = volatileDay.openPrice;
    
    // Generate strikes around the opening price
    for (let i = -10; i <= 10; i++) {
      const strike = Math.round(basePrice) + i;
      if (strike > 0) {
        strikes.push({
          strike,
          callProfit: volatileDay.direction === 'UP' ? volatileDay.moveAmount * 15 : 0,
          putProfit: volatileDay.direction === 'DOWN' ? volatileDay.moveAmount * 15 : 0
        });
      }
    }
    
    setAvailableOptions(strikes);
  }, [volatileDay]);

  // Load data when component mounts or viewing date changes (NOT when contracts change)
  useEffect(() => {
    loadDayData(viewingDate);
  }, [viewingDate, ticker, apiKey, chartMode]);
  
  // Separate effect for when option selection changes
  useEffect(() => {
    if (selectedOption) {
      loadDayData(viewingDate);
    }
  }, [selectedOption?.strike, selectedOption?.type]);

  const navigateDay = (offset: number) => {
    if (!selectedOption) return;
    
    const newDate = new Date(viewingDate);
    newDate.setDate(newDate.getDate() + offset);
    
    // Can't go past expiry date for 0DTE options
    const expiryDate = new Date(selectedOption.expiryDate);
    if (newDate > expiryDate) {
      alert('❌ Cannot view days after option expiry');
      return;
    }
    
    // Skip weekends
    const dayOfWeek = newDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      alert('❌ Skipping weekend - no market data');
      return;
    }
    
    setViewingDate(newDate.toISOString().split('T')[0]);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-green-400 font-semibold">{label}</p>
          <p className="text-white">
            {chartMode === 'option' ? 'Option' : 'Stock'} Price: <span className="font-bold">${payload[0].value.toFixed(2)}</span>
          </p>
          {chartMode === 'option' && data.stockPrice && (
            <p className="text-blue-400">Stock Price: <span className="font-bold">${data.stockPrice.toFixed(2)}</span></p>
          )}
          {selectedOption && data.daysToExpiry !== undefined && (
            <p className={`text-sm ${data.daysToExpiry === 0 ? 'text-red-400' : 'text-orange-400'}`}>
              {data.daysToExpiry === 0 ? '🔥 0DTE' : `📅 ${data.daysToExpiry} days to expiry`}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-full flex">
      
      {/* Chart Area */}
      <div className="flex-1 p-4 flex flex-col">
        
        {/* Chart Header */}
        <div className="bg-gray-700 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-green-400">
                {ticker} {selectedOption 
                  ? `${selectedOption.type} $${selectedOption.strike} Strike`
                  : 'Stock Chart'
                }
              </h2>
              <div className="flex items-center space-x-4 text-sm mt-1">
                <span className="text-gray-400">
                  📅 Viewing: {new Date(viewingDate).toLocaleDateString()}
                </span>
                {selectedOption && (
                  <>
                    <span className="text-orange-400 font-bold">
                      🎯 Expires: {selectedOption.expiryDate}
                    </span>
                    {(() => {
                      const currentDate = new Date(viewingDate);
                      const expiryDate = new Date(selectedOption.expiryDate);
                      const daysLeft = Math.floor((expiryDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
                      
                      if (daysLeft === 0) {
                        return <span className="text-red-400 font-bold">🔥 0DTE (EXPIRES TODAY)</span>;
                      } else if (daysLeft > 0) {
                        return <span className="text-blue-400 font-bold">📅 {daysLeft} days to expiry</span>;
                      } else {
                        return <span className="text-red-600 font-bold">💀 EXPIRED</span>;
                      }
                    })()}
                  </>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setChartMode('stock');
                  loadDayData(viewingDate); // Reload with stock mode
                }}
                className={`px-3 py-1 rounded text-sm ${
                  chartMode === 'stock' ? 'bg-green-400 text-black' : 'bg-gray-600 text-white hover:bg-gray-500'
                }`}
              >
                📈 Stock Price
              </button>
              <button
                onClick={() => {
                  setChartMode('option');
                  loadDayData(viewingDate); // Reload with option mode
                }}
                disabled={!selectedOption}
                className={`px-3 py-1 rounded text-sm ${
                  chartMode === 'option' && selectedOption ? 'bg-orange-400 text-black' : 'bg-gray-600 text-gray-400'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                🔶 Option Price
              </button>
            </div>
          </div>
        </div>

        {/* Date Navigation - Only when option selected */}
        {selectedOption && (
          <div className="bg-gray-700 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={() => navigateDay(-1)}
                disabled={loading}
                className="flex items-center px-3 py-1 bg-gray-600 rounded hover:bg-gray-500 disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Previous Day
              </button>
              
              <input
                type="date"
                value={viewingDate}
                max={selectedOption.expiryDate} // Can't go past expiry
                onChange={(e) => setViewingDate(e.target.value)}
                className="input-field text-center py-1 px-2"
              />
              
              <button
                onClick={() => navigateDay(1)}
                disabled={loading || viewingDate >= selectedOption.expiryDate}
                className="flex items-center px-3 py-1 bg-gray-600 rounded hover:bg-gray-500 disabled:opacity-50"
              >
                Next Day
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
            
            <p className="text-center text-xs text-gray-400 mt-2">
              ⚠️ Can only view days before/on expiry date ({selectedOption.expiryDate})
            </p>
          </div>
        )}

        {/* Chart */}
        <div className="flex-1 bg-gray-800 rounded-lg p-2">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{loading ? 'Loading chart...' : 'No data available'}</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                <YAxis 
                  tick={{ fontSize: 11, fill: '#9CA3AF' }} 
                  tickFormatter={(value) => `$${value.toFixed(2)}`}
                  domain={chartMode === 'stock' ? ['dataMin - 2', 'dataMax + 2'] : ['dataMin - 0.1', 'dataMax + 0.1']}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="price" 
                  stroke={chartMode === 'option' ? "#F97316" : "#10B981"} 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Option Selection Sidebar */}
      <div className="w-80 bg-gray-700 p-4 border-l border-gray-600 flex flex-col">
        
        {/* Header with Contracts Input Inline */}
        <div className="bg-gray-600 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-green-400 font-bold text-lg">⚡ 0DTE Options</h3>
              <p className="text-xs text-orange-400">Expires {volatileDay.date} 4PM</p>
            </div>
            {selectedOption && (
              <div className="text-right">
                <div className="text-xs text-gray-400 mb-1">Contracts:</div>
                <input
                  type="number"
                  value={contracts}
                  onChange={(e) => setContracts(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  max="100"
                  className="input-field w-16 text-center font-bold text-sm py-1 px-1"
                />
              </div>
            )}
          </div>
        </div>

        {/* Full Height Options List */}
        <div className="flex-1 bg-gray-600 rounded-lg overflow-hidden">
          <div className="h-full overflow-y-auto p-3 space-y-1">
              {availableOptions.map((opt) => {
                const isAtm = Math.abs(opt.strike - volatileDay.openPrice) < 2;
                const hasCallProfit = opt.callProfit > 10;
                const hasPutProfit = opt.putProfit > 10;
                
                return (
                  <div key={opt.strike} className={`bg-gray-700 rounded-lg p-4 ${isAtm ? 'border-l-4 border-yellow-400' : ''}`}>
                    
                    {/* Strike Price Header */}
                    <div className="text-center mb-3">
                      <div className="text-white font-bold text-xl">
                        ${opt.strike} Strike
                      </div>
                      {isAtm && (
                        <div className="text-yellow-400 text-sm font-bold">
                          🎯 AT THE MONEY
                        </div>
                      )}
                      <div className="text-gray-400 text-xs">
                        {Math.abs(opt.strike - volatileDay.openPrice) < 0.5 ? 'ATM' : 
                         opt.strike > volatileDay.openPrice ? 'OTM' : 'ITM'}
                      </div>
                    </div>

                    {/* CALL Option Row */}
                    <div
                      onClick={() => onOptionSelect(opt.strike, 'CALL', volatileDay.date)}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all mb-2 ${
                        selectedOption?.strike === opt.strike && selectedOption?.type === 'CALL'
                          ? 'bg-green-400/20 border border-green-400' 
                          : hasCallProfit ? 'bg-green-400/10 hover:bg-green-400/20' : 'bg-gray-800 hover:bg-gray-750'
                      }`}
                    >
                      <div className="flex items-center">
                        <span className="text-green-400 font-bold mr-3">📈 CALL</span>
                        <div className="text-sm text-gray-300">
                          ${(() => {
                            // Calculate realistic entry price for this CALL
                            const intrinsic = Math.max(0, volatileDay.openPrice - opt.strike);
                            const timeVal = 0.05 + Math.max(0, 0.15 - Math.abs(volatileDay.openPrice - opt.strike) * 0.02);
                            const entryPrice = intrinsic + timeVal;
                            const targetPrice = entryPrice + 0.20;
                            return `Entry: $${entryPrice.toFixed(2)} • Target: $${targetPrice.toFixed(2)}`;
                          })()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${hasCallProfit ? 'text-green-400' : 'text-gray-400'}`}>
                          {hasCallProfit ? `+$${(opt.callProfit * contracts).toFixed(0)}` : '$0'}
                        </div>
                        <div className="text-xs text-gray-400">
                          {contracts} contract{contracts > 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>

                    {/* PUT Option Row */}
                    <div
                      onClick={() => onOptionSelect(opt.strike, 'PUT', volatileDay.date)}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                        selectedOption?.strike === opt.strike && selectedOption?.type === 'PUT'
                          ? 'bg-red-400/20 border border-red-400' 
                          : hasPutProfit ? 'bg-red-400/10 hover:bg-red-400/20' : 'bg-gray-800 hover:bg-gray-750'
                      }`}
                    >
                      <div className="flex items-center">
                        <span className="text-red-400 font-bold mr-3">📉 PUT</span>
                        <div className="text-sm text-gray-300">
                          ${(() => {
                            // Calculate realistic entry price for this PUT
                            const intrinsic = Math.max(0, opt.strike - volatileDay.openPrice);
                            const timeVal = 0.05 + Math.max(0, 0.15 - Math.abs(volatileDay.openPrice - opt.strike) * 0.02);
                            const entryPrice = intrinsic + timeVal;
                            const targetPrice = entryPrice + 0.20;
                            return `Entry: $${entryPrice.toFixed(2)} • Target: $${targetPrice.toFixed(2)}`;
                          })()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${hasPutProfit ? 'text-red-400' : 'text-gray-400'}`}>
                          {hasPutProfit ? `+$${(opt.putProfit * contracts).toFixed(0)}` : '$0'}
                        </div>
                        <div className="text-xs text-gray-400">
                          {contracts} contract{contracts > 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
        </div>
      </div>
    </div>
  );
};

export default DayAnalysis;