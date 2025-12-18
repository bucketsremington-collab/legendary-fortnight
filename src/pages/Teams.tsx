import { Link } from 'react-router-dom';
import { mockTeams, getTeamMembers } from '../data/mockData';
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
        onError={(e) => {
          // Fallback to abbreviation if image fails to load
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          target.nextElementSibling?.classList.remove('hidden');
        }}
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

export default function Teams() {
  // Sort teams by win percentage
  const sortedTeams = [...mockTeams].sort((a, b) => {
    const aWinPct = a.wins / (a.wins + a.losses) || 0;
    const bWinPct = b.wins / (b.wins + b.losses) || 0;
    return bWinPct - aWinPct;
  });

  return (
    <div className="space-y-6">
      <div className="mc-card p-6">
        <h1 className="text-2xl font-bold text-mc-text mb-2">MBA Teams</h1>
        <p className="text-mc-text-muted">All teams competing in the Minecraft Basketball Association</p>
      </div>

      {/* Standings Table */}
      <div className="mc-card overflow-hidden">
        <table className="w-full">
          <thead className="bg-mc-darker border-b border-mc-border">
            <tr>
              <th className="text-left px-4 py-3 text-mc-text-muted">#</th>
              <th className="text-left px-4 py-3 text-mc-text-muted">Team</th>
              <th className="text-center px-3 py-3 text-mc-text-muted">W</th>
              <th className="text-center px-3 py-3 text-mc-text-muted">L</th>
              <th className="text-center px-3 py-3 text-mc-text-muted">PCT</th>
              <th className="text-left px-3 py-3 text-mc-text-muted hidden md:table-cell">Roster</th>
            </tr>
          </thead>
          <tbody>
            {sortedTeams.map((team, index) => {
              const winPct = team.wins + team.losses > 0 
                ? (team.wins / (team.wins + team.losses)).toFixed(3).slice(1) 
                : '.000';
              const members = getTeamMembers(team.id);

              return (
                <tr key={team.id} className="border-b border-mc-border hover:bg-mc-surface-light transition-colors">
                  <td className="px-4 py-3 font-bold text-mc-text-muted">{index + 1}</td>
                  <td className="px-4 py-3">
                    <Link to={`/team/${team.id}`} className="flex items-center gap-3 hover:text-mc-accent">
                      <TeamLogo team={team} size={32} />
                      <span className="font-bold text-mc-text">{team.name}</span>
                    </Link>
                  </td>
                  <td className="text-center px-3 py-3 text-green-400 font-bold">{team.wins}</td>
                  <td className="text-center px-3 py-3 text-red-400 font-bold">{team.losses}</td>
                  <td className="text-center px-3 py-3 text-mc-text">{winPct}</td>
                  <td className="px-3 py-3 hidden md:table-cell">
                    <div className="flex gap-1">
                      {members.slice(0, 5).map(member => (
                        <MinecraftHead 
                          key={member.id} 
                          username={member.minecraft_username} 
                          size={24}
                        />
                      ))}
                      {members.length > 5 && (
                        <span className="text-mc-text-muted text-sm ml-1">+{members.length - 5}</span>
                      )}
                      {members.length === 0 && (
                        <span className="text-mc-text-muted text-sm">No players</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Team Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {mockTeams.map(team => {
          const members = getTeamMembers(team.id);
          
          return (
            <Link key={team.id} to={`/team/${team.id}`} className="mc-card overflow-hidden hover:border-mc-accent transition-colors">
              {/* Team Header */}
              <div 
                className="h-2"
                style={{ backgroundColor: team.primary_color }}
              />
              
              <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <TeamLogo team={team} size={48} />
                  <div>
                    <h3 className="font-bold text-mc-text">{team.name}</h3>
                    <p className="text-sm text-mc-text-muted">{team.wins}-{team.losses}</p>
                  </div>
                </div>
                
                {/* Player Heads */}
                {members.length > 0 ? (
                  <div className="flex gap-1 flex-wrap">
                    {members.slice(0, 6).map(member => (
                      <MinecraftHead 
                        key={member.id}
                        username={member.minecraft_username}
                        size={24}
                      />
                    ))}
                    {members.length > 6 && (
                      <div className="w-6 h-6 bg-mc-surface-light rounded flex items-center justify-center text-xs text-mc-text-muted">
                        +{members.length - 6}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-mc-text-muted">No players yet</p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
