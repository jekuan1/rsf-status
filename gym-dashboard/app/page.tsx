'use client'

import { useEffect, useState, useRef } from 'react'
import { getCurrentCapacity, getHistoricalData, getIncrementalData, ROOMS, ROOM_NAMES, RoomName } from '@/lib/gym-data'
import { GymLog } from '@/lib/supabase'
import { format } from 'date-fns'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function Dashboard() {
  const [currentData, setCurrentData] = useState<GymLog[]>([])
  const [historicalData, setHistoricalData] = useState<GymLog[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState(24)
  const [visibleRooms, setVisibleRooms] = useState<Set<RoomName>>(
    new Set(ROOM_NAMES)
  )
  const isInitialLoad = useRef(true)
  const lastTimestamp = useRef<string | null>(null)

  useEffect(() => {
    async function fetchFullData() {
      // Full data fetch for initial load or time range change
      if (isInitialLoad.current) {
        setLoading(true)
      }
      
      try {
        const [current, historical] = await Promise.all([
          getCurrentCapacity(),
          getHistoricalData(timeRange)
        ])
        setCurrentData(current)
        setHistoricalData(historical)
        
        // Update last timestamp
        if (historical.length > 0) {
          lastTimestamp.current = historical[historical.length - 1].created_at
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        if (isInitialLoad.current) {
          setLoading(false)
          isInitialLoad.current = false
        }
      }
    }

    async function fetchIncrementalData() {
      // Incremental fetch for auto-refresh
      if (!lastTimestamp.current) return
      
      try {
        const [current, newData] = await Promise.all([
          getCurrentCapacity(),
          getIncrementalData(lastTimestamp.current)
        ])
        
        setCurrentData(current)
        
        if (newData.length > 0) {
          setHistoricalData(prev => {
            // Filter out data points outside time range
            const cutoffTime = new Date()
            cutoffTime.setHours(cutoffTime.getHours() - timeRange)
            
            const filtered = prev.filter(item => 
              new Date(item.created_at) >= cutoffTime
            )
            
            return [...filtered, ...newData]
          })
          
          // Update last timestamp
          lastTimestamp.current = newData[newData.length - 1].created_at
        }
      } catch (error) {
        console.error('Error fetching incremental data:', error)
      }
    }

    // Initial full fetch
    fetchFullData()
    
    // Set up interval for incremental fetches
    const interval = setInterval(fetchIncrementalData, 60000)
    return () => clearInterval(interval)
  }, [timeRange])

  const toggleRoom = (room: RoomName) => {
    setVisibleRooms(prev => {
      const newSet = new Set(prev)
      if (newSet.has(room)) {
        newSet.delete(room)
      } else {
        newSet.add(room)
      }
      return newSet
    })
  }

  // Group data by time for charting - keep all points
  const chartData = historicalData.reduce((acc: any[], log) => {
    const time = format(new Date(log.created_at), 'h:mm a')
    const existing = acc.find(item => item.time === time)
    
    if (existing) {
      existing[log.room_name] = log.percentage
    } else {
      acc.push({
        time,
        timestamp: new Date(log.created_at).getTime(),
        [log.room_name]: log.percentage
      })
    }
    return acc
  }, [])

  // Extract only hourly times for x-axis tick display
  // Extract only hourly times for x-axis ticks
  const hourlyTicks = chartData
    .filter(item => {
      const parts = item.time.split(':')
      const minutes = parts[1]?.split(' ')[0]
      return minutes === '00'
    })
    .map(item => item.time)

  // Calculate Y-axis ticks: 25, 50, 75, 100, and max value
  const maxValue = Math.max(
    ...chartData.flatMap(item => 
      ROOM_NAMES.map(room => item[room] || 0)
    ),
    0
  )
  const yAxisTicks = [25, 50, 75, maxValue, 100]
    .filter((v, i, arr) => arr.indexOf(v) === i) // Remove duplicates
    .sort((a, b) => a - b)

  // Sort current data by room order
  const sortedCurrentData = [...currentData].sort((a, b) => {
    return ROOM_NAMES.indexOf(a.room_name as RoomName) - ROOM_NAMES.indexOf(b.room_name as RoomName)
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-2xl font-semibold text-gray-600">Loading gym data...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-2 px-2 sm:py-4 sm:px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-3 sm:mb-4">
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900 mb-1">
            Berkeley RSF Gym Capacity Tracker
          </h1>
          <p className="text-xs sm:text-sm text-gray-600" suppressHydrationWarning>
            Last updated: {currentData.length > 0 ? format(new Date(currentData[0].created_at), 'h:mm a') : '--'}
          </p>
        </div>

        {/* Current Capacity Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3 mb-3 sm:mb-4">
          {sortedCurrentData.map((room) => {
            const roomInfo = ROOMS[room.room_name as RoomName]
            const percentage = room.percentage
            const status = percentage >= 80 ? 'busy' : percentage > 50 ? 'moderate' : 'available'
            
            return (
              <div
                key={room.room_name}
                className="bg-white rounded-lg shadow-md p-3 sm:p-4 hover:shadow-lg transition-all duration-500"
                style={{ borderTop: `4px solid ${roomInfo?.color || '#gray'}` }}
              >
                <h3 className="text-xs sm:text-sm font-semibold text-gray-800 mb-1">
                  {roomInfo?.displayName || room.room_name}
                </h3>
                <div className="text-xl sm:text-2xl font-bold mb-1 transition-all duration-500" style={{ color: roomInfo?.color }}>
                  {room.count}/{roomInfo?.maxCapacity || 0}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg sm:text-xl font-semibold text-gray-700 transition-all duration-500">
                    {percentage.toFixed(1)}%
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium transition-all duration-300 ${
                    status === 'busy' ? 'bg-red-100 text-red-800' :
                    status === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {status === 'busy' ? 'Busy' :
                     status === 'moderate' ? 'Moderate' :
                     'Available'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Controls Row */}
        <div className="mb-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-0">
          {/* Time Range Selector */}
          <div className="flex gap-1.5 sm:gap-2">
            {[6, 12, 24, 48].map((hours) => (
              <button
                key={hours}
                onClick={() => setTimeRange(hours)}
                className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  timeRange === hours
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 shadow-sm'
                }`}
              >
                {hours}h
              </button>
            ))}
          </div>

          {/* Room Toggles */}
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {ROOM_NAMES.map((room) => {
              const roomInfo = ROOMS[room]
              const isVisible = visibleRooms.has(room)
              return (
                <button
                  key={room}
                  onClick={() => toggleRoom(room)}
                  className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all shadow-sm ${
                    isVisible
                      ? 'text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                  style={isVisible ? { backgroundColor: roomInfo.color } : {}}
                >
                  {roomInfo.displayName}
                </button>
              )
            })}
          </div>
        </div>

        {/* Historical Chart */}
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-4">
          <h2 className="text-base sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">
            Capacity Over Time (Last {timeRange} Hours)
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid stroke="#d1d5db" strokeWidth={1} vertical={false} />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 12, fill: '#374151', dy: 14 }}
                ticks={hourlyTicks}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#374151' }}
                ticks={yAxisTicks}
                label={{ value: 'Capacity %', angle: -90, position: 'insideLeft', style: { fontSize: 14, fill: '#374151' } }}
                domain={[0, 100]}
              />
              <Tooltip 
                contentStyle={{ fontSize: 11, color: '#111827', backgroundColor: '#ffffff', border: '1px solid #d1d5db' }}
                formatter={(value: number | undefined) => value != null ? `${value.toFixed(1)}%` : 'N/A'}
              />
              <Legend 
                wrapperStyle={{ fontSize: 14 }}
                iconType="line"
                content={(props) => {
                  return (
                    <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '16px', marginTop: '8px' }}>
                      {ROOM_NAMES.filter(name => visibleRooms.has(name)).map(name => (
                        <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '16px', height: '2px', backgroundColor: ROOMS[name].color }} />
                          <span style={{ fontSize: 14, color: '#374151' }}>{ROOMS[name].displayName}</span>
                        </div>
                      ))}
                    </div>
                  )
                }}
              />
              {ROOM_NAMES.map((name) => {
                const info = ROOMS[name]
                return visibleRooms.has(name) ? (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    name={info.displayName}
                    stroke={info.color}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                    isAnimationActive={true}
                    animationDuration={800}
                    animationEasing="ease-in-out"
                  />
                ) : null
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
