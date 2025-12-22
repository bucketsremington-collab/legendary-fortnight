import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  fetchUserByUsername, 
  fetchTeams, 
  fetchPlayerStatsByUserIdAndSeason,
  fetchAccoladesByUserId,
  updateUser,
} from '../data/dataService';
import { useAuth, MBA_ROLE_IDS } from '../context/AuthContext';
import { calculateStats } from '../utils/helpers';
import MinecraftHead from '../components/MinecraftHead';
import ParkStatsDisplay from '../components/ParkStatsDisplay';
import { User, Team, PlayerStats, Accolade } from '../types';

// Helper to check if user has a specific Discord role
function hasDiscordRole(user: User | null, roleId: string): boolean {
  return user?.discord_roles?.includes(roleId) ?? false;
}
// Available seasons (add more as needed)
const AVAILABLE_SEASONS = ['S0'];

// Team Logo component with fallback to abbreviation
function TeamLogo({ team, size = 40 }: { team: Team, size?: number }) {
  if (team.logo_url) {
    return (
      <img 
        src={team.logo_url} 
        alt={team.name}
        className="object-contain"
        style={{ width: size, height: size }}
      />
    );
  }
  
  return (
    <div 
      className="rounded flex items-center justify-center text-white font-bold"
      style={{ width: size, height: size, backgroundColor: team.primary_color, fontSize: size * 0.35 }}
    >
      {team.abbreviation}
    </div>
  );
}

