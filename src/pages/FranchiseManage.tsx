import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, MBA_ROLE_IDS } from '../context/AuthContext';
import { fetchTeamById, fetchTeamMembers, fetchGamesByTeamId, fetchUsers } from '../data/dataService';
import { signPlayer, releasePlayer } from '../data/franchiseService';
import { Team, User, Game } from '../types';
import MinecraftHead from '../components/MinecraftHead';
import { hasDiscordRole } from '../utils/roleHelpers';

// Team Logo component
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

export default function FranchiseManage() {
  const { user } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [roster, setRoster] = useState<User[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [freeAgents, setFreeAgents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showSignModal, setShowSignModal] = useState(false);

  useEffect(() => {
    async function loadTeamData() {
      if (!user?.team_id) {
        setLoading(false);
        return;
      }

      try {
        const [teamData, membersData, gamesData, allUsers] = await Promise.all([
          fetchTeamById(user.team_id),
          fetchTeamMembers(user.team_id),
          fetchGamesByTeamId(user.team_id),
          fetchUsers()
        ]);

        setTeam(teamData);
        setRoster(membersData);
        setGames(gamesData);
        // Filter free agents (users without team_id and with minecraft_username)
        setFreeAgents(allUsers.filter(u => !u.team_id && u.minecraft_username));
      } catch (err) {
        console.error('Error loading team data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadTeamData();
  }, [user?.team_id]);

  const handleSignPlayer = async (playerId: string) => {
    if (!team || !user) return;
    
    setActionLoading(true);
    setMessage(null);

    const result = await signPlayer(team.id, playerId, user.id);
    
    if (result.success) {
      setMessage({ type: 'success', text: result.message });
      // Refresh roster and free agents
      const [membersData, allUsers] = await Promise.all([
        fetchTeamMembers(team.id),
        fetchUsers()
      ]);
      setRoster(membersData);
      setFreeAgents(allUsers.filter(u => !u.team_id && u.minecraft_username));
      setShowSignModal(false);
    } else {
      setMessage({ type: 'error', text: result.message });
    }

    setActionLoading(false);
    setTimeout(() => setMessage(null), 5000);
  };

  const handleReleasePlayer = async (playerId: string) => {
    if (!team || !user) return;
    
    if (!confirm('Are you sure you want to release this player?')) return;
    
    setActionLoading(true);
    setMessage(null);

    const result = await releasePlayer(team.id, playerId, user.id);
    
    if (result.success) {
      setMessage({ type: 'success', text: result.message });
      // Refresh roster and free agents
      const [membersData, allUsers] = await Promise.all([
        fetchTeamMembers(team.id),
        fetchUsers()
      ]);
      setRoster(membersData);
      setFreeAgents(allUsers.filter(u => !u.team_id && u.minecraft_username));
    } else {
      setMessage({ type: 'error', text: result.message });
    }

    setActionLoading(false);
    setTimeout(() => setMessage(null), 5000);
  };

  // Check if user has franchise owner or general manager permissions
  const canManageRoster = user && (
    hasDiscordRole(user, MBA_ROLE_IDS.FRANCHISE_OWNER) ||
    hasDiscordRole(user, MBA_ROLE_IDS.GENERAL_MANAGER) ||
    hasDiscordRole(user, MBA_ROLE_IDS.HEAD_COACH)
  );

  // Check if user has franchise owner permissions
  if (!canManageRoster) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mc-card p-8 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-mc-text mb-2">Access Denied</h1>
          <p className="text-mc-text-muted mb-4">
            You must be a Franchise Owner, General Manager, or Head Coach to access this page.
          </p>
          <Link to="/home" className="text-mc-accent hover:underline">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-mc-text-muted">Loading franchise data...</div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mc-card p-8 text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-mc-text mb-2">No Team Found</h1>
          <p className="text-mc-text-muted mb-4">
            You don't appear to have a team assignment. Please contact an administrator.
          </p>
          <Link to="/home" className="text-mc-accent hover:underline">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  const upcomingGames = games.filter(g => g.status === 'scheduled').slice(0, 5);
  const rosterCap = 10; // TODO: Make this configurable

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Message Banner */}
      {message && (
        <div className={`mc-card p-4 border-l-4 ${message.type === 'success' ? 'border-green-500 bg-green-900/20' : 'border-red-500 bg-red-900/20'}`}>
          <p className={message.type === 'success' ? 'text-green-200' : 'text-red-200'}>
            {message.text}
          </p>
        </div>
      )}

      {/* Header */}
      <div className="mc-card overflow-hidden">
        <div 
          className="h-32 flex items-center px-6"
          style={{ backgroundColor: team.primary_color }}
        >
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 flex items-center justify-center bg-white/20 rounded-lg p-2">
              <TeamLogo team={team} size={64} />
            </div>
            <div className="text-white">
              <p className="text-sm opacity-80 mb-1">Franchise Management</p>
              <h1 className="text-3xl font-bold">{team.name}</h1>
              <p className="opacity-80">Owner Dashboard</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="mc-card p-4 text-center">
          <div className="text-3xl font-bold text-mc-accent">{team.wins}</div>
          <div className="text-sm text-mc-text-muted">Wins</div>
        </div>
        <div className="mc-card p-4 text-center">
          <div className="text-3xl font-bold text-red-500">{team.losses}</div>
          <div className="text-sm text-mc-text-muted">Losses</div>
        </div>
        <div className="mc-card p-4 text-center">
          <div className="text-3xl font-bold text-mc-gold">{team.championships}</div>
          <div className="text-sm text-mc-text-muted">Championships</div>
        </div>
        <div className="mc-card p-4 text-center">
          <div className="text-3xl font-bold text-mc-text">{roster.length}</div>
          <div className="text-sm text-mc-text-muted">Roster Size</div>
        </div>
      </div>

      {/* Management Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Roster Management */}
        <div className="mc-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-mc-text">Roster</h2>
            <span className="text-sm text-mc-text-muted">{roster.length}/{rosterCap}</span>
          </div>
          
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {roster.map(member => (
              <div
                key={member.id}
                className="flex items-center gap-3 p-3 bg-mc-surface-light border border-mc-border rounded"
              >
                <Link to={`/profile/${member.username}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <MinecraftHead username={member.minecraft_username} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-mc-text truncate">{member.minecraft_username}</div>
                    <div className="text-sm text-mc-text-muted capitalize">{member.role}</div>
                  </div>
                </Link>
                <button
                  onClick={() => handleReleasePlayer(member.id)}
                  disabled={actionLoading}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white text-sm rounded transition-colors"
                  title="Release player"
                >
                  📤 Release
                </button>
              </div>
            ))}
            {roster.length === 0 && (
              <p className="text-mc-text-muted text-center py-4">No roster members yet</p>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-mc-border">
            <button 
              onClick={() => setShowSignModal(true)}
              disabled={actionLoading || roster.length >= rosterCap}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded transition-colors"
            >
              📝 Sign Free Agent {roster.length >= rosterCap && '(Roster Full)'}
            </button>
          </div>
        </div>

        {/* Schedule Management */}
        <div className="mc-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-mc-text">Schedule</h2>
            <Link to="/games" className="text-sm text-mc-accent hover:underline">View All</Link>
          </div>

          {upcomingGames.length > 0 ? (
            <div className="space-y-2 mb-4">
              <h3 className="text-sm font-bold text-mc-text-muted">Upcoming Games</h3>
              {upcomingGames.map(game => (
                <div key={game.id} className="p-3 bg-mc-surface-light border border-mc-border rounded">
                  <div className="text-sm text-mc-text">
                    {game.home_team_id === team.id ? 'vs' : '@'} Opponent
                  </div>
                  <div className="text-xs text-mc-text-muted">
                    {new Date(game.scheduled_date || '').toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-mc-text-muted text-center py-4 mb-4">No upcoming games scheduled</p>
          )}

          <div className="pt-4 border-t border-mc-border space-y-2">
            <button 
              disabled
              className="w-full px-4 py-2 bg-mc-surface border border-mc-border text-mc-text-muted rounded cursor-not-allowed"
            >
              📅 Schedule Game - Coming Soon
            </button>
            <button 
              disabled
              className="w-full px-4 py-2 bg-mc-surface border border-mc-border text-mc-text-muted rounded cursor-not-allowed"
            >
              🔄 Request Trade - Coming Soon
            </button>
          </div>
        </div>
      </div>

      {/* Additional Features Placeholder */}
      <div className="mc-card p-6">
        <h2 className="text-lg font-bold text-mc-text mb-4">Coming Soon</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-mc-surface-light border border-mc-border rounded text-center">
            <div className="text-3xl mb-2">📊</div>
            <div className="font-bold text-mc-text">Team Analytics</div>
            <div className="text-sm text-mc-text-muted">View detailed team performance stats</div>
          </div>
          <div className="p-4 bg-mc-surface-light border border-mc-border rounded text-center">
            <div className="text-3xl mb-2">💰</div>
            <div className="font-bold text-mc-text">Salary Cap</div>
            <div className="text-sm text-mc-text-muted">Manage team finances and contracts</div>
          </div>
          <div className="p-4 bg-mc-surface-light border border-mc-border rounded text-center">
            <div className="text-3xl mb-2">📝</div>
            <div className="font-bold text-mc-text">Draft Board</div>
            <div className="text-sm text-mc-text-muted">Scout and draft new players</div>
          </div>
        </div>
      </div>

      {/* Sign Free Agent Modal */}
      {showSignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="mc-card p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-mc-text">Sign Free Agent</h2>
              <button
                onClick={() => setShowSignModal(false)}
                className="text-mc-text-muted hover:text-mc-text"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              {freeAgents.length > 0 ? (
                freeAgents.map(agent => (
                  <div
                    key={agent.id}
                    className="flex items-center gap-3 p-3 bg-mc-surface-light border border-mc-border rounded"
                  >
                    <MinecraftHead username={agent.minecraft_username} size={36} />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-mc-text truncate">{agent.minecraft_username}</div>
                      <div className="text-sm text-mc-text-muted">@{agent.username}</div>
                    </div>
                    <button
                      onClick={() => handleSignPlayer(agent.id)}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded transition-colors"
                    >
                      📝 Sign
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-mc-text-muted text-center py-8">No free agents available</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
