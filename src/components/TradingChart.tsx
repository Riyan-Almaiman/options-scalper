import { useState, useEffect } from 'react';
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Bar } from 'recharts';
import { BarChart3, ArrowLeft, ArrowRight, Calendar } from 'lucide-react';

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
  originalTradingDay: string;
}

interface StockData {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TradingChartProps {
  ticker: string;
  selectedDay: VolatileDay;
  apiKey: string;
  viewMode: 'stock' | 'option';
  onViewModeChange: (mode: 'stock' | 'option') => void;
  selectedOption?: SelectedOption | null;
  // onOptionSelect?: (option: SelectedOption) => void;
}

const TradingChart: React.FC<TradingChartProps> = ({ 
  ticker, 
  selectedDay, 
  apiKey, 
  viewMode, 
  onViewModeChange,
  selectedOption
  // onOptionSelect - not used
}) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(selectedDay.date);
  const [showVolume, setShowVolume] = useState(true);

  const loadDayData = async (targetDate: string) => {
    if (!ticker || !apiKey) return;
    
    setLoading(true);
    try {
      const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/minute/${targetDate}/${targetDate}?adjusted=true&sort=asc&apikey=${apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status !== 'OK' && data.status !== 'DELAYED') {
        throw new Error('No data for this date');
      }
      
      if (!data.results || data.results.length === 0) {
        setChartData([]);
        return;
      }
      
      // Process minute data
      const minuteData = data.results.map((item: any) => ({
        timestamp: new Date(item.t),
        open: item.o,
        high: item.h,
        low: item.l,
        close: item.c,
        volume: item.v,
      }));

      // Filter for market hours only
      const marketHoursData = minuteData.filter((item: any) => {
        const easternTime = new Date(item.timestamp.toLocaleString("en-US", {timeZone: "America/New_York"}));
        const hour = easternTime.getHours();
        const minute = easternTime.getMinutes();
        const currentTime = hour * 60 + minute;
        
        return currentTime >= 570 && currentTime < 960; // 9:30 AM - 4:00 PM
      });

      // Prepare chart data
      const chartPoints = marketHoursData.map((item: StockData, index: number) => {
        const timeLabel = item.timestamp.toLocaleTimeString("en-US", {
          timeZone: "America/New_York",
          hour: 'numeric',
          minute: '2-digit'
        });
        
        if (viewMode === 'option' && selectedOption) {
          // Use the SPECIFIC selected option (not changing based on day)
          const intrinsicValue = selectedOption.type === 'CALL' 
            ? Math.max(0, item.close - selectedOption.strike)
            : Math.max(0, selectedOption.strike - item.close);
          
          // Calculate days until expiry
          const viewingDate = new Date(currentDate);
          const expiryDate = new Date(selectedOption.expiryDate);
          const daysUntilExpiry = Math.max(0, (expiryDate.getTime() - viewingDate.getTime()) / (1000 * 60 * 60 * 24));
          
          // Time value based on actual days to expiry
          let timeValue = 0;
          if (daysUntilExpiry === 0) {
            // 0DTE - time value decays throughout the day
            const timeDecayFactor = Math.max(0.05, 1 - (index / marketHoursData.length));
            timeValue = 0.30 * timeDecayFactor; // Lower time value for 0DTE
          } else if (daysUntilExpiry > 0) {
            // Multi-day option - more time value
            timeValue = 0.50 + (daysUntilExpiry * 0.20);
          }
          
          const optionPrice = intrinsicValue + timeValue;
          
          return {
            time: timeLabel,
            price: Math.max(0.01, optionPrice),
            stockPrice: item.close,
            volume: item.volume,
            daysToExpiry: daysUntilExpiry,
            intrinsic: intrinsicValue,
            timeValue: timeValue
          };
        }
        
        // Stock price mode
        return {
          time: timeLabel,
          price: item.close,
          volume: item.volume
        };
      });

      setChartData(chartPoints);
      
    } catch (error) {
      alert(`❌ Error loading ${targetDate}: ${(error as Error).message}`);
      setChartData([]);
    } finally {
      setLoading(false);
    }
  };

