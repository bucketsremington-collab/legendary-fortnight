import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchFreeAgentListings, fetchUserById, fetchPlayerStatsByUserId } from '../data/dataService';
import { useAuth } from '../context/AuthContext';
import { User, PlayerStats } from '../types';
import { calculateStats } from '../utils/helpers';
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

export default function FreeAgents() {
  const { loginWithDiscord } = useAuth();
  const [listings, setListings] = useState<FreeAgentListing[]>([]);
  const [users, setUsers] = useState<Map<string, User>>(new Map());
  const [stats, setStats] = useState<Map<string, PlayerStats>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const listingsData = await fetchFreeAgentListings();
        setListings(listingsData);

        // Fetch users and stats for all listings
        const usersMap = new Map<string, User>();
        const statsMap = new Map<string, PlayerStats>();
        
        await Promise.all(
          listingsData.map(async (listing) => {
            const user = await fetchUserById(listing.user_id);
            if (user) {
              usersMap.set(listing.user_id, user);
              const playerStats = await fetchPlayerStatsByUserId(user.id);
              if (playerStats) statsMap.set(user.id, playerStats);
            }
          })
        );
        
        setUsers(usersMap);
        setStats(statsMap);
      } catch (err) {
        console.error('Error loading free agents:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const getUserById = (id: string) => users.get(id);
  const getPlayerStatsByUserId = (id: string) => stats.get(id);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-mc-text-muted">Loading free agents...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mc-card p-6">
        <h1 className="text-2xl font-bold text-mc-text mb-2">Free Agents</h1>
        <p className="text-mc-text-muted">Players looking for teams. Contact them via Discord to discuss.</p>
      </div>

      {/* List yourself banner */}
      <div className="p-4 bg-[#5865F2] rounded">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="font-bold text-white">Looking for a team?</h3>
            <p className="text-white/80">Connect your Discord to list yourself as a free agent.</p>
          </div>
          <button
            onClick={() => loginWithDiscord()}
            className="px-4 py-2 bg-white text-[#5865F2] font-bold hover:bg-gray-100 transition-colors rounded"
          >
            Connect Discord
          </button>
        </div>
      </div>

      {/* Free Agent Listings */}
      <div className="space-y-3">
        {listings.map(listing => {
          const user = getUserById(listing.user_id);
          const playerStats = user ? getPlayerStatsByUserId(user.id) : null;
          const calculated = playerStats ? calculateStats(playerStats) : null;

          if (!user) return null;

          return (
            <div key={listing.id} className="mc-card p-4">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <Link to={`/profile/${user.username}`}>
                  <MinecraftHead username={user.minecraft_username} size={56} />
                </Link>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Link to={`/profile/${user.username}`} className="font-bold text-mc-text hover:text-mc-accent">
                      {user.minecraft_username}
                    </Link>
                    <span className={`text-xs px-2 py-0.5 ${
                      listing.availability === 'available' 
                        ? 'bg-mc-accent text-white' 
                        : listing.availability === 'in-talks'
                        ? 'bg-yellow-500 text-white'
                        : 'bg-mc-surface-light text-mc-text-muted'
                    }`}>
                      {listing.availability === 'available' ? 'Available' : 
                       listing.availability === 'in-talks' ? 'In Talks' : 'Signed'}
                    </span>
                  </div>

                  {/* Positions */}
                  <div className="flex gap-2 mb-2 flex-wrap">
                    {listing.positions.map(pos => (
                      <span key={pos} className="text-sm px-2 py-0.5 bg-mc-surface-light border border-mc-border text-mc-text">
                        {pos}
                      </span>
                    ))}
                  </div>

                  <p className="text-mc-text-muted mb-3">{listing.description}</p>

                  {/* Stats if available */}
                  {calculated && (
                    <div className="flex gap-4 text-sm mb-3 flex-wrap">
                      <span className="text-mc-text">
                        <strong className="text-mc-accent">{calculated.ppg.toFixed(1)}</strong> PPG
                      </span>
                      <span className="text-mc-text">
                        <strong className="text-mc-accent">{calculated.apg.toFixed(1)}</strong> APG
                      </span>
                      <span className="text-mc-text">
                        <strong className="text-mc-accent">{calculated.rpg.toFixed(1)}</strong> RPG
                      </span>
                    </div>
                  )}

                  {/* Discord Contact */}
                  <div className="flex items-center gap-2 text-sm">
                    <svg className="w-4 h-4 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                    <span className="text-mc-text font-mono">{listing.discord_tag}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {listings.length === 0 && (
        <div className="mc-card p-8 text-center text-mc-text-muted">
          No free agents listed right now.
        </div>
      )}
    </div>
  );
}
