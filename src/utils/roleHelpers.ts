import { User } from '../types';

/**
 * Check if a user has a specific Discord role
 */
export function hasDiscordRole(user: User | null, roleId: string): boolean {
  return user?.discord_roles?.includes(roleId) || false;
}
