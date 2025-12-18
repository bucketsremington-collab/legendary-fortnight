// Minecraft head/avatar component using Crafatar API
// https://crafatar.com - provides Minecraft skin renders

interface MinecraftHeadProps {
  username: string;
  size?: number;
  className?: string;
}

// Uses Crafatar to get Minecraft head from username
// Falls back to mc-heads.net if needed
export function getMinecraftHeadUrl(username: string, size: number = 32): string {
  // Crafatar uses UUIDs, but mc-heads.net works with usernames
  return `https://mc-heads.net/avatar/${username}/${size}`;
}

export function getMinecraftBodyUrl(username: string, size: number = 64): string {
  return `https://mc-heads.net/body/${username}/${size}`;
}

export default function MinecraftHead({ username, size = 32, className = '' }: MinecraftHeadProps) {
  return (
    <img 
      src={getMinecraftHeadUrl(username, size)}
      alt={username}
      width={size}
      height={size}
      className={`mc-head ${className}`}
      onError={(e) => {
        // Fallback to a default skin if the username doesn't exist
        (e.target as HTMLImageElement).src = `https://mc-heads.net/avatar/MHF_Steve/${size}`;
      }}
    />
  );
}
