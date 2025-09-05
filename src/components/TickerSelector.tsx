import React from 'react';
import { TrendingUp } from 'lucide-react';

interface TickerSelectorProps {
  selectedTicker: string;
  onTickerChange: (ticker: string) => void;
}

const popularTickers = ['SPY', 'QQQ', 'AAPL', 'TSLA', 'NVDA', 'MSFT'];

const TickerSelector: React.FC<TickerSelectorProps> = ({ selectedTicker, onTickerChange }) => {
  return (
    <div className="card">
      <div className="flex items-center mb-4">
        <TrendingUp className="w-5 h-5 mr-2 text-green-400" />
        <h3 className="text-lg font-semibold text-green-400">Stock Symbol</h3>
      </div>
      
      <p className="text-gray-400 text-sm mb-4">
        Choose a high-volume stock for better options patterns
      </p>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {popularTickers.map(ticker => (
          <button
            key={ticker}
            onClick={() => onTickerChange(ticker)}
            className={`ticker-btn ${selectedTicker === ticker ? 'ticker-btn-selected' : ''}`}
          >
            {ticker}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-green-400 mb-3">
          💡 Or enter custom ticker:
        </label>
        <input
          type="text"
          value={selectedTicker}
          onChange={(e) => onTickerChange(e.target.value.toUpperCase())}
          placeholder="TYPE TICKER HERE"
          maxLength={6}
          className="input-field w-full text-center font-bold text-xl"
        />
      </div>

      {selectedTicker && (
        <div className="mt-4 p-3 bg-gray-800 rounded-lg border border-green-400/30">
          <div className="text-center">
            <span className="text-green-400 font-bold text-lg">{selectedTicker}</span>
            <span className="ml-2 text-gray-400">selected</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TickerSelector;