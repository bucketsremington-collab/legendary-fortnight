// Test Edge Function to query MySQL database structure
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Client } from "https://deno.land/x/mysql@v2.12.1/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const client = await new Client().connect({
      hostname: "sql1.revivenode.com",
      username: "u33066_lxlvlVUN8X",
      db: "s33066_MBA",
      password: "=j22tJcO3+=vXg@jFNSzma6L",
      port: 3306,
    })

    // Get all tables in the database
    const tables = await client.query(`SHOW TABLES`)
    
    await client.close()

    return new Response(
      JSON.stringify({ 
        database: 's33066_MBA',
        tables: tables.rows 
      }, null, 2),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