export default function Profile() {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser, mbaRoles, isInMBAServer, syncRolesToDatabase } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [accolades, setAccolades] = useState<Accolade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<string>('S0');
  
  // Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [editMinecraftUsername, setEditMinecraftUsername] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  
  // Sync roles state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  
  // Stats display mode (average or total)
  const [showTotals, setShowTotals] = useState(false);
  // Stats type (Season vs Park/Rec)
  const [statsType, setStatsType] = useState<'season' | 'park'>('season');

  // Check if this is the current user's profile
  const isOwnProfile = currentUser?.id === user?.id || 
                       currentUser?.username.toLowerCase() === username?.toLowerCase() ||
                       currentUser?.minecraft_username.toLowerCase() === username?.toLowerCase();

  useEffect(() => {
    const loadProfile = async () => {
      if (!username) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setNotFound(false);

      // Find user from database (dataService handles fallback to mock data)
      const foundUser = await fetchUserByUsername(username);

      if (!foundUser) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      setUser(foundUser);

      // Load team
      if (foundUser.team_id) {
        const teams = await fetchTeams();
        const foundTeam = teams.find(t => t.id === foundUser.team_id);
        setTeam(foundTeam || null);
      }

      // Load accolades
      const playerAccolades = await fetchAccoladesByUserId(foundUser.id);
      setAccolades(playerAccolades);

      setIsLoading(false);
    };

    loadProfile();
  }, [username]);

  // Load stats when user or season changes
  useEffect(() => {
    const loadStats = async () => {
      if (user) {
        const playerStats = await fetchPlayerStatsByUserIdAndSeason(user.id, selectedSeason);
        setStats(playerStats || null);
      }
    };
    loadStats();
  }, [user, selectedSeason]);

  // Initialize edit values when user loads
  useEffect(() => {
    if (user) {
      setEditBio(user.bio || '');
      setEditMinecraftUsername(user.minecraft_username || '');
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setIsSaving(true);
    setSaveMessage('');

    const updates: Partial<User> = {
      bio: editBio,
      minecraft_username: editMinecraftUsername,
    };

    const result = await updateUser(user.id, updates);
    
    if (result) {
      setUser({ ...user, ...updates });
      setSaveMessage('Profile updated!');
      setIsEditing(false);
      
      // Update localStorage if this is the current user
      const storedUser = localStorage.getItem('mba_user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed.id === user.id) {
          localStorage.setItem('mba_user', JSON.stringify({ ...parsed, ...updates }));
        }
      }
    } else {
      setSaveMessage('Failed to save profile');
    }
    
    setIsSaving(false);
  };

  const calculated = stats ? calculateStats(stats) : null;

  if (isLoading) {
    return (
      <div className="mc-card p-8 text-center">
        <h1 className="text-2xl font-bold text-mc-text mb-2">Loading...</h1>
        <p className="text-mc-text-muted">Fetching player profile...</p>
      </div>
    );
  }

  if (notFound || !user) {
    return (
      <div className="mc-card p-8 text-center">
        <h1 className="text-2xl font-bold text-mc-text mb-2">Player Not Found</h1>
        <p className="text-mc-text-muted mb-4">The player you're looking for doesn't exist.</p>
        <Link to="/stats" className="text-mc-accent hover:underline">
          View All Players
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Profile Card */}
      <div className="mc-card overflow-hidden">
        {/* Header with team color (gray for free agents) */}
        <div 
          className="h-20"
          style={{ backgroundColor: team?.primary_color || '#6B7280' }}
        />
        
        {/* Profile Content */}
        <div className="px-6 pb-6">
          {/* Avatar */}
          <div className="relative -mt-12 mb-4">
            <MinecraftHead 
              username={user.minecraft_username} 
              size={80} 
              className="border-4 border-mc-surface"
            />
          </div>

          {/* Name & IGN with Staff Badges */}
          <div className="mb-4 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-mc-text">{user.minecraft_username}</h1>
                {/* Staff badges - check stored discord_roles for all users */}
                {/* For own profile, use mbaRoles (live), for others use stored discord_roles */}
                {(isOwnProfile ? mbaRoles.isOwner : hasDiscordRole(user, MBA_ROLE_IDS.OWNER)) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-red-600 to-red-500 text-white text-xs font-bold rounded-full shadow-sm">
                    👑 OWNER
                  </span>
                )}
                {(isOwnProfile ? mbaRoles.isDeveloper : hasDiscordRole(user, MBA_ROLE_IDS.DEVELOPER)) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-purple-600 to-purple-500 text-white text-xs font-bold rounded-full shadow-sm">
                    💻 DEV
                  </span>
                )}
                {(isOwnProfile ? mbaRoles.isModerator : hasDiscordRole(user, MBA_ROLE_IDS.MODERATOR)) && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-xs font-bold rounded-full shadow-sm">
                    🛡️ MOD
                  </span>
                )}
                {/* Fallback: show generic STAFF badge if user has admin role but no discord_roles synced yet */}
                {!isOwnProfile && user.role === 'admin' && !user.discord_roles?.length && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-red-600 to-orange-500 text-white text-xs font-bold rounded-full shadow-sm">
                    ⭐ STAFF
                  </span>
                )}
              </div>
              <p className="text-mc-text-muted">@{user.username}</p>
            </div>
            {isOwnProfile && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 bg-mc-surface border border-mc-border text-mc-text hover:bg-mc-surface-light transition-colors text-sm"
              >
                Edit Profile
              </button>
            )}
          </div>

          {/* Edit Form */}
          {isEditing && isOwnProfile && (
            <div className="mb-4 p-4 bg-mc-darker border border-mc-border rounded space-y-4">
              <div>
                <label className="block text-mc-text-muted text-sm mb-1">Minecraft Username</label>
                <input
                  type="text"
                  value={editMinecraftUsername}
                  onChange={(e) => setEditMinecraftUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-mc-surface border border-mc-border text-mc-text rounded focus:outline-none focus:border-mc-accent"
                  placeholder="Your Minecraft username"
                />
              </div>
              <div>
                <label className="block text-mc-text-muted text-sm mb-1">Bio</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full px-3 py-2 bg-mc-surface border border-mc-border text-mc-text rounded focus:outline-none focus:border-mc-accent resize-none"
                  rows={3}
                  placeholder="Tell us about yourself..."
                  maxLength={200}
                />
                <div className="text-right text-xs text-mc-text-muted mt-1">
                  {editBio.length}/200
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="px-4 py-2 bg-mc-accent text-white font-bold rounded hover:bg-mc-accent-hover transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditBio(user.bio || '');
                    setEditMinecraftUsername(user.minecraft_username || '');
                    setSaveMessage('');
                  }}
                  className="px-4 py-2 bg-mc-surface border border-mc-border text-mc-text rounded hover:bg-mc-surface-light transition-colors"
                >
                  Cancel
                </button>
                {saveMessage && (
                  <span className={`text-sm ${saveMessage.includes('Failed') ? 'text-red-500' : 'text-green-500'}`}>
                    {saveMessage}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Bio */}
          {user.bio && !isEditing && (
            <p className="text-mc-text mb-4">{user.bio}</p>
          )}

          {/* Team with Position Role */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {team && (
              <Link 
                to={`/team/${team.id}`}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-mc-surface-light border border-mc-border hover:border-mc-accent transition-colors"
              >
                <TeamLogo team={team} size={20} />
                <span className="text-mc-text font-bold">{team.name}</span>
              </Link>
            )}

            {!team && (
              <Link 
                to="/free-agents"
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-mc-surface-light border border-mc-border hover:border-mc-accent transition-colors"
              >
                <div 
                  className="w-5 h-5 rounded flex items-center justify-center text-white font-bold text-xs"
                  style={{ backgroundColor: '#6B7280' }}
                >
                  FA
                </div>
                <span className="text-mc-text font-bold">Free Agent</span>
              </Link>
            )}

            {/* Position roles next to team - check stored discord_roles for all users */}
            {(isOwnProfile ? mbaRoles.isFranchiseOwner : hasDiscordRole(user, MBA_ROLE_IDS.FRANCHISE_OWNER)) && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-yellow-500 to-amber-500 text-black text-xs font-bold rounded-full shadow-sm">
                🏆 Franchise Owner
              </span>
            )}
            {(isOwnProfile ? mbaRoles.isGeneralManager : hasDiscordRole(user, MBA_ROLE_IDS.GENERAL_MANAGER)) && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-orange-500 to-orange-400 text-white text-xs font-bold rounded-full shadow-sm">
                📋 General Manager
              </span>
            )}
            {(isOwnProfile ? mbaRoles.isHeadCoach : hasDiscordRole(user, MBA_ROLE_IDS.HEAD_COACH)) && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-green-600 to-green-500 text-white text-xs font-bold rounded-full shadow-sm">
                📢 Head Coach
              </span>
            )}
            {(isOwnProfile ? mbaRoles.isAssistantCoach : hasDiscordRole(user, MBA_ROLE_IDS.ASSISTANT_COACH)) && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-teal-600 to-teal-500 text-white text-xs font-bold rounded-full shadow-sm">
                🎯 Asst. Coach
              </span>
            )}
            {/* Fallback: show generic Coach badge if user has coach role but no discord_roles synced yet */}
            {!isOwnProfile && user.role === 'coach' && !user.discord_roles?.length && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-green-600 to-teal-500 text-white text-xs font-bold rounded-full shadow-sm">
                🎯 Coach
              </span>
            )}
          </div>

          {/* Discord Info */}
          <div className="flex items-center gap-2 text-mc-text-muted mb-4">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            <span>{user.username}</span>
          </div>
          
          {/* Sync Roles Button - only show on own profile if in MBA server */}
          {isOwnProfile && isInMBAServer && (
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={async () => {
                  setIsSyncing(true);
                  setSyncMessage('');
                  const result = await syncRolesToDatabase();
                  setSyncMessage(result.message);
                  setIsSyncing(false);
                  
                  // Reload profile data if sync was successful
                  if (result.success && result.message !== 'Already synced - no changes needed') {
                    // Refresh the page data
                    window.location.reload();
                  }
                }}
                disabled={isSyncing}
                className="px-3 py-1.5 bg-[#5865F2] hover:bg-[#4752C4] text-white text-sm font-bold rounded transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <svg className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {isSyncing ? 'Syncing...' : 'Sync Discord Roles'}
              </button>
              {syncMessage && (
                <span className={`text-sm ${syncMessage.includes('Failed') ? 'text-red-500' : 'text-green-500'}`}>
                  {syncMessage}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Unified Stats Card */}
      <div className="mc-card p-6">
        <div className="flex items-center justify-between border-b border-mc-border pb-2 mb-4">
          <h2 className="text-lg font-bold text-mc-text">Player Stats</h2>
          <div className="flex items-center gap-2">
            {/* Season/Park Toggle */}
            <div className="inline-flex rounded-md overflow-hidden">
              <button
                onClick={() => setStatsType('season')}
                className={`px-3 py-1 text-sm font-medium transition-colors border focus:outline-none ${
                  statsType === 'season'
                    ? 'bg-mc-accent text-white border-mc-accent' 
                    : 'bg-mc-surface text-mc-text-muted border-mc-border hover:bg-mc-surface-light'
                } rounded-l-md border-r-0`}
              >
                Season
              </button>
              <button
                onClick={() => setStatsType('park')}
                className={`px-3 py-1 text-sm font-medium transition-colors border focus:outline-none ${
                  statsType === 'park'
                    ? 'bg-mc-accent text-white border-mc-accent' 
                    : 'bg-mc-surface text-mc-text-muted border-mc-border hover:bg-mc-surface-light'
                } rounded-r-md`}
              >
                Park/Rec
              </button>
            </div>
            {/* Season Dropdown - always visible */}
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              title="Select season"
              className="px-3 py-1 bg-mc-surface border border-mc-border rounded text-mc-text text-sm focus:outline-none focus:border-mc-accent"
              disabled={statsType === 'park'}
            >
              {AVAILABLE_SEASONS.map(season => (
                <option key={season} value={season}>
                  Season {season.replace('S', '')}
                </option>
              ))}
            </select>
            {/* Averages/Totals Toggle */}
            <div className="inline-flex rounded-md overflow-hidden">
              <button
                onClick={() => setShowTotals(false)}
                className={`px-3 py-1 text-sm font-medium transition-colors border focus:outline-none ${
                  !showTotals 
                    ? 'bg-mc-accent text-white border-mc-accent' 
                    : 'bg-mc-surface text-mc-text-muted border-mc-border hover:bg-mc-surface-light'
                } rounded-l-md border-r-0`}
              >
                Averages
              </button>
              <button
                onClick={() => setShowTotals(true)}
                className={`px-3 py-1 text-sm font-medium transition-colors border focus:outline-none ${
                  showTotals 
                    ? 'bg-mc-accent text-white border-mc-accent' 
                    : 'bg-mc-surface text-mc-text-muted border-mc-border hover:bg-mc-surface-light'
                } rounded-r-md`}
              >
                Totals
              </button>
            </div>
          </div>
        </div>
        
        {statsType === 'season' ? (
          /* Season Stats */
          stats && calculated ? (
            <>
              {/* Record Section for Season Stats */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-mc-text mb-3">Record</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-mc-surface-light p-3 border border-mc-border text-center">
                    <div className="text-2xl font-bold text-mc-accent">{stats.games_won || 0}</div>
                    <div className="text-sm text-mc-text-muted">Wins</div>
                  </div>
                  <div className="bg-mc-surface-light p-3 border border-mc-border text-center">
                    <div className="text-2xl font-bold text-red-500">{stats.games_lost || 0}</div>
                    <div className="text-sm text-mc-text-muted">Losses</div>
                  </div>
                  <div className="bg-mc-surface-light p-3 border border-mc-border text-center">
                    <div className="text-2xl font-bold text-mc-text">
                      {stats.games_played > 0 ? ((stats.games_won / stats.games_played) * 100).toFixed(1) : '0.0'}%
                    </div>
                    <div className="text-sm text-mc-text-muted">Win %</div>
                  </div>
                </div>
                <div className="mt-2 text-center text-mc-text-muted text-sm">
                  {stats.games_played} Games Played
                </div>
              </div>

              {/* Stats Section */}
              <div>
                <h4 className="text-sm font-semibold text-mc-text mb-3">
                  {showTotals ? 'Total Stats' : 'Averages'}
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-mc-surface-light p-3 border border-mc-border text-center">
                    <div className="text-lg font-bold text-mc-text">
                      {showTotals ? stats.points_scored : calculated.ppg.toFixed(1)}
                    </div>
                    <div className="text-xs text-mc-text-muted">PTS</div>
                  </div>
                  <div className="bg-mc-surface-light p-3 border border-mc-border text-center">
                    <div className="text-lg font-bold text-mc-text">
                      {showTotals ? stats.assists : calculated.apg.toFixed(1)}
                    </div>
                    <div className="text-xs text-mc-text-muted">AST</div>
                  </div>
                  <div className="bg-mc-surface-light p-3 border border-mc-border text-center">
                    <div className="text-lg font-bold text-mc-text">
                      {showTotals ? stats.rebounds : calculated.rpg.toFixed(1)}
                    </div>
                    <div className="text-xs text-mc-text-muted">REB</div>
                  </div>
                  <div className="bg-mc-surface-light p-3 border border-mc-border text-center">
                    <div className="text-lg font-bold text-mc-text">
                      {showTotals ? stats.steals : calculated.spg.toFixed(1)}
                    </div>
                    <div className="text-xs text-mc-text-muted">STL</div>
                  </div>
                  <div className="bg-mc-surface-light p-3 border border-mc-border text-center">
                    <div className="text-lg font-bold text-mc-text">
                      {showTotals ? stats.blocks : calculated.bpg.toFixed(1)}
                    </div>
                    <div className="text-xs text-mc-text-muted">BLK</div>
                  </div>
                  <div className="bg-mc-surface-light p-3 border border-mc-border text-center">
                    <div className="text-lg font-bold text-mc-text">
                      {showTotals ? stats.turnovers : calculated.tpg.toFixed(1)}
                    </div>
                    <div className="text-xs text-mc-text-muted">TO</div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-mc-text-muted">No stats for this season</p>
          )
        ) : (
          /* Park/Rec Stats */
          user && <ParkStatsDisplay user={user} season={1} showTotals={showTotals} />
        )}
      </div>

      {/* Accolades Card */}
      {accolades.length > 0 && (
        <div className="mc-card p-6">
          <h2 className="text-lg font-bold text-mc-text border-b border-mc-border pb-2 mb-4">Accolades</h2>
          
          <div className="flex flex-wrap gap-2">
            {accolades.map(accolade => (
              <div 
                key={accolade.id}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-mc-surface-light border border-mc-gold text-mc-text"
                title={accolade.description || undefined}
              >
                <span>{accolade.icon}</span>
                <span className="font-bold">{accolade.title}</span>
                <span className="text-mc-text-muted">{accolade.season}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
