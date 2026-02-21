import { supabase, GymLog } from './supabase'

export async function getCurrentCapacity() {
  const { data, error } = await supabase
    .from('gym_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5) // Get latest entry for each of 5 rooms

  if (error) throw error
  return data as GymLog[]
}

export async function getHistoricalData(hours: number = 24) {
  const startTime = new Date()
  startTime.setHours(startTime.getHours() - hours)

  console.log('Querying historical data from:', startTime.toISOString())

  // Fetch data with pagination to get more than 1000 rows
  let allData: GymLog[] = []
  let from = 0
  const pageSize = 1000
  
  while (true) {
    const { data, error } = await supabase
      .from('gym_logs')
      .select('*')
      .gte('created_at', startTime.toISOString())
      .order('created_at', { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) throw error
    if (!data || data.length === 0) break
    
    allData = allData.concat(data)
    
    // If we got less than a full page, we're done
    if (data.length < pageSize) break
    
    from += pageSize
  }
  
  console.log(`Received ${allData.length} data points`)
  if (allData.length > 0) {
    console.log('Latest data point:', allData[allData.length - 1].created_at)
  }
  
  return allData as GymLog[]
}

export async function getIncrementalData(afterTimestamp: string) {
  console.log('Fetching incremental data after:', afterTimestamp)
  
  const { data, error } = await supabase
    .from('gym_logs')
    .select('*')
    .gt('created_at', afterTimestamp)
    .order('created_at', { ascending: true })
    .limit(100) // Only fetch up to 100 new rows (should be max ~20 minutes)

  if (error) throw error
  
  console.log(`Received ${data?.length || 0} new data points`)
  return data as GymLog[]
}

export async function getRoomData(roomName: string, hours: number = 24) {
  const startTime = new Date()
  startTime.setHours(startTime.getHours() - hours)

  const { data, error } = await supabase
    .from('gym_logs')
    .select('*')
    .eq('room_name', roomName)
    .gte('created_at', startTime.toISOString())
    .order('created_at', { ascending: true })

  if (error) throw error
  return data as GymLog[]
}

export const ROOMS = {
  Total: { maxCapacity: 150, color: '#8b5cf6', displayName: 'Total' },
  Main: { maxCapacity: 80, color: '#3b82f6', displayName: 'Main' },
  Extension: { maxCapacity: 40, color: '#10b981', displayName: 'Extension' },
  Annex: { maxCapacity: 30, color: '#f59e0b', displayName: 'Annex' },
  CMS: { maxCapacity: 55, color: '#ef4444', displayName: 'Stadium Fitness Center (CMS)' },
} as const

export type RoomName = keyof typeof ROOMS
export const ROOM_NAMES: RoomName[] = ['Total', 'Main', 'Extension', 'Annex', 'CMS']
