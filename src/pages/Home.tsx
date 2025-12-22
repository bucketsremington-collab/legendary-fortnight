import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  fetchNews, 
  fetchGames, 
  fetchFreeAgentListings, 
  fetchUsers, 
  fetchTeams,
  fetchUserById,
  NewsItem
} from '../data/dataService';
import { Team, User, Game } from '../types';
import MinecraftHead from '../components/MinecraftHead';

// Types for free agent listing
interface FreeAgentListing {
  id: string;
  user_id: string;
  positions: string[];
  description: string;
  availability: 'available' | 'in-talks' | 'signed';
  discord_tag: string;
  created_at: string;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getCategoryStyle(category: NewsItem['category']): string {
  switch (category) {
    case 'announcement': return 'bg-mc-accent text-white';
    case 'trade': return 'bg-blue-500 text-white';
    case 'game-recap': return 'bg-orange-500 text-white';
    case 'free-agency': return 'bg-purple-500 text-white';
    case 'event': return 'bg-yellow-500 text-black';
    default: return 'bg-mc-surface-light text-mc-text';
  }
}

function getCategoryLabel(category: NewsItem['category']): string {
  switch (category) {
    case 'announcement': return 'Announcement';
    case 'trade': return 'Trade';
    case 'game-recap': return 'Game Recap';
    case 'free-agency': return 'Free Agency';
    case 'event': return 'Event';
    default: return 'News';
  }
}

export default function Home() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [freeAgentListings, setFreeAgentListings] = useState<FreeAgentListing[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [freeAgentUsers, setFreeAgentUsers] = useState<Map<string, User>>(new Map());
  const [loading, setLoading] = useState(true);
  const [lastLoadTime, setLastLoadTime] = useState<number>(0);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      
      // Try to load from cache first
      try {
        const cached = localStorage.getItem('mba_home_data');
        if (cached) {
          const { news: cachedNews, games: cachedGames, timestamp } = JSON.parse(cached);
          const age = Date.now() - timestamp;
          // Use cache if less than 2 minutes old
          if (age < 120000) {
            console.log('Using cached home data');
            setNews(cachedNews);
            setGames(cachedGames);
            setLoading(false);
            return; // Don't fetch fresh data
          }
        }
      } catch {
        // Invalid cache, continue to fetch
      }
      
      try {
        // Add timeout to prevent infinite loading
        const timeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Data fetch timeout')), 15000)
        );
        
        const dataPromise = Promise.all([
          fetchNews(),
          fetchGames(),
          fetchFreeAgentListings(),
          fetchUsers(),
          fetchTeams(),
        ]);
        
        const [newsData, gamesData, freeAgentsData, usersData, teamsData] = await Promise.race([
          dataPromise,
          timeout
        ]) as any;
        
        setNews(newsData);
        setGames(gamesData);
        setFreeAgentListings(freeAgentsData);
        setUsers(usersData);
        setTeams(teamsData);
        
        // Cache news and games
        const now = Date.now();
        localStorage.setItem('mba_home_data', JSON.stringify({
          news: newsData,
          games: gamesData,
          timestamp: now
        }));
        setLastLoadTime(now);

        // Pre-fetch users for free agent listings (with timeout)
        const faUsers = new Map<string, User>();
        for (const listing of freeAgentsData) {
          try {
            const userPromise = fetchUserById(listing.user_id);
            const user = await Promise.race([
              userPromise,
              new Promise((_, reject) => setTimeout(() => reject(new Error('User fetch timeout')), 2000))
            ]) as User;
            if (user) faUsers.set(listing.user_id, user);
          } catch {
            // Skip if user fetch fails
          }
        }
        setFreeAgentUsers(faUsers);
      } catch (err) {
        console.error('Error loading home data:', err);
        // Try to use cached data even if expired
        try {
          const cached = localStorage.getItem('mba_home_data');
          if (cached) {
            const { news: cachedNews, games: cachedGames } = JSON.parse(cached);
            console.log('Using expired cache due to fetch failure');
            setNews(cachedNews);
            setGames(cachedGames);
          } else {
            // Set empty data instead of staying in loading state
            setNews([]);
            setGames([]);
          }
        } catch {
          setNews([]);
          setGames([]);
        }
        setFreeAgentListings([]);
        setUsers([]);
        setTeams([]);
      } finally {
        setLoading(false);
      }
    }
    loadData();
    
    // Auto-refresh when page becomes visible after being idle
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && lastLoadTime > 0) {
        const timeSinceLoad = Date.now() - lastLoadTime;
        // If page was idle for more than 5 minutes, refresh data
        if (timeSinceLoad > 5 * 60 * 1000) {
          console.log('Page was idle, refreshing home data...');
          loadData();
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [lastLoadTime]);

  const getTeamById = (id: string) => teams.find(t => t.id === id);
  
  const upcomingGames = games.filter(g => g.status === 'scheduled').slice(0, 3);
  const pinnedNews = news.filter(n => n.is_pinned);
  const regularNews = news.filter(n => !n.is_pinned);
  const recentFreeAgents = freeAgentListings.filter(fa => fa.availability === 'available').slice(0, 3);
  const topPlayers = users.filter(u => u.role === 'player').slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-mc-text-muted">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pinned News */}
      {pinnedNews.map(news => (
        <div key={news.id} className="mc-card p-5 border-l-4 border-l-mc-accent">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">📌</span>
            <span className={`text-xs px-2 py-0.5 rounded ${getCategoryStyle(news.category)}`}>
              {getCategoryLabel(news.category)}
            </span>
          </div>
          <h2 className="text-xl font-bold text-mc-text mb-2">{news.title}</h2>
          <p className="text-mc-text-muted mb-3">{news.content}</p>
          <div className="text-sm text-mc-text-muted">
            {news.author} • {formatDate(news.created_at)}
          </div>
        </div>
      ))}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* News Feed */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-mc-text border-b border-mc-border pb-2">Latest News</h2>
          
          {regularNews.map(news => (
            <div key={news.id} className="mc-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs px-2 py-0.5 rounded ${getCategoryStyle(news.category)}`}>
                  {getCategoryLabel(news.category)}
                </span>
                <span className="text-sm text-mc-text-muted">{formatDate(news.created_at)}</span>
              </div>
              <h3 className="font-bold text-mc-text mb-2">{news.title}</h3>
              <p className="text-mc-text-muted">{news.content}</p>
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Upcoming Games */}
          <div className="mc-card p-4">
            <h3 className="text-lg font-bold text-mc-text border-b border-mc-border pb-2 mb-3">
              Upcoming Games
            </h3>
            {upcomingGames.length > 0 ? (
              <div className="space-y-3">
                {upcomingGames.map(game => {
                  const homeTeam = getTeamById(game.home_team_id);
                  const awayTeam = getTeamById(game.away_team_id);
                  
                  return (
                    <div key={game.id} className="p-3 bg-mc-darker rounded border border-mc-border">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-mc-text">{homeTeam?.abbreviation}</span>
                        <span className="text-mc-text-muted text-sm">vs</span>
                        <span className="font-bold text-mc-text">{awayTeam?.abbreviation}</span>
                      </div>
                      <div className="text-sm text-mc-text-muted text-center mt-1">
                        {new Date(game.scheduled_date).toLocaleDateString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-mc-text-muted">No upcoming games</p>
            )}
            <Link to="/games" className="block mt-3 text-center text-mc-accent hover:underline text-sm">
              View All Games →
            </Link>
          </div>

          {/* Top Players - with Minecraft heads */}
          <div className="mc-card p-4">
            <h3 className="text-lg font-bold text-mc-text border-b border-mc-border pb-2 mb-3">
              Active Players
            </h3>
            <div className="space-y-2">
              {topPlayers.map(player => (
                <Link 
                  key={player.id}
                  to={`/profile/${player.username}`}
                  className="flex items-center gap-3 p-2 hover:bg-mc-surface-light rounded transition-colors"
                >
                  <MinecraftHead username={player.minecraft_username} size={32} />
                  <span className="text-mc-text">{player.minecraft_username}</span>
                </Link>
              ))}
            </div>
            <Link to="/stats" className="block mt-3 text-center text-mc-accent hover:underline text-sm">
              View All Players →
            </Link>
          </div>

          {/* Free Agents Preview - with Minecraft heads */}
          <div className="mc-card p-4">
            <h3 className="text-lg font-bold text-mc-text border-b border-mc-border pb-2 mb-3">
              Looking for Teams
            </h3>
            {recentFreeAgents.length > 0 ? (
              <div className="space-y-2">
                {recentFreeAgents.map(listing => {
                  const user = freeAgentUsers.get(listing.user_id);
                  if (!user) return null;
                  
                  return (
                    <Link 
                      key={listing.id}
                      to={`/profile/${user.username}`}
                      className="flex items-center gap-3 p-2 hover:bg-mc-surface-light rounded transition-colors"
                    >
                      <MinecraftHead username={user.minecraft_username} size={32} />
                      <div>
                        <div className="text-mc-text">{user.minecraft_username}</div>
                        <div className="text-xs text-mc-text-muted">
                          {listing.positions.join(' / ')}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="text-mc-text-muted">No free agents</p>
            )}
            <Link to="/free-agents" className="block mt-3 text-center text-mc-accent hover:underline text-sm">
              View All Free Agents →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
