import React, { useState } from 'react';
import {  Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,  Bar, ComposedChart } from 'recharts';
import { BarChart3} from 'lucide-react';

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

interface PriceChartProps {
  data: StockData[];
  ticker: string;
  patterns: Pattern[];
  selectedPattern?: Pattern | null;
  contractsCount?: number;
  apiKey?: string;
  selectedDate?: string;
}

const PriceChart: React.FC<PriceChartProps> = ({ data, ticker, selectedPattern, contractsCount = 1, apiKey, selectedDate }) => {
  const [showVolume, setShowVolume] = useState(true);
  const [viewMode, setViewMode] = useState<'stock' | 'option' | 'multi-day'>('stock');
  const [currentViewDate, setCurrentViewDate] = useState<string>('');
  const [multiDayData, setMultiDayData] = useState<StockData[]>([]);

  const loadDifferentDay = async (dayOffset: number) => {
    if (!selectedPattern || !apiKey || !selectedDate) return;
    
    try {
      // Calculate the target date
      const baseDate = new Date(selectedDate);
      baseDate.setDate(baseDate.getDate() + dayOffset);
      const targetDate = baseDate.toISOString().split('T')[0];
      
      // Check if it's a weekend (skip)
      const dayOfWeek = baseDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        alert('❌ Weekend selected - no market data');
        return;
      }
      
      setCurrentViewDate(targetDate);
      
      // Fetch data for that specific day
      const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/minute/${targetDate}/${targetDate}?adjusted=true&sort=asc&apikey=${apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status !== 'OK' && data.status !== 'DELAYED') {
        throw new Error('No data for this date');
      }
      
      if (!data.results || data.results.length === 0) {
        alert('❌ No trading data for this date');
        return;
      }
      
      // Process the new day's data
      const newDayData = data.results.map((item: any) => ({
        timestamp: new Date(item.t),
        open: item.o,
        high: item.h,
        low: item.l,
        close: item.c,
        volume: item.v,
      }));
      
      // Filter for market hours
      const marketHoursData = newDayData.filter((item: any) => {
        const easternTime = new Date(item.timestamp.toLocaleString("en-US", {timeZone: "America/New_York"}));
        const hour = easternTime.getHours();
        const minute = easternTime.getMinutes();
        const currentTime = hour * 60 + minute;
        
        return currentTime >= 570 && currentTime < 960; // 9:30 AM - 4:00 PM
      });
      
      setMultiDayData(marketHoursData);
      console.log(`Loaded ${marketHoursData.length} data points for ${targetDate}`);
      
    } catch (error) {
      alert(`❌ Error loading ${(error as Error).message}`);
    } finally {
    }
  };

  // Prepare chart data - if pattern selected, show option price simulation
  const getChartData = () => {
    if (viewMode === 'option' && selectedPattern) {
      console.log('Showing option simulation for:', selectedPattern);
      
      // Use ALL available stock data and simulate option prices for the full day
      const strikePrice = Math.round(selectedPattern.entryPrice);
      const startingOptionPrice = 0.50; // Typical 0DTE starting price
      
      // Simulate option prices for the entire day's data
      return data.map((item, index) => {
        // Calculate intrinsic value
        const intrinsicValue = selectedPattern.direction === 'CALL' 
          ? Math.max(0, item.close - strikePrice)
          : Math.max(0, strikePrice - item.close);
        
        // Simple time value that decays throughout the day
        const totalMinutes = data.length;
        const timeDecayFactor = Math.max(0.1, 1 - (index / totalMinutes));
        const timeValue = startingOptionPrice * timeDecayFactor * 0.5;
        
        // Delta effect - how much option moves per $1 stock move
        const stockMoveFromStrike = Math.abs(item.close - strikePrice);
        const delta = Math.max(0.1, Math.min(0.9, 1 - stockMoveFromStrike / 10));
        
        const optionPrice = intrinsicValue + timeValue + (delta * 0.1);
        
        return {
          time: item.timestamp.toLocaleString("en-US", {
            timeZone: "America/New_York",
            hour: 'numeric',
            minute: '2-digit'
          }),
          price: Math.max(0.01, optionPrice),
          stockPrice: item.close,
          volume: item.volume,
          index: index
        };
      });
    }
    
    if (viewMode === 'multi-day' && selectedPattern) {
      // Use multiDayData if available, otherwise current data
      const dataToUse = multiDayData.length > 0 ? multiDayData : data;
      const strikePrice = Math.round(selectedPattern.entryPrice);
      
      return dataToUse.map((item, index) => {
        const intrinsicValue = selectedPattern.direction === 'CALL' 
          ? Math.max(0, item.close - strikePrice)
          : Math.max(0, strikePrice - item.close);
        
        const timeDecayFactor = Math.max(0.1, 1 - (index / dataToUse.length));
        const timeValue = 0.50 * timeDecayFactor;
        const optionPrice = intrinsicValue + timeValue;
        
        return {
          time: item.timestamp.toLocaleString("en-US", {
            timeZone: "America/New_York",
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          }),
          price: Math.max(0.01, optionPrice),
          stockPrice: item.close,
          volume: item.volume,
          index: index
        };
      });
    }
    
    // Default stock price chart - show ALL data for single day
    console.log(`Chart showing ${data.length} total data points`);
    console.log('First:', data[0]?.timestamp);
    console.log('Last:', data[data.length - 1]?.timestamp);
    
    return data.map((item, index) => ({
      time: item.timestamp.toLocaleString("en-US", {
        timeZone: "America/New_York",
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      }),
      price: item.close,
      volume: item.volume,
      high: item.high,
      low: item.low,
      index: index
    }));
  };

  const chartData = getChartData();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-green-400 font-semibold">{label}</p>
          <p className="text-white">
            {viewMode === 'option' ? 'Option' : 'Stock'} Price: 
            <span className="font-bold"> ${payload[0].value.toFixed(2)}</span>
          </p>
          {viewMode === 'option' && payload[0].payload?.stockPrice && (
            <p className="text-blue-400">
              Stock Price: <span className="font-bold">${payload[0].payload.stockPrice.toFixed(2)}</span>
            </p>
          )}
          {showVolume && payload[1] && (
            <p className="text-orange-400">
              Volume: <span className="font-bold">{payload[1].value.toLocaleString()}</span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };



  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <BarChart3 className="w-5 h-5 mr-2 text-green-400" />
          <h3 className="text-lg font-semibold text-green-400">
            {viewMode === 'option' && selectedPattern 
              ? `${contractsCount}x ${ticker} ${selectedPattern.direction} ${Math.round(selectedPattern.entryPrice)} Strike`
              : `${ticker} Stock Price`
            }
          </h3>
          {selectedPattern && viewMode === 'option' && (
            <span className="ml-2 text-xs bg-green-400 text-black px-2 py-1 rounded">
              ${contractsCount}x contracts = ${(selectedPattern.estimatedProfit * contractsCount).toFixed(0)} total profit
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('stock')}
            className={`px-3 py-1 rounded text-xs ${
              viewMode === 'stock' ? 'bg-green-400 text-black' : 'bg-gray-800 text-gray-400'
            }`}
          >
            📈 Stock Price
          </button>
          
          <button
            onClick={() => setViewMode('option')}
            disabled={!selectedPattern}
            className={`px-3 py-1 rounded text-xs ${
              viewMode === 'option' && selectedPattern ? 'bg-orange-400 text-black' : 'bg-gray-800 text-gray-400'
            } disabled:opacity-50`}
          >
            💰 Option (This Day)
          </button>
          
          <button
            onClick={() => setViewMode('multi-day')}
            disabled={!selectedPattern}
            className={`px-3 py-1 rounded text-xs ${
              viewMode === 'multi-day' && selectedPattern ? 'bg-purple-400 text-black' : 'bg-gray-800 text-gray-400'
            } disabled:opacity-50`}
          >
            📊 Multi-Day Pattern
          </button>
          
          <button
            onClick={() => setShowVolume(!showVolume)}
            className={`px-3 py-1 rounded text-xs ${
              showVolume ? 'bg-blue-400 text-black' : 'bg-gray-800 text-gray-400'
            }`}
          >
            Volume
          </button>
        </div>
      </div>

      {/* Day Navigation for Multi-Day View */}
      {viewMode === 'multi-day' && selectedPattern && (
        <div className="mb-4 p-3 bg-gray-700 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400">Navigate Days:</span>
              <button
                onClick={() => loadDifferentDay(-7)}
                className="px-2 py-1 bg-gray-600 rounded text-xs hover:bg-gray-500"
              >
                ← 1 Week Before
              </button>
              <button
                onClick={() => loadDifferentDay(-1)}
                className="px-2 py-1 bg-gray-600 rounded text-xs hover:bg-gray-500"
              >
                ← Previous Day
              </button>
              <button
                onClick={() => loadDifferentDay(1)}
                className="px-2 py-1 bg-gray-600 rounded text-xs hover:bg-gray-500"
              >
                Next Day →
              </button>
              <button
                onClick={() => loadDifferentDay(7)}
                className="px-2 py-1 bg-gray-600 rounded text-xs hover:bg-gray-500"
              >
                1 Week After →
              </button>
            </div>
            <div className="text-sm text-purple-400 font-bold">
              Viewing: {currentViewDate || selectedDate}
            </div>
          </div>
        </div>
      )}

      {chartData.length === 0 ? (
        <div className="h-96 flex items-center justify-center text-gray-400 bg-gray-800 rounded-lg">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No chart data available</p>
          </div>
        </div>
      ) : (
        <div className="h-96 bg-gray-800 rounded-lg p-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 12, fill: '#9CA3AF' }}
                interval="preserveStartEnd"
              />
              <YAxis 
                yAxisId="price"
                orientation="left"
                tick={{ fontSize: 12, fill: '#9CA3AF' }}
                domain={['dataMin - 0.5', 'dataMax + 0.5']}
                tickFormatter={(value) => `$${value.toFixed(2)}`}
              />
              {showVolume && (
                <YAxis 
                  yAxisId="volume"
                  orientation="right"
                  tick={{ fontSize: 12, fill: '#9CA3AF' }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                />
              )}
              <Tooltip content={<CustomTooltip />} />
              
              <Line 
                yAxisId="price"
                type="monotone" 
                dataKey="price" 
                stroke={viewMode === 'option' ? "#F97316" : "#10B981"} 
                strokeWidth={3}
                dot={false}
                connectNulls={false}
              />
              
              {showVolume && (
                <Bar 
                  yAxisId="volume"
                  dataKey="volume" 
                  fill="#F97316"
                  opacity={0.4}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-2xl font-bold text-green-400">
            {chartData.length}
          </div>
          <div className="text-xs text-gray-400">Data Points</div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-2xl font-bold text-green-400">
            ${chartData.length > 0 ? chartData[chartData.length - 1]?.price.toFixed(2) : '0.00'}
          </div>
          <div className="text-xs text-gray-400">Current Price</div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="text-2xl font-bold text-green-400">
            {new Set(data.map(d => d.timestamp.toDateString())).size}
          </div>
          <div className="text-xs text-gray-400">Trading Days</div>
        </div>
      </div>
    </div>
  );
};

export default PriceChart;