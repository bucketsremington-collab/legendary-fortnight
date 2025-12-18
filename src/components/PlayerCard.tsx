import { Link } from 'react-router-dom';
import { User, PlayerStats } from '../types';
import { getInitials, calculateStats } from '../utils/helpers';
import { getTeamById } from '../data/mockData';
import { TrendingUp, Award } from 'lucide-react';
import MinecraftHead from './MinecraftHead';

interface PlayerCardProps {
  player: User;
  stats?: PlayerStats;
  accoladeCount?: number;
  showStats?: boolean;
}

export default function PlayerCard({ player, stats, accoladeCount = 0, showStats = true }: PlayerCardProps) {
  const team = player.team_id ? getTeamById(player.team_id) : null;
  const calculated = stats ? calculateStats(stats) : null;

  return (
    <Link 
      to={`/profile/${player.username}`}
      className="block mc-card hover:border-mc-accent transition-all duration-200 overflow-hidden group"
    >
      {/* Team color banner */}
      <div 
        className="h-16 relative"
        style={{ 
          background: team 
            ? `linear-gradient(135deg, ${team.primary_color}, ${team.secondary_color})`
            : 'linear-gradient(135deg, var(--mc-accent), #8B4513)'
        }}
      >
      </div>

      <div className="px-4 pb-4 -mt-8 relative">
        {/* Avatar */}
        <div className="w-16 h-16 rounded-xl border-4 border-mc-surface group-hover:scale-105 transition-transform overflow-hidden">
          <MinecraftHead username={player.minecraft_username} size={56} />
        </div>

        {/* Player Info */}
        <div className="mt-3">
          <h3 className="font-semibold text-mc-text group-hover:text-mc-accent transition-colors">
            {player.minecraft_username}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-mc-text-muted">@{player.username}</span>
            {team && (
              <span 
                className="px-2 py-0.5 rounded text-xs font-medium"
                style={{ 
                  backgroundColor: `${team.primary_color}20`,
                  color: team.primary_color 
                }}
              >
                {team.abbreviation}
              </span>
            )}
          </div>
          
          <p className="text-xs text-mc-text-muted capitalize mt-1">
            {player.role}
          </p>
        </div>

        {/* Stats Preview */}
        {showStats && calculated && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="text-center p-2 bg-mc-darker rounded-lg">
              <p className="text-lg font-bold text-mc-text">{calculated.ppg}</p>
              <p className="text-xs text-mc-text-muted">PPG</p>
            </div>
            <div className="text-center p-2 bg-mc-darker rounded-lg">
              <p className="text-lg font-bold text-mc-text">{calculated.rpg}</p>
              <p className="text-xs text-mc-text-muted">RPG</p>
            </div>
            <div className="text-center p-2 bg-mc-darker rounded-lg">
              <p className="text-lg font-bold text-mc-text">{calculated.apg}</p>
              <p className="text-xs text-mc-text-muted">APG</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between text-sm">
          {stats && (
            <div className="flex items-center gap-1 text-mc-text-muted">
              <TrendingUp className="w-4 h-4" />
              <span>{stats.games_won}-{stats.games_lost}</span>
            </div>
          )}
          {accoladeCount > 0 && (
            <div className="flex items-center gap-1 text-amber-500">
              <Award className="w-4 h-4" />
              <span>{accoladeCount}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
