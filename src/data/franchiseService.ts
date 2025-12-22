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
const BOT_API_URL = import.meta.env.VITE_BOT_API_URL;
const BOT_API_KEY = import.meta.env.VITE_BOT_API_KEY;

/**
 * Sign a player to a team
 */
export async function signPlayer(teamId: string, playerId: string, coachId: string): Promise<{ success: boolean; message: string }> {
  try {
    // Check if player is already on a team
    const { data: player } = await supabase!
      .from('users')
      .select('team_id, discord_id')
      .eq('id', playerId)
      .single();

    if (player?.team_id) {
      return { success: false, message: 'Player is already on a team' };
    }

    if (!player?.discord_id) {
      return { success: false, message: 'Player must be linked to Discord' };
    }

    // Get roster count
    const { data: roster } = await supabase!
      .from('users')
      .select('id')
      .eq('team_id', teamId);

    const rosterCount = roster?.length || 0;
    const rosterCap = 10;

    if (rosterCount >= rosterCap) {
      return { success: false, message: `Roster is full (${rosterCount}/${rosterCap})` };
    }

    // Call bot API to handle the transaction
    const result = await callBotAPI('sign', {
      guild_id: GUILD_ID,
      player_id: player.discord_id.replace('discord-', ''),
      team_id: teamId,
      coach_id: coachId
    });

    if (!result.success) {
      return result;
    }

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
      .select('team_id, discord_id')
      .eq('id', playerId)
      .single();

    if (player?.team_id !== teamId) {
      return { success: false, message: 'Player is not on this team' };
    }

    if (!player?.discord_id) {
      return { success: false, message: 'Player must be linked to Discord' };
    }

    // Call bot API to handle the transaction
    const result = await callBotAPI('release', {
      guild_id: GUILD_ID,
      player_id: player.discord_id.replace('discord-', ''),
      team_id: teamId,
      coach_id: coachId
    });

    if (!result.success) {
      return result;
    }

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
 * Call bot API to execute transaction
 */
async function callBotAPI(action: 'sign' | 'release', data: any): Promise<{ success: boolean; message: string }> {
  if (!BOT_API_URL || !BOT_API_KEY) {
    return { success: false, message: 'Bot API not configured' };
  }

  try {
    const response = await fetch(`${BOT_API_URL}/api/transaction/${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': BOT_API_KEY
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, message: error.error || 'Bot API request failed' };
    }

    return await response.json();
  } catch (error) {
    console.error('Error calling bot API:', error);
    return { success: false, message: 'Failed to connect to bot API' };
  }
}
