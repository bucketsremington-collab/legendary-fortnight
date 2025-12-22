// Supabase Edge Function to query MySQL database for park stats
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Client } from "https://deno.land/x/mysql@v2.12.1/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const fetchAll = url.searchParams.get('all') === 'true'
    const season = url.searchParams.get('season') || '1'
    
    // Connect to MySQL database
    const client = await new Client().connect({
      hostname: "sql1.revivenode.com",
      username: "u33066_lxlvlVUN8X",
      db: "s33066_MBA",
      password: "=j22tJcO3+=vXg@jFNSzma6L",
      port: 3306,
    })

    // If fetching all players
    if (fetchAll) {
      const result = await client.execute('SELECT * FROM players')
      await client.close()

      if (!result.rows || result.rows.length === 0) {
        return new Response(
          JSON.stringify([]),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Map all players to stats format
      const allStats = result.rows.map((row: any) => ({
        player_uuid: row.uuid,
        player_name: row.ign || 'Unknown',
        season: parseInt(season),
        wins: row.SEASON_1_WINS || 0,
        losses: row.SEASON_1_LOSSES || 0,
        games_played: row.SEASON_1_GAMES_PLAYED || 0,
        points: row.SEASON_1_POINTS || 0,
        assists: row.SEASON_1_ASSISTS || 0,
        rebounds: row.SEASON_1_REBOUNDS || 0,
        steals: row.SEASON_1_STEALS || 0,
        blocks: row.SEASON_1_BLOCKS || 0,
        turnovers: row.SEASON_1_TURNOVERS || 0,
        fg_made: row.SEASON_1_FG_MADE || 0,
        fg_attempted: row.SEASON_1_FG_ATTEMPTED || 0,
        three_fg_made: row.SEASON_1_3FG_MADE || 0,
        three_fg_attempted: row.SEASON_1_3FG_ATTEMPTED || 0,
        threes: row.SEASON_1_THREES || 0,
      }))

      return new Response(
        JSON.stringify(allStats),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Individual player lookup
    const pathParts = url.pathname.split('/').filter(Boolean)
    let playerIdentifier = pathParts[pathParts.length - 1]
    let playerUUID = playerIdentifier;
    
    // If the identifier doesn't look like a UUID (no dashes), try to convert from username to UUID
    if (!playerIdentifier.includes('-')) {
      // Call Mojang API to convert username to UUID
      try {
        const mojangResponse = await fetch(`https://api.mojang.com/users/profiles/minecraft/${playerIdentifier}`);
        if (mojangResponse.ok) {
          const mojangData = await mojangResponse.json();
          const rawUuid = mojangData.id;
          // Format UUID with dashes
          playerUUID = `${rawUuid.slice(0,8)}-${rawUuid.slice(8,12)}-${rawUuid.slice(12,16)}-${rawUuid.slice(16,20)}-${rawUuid.slice(20)}`;
        }
      } catch (error) {
        console.log('Could not convert username to UUID:', error);
        // Continue with original identifier
      }
    }

    // Query player stats from the players table
    const result = await client.execute(
      `SELECT * FROM players WHERE uuid = ?`,
      [playerUUID]
    )

    await client.close()

    if (!result.rows || result.rows.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Player not found' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Map database columns to response format
    const row = result.rows[0]
    const stats = {
      player_uuid: row.uuid,
      player_name: row.ign || 'Unknown',
      season: parseInt(season),
      
      // Record
      wins: row.SEASON_1_WINS || 0,
      losses: row.SEASON_1_LOSSES || 0,
      games_played: row.SEASON_1_GAMES_PLAYED || 0,
      
      // Stats
      points: row.SEASON_1_POINTS || 0,
      assists: row.SEASON_1_ASSISTS || 0,
      rebounds: row.SEASON_1_REBOUNDS || 0,
      steals: row.SEASON_1_STEALS || 0,
      blocks: row.SEASON_1_BLOCKS || 0,
      turnovers: row.SEASON_1_TURNOVERS || 0,
      fg_made: row.SEASON_1_FG_MADE || 0,
      fg_attempted: row.SEASON_1_FG_ATTEMPTED || 0,
      three_fg_made: row.SEASON_1_3FG_MADE || 0,
      three_fg_attempted: row.SEASON_1_3FG_ATTEMPTED || 0,
      threes: row.SEASON_1_THREES || 0,
    }

    return new Response(
      JSON.stringify(stats),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
