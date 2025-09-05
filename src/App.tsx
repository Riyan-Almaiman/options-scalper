import { useState } from 'react';

import PriceChart from './components/PriceChart';
import SimplePatternList from './components/SimplePatternList';
import NewsFeed from './components/NewsFeed';

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

function App() {
  const [selectedTicker, setSelectedTicker] = useState('');
  const [apiKey, setApiKey] = useState(() => {
    // Load saved API key from localStorage
    return localStorage.getItem('polygonApiKey') || '';
  });
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState<Pattern | null>(null);
  const [contractsCount, setContractsCount] = useState(1);
  const [selectedDate, setSelectedDate] = useState(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  });

  return (
    <div className="min-h-screen bg-gray-800 text-white flex">
      
      {/* Left Column - Main Trading Interface */}
      <div className="flex-1 p-4">
        
        {/* Simple Top Bar */}
        <div className="flex items-center justify-between mb-6 bg-gray-700 rounded-lg p-4">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-green-400">⚡ 0DTE Scalper</h1>
            
            {/* Quick Setup */}
            <div className="flex items-center space-x-3">
              <select 
                value={selectedTicker}
                onChange={(e) => setSelectedTicker(e.target.value)}
                className="input-field text-sm py-2 px-3"
              >
                <option value="">Select Ticker</option>
                <option value="SPY">SPY</option>
                <option value="QQQ">QQQ</option>
                <option value="AAPL">AAPL</option>
                <option value="TSLA">TSLA</option>
                <option value="NVDA">NVDA</option>
              </select>
              
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="input-field text-sm py-2 px-3"
              />
              
              <div className="relative">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => {
                    const newKey = e.target.value;
                    setApiKey(newKey);
                    // Auto-save to localStorage
                    if (newKey) {
                      localStorage.setItem('polygonApiKey', newKey);
                    } else {
                      localStorage.removeItem('polygonApiKey');
                    }
                  }}
                  placeholder={apiKey ? "API Key Saved ✓" : "Enter API Key"}
                  className="input-field text-sm py-2 px-3 w-32 pr-8"
                />
                {apiKey && (
                  <button
                    onClick={() => {
                      setApiKey('');
                      localStorage.removeItem('polygonApiKey');
                    }}
                    className="absolute right-1 top-1 bg-red-400 text-black text-xs px-1 py-1 rounded hover:bg-red-300"
                    title="Clear saved API key"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={async () => {
              if (!selectedTicker || !apiKey) {
                alert('❌ Select ticker and enter API key');
                return;
              }
              
              setIsLoading(true);
              try {
                // Load historical data for SINGLE DAY only
                const url = `https://api.polygon.io/v2/aggs/ticker/${selectedTicker}/range/1/minute/${selectedDate}/${selectedDate}?adjusted=true&sort=asc&apikey=${apiKey}`;
                
                const response = await fetch(url);
                const data = await response.json();
                
                if (data.status !== 'OK' && data.status !== 'DELAYED') {
                  throw new Error(data.error || 'Failed to load data');
                }
                
                if (!data.results || data.results.length === 0) {
                  throw new Error('No data available for this period');
                }
                
                // Process and filter data
                const allData = data.results.map((item: any) => ({
                  timestamp: new Date(item.t),
                  open: item.o,
                  high: item.h,
                  low: item.l,
                  close: item.c,
                  volume: item.v,
                }));

                // Filter for market hours only
                const marketHoursData = allData.filter((item: any) => {
                  const easternTime = new Date(item.timestamp.toLocaleString("en-US", {timeZone: "America/New_York"}));
                  const hour = easternTime.getHours();
                  const minute = easternTime.getMinutes();
                  const currentTime = hour * 60 + minute;
                  
                  return currentTime >= 570 && currentTime < 960; // 9:30 AM - 4:00 PM
                });

                console.log(`Total data points: ${allData.length}`);
                console.log(`Market hours data: ${marketHoursData.length}`);
                console.log('First data point:', marketHoursData[0]?.timestamp);
                console.log('Last data point:', marketHoursData[marketHoursData.length - 1]?.timestamp);

                setStockData(marketHoursData);
                
                // Find patterns
                const patterns: any[] = [];
                for (let i = 5; i < marketHoursData.length - 15; i++) {
                  const entry = marketHoursData[i];
                  
                  for (let j = i + 1; j <= Math.min(i + 15, marketHoursData.length - 1); j++) {
                    const exit = marketHoursData[j];
                    const stockMove = Math.abs(exit.close - entry.close);
                    
                    if (stockMove >= 0.10) {
                      const direction = exit.close > entry.close ? 'CALL' : 'PUT';
                      const movePercent = (stockMove / entry.close) * 100;
                      const leverage = movePercent < 0.2 ? 15 : 20;
                      const estimatedProfit = stockMove * leverage;
                      
                      if (estimatedProfit >= 10) {
                        patterns.push({
                          date: entry.timestamp.toDateString(),
                          time: entry.timestamp.toLocaleTimeString("en-US", {timeZone: "America/New_York"}),
                          entryPrice: entry.close,
                          exitPrice: exit.close,
                          stockMove: stockMove,
                          movePercent: movePercent,
                          holdMinutes: j - i,
                          direction: direction,
                          estimatedProfit: estimatedProfit,
                          volume: entry.volume,
                          success: true
                        });
                        break;
                      }
                    }
                  }
                }
                
                setPatterns(patterns.sort((a, b) => b.estimatedProfit - a.estimatedProfit));
                
              } catch (error) {
                alert(`❌ Error: ${(error as Error).message}`);
              } finally {
                setIsLoading(false);
              }
            }}
            disabled={isLoading || !selectedTicker || !apiKey}
            className="btn-primary disabled:opacity-50"
          >
            {isLoading ? '📊 Analyzing...' : '🔍 Find Patterns'}
          </button>
        </div>

        {/* Current Price Display */}
        {stockData.length > 0 && (
          <div className="bg-gray-700 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-white">
                  {selectedTicker} 
                  <span className="text-green-400 ml-2">
                    ${stockData[stockData.length - 1]?.close.toFixed(2)}
                  </span>
                </h2>
                <p className="text-gray-400">
                  Last: {stockData[stockData.length - 1]?.timestamp.toLocaleString("en-US", {
                    timeZone: "America/New_York",
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })} EST
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-400">Volume</div>
                <div className="text-lg font-bold">
                  {stockData[stockData.length - 1]?.volume.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Trading Dashboard */}
        {stockData.length > 0 && (
          <div className="grid grid-cols-3 gap-4 h-[calc(100vh-120px)]">
            
            {/* Left - Chart (Takes up 2 columns) */}
            <div className="col-span-2">
              <PriceChart 
                data={stockData}
                ticker={selectedTicker}
                patterns={patterns}
                selectedPattern={selectedPattern}
                contractsCount={contractsCount}
                apiKey={apiKey}
                selectedDate={selectedDate}
              />
            </div>

            {/* Right - Pattern List (1 column) */}
            <div className="col-span-1">
              {patterns.length > 0 ? (
                <div>
                  {/* Contracts Control - Only when pattern selected */}
                  {selectedPattern && (
                    <div className="bg-gray-700 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-gray-400">Position Size:</div>
                          <div className="flex items-center space-x-2 mt-1">
                            <input
                              type="number"
                              value={contractsCount}
                              onChange={(e) => setContractsCount(Math.max(1, parseInt(e.target.value) || 1))}
                              min="1"
                              max="100"
                              className="input-field text-center font-bold w-20"
                            />
                            <span className="text-gray-400">contracts</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-400">Total Cost:</div>
                          <div className="text-lg font-bold text-orange-400">
                            ${(() => {
                              const strikePrice = Math.round(selectedPattern.entryPrice);
                              const entryIntrinsic = selectedPattern.direction === 'CALL' 
                                ? Math.max(0, selectedPattern.entryPrice - strikePrice)
                                : Math.max(0, strikePrice - selectedPattern.entryPrice);
                              const entryOptionPrice = entryIntrinsic + 0.50;
                              return (entryOptionPrice * contractsCount * 100).toFixed(0);
                            })()}
                          </div>
                          <div className="text-sm text-gray-400">${contractsCount} contracts</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-400">Total Profit:</div>
                          <div className="text-xl font-bold text-green-400">
                            +${(() => {
                              const strikePrice = Math.round(selectedPattern.entryPrice);
                              const entryIntrinsic = selectedPattern.direction === 'CALL' 
                                ? Math.max(0, selectedPattern.entryPrice - strikePrice)
                                : Math.max(0, strikePrice - selectedPattern.entryPrice);
                              const entryOptionPrice = entryIntrinsic + 0.50;
                              
                              const exitIntrinsic = selectedPattern.direction === 'CALL'
                                ? Math.max(0, selectedPattern.exitPrice - strikePrice) 
                                : Math.max(0, strikePrice - selectedPattern.exitPrice);
                              const exitOptionPrice = exitIntrinsic + Math.max(0.05, 0.50 - (selectedPattern.holdMinutes * 0.02));
                              
                              const profitPerContract = (exitOptionPrice - entryOptionPrice) * 100;
                              return (profitPerContract * contractsCount).toFixed(0);
                            })()}
                          </div>
                          <div className="text-sm text-gray-400">
                            {(() => {
                              const strikePrice = Math.round(selectedPattern.entryPrice);
                              const entryIntrinsic = selectedPattern.direction === 'CALL' 
                                ? Math.max(0, selectedPattern.entryPrice - strikePrice)
                                : Math.max(0, strikePrice - selectedPattern.entryPrice);
                              const entryOptionPrice = entryIntrinsic + 0.50;
                              const totalCost = entryOptionPrice * contractsCount * 100;
                              
                              const exitIntrinsic = selectedPattern.direction === 'CALL'
                                ? Math.max(0, selectedPattern.exitPrice - strikePrice) 
                                : Math.max(0, strikePrice - selectedPattern.exitPrice);
                              const exitOptionPrice = exitIntrinsic + Math.max(0.05, 0.50 - (selectedPattern.holdMinutes * 0.02));
                              
                              const profitPerContract = (exitOptionPrice - entryOptionPrice) * 100;
                              const totalProfit = profitPerContract * contractsCount;
                              
                              return ((totalProfit / totalCost) * 100).toFixed(0);
                            })()}% gain
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <SimplePatternList 
                    patterns={patterns}
                    onPatternClick={setSelectedPattern}
                    selectedPattern={selectedPattern}
                    contractsCount={contractsCount}
                  />
                </div>
              ) : (
                <div className="bg-gray-700 rounded-lg p-8 text-center h-full flex items-center justify-center">
                  <div className="text-gray-400">
                    <div className="text-4xl mb-4">🔍</div>
                    <p>No patterns found for this day</p>
                    <p className="text-sm mt-2">Try a more volatile trading day</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {!stockData.length && !isLoading && (
          <div className="bg-gray-700 rounded-lg p-12 text-center">
            <div className="text-gray-400">
              <div className="text-6xl mb-4">📊</div>
              <p className="text-xl">Ready to Find Profitable 0DTE Patterns</p>
              <p className="text-sm mt-2">Select ticker, date, and API key above, then click "Find Patterns"</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Column - News Feed */}
      <div className="w-80 bg-gray-700 border-l border-gray-600">
        <NewsFeed 
          ticker={selectedTicker}
          apiKey={apiKey}
        />
      </div>
    </div>
  );
}

export default App;