import { useState } from 'react';
import VolatilityScanner from './components/VolatilityScanner';
import DayAnalysis from './components/DayAnalysis';
import NewsFeed from './components/NewsFeed';

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
  expiryDate: string; // This is the 0DTE expiry date we found
  currentViewDate: string; // What day we're currently viewing
}

function App() {
  const [ticker, setTicker] = useState('');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('polygonApiKey') || '');
  const [currentView, setCurrentView] = useState<'scanner' | 'analysis'>('scanner');
  
  // Scanner results
  const [volatileDays, setVolatileDays] = useState<VolatileDay[]>([]);
  const [selectedVolatileDay, setSelectedVolatileDay] = useState<VolatileDay | null>(null);
  
  // Selected option for tracking across days
  const [selectedOption, setSelectedOption] = useState<SelectedOption | null>(null);

  const saveApiKey = (key: string) => {
    setApiKey(key);
    if (key) {
      localStorage.setItem('polygonApiKey', key);
    } else {
      localStorage.removeItem('polygonApiKey');
    }
  };

  const selectVolatileDay = (day: VolatileDay) => {
    setSelectedVolatileDay(day);
    setSelectedOption(null); // Reset option selection
    setCurrentView('analysis');
  };

  const selectOption = (strike: number, type: 'CALL' | 'PUT', expiryDate: string) => {
    setSelectedOption({
      strike,
      type,
      expiryDate,
      currentViewDate: expiryDate // Start viewing the expiry date
    });
  };

  return (
    <div className="h-screen bg-gray-800 text-white flex overflow-hidden">
      
      {/* Top Bar */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-gray-700 p-4 border-b border-gray-600">
          <div className="flex items-center justify-between">
            
            {/* Basic Controls */}
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-green-400">⚡ 0DTE Options Explorer</h1>
              
              <select 
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                className="input-field py-2 px-3"
              >
                <option value="">Select Ticker</option>
                <option value="SPY">SPY - S&P 500</option>
                <option value="QQQ">QQQ - NASDAQ</option>
                <option value="AAPL">AAPL - Apple</option>
                <option value="TSLA">TSLA - Tesla</option>
                <option value="NVDA">NVDA - NVIDIA</option>
              </select>

              <div className="relative">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => saveApiKey(e.target.value)}
                  placeholder={apiKey ? "API Key Saved ✓" : "API Key"}
                  className="input-field py-2 px-3 w-32"
                />
                {apiKey && (
                  <button
                    onClick={() => saveApiKey('')}
                    className="absolute right-1 top-1 bg-red-400 text-black text-xs px-1 py-1 rounded"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* View Navigation */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentView('scanner')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  currentView === 'scanner' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                🔍 Find Volatile Days
              </button>
              
              <button
                onClick={() => setCurrentView('analysis')}
                disabled={!selectedVolatileDay}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  currentView === 'analysis' && selectedVolatileDay
                    ? 'bg-orange-500 text-white' 
                    : 'bg-gray-600 text-gray-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                📊 Analyze Day
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {currentView === 'scanner' ? (
            <VolatilityScanner
              ticker={ticker}
              apiKey={apiKey}
              onDaySelected={selectVolatileDay}
              results={volatileDays}
              setResults={setVolatileDays}
            />
          ) : (
            <DayAnalysis
              ticker={ticker}
              apiKey={apiKey}
              volatileDay={selectedVolatileDay!}
              selectedOption={selectedOption}
              onOptionSelect={selectOption}
            />
          )}
        </div>
      </div>

      {/* News Sidebar */}
      <div className="w-80 bg-gray-700 border-l border-gray-600">
        <NewsFeed ticker={ticker} apiKey={apiKey} />
      </div>
    </div>
  );
}

export default App;