import { supabase } from '../lib/supabase';

export interface TeamAction {
  type: 'sign' | 'release' | 'trade' | 'offer';
  player_id: string;
  team_id: string;
  coach_id: string;
  details?: any;
  created_at: string;
}

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

    // Log the action
    await logTeamAction({
      type: 'sign',
      player_id: playerId,
      team_id: teamId,
      coach_id: coachId,
      created_at: new Date().toISOString()
    });

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

    // Log the action
    await logTeamAction({
      type: 'release',
      player_id: playerId,
      team_id: teamId,
      coach_id: coachId,
      created_at: new Date().toISOString()
    });

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
 * Log team action to database
 */
async function logTeamAction(action: TeamAction) {
  try {
    await supabase!
      .from('team_actions')
      .insert(action);
  } catch (error) {
    console.error('Error logging team action:', error);
  }
}

/**
 * Send Discord notification via webhook
 */
async function sendDiscordNotification(type: string, data: any) {
  const webhookUrl = import.meta.env.VITE_DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('Discord webhook URL not configured');
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
