import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const DISCORD_BOT_TOKEN = Deno.env.get('DISCORD_BOT_TOKEN');
const GUILD_ID = Deno.env.get('VITE_MBA_DISCORD_SERVER_ID');

interface RoleSyncRequest {
  action: 'add' | 'remove';
  userId: string; // Discord user ID
  roleId: string; // Discord role ID
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    if (!DISCORD_BOT_TOKEN) {
      throw new Error('DISCORD_BOT_TOKEN not configured');
    }

    if (!GUILD_ID) {
      throw new Error('VITE_MBA_DISCORD_SERVER_ID not configured');
    }

    const { action, userId, roleId }: RoleSyncRequest = await req.json();

    if (!action || !userId || !roleId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: action, userId, roleId' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Discord API endpoint to add/remove role
    const method = action === 'add' ? 'PUT' : 'DELETE';
    const endpoint = `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userId}/roles/${roleId}`;

    const response = await fetch(endpoint, {
      method,
      headers: {
        'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Discord API error:', errorText);
      
      // Return success even if user isn't in server or role doesn't exist
      // This prevents blocking transactions for non-Discord users
      if (response.status === 404 || response.status === 403) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            warning: 'User not in Discord server or role not found',
            status: response.status 
          }),
          { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }

      throw new Error(`Discord API error: ${response.status} ${errorText}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        action, 
        userId, 
        roleId 
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in discord-role-sync:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
});
