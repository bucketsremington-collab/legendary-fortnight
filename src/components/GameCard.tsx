import { Link } from 'react-router-dom';
import { Game } from '../types';
import { getTeamById, getUserById } from '../data/mockData';
import { formatDateTime } from '../utils/helpers';
import { Clock, MapPin, Trophy } from 'lucide-react';

interface GameCardProps {
  game: Game;
}

export default function GameCard({ game }: GameCardProps) {
  const homeTeam = getTeamById(game.home_team_id);
  const awayTeam = getTeamById(game.away_team_id);
  const mvp = game.mvp_player_id ? getUserById(game.mvp_player_id) : null;

  if (!homeTeam || !awayTeam) return null;

  const isCompleted = game.status === 'completed';
  const isLive = game.status === 'live';
  const homeWon = isCompleted && game.home_score > game.away_score;
  const awayWon = isCompleted && game.away_score > game.home_score;

  return (
    <div className="mc-card overflow-hidden hover:border-mc-accent transition-colors">
      {/* Status bar */}
      <div className={`
        px-4 py-2 flex items-center justify-between text-sm
        ${isLive ? 'bg-red-500/20 text-red-400' : 'bg-mc-darker text-mc-text-muted'}
      `}>
        <div className="flex items-center gap-2">
          {isLive ? (
            <>
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              <span className="font-medium">LIVE</span>
            </>
          ) : (
            <>
              <Clock className="w-4 h-4" />
              <span>{formatDateTime(game.scheduled_date)}</span>
            </>
          )}
        </div>
        {game.is_playoff && (
          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs font-medium">
            PLAYOFFS
          </span>
        )}
      </div>

      {/* Teams */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          {/* Away Team */}
          <Link 
            to={`/team/${awayTeam.id}`}
            className="flex-1 flex items-center gap-3 group"
          >
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold group-hover:scale-105 transition-transform"
              style={{ backgroundColor: awayTeam.primary_color }}
            >
              {awayTeam.abbreviation}
            </div>
            <div>
              <p className={`font-semibold group-hover:text-mc-accent transition-colors ${awayWon ? 'text-mc-text' : 'text-mc-text-muted'}`}>
                {awayTeam.name}
              </p>
              <p className="text-xs text-mc-text-muted">{awayTeam.wins}-{awayTeam.losses}</p>
            </div>
          </Link>

          {/* Score */}
          <div className="px-6 text-center">
            {isCompleted || isLive ? (
              <div className="flex items-center gap-4">
                <span className={`text-2xl font-bold ${awayWon ? 'text-mc-text' : 'text-mc-text-muted'}`}>
                  {game.away_score}
                </span>
                <span className="text-mc-border">-</span>
                <span className={`text-2xl font-bold ${homeWon ? 'text-mc-text' : 'text-mc-text-muted'}`}>
                  {game.home_score}
                </span>
              </div>
            ) : (
              <span className="text-mc-text-muted text-lg">VS</span>
            )}
            {isCompleted && (
              <span className="text-xs text-mc-text-muted">Final</span>
            )}
          </div>

          {/* Home Team */}
          <Link 
            to={`/team/${homeTeam.id}`}
            className="flex-1 flex items-center gap-3 justify-end group"
          >
            <div className="text-right">
              <p className={`font-semibold group-hover:text-mc-accent transition-colors ${homeWon ? 'text-mc-text' : 'text-mc-text-muted'}`}>
                {homeTeam.name}
              </p>
              <p className="text-xs text-mc-text-muted">{homeTeam.wins}-{homeTeam.losses}</p>
            </div>
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold group-hover:scale-105 transition-transform"
              style={{ backgroundColor: homeTeam.primary_color }}
            >
              {homeTeam.abbreviation}
            </div>
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-mc-border flex items-center justify-between text-sm">
          {game.arena && (
            <div className="flex items-center gap-2 text-mc-text-muted">
              <MapPin className="w-4 h-4" />
              <span>{game.arena}</span>
            </div>
          )}
          
          {mvp && isCompleted && (
            <Link 
              to={`/profile/${mvp.username}`}
              className="flex items-center gap-2 text-amber-400 hover:text-amber-300"
            >
              <Trophy className="w-4 h-4" />
              <span>MVP: {mvp.display_name}</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
