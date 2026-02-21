// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

// Room configuration (fallback if not in env)
const ROOM_NAMES = ["Total", "Main Weight Room", "Extension", "Annex", "CMS"]
const MAX_CAPACITIES = [150, 80, 40, 30, 55]

interface DensityResponse {
  count: number
}

interface GymLog {
  room_name: string
  count: number
  percentage: number
}

// Fetch count from Density API with error handling
async function fetchGymCount(
  spaceId: string, 
  token: string, 
  roomName: string
): Promise<{ success: true; count: number } | { success: false; error: string }> {
  try {
    const url = `https://api.density.io/v2/spaces/${spaceId}/count`
    
    const response = await fetch(url, {
      headers: { "Authorization": `Bearer ${token}` },
    })

    if (!response.ok) {
      return { 
        success: false, 
        error: `API error: ${response.status} ${response.statusText}` 
      }
    }

    const data: DensityResponse = await response.json()
    return { success: true, count: data.count }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }
  }
}

Deno.serve(async (req) => {
  try {
    // Get environment variables
    const densityToken = Deno.env.get("DENSITY_TOKEN")
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    const roomIdsEnv = Deno.env.get("ROOM_IDS")

    // Validate required secrets
    if (!densityToken) {
      throw new Error("DENSITY_TOKEN is not set")
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase credentials are not set")
    }

    if (!roomIdsEnv) {
      throw new Error("ROOM_IDS is not set")
    }

    const ROOM_IDS = roomIdsEnv.split(",").map(id => id.trim())

    // Validate configuration
    if (ROOM_IDS.length !== ROOM_NAMES.length || ROOM_IDS.length !== MAX_CAPACITIES.length) {
      throw new Error("Configuration mismatch: ROOM_IDS, ROOM_NAMES, and MAX_CAPACITIES must have same length")
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log(`Starting gym capacity scrape for ${ROOM_IDS.length} rooms...`)

    // Fetch all rooms in parallel for speed
    const fetchPromises = ROOM_IDS.map((roomId, index) => 
      fetchGymCount(roomId, densityToken, ROOM_NAMES[index])
    )

    const fetchResults = await Promise.all(fetchPromises)

    // Process results with error resilience
    const results: GymLog[] = []
    
    for (let i = 0; i < fetchResults.length; i++) {
      const result = fetchResults[i]
      const roomName = ROOM_NAMES[i]
      const maxCapacity = MAX_CAPACITIES[i]

      if (result.success) {
        const percentage = (result.count / maxCapacity) * 100
        
        results.push({
          room_name: roomName,
          count: result.count,
          percentage: Number(percentage.toFixed(2)), // Round to 2 decimals
        })

        console.log(`✓ ${roomName}: ${result.count}/${maxCapacity} (${percentage.toFixed(1)}%)`)
      } else {
        console.error(`✗ ${roomName}: ${result.error}`)
        // Continue with other rooms even if one fails
      }
    }

    // Insert all successful results into Supabase
    if (results.length > 0) {
      const { error } = await supabase
        .from("gym_logs")
        .insert(results)

      if (error) {
        throw new Error(`Supabase insert error: ${error.message}`)
      }

      console.log(`Successfully inserted ${results.length}/${ROOM_IDS.length} records`)
    } else {
      console.warn("No records to insert - all rooms failed")
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Scraped ${results.length}/${ROOM_IDS.length} rooms successfully`,
        data: results,
        failed: ROOM_IDS.length - results.length,
      }),
      { 
        headers: { "Content-Type": "application/json" },
        status: 200,
      },
    )
  } catch (error) {
    console.error("Error in gym-scraper:", error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { 
        headers: { "Content-Type": "application/json" },
        status: 500,
      },
    )
  }
})

/* To invoke locally:

  1. Run `supabase start`
  2. Set environment variables in .env file
  3. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/gym-scraper' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

  Or to invoke from QStash:
  - Set as a scheduled job with your deployed function URL
  - QStash will POST to the function every minute

*/
