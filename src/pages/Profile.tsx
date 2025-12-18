import { useParams, Link } from 'react-router-dom';
import { 
  mockUsers,
  mockTeams,
  getTeamById,
  getPlayerStatsByUserId,
  getAccoladesByUserId,
} from '../data/mockData';
import { calculateStats } from '../utils/helpers';
import MinecraftHead from '../components/MinecraftHead';

// Team Logo component with fallback to abbreviation
function TeamLogo({ team, size = 40 }: { team: typeof mockTeams[0], size?: number }) {
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

  // Find user by username
  const user = mockUsers.find(u => u.username.toLowerCase() === username?.toLowerCase());
  
  if (!user) {
    return (
      <div className="mc-card p-8 text-center">
        <h1 className="text-2xl font-bold text-mc-text mb-2">Player Not Found</h1>
        <p className="text-mc-text-muted mb-4">The player you're looking for doesn't exist.</p>
        <Link to="/" className="text-mc-accent hover:underline">
          Return to Home
        </Link>
      </div>
    );
  }

  const team = user.team_id ? getTeamById(user.team_id) : null;
  const stats = getPlayerStatsByUserId(user.id);
  const accolades = getAccoladesByUserId(user.id);
  const calculated = stats ? calculateStats(stats) : null;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Profile Card */}
      <div className="mc-card overflow-hidden">
        {/* Header with team color */}
        <div 
          className="h-20"
          style={{ backgroundColor: team?.primary_color || '#5D8A32' }}
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

          {/* Name & IGN */}
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-mc-text">{user.minecraft_username}</h1>
            <p className="text-mc-text-muted">@{user.username}</p>
          </div>

          {/* Bio */}
          {user.bio && (
            <p className="text-mc-text mb-4">{user.bio}</p>
          )}

          {/* Team */}
          {team && (
            <Link 
              to={`/team/${team.id}`}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-mc-surface-light border border-mc-border hover:border-mc-accent transition-colors mb-4"
            >
              <TeamLogo team={team} size={20} />
              <span className="text-mc-text font-bold">{team.name}</span>
            </Link>
          )}

          {!team && (
            <span className="inline-block px-3 py-1.5 bg-mc-surface-light border border-mc-border text-mc-text-muted mb-4">
              Free Agent
            </span>
          )}

          {/* Discord Info */}
          <div className="flex items-center gap-2 text-mc-text-muted">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            <span>{user.username}</span>
          </div>
        </div>
      </div>

      {/* Stats Card */}
      {stats && calculated && (
        <div className="mc-card p-6">
          <h2 className="text-lg font-bold text-mc-text border-b border-mc-border pb-2 mb-4">Season Stats</h2>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-mc-surface-light border border-mc-border">
              <div className="text-2xl font-bold text-mc-accent">{stats.games_played}</div>
              <div className="text-sm text-mc-text-muted">Games</div>
            </div>
            <div className="text-center p-3 bg-mc-surface-light border border-mc-border">
              <div className="text-2xl font-bold text-mc-accent">{calculated.ppg.toFixed(1)}</div>
              <div className="text-sm text-mc-text-muted">PPG</div>
            </div>
            <div className="text-center p-3 bg-mc-surface-light border border-mc-border">
              <div className="text-2xl font-bold text-mc-accent">{calculated.apg.toFixed(1)}</div>
              <div className="text-sm text-mc-text-muted">APG</div>
            </div>
            <div className="text-center p-3 bg-mc-surface-light border border-mc-border">
              <div className="text-2xl font-bold text-mc-accent">{calculated.rpg.toFixed(1)}</div>
              <div className="text-sm text-mc-text-muted">RPG</div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mt-4">
            <div className="text-center p-3 bg-mc-surface-light border border-mc-border">
              <div className="text-xl font-bold text-mc-text">{stats.points_scored}</div>
              <div className="text-sm text-mc-text-muted">PTS</div>
            </div>
            <div className="text-center p-3 bg-mc-surface-light border border-mc-border">
              <div className="text-xl font-bold text-mc-text">{stats.assists}</div>
              <div className="text-sm text-mc-text-muted">AST</div>
            </div>
            <div className="text-center p-3 bg-mc-surface-light border border-mc-border">
              <div className="text-xl font-bold text-mc-text">{stats.steals}</div>
              <div className="text-sm text-mc-text-muted">STL</div>
            </div>
            <div className="text-center p-3 bg-mc-surface-light border border-mc-border">
              <div className="text-xl font-bold text-mc-text">{stats.blocks}</div>
              <div className="text-sm text-mc-text-muted">BLK</div>
            </div>
          </div>
        </div>
      )}

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
