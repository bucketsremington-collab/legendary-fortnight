import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchTeamById, fetchTeamMembers, fetchPlayerStatsByUserId, fetchGamesByTeamId } from '../data/dataService';
import { Team as TeamType, User, PlayerStats, Game } from '../types';
import { calculateStats } from '../utils/helpers';
import MinecraftHead from '../components/MinecraftHead';

// Team Logo component with fallback to abbreviation
function TeamLogo({ team, size = 40 }: { team: TeamType, size?: number }) {
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

export default function TeamPage() {
  const { teamId } = useParams<{ teamId: string }>();
  
  const [team, setTeam] = useState<TeamType | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [memberStats, setMemberStats] = useState<Map<string, PlayerStats>>(new Map());
  const [games, setGames] = useState<Game[]>([]);
  const [opponentTeams, setOpponentTeams] = useState<Map<string, TeamType>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!teamId) return;
      
      setLoading(true);
      try {
        const teamData = await fetchTeamById(teamId);
        if (!teamData) {
          setTeam(null);
          setLoading(false);
          return;
        }
        setTeam(teamData);

        const [membersData, gamesData] = await Promise.all([
          fetchTeamMembers(teamId),
          fetchGamesByTeamId(teamId),
        ]);
        
        setMembers(membersData);
        setGames(gamesData);

        // Fetch stats for all members
        const statsMap = new Map<string, PlayerStats>();
        await Promise.all(
          membersData.map(async (member) => {
            const stats = await fetchPlayerStatsByUserId(member.id);
            if (stats) statsMap.set(member.id, stats);
          })
        );
        setMemberStats(statsMap);

        // Fetch opponent teams
        const opponentsMap = new Map<string, TeamType>();
        const opponentIds = new Set<string>();
        gamesData.forEach(g => {
          if (g.home_team_id !== teamId) opponentIds.add(g.home_team_id);
          if (g.away_team_id !== teamId) opponentIds.add(g.away_team_id);
        });
        
        await Promise.all(
          Array.from(opponentIds).map(async (oppId) => {
            const oppTeam = await fetchTeamById(oppId);
            if (oppTeam) opponentsMap.set(oppId, oppTeam);
          })
        );
        setOpponentTeams(opponentsMap);
      } catch (err) {
        console.error('Error loading team:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [teamId]);

  const getTeamByIdLocal = (id: string) => opponentTeams.get(id) || team;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-mc-text-muted">Loading team...</div>
      </div>
    );
  }
  
  if (!team) {
    return (
      <div className="mc-card p-8 text-center">
        <h1 className="text-2xl font-bold text-mc-text mb-2">Team Not Found</h1>
        <p className="text-mc-text-muted mb-4">The team you're looking for doesn't exist.</p>
        <Link to="/teams" className="text-mc-accent hover:underline">
          View All Teams
        </Link>
      </div>
    );
  }

  const teamGames = games;
  const recentGames = teamGames.filter(g => g.status === 'completed').slice(0, 3);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Team Header */}
      <div className="mc-card overflow-hidden">
        <div 
          className="h-24 flex items-center justify-center"
          style={{ backgroundColor: team.primary_color }}
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 flex items-center justify-center bg-white/20 rounded p-1">
              <TeamLogo team={team} size={56} />
            </div>
            <div className="text-white">
              <h1 className="text-3xl font-bold">{team.name}</h1>
              <p className="opacity-80">Est. {team.founded_date}</p>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-mc-surface-light border border-mc-border">
              <div className="text-2xl font-bold text-mc-accent">{team.wins}</div>
              <div className="text-sm text-mc-text-muted">Wins</div>
            </div>
            <div className="p-4 bg-mc-surface-light border border-mc-border">
              <div className="text-2xl font-bold text-red-500">{team.losses}</div>
              <div className="text-sm text-mc-text-muted">Losses</div>
            </div>
            <div className="p-4 bg-mc-surface-light border border-mc-border">
              <div className="text-2xl font-bold text-mc-gold">{team.championships}</div>
              <div className="text-sm text-mc-text-muted">Titles</div>
            </div>
          </div>
        </div>
      </div>

      {/* Roster */}
      <div className="mc-card p-6">
        <h2 className="text-lg font-bold text-mc-text border-b border-mc-border pb-2 mb-4">
          Roster ({members.length})
        </h2>
        
        <div className="space-y-2">
          {members.map(member => {
            const stats = memberStats.get(member.id);
            const calculated = stats ? calculateStats(stats) : null;
            
            return (
              <Link 
                key={member.id}
                to={`/profile/${member.username}`}
                className="flex items-center gap-4 p-3 bg-mc-surface-light border border-mc-border hover:border-mc-accent transition-colors"
              >
                <MinecraftHead username={member.minecraft_username} size={40} />
                <div className="flex-1">
                  <div className="font-bold text-mc-text">{member.minecraft_username}</div>
                  <div className="text-sm text-mc-text-muted capitalize">{member.role}</div>
                </div>
                {calculated && (
                  <div className="flex gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-bold text-mc-accent">{calculated.ppg.toFixed(1)}</div>
                      <div className="text-mc-text-muted">PPG</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-mc-text">{calculated.apg.toFixed(1)}</div>
                      <div className="text-mc-text-muted">APG</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-mc-text">{calculated.rpg.toFixed(1)}</div>
                      <div className="text-mc-text-muted">RPG</div>
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Games - Only show if games exist in database */}
      {recentGames.length > 0 && games.length > 0 && (
        <div className="mc-card p-6">
          <h2 className="text-lg font-bold text-mc-text border-b border-mc-border pb-2 mb-4">
            Recent Games
          </h2>
          
          <div className="space-y-3">
            {recentGames.map(game => {
              const isHome = game.home_team_id === team.id;
              const opponent = getTeamByIdLocal(isHome ? game.away_team_id : game.home_team_id);
              const teamScore = isHome ? game.home_score : game.away_score;
              const oppScore = isHome ? game.away_score : game.home_score;
              const won = (teamScore || 0) > (oppScore || 0);
              
              return (
                <div key={game.id} className="flex items-center justify-between p-3 bg-mc-surface-light border border-mc-border">
                  <div className="flex items-center gap-3">
                    <span className={`font-bold px-3 py-1 rounded text-sm ${won ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                      {won ? 'W' : 'L'}
                    </span>
                    <span className="text-mc-text-muted">{isHome ? 'vs' : '@'}</span>
                    <Link to={`/team/${opponent?.id}`} className="flex items-center gap-2 hover:text-mc-accent">
                      {opponent && <TeamLogo team={opponent} size={24} />}
                      <span className="font-bold text-mc-text">{opponent?.name}</span>
                    </Link>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-mc-text">{teamScore} - {oppScore}</div>
                    <div className="text-sm text-mc-text-muted">
                      {new Date(game.scheduled_date || '').toLocaleDateString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <Link to="/games" className="block mt-4 text-center text-mc-accent hover:underline">
            View All Games
          </Link>
        </div>
      )}
    </div>
  );
}
