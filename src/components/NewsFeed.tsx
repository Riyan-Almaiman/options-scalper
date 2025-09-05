import React, { useState, useEffect } from 'react';
import { Newspaper, ExternalLink, Clock } from 'lucide-react';

interface NewsItem {
  id: string;
  title: string;
  description: string;
  published_utc: string;
  article_url: string;
  image_url?: string;
  keywords?: string[];
  tickers?: string[];
  sentiment?: string;
}

interface NewsFeedProps {
  ticker: string;
  apiKey: string;
}

const NewsFeed: React.FC<NewsFeedProps> = ({ ticker, apiKey }) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchNews = async () => {
    if (!ticker || !apiKey) return;
    
    setLoading(true);
    try {
      // Polygon.io news endpoint
      const url = `https://api.polygon.io/v2/reference/news?ticker=${ticker}&limit=20&sort=published_utc&order=desc&apikey=${apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK' && data.results) {
        setNews(data.results);
        setLastUpdated(new Date());
      } else {
        console.error('Failed to fetch news:', data);
      }
    } catch (error) {
      console.error('News fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, [ticker, apiKey]);

  const formatTimeAgo = (utcDate: string) => {
    const now = new Date();
    const published = new Date(utcDate);
    const diffMs = now.getTime() - published.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    }
  };

  

  return (
    <div className="h-full p-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Newspaper className="w-5 h-5 mr-2 text-green-400" />
          <h3 className="text-lg font-semibold text-green-400">
            {ticker ? `${ticker} News` : 'Market News'}
          </h3>
        </div>
        
        {lastUpdated && (
          <div className="flex items-center text-xs text-gray-400">
            <Clock className="w-3 h-3 mr-1" />
            {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </div>

      <button
        onClick={fetchNews}
        disabled={loading || !ticker || !apiKey}
        className="btn-success w-full mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
            Loading...
          </div>
        ) : (
          '🔄 Refresh News'
        )}
      </button>

      {!ticker && (
        <div className="text-center py-8 text-gray-400">
          <Newspaper className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Select a ticker to see news</p>
        </div>
      )}

      {!apiKey && ticker && (
        <div className="text-center py-8">
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
            <p className="text-orange-400 text-sm">
              🔑 API key required for news feed
            </p>
          </div>
        </div>
      )}

      {news.length === 0 && !loading && ticker && apiKey && (
        <div className="text-center py-8 text-gray-400">
          <Newspaper className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No recent news found</p>
        </div>
      )}

      {/* News Items */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {news.map((item) => (
          <div 
            key={item.id}
            className="bg-gray-600 rounded-lg p-4 border border-gray-500 hover:border-green-400/50 transition-all duration-200 cursor-pointer"
            onClick={() => window.open(item.article_url, '_blank')}
          >
            {item.image_url && (
              <img 
                src={item.image_url} 
                alt=""
                className="w-full h-24 object-cover rounded-lg mb-3"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            )}
            
            <h4 className="font-semibold text-white text-sm mb-2 line-clamp-2 leading-tight">
              {item.title}
            </h4>
            
            {item.description && (
              <p className="text-gray-300 text-xs mb-3 line-clamp-3 leading-relaxed">
                {item.description}
              </p>
            )}
            
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <span className="text-gray-400">
                  {formatTimeAgo(item.published_utc)}
                </span>
                
                {item.tickers && item.tickers.length > 0 && (
                  <div className="flex items-center space-x-1">
                    {item.tickers.slice(0, 3).map(tickerSymbol => (
                      <span 
                        key={tickerSymbol}
                        className="bg-green-400/20 text-green-400 px-1.5 py-0.5 rounded text-xs font-mono"
                      >
                        {tickerSymbol}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              <ExternalLink className="w-3 h-3 text-gray-400 opacity-50" />
            </div>

            {item.keywords && item.keywords.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {item.keywords.slice(0, 3).map(keyword => (
                  <span 
                    key={keyword}
                    className="bg-gray-500/30 text-gray-300 px-2 py-1 rounded text-xs"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* News Summary */}
      {news.length > 0 && (
        <div className="mt-4 p-3 bg-gray-600 rounded-lg border-t border-gray-500">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-300">
              📰 {news.length} articles loaded
            </span>
            <span className="text-gray-400">
              Last: {formatTimeAgo(news[0]?.published_utc)}
            </span>
          </div>
          
          {ticker && (
            <div className="mt-2 text-center">
              <span className="bg-green-400/20 text-green-400 px-2 py-1 rounded text-xs font-semibold">
                📊 Tracking {ticker}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NewsFeed;