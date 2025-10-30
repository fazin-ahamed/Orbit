#!/bin/bash

echo "🚀 BusinessOS Supabase Setup Script"
echo "=================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop and try again."
    echo ""
    echo "To start Docker Desktop:"
    echo "1. Open Docker Desktop application"
    echo "2. Wait for it to fully start"
    echo "3. Run this script again"
    exit 1
fi

echo "✅ Docker is running"

# Check if Supabase is already running
if docker ps | grep -q supabase; then
    echo "✅ Supabase is already running"
else
    echo "🔄 Starting Supabase..."
    npx supabase start

    if [ $? -eq 0 ]; then
        echo "✅ Supabase started successfully"
    else
        echo "❌ Failed to start Supabase"
        exit 1
    fi
fi

# Get Supabase status
echo ""
echo "📊 Supabase Status:"
npx supabase status

echo ""
echo "🔗 Supabase URLs:"
echo "Local URL: http://localhost:54321"
echo "Studio: http://localhost:54323"
echo "API URL: http://localhost:54321/rest/v1/"
echo "Database URL: postgresql://postgres:postgres@localhost:54321/postgres"

echo ""
echo "📝 Environment variables to add to .env:"
echo "USE_SUPABASE=true"
echo "SUPABASE_URL=http://localhost:54321"
echo "SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
echo "SUPABASE_DB_PASSWORD=postgres"
echo "SUPABASE_DATABASE_URL=postgresql://postgres:postgres@localhost:54321/postgres"

echo ""
echo "🎯 Next steps:"
echo "1. Update your .env file with the variables above"
echo "2. Run: npm run migrate"
echo "3. Run: npm run dev"
echo "4. Test: curl http://localhost:3000/api/database/health"

echo ""
echo "🔧 Useful commands:"
echo "npx supabase stop    # Stop Supabase"
echo "npx supabase status  # Check status"
echo "npx supabase restart # Restart Supabase"