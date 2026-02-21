-- Create gym_logs table for tracking gym capacity over time
CREATE TABLE IF NOT EXISTS gym_logs (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  room_name TEXT NOT NULL,
  count INTEGER NOT NULL,
  percentage NUMERIC(5, 2) NOT NULL
);

-- Create index on created_at for faster time-based queries
CREATE INDEX IF NOT EXISTS idx_gym_logs_created_at ON gym_logs(created_at DESC);

-- Create index on room_name for filtered queries
CREATE INDEX IF NOT EXISTS idx_gym_logs_room_name ON gym_logs(room_name);

-- Enable Row Level Security (optional, recommended for production)
ALTER TABLE gym_logs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role to insert (Edge Functions use service role)
CREATE POLICY "Enable insert for service role" ON gym_logs
  FOR INSERT
  WITH CHECK (true);

-- Create policy to allow authenticated users to read
CREATE POLICY "Enable read access for authenticated users" ON gym_logs
  FOR SELECT
  USING (true);
