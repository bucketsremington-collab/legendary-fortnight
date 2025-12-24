import { useState, useEffect } from 'react';
import { fetchGames, fetchTeams } from '../data/dataService';
import { Team, Game } from '../types';
import { Link } from 'react-router-dom';

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

// Helper component for team display
function TeamBadge({ team, showName = true }: { team: Team | undefined, showName?: boolean }) {
  if (!team) return null;
  
  return (
    <div className="flex items-center gap-2">
      <TeamLogo team={team} size={40} />
      {showName && <span className="font-bold text-mc-text hidden sm:inline">{team.name}</span>}
    </div>
  );
}

export default function Games() {
  const [games, setGames] = useState<Game[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState<string>('S0');

  // Note: Data refresh happens via 5-minute interval when tab is active

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [gamesData, teamsData] = await Promise.all([
          fetchGames(),
          fetchTeams(),
        ]);
        setGames(gamesData);
        setTeams(teamsData);
      } catch (err) {
        console.error('Error loading games:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    // Reload data every 5 minutes
    const reloadInterval = setInterval(() => {
      console.log('[Games] 5-minute interval triggered - reloading data');
      loadData();
    }, 5 * 60 * 1000);

    return () => clearInterval(reloadInterval);
  }, []);

  const getTeamById = (id: string) => teams.find(t => t.id === id);

  // Filter games by selected season
  const seasonGames = games.filter(g => g.season === selectedSeason);
  const upcomingGames = seasonGames.filter(g => g.status === 'scheduled');
  const completedGames = seasonGames.filter(g => g.status === 'completed');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-mc-text-muted">Loading games...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mc-card p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-mc-text mb-2">Games</h1>
            <p className="text-mc-text-muted">MBA game schedule and results</p>
          </div>
          <select
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(e.target.value)}
            title="Select season"
            className="px-3 py-2 bg-mc-surface border border-mc-border rounded text-mc-text focus:outline-none focus:border-mc-accent"
          >
            {AVAILABLE_SEASONS.map(season => (
              <option key={season} value={season}>
                Season {season.replace('S', '')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Upcoming Games */}
      <div className="mc-card p-6">
        <h2 className="text-lg font-bold text-mc-text border-b border-mc-border pb-2 mb-4">
          Upcoming Games
        </h2>
        
        {upcomingGames.length > 0 ? (
          <div className="space-y-3">
            {upcomingGames.map(game => {
              const homeTeam = getTeamById(game.home_team_id);
              const awayTeam = getTeamById(game.away_team_id);
              
              return (
                <div key={game.id} className="p-4 bg-mc-surface-light border border-mc-border flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Link to={`/team/${homeTeam?.id}`} className="flex items-center gap-2 hover:opacity-80">
                      <TeamBadge team={homeTeam} />
                    </Link>
                    
                    <span className="text-mc-text-muted font-bold">vs</span>
                    
                    <Link to={`/team/${awayTeam?.id}`} className="flex items-center gap-2 hover:opacity-80">
                      <TeamBadge team={awayTeam} />
                    </Link>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-mc-text font-bold">
                      {new Date(game.scheduled_date || '').toLocaleDateString()}
                    </div>
                    <div className="text-sm text-mc-text-muted">
                      {new Date(game.scheduled_date || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-mc-text-muted">No upcoming games scheduled</p>
        )}
      </div>

      {/* Completed Games */}
      <div className="mc-card p-6">
        <h2 className="text-lg font-bold text-mc-text border-b border-mc-border pb-2 mb-4">
          Recent Results
        </h2>
        
        {completedGames.length > 0 ? (
          <div className="space-y-3">
            {completedGames.map(game => {
              const homeTeam = getTeamById(game.home_team_id);
              const awayTeam = getTeamById(game.away_team_id);
              const homeWon = (game.home_score || 0) > (game.away_score || 0);
              
              return (
                <div key={game.id} className="p-4 bg-mc-surface-light border border-mc-border">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <Link to={`/team/${homeTeam?.id}`} className="flex items-center gap-3 hover:opacity-80">
                        <TeamBadge team={homeTeam} showName={false} />
                        <span className={`font-bold ${homeWon ? 'text-mc-accent' : 'text-mc-text'}`}>
                          {homeTeam?.name}
                        </span>
                      </Link>
                    </div>
                    
                    <div className="text-center px-4">
                      <div className="text-2xl font-bold">
                        <span className={homeWon ? 'text-mc-accent' : 'text-mc-text'}>{game.home_score}</span>
                        <span className="text-mc-text-muted mx-2">-</span>
                        <span className={!homeWon ? 'text-mc-accent' : 'text-mc-text'}>{game.away_score}</span>
                      </div>
                      <div className="text-sm text-mc-text-muted">FINAL</div>
                    </div>
                    
                    <div className="flex-1 text-right">
                      <Link to={`/team/${awayTeam?.id}`} className="inline-flex items-center gap-3 hover:opacity-80">
                        <span className={`font-bold ${!homeWon ? 'text-mc-accent' : 'text-mc-text'}`}>
                          {awayTeam?.name}
                        </span>
                        <TeamBadge team={awayTeam} showName={false} />
                      </Link>
                    </div>
                  </div>
                  
                  <div className="text-sm text-mc-text-muted text-center mt-2">
                    {new Date(game.scheduled_date || '').toLocaleDateString()}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-mc-text-muted">No completed games yet</p>
        )}
      </div>
    </div>
  );
}
