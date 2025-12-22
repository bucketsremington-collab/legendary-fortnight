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
    const pathParts = url.pathname.split('/').filter(Boolean)
    const playerUUID = pathParts[pathParts.length - 1] // Get last part of path
    const season = url.searchParams.get('season') || '1'
    
    // Connect to MySQL database
    const client = await new Client().connect({
      hostname: "sql1.revivenode.com",
      username: "u33066_lxlvlVUN8X",
      db: "s33066_MBA",
      password: "=j22tJcO3+=vXg@jFNSzma6L",
      port: 3306,
    })

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
