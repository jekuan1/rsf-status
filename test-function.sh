#!/bin/bash

# Quick test script for the gym-scraper Edge Function
# Make sure Supabase is running with `supabase start`

echo "Testing gym-scraper Edge Function..."
echo ""

curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/gym-scraper' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

echo ""
echo ""
echo "To follow function logs, run:"
echo "  supabase functions logs gym-scraper --follow"
