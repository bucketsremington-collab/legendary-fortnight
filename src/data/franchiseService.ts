import { supabase } from '../lib/supabase';

export interface TransactionHistory {
  guild_id: string;
  transaction_type: 'sign' | 'release' | 'trade' | 'demand' | 'offer';
  player_id: string;
  from_team_id?: string;
  to_team_id?: string;
  performed_by: string;
  notes?: string;
  created_at: string;
}

const GUILD_ID = import.meta.env.VITE_MBA_DISCORD_SERVER_ID;

/**
 * Sign a player to a team
 */
export async function signPlayer(teamId: string, playerId: string, coachId: string): Promise<{ success: boolean; message: string }> {
  try {
    // Check if player is already on a team
    const { data: player } = await supabase!
      .from('users')
      .select('team_id')
      .eq('id', playerId)
      .single();

    if (player?.team_id) {
      return { success: false, message: 'Player is already on a team' };
    }

    // Get roster count
    const { data: roster } = await supabase!
      .from('users')
      .select('id')
      .eq('team_id', teamId);

    const rosterCount = roster?.length || 0;
    const rosterCap = 10; // TODO: Make this configurable

    if (rosterCount >= rosterCap) {
      return { success: false, message: `Roster is full (${rosterCount}/${rosterCap})` };
    }

    // Sign player to team
    const { error } = await supabase!
      .from('users')
      .update({ team_id: teamId })
      .eq('id', playerId);

    if (error) throw error;

    // Log to transaction_history
    await logTransaction({
      guild_id: GUILD_ID,
      transaction_type: 'sign',
      player_id: playerId,
      from_team_id: undefined,
      to_team_id: teamId,
      performed_by: coachId,
      notes: 'Player signed via web app',
      created_at: new Date().toISOString()
    });

    // Sync Discord role
    await syncDiscordRole('add', playerId, teamId);

    // Send Discord notification
    await sendDiscordNotification('sign', {
      playerId,
      teamId,
      coachId,
      rosterCount: rosterCount + 1,
      rosterCap
    });

    return { success: true, message: 'Player signed successfully' };
  } catch (error) {
    console.error('Error signing player:', error);
    return { success: false, message: 'Failed to sign player' };
  }
}

/**
 * Release a player from a team
 */
export async function releasePlayer(teamId: string, playerId: string, coachId: string): Promise<{ success: boolean; message: string }> {
  try {
    // Verify player is on the team
    const { data: player } = await supabase!
      .from('users')
      .select('team_id')
      .eq('id', playerId)
      .single();

    if (player?.team_id !== teamId) {
      return { success: false, message: 'Player is not on this team' };
    }

    // Release player
    const { error } = await supabase!
      .from('users')
      .update({ team_id: null })
      .eq('id', playerId);

    if (error) throw error;

    // Get roster count after release
    const { data: roster } = await supabase!
      .from('users')
      .select('id')
      .eq('team_id', teamId);

    const rosterCount = roster?.length || 0;

    // Log to transaction_history
    await logTransaction({
      guild_id: GUILD_ID,
      transaction_type: 'release',
      player_id: playerId,
      from_team_id: teamId,
      to_team_id: undefined,
      performed_by: coachId,
      notes: 'Player released via web app',
      created_at: new Date().toISOString()
    });

    // Sync Discord role
    await syncDiscordRole('remove', playerId, teamId);

    // Send Discord notification
    await sendDiscordNotification('release', {
      playerId,
      teamId,
      coachId,
      rosterCount,
      rosterCap: 10
    });

    return { success: true, message: 'Player released successfully' };
  } catch (error) {
    console.error('Error releasing player:', error);
    return { success: false, message: 'Failed to release player' };
  }
}

/**
 * Log transaction to transaction_history table
 */
async function logTransaction(transaction: TransactionHistory) {
  try {
    await supabase!
      .from('transaction_history')
      .insert(transaction);
  } catch (error) {
    console.error('Error logging transaction:', error);
  }
}

/**
 * Sync Discord roles via Edge Function
 */
async function syncDiscordRole(action: 'add' | 'remove', playerId: string, teamId: string) {
  try {
    // Get player's Discord ID
    const { data: player } = await supabase!
      .from('users')
      .select('id, discord_id')
      .eq('id', playerId)
      .single();

    if (!player?.discord_id) {
      console.warn('Player does not have a Discord ID');
      return;
    }

    // Get team's Discord role ID
    const { data: team } = await supabase!
      .from('teams')
      .select('team_role_id')
      .eq('id', teamId)
      .single();

    if (!team?.team_role_id) {
      console.warn('Team does not have a Discord role ID');
      return;
    }

    // Extract Discord ID from format 'discord-123456789'
    const discordId = player.discord_id.replace('discord-', '');

    // Call Edge Function to sync role
    const { error } = await supabase!.functions.invoke('discord-role-sync', {
      body: {
        action,
        userId: discordId,
        roleId: team.team_role_id
      }
    });

    if (error) {
      console.error('Error syncing Discord role:', error);
    }
  } catch (error) {
    console.error('Error in syncDiscordRole:', error);
  }
}

/**
 * Send Discord notification to transactions channel
 */
async function sendDiscordNotification(type: string, data: any) {
  const webhookUrl = import.meta.env.VITE_DISCORD_TRANSACTIONS_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('Discord transactions webhook URL not configured');
    return;
  }

  try {
    // Fetch user and team details
    const [playerRes, teamRes, coachRes] = await Promise.all([
      supabase!.from('users').select('*').eq('id', data.playerId).single(),
      supabase!.from('teams').select('*').eq('id', data.teamId).single(),
      supabase!.from('users').select('*').eq('id', data.coachId).single()
    ]);

    const player = playerRes.data;
    const team = teamRes.data;
    const coach = coachRes.data;

    if (!player || !team || !coach) return;

    let embed;
    if (type === 'sign') {
      embed = {
        title: '📝 Player Signed',
        description: `**${player.minecraft_username}** has signed with **${team.name}**!`,
        color: parseInt(team.primary_color?.replace('#', ''), 16) || 0x5865F2,
        fields: [
          { name: 'Player', value: player.minecraft_username, inline: true },
          { name: 'Team', value: team.name, inline: true },
          { name: 'Roster', value: `${data.rosterCount}/${data.rosterCap}`, inline: true },
          { name: 'Signed by', value: coach.minecraft_username, inline: false }
        ],
        thumbnail: { url: team.logo_url || '' },
        timestamp: new Date().toISOString()
      };
    } else if (type === 'release') {
      embed = {
        title: '📤 Player Released',
        description: `**${player.minecraft_username}** has been released from **${team.name}**.`,
        color: parseInt(team.primary_color?.replace('#', ''), 16) || 0x5865F2,
        fields: [
          { name: 'Player', value: player.minecraft_username, inline: true },
          { name: 'Former Team', value: team.name, inline: true },
          { name: 'Roster', value: `${data.rosterCount}/${data.rosterCap}`, inline: true },
          { name: 'Released by', value: coach.minecraft_username, inline: false }
        ],
        thumbnail: { url: team.logo_url || '' },
        timestamp: new Date().toISOString()
      };
    }

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    });
  } catch (error) {
    console.error('Error sending Discord notification:', error);
  }
}
