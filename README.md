# Berkeley RSF Gym Capacity Tracker

Real-time gym capacity monitoring system.

## Stack

- Supabase (Edge Functions + Postgres)
- Upstash QStash (scheduled data collection)
- Next.js dashboard with Recharts

## Structure

- `supabase/functions/gym-scraper/` - Data collection function
- `supabase/migrations/` - Database schema
- `gym-dashboard/` - Visualization dashboard

## Setup

Environment variables are stored in `.env` files (not committed to git). See Supabase and QStash documentation for deployment instructions