  const navigateDay = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + offset);
    
    // Skip weekends
    const dayOfWeek = newDate.getDay();
    if (dayOfWeek === 0) newDate.setDate(newDate.getDate() + 1); // Sunday -> Monday
    if (dayOfWeek === 6) newDate.setDate(newDate.getDate() + 2); // Saturday -> Monday
    
    const newDateStr = newDate.toISOString().split('T')[0];
    setCurrentDate(newDateStr);
    loadDayData(newDateStr);
  };

  // Load data when component mounts or date changes
  useEffect(() => {
    if (currentDate !== selectedDay.date) {
      loadDayData(currentDate);
    } else {
      loadDayData(selectedDay.date);
    }
  }, [currentDate, selectedDay.date, viewMode]);

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
    <div className="h-full bg-gray-700 rounded-lg p-4 flex flex-col">
      
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <BarChart3 className="w-6 h-6 mr-3 text-green-400" />
          <div>
            <h2 className="text-lg font-bold text-green-400">
              {ticker} {viewMode === 'option' && selectedOption
                ? `${selectedOption.type} $${selectedOption.strike} Strike` 
                : 'Stock Price'
              }
            </h2>
            <div className="flex items-center space-x-4 text-sm">
              <span className="text-gray-400">
                📅 Viewing: {new Date(currentDate).toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </span>
              
              {viewMode === 'option' && selectedOption && (
                <>
                  <span className="text-orange-400 font-bold">
                    ⏰ Expires: {selectedOption.expiryDate}
                  </span>
                  
                  {(() => {
                    const viewingDate = new Date(currentDate);
                    const expiryDate = new Date(selectedOption.expiryDate);
                    const daysUntilExpiry = Math.floor((expiryDate.getTime() - viewingDate.getTime()) / (1000 * 60 * 60 * 24));
                    
                    if (daysUntilExpiry === 0) {
                      return <span className="text-red-400 font-bold">🔥 0DTE (EXPIRES TODAY)</span>;
                    } else if (daysUntilExpiry < 0) {
                      return <span className="text-red-600 font-bold">💀 EXPIRED ({Math.abs(daysUntilExpiry)} days ago)</span>;
                    } else {
                      return <span className="text-blue-400 font-bold">📅 {daysUntilExpiry} days until expiry</span>;
                    }
                  })()}
                </>
              )}
              
              <span className={`font-bold ${selectedDay.direction === 'UP' ? 'text-green-400' : 'text-red-400'}`}>
                Original: {selectedDay.movePercent.toFixed(1)}% {selectedDay.direction} Day
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onViewModeChange('stock')}
            className={`px-3 py-1 rounded text-sm ${
              viewMode === 'stock' ? 'bg-green-400 text-black' : 'bg-gray-600 text-white hover:bg-gray-500'
            }`}
          >
            📈 Stock
          </button>
          
          <button
            onClick={() => onViewModeChange('option')}
            className={`px-3 py-1 rounded text-sm ${
              viewMode === 'option' ? 'bg-orange-400 text-black' : 'bg-gray-600 text-white hover:bg-gray-500'
            }`}
          >
            🔶 Option
          </button>
          
          <button
            onClick={() => setShowVolume(!showVolume)}
            className={`px-3 py-1 rounded text-sm ${
              showVolume ? 'bg-blue-400 text-black' : 'bg-gray-600 text-white hover:bg-gray-500'
            }`}
          >
            Volume
          </button>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="mb-4 p-3 bg-gray-600 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Calendar className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-gray-300">Navigate Days:</span>
            
            <button
              onClick={() => navigateDay(-1)}
              disabled={loading}
              className="flex items-center px-2 py-1 bg-gray-500 rounded text-xs hover:bg-gray-400 disabled:opacity-50"
            >
              <ArrowLeft className="w-3 h-3 mr-1" />
              Previous
            </button>
            
            <input
              type="date"
              value={currentDate}
              onChange={(e) => {
                setCurrentDate(e.target.value);
                loadDayData(e.target.value);
              }}
              className="input-field text-sm py-1 px-2 text-center"
            />
            
            <button
              onClick={() => navigateDay(1)}
              disabled={loading}
              className="flex items-center px-2 py-1 bg-gray-500 rounded text-xs hover:bg-gray-400 disabled:opacity-50"
            >
              Next
              <ArrowRight className="w-3 h-3 ml-1" />
            </button>
          </div>
          
          <div className="text-xs text-gray-400">
            {loading ? 'Loading...' : `${chartData.length} data points`}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 bg-gray-800 rounded-lg p-2 overflow-hidden">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{loading ? 'Loading chart data...' : 'No data available for this date'}</p>
            </div>
          </div>
        ) : (
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
                  fill="#3B82F6"
                  opacity={0.3}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default TradingChart;