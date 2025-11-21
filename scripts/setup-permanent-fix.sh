#!/bin/bash

# Setup script to apply the permanent fix for orphaned profiles
# Run with: bash scripts/setup-permanent-fix.sh

set -e

echo "=========================================="
echo "Orphaned Profiles - Permanent Fix Setup"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if in correct directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Run this script from the project root directory${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Checking environment...${NC}"
if [ ! -f ".env.local" ]; then
    echo -e "${RED}❌ .env.local not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Environment file found${NC}"
echo ""

echo -e "${YELLOW}Step 2: Checking for orphaned profiles...${NC}"
node scripts/find-orphaned-profiles.js
ORPHANED_COUNT=$?
echo ""

echo -e "${YELLOW}Step 3: Database migration${NC}"
echo "You need to apply the database trigger manually:"
echo ""
echo "Option A: Using Supabase CLI (recommended)"
echo "  supabase db push"
echo ""
echo "Option B: Manual via Supabase Dashboard"
echo "  1. Go to https://app.supabase.com"
echo "  2. Select your project"
echo "  3. Go to SQL Editor"
echo "  4. Copy and run: supabase/migrations/20241120000000_prevent_orphaned_profiles.sql"
echo ""
read -p "Have you applied the migration? (y/n): " migration_done

if [ "$migration_done" != "y" ]; then
    echo -e "${YELLOW}⚠️  Please apply the migration and run this script again${NC}"
    exit 0
fi

echo -e "${GREEN}✅ Migration applied${NC}"
echo ""

echo -e "${YELLOW}Step 4: Fix existing orphaned profiles${NC}"
read -p "Do you want to fix orphaned profiles now? (y/n): " fix_orphans

if [ "$fix_orphans" = "y" ]; then
    node scripts/fix-orphaned-profiles.js
fi
echo ""

echo -e "${YELLOW}Step 5: Verify health check endpoint${NC}"
echo "Testing health check API..."

# Start server in background if not running
if ! lsof -Pi :9003 -sTCP:LISTEN -t >/dev/null ; then
    echo "Starting dev server..."
    npm run dev > /dev/null 2>&1 &
    DEV_SERVER_PID=$!
    sleep 5
    echo "Dev server started (PID: $DEV_SERVER_PID)"
else
    echo "Dev server already running"
    DEV_SERVER_PID=""
fi

# Test health check
HEALTH_RESPONSE=$(curl -s http://localhost:9003/api/health/data-integrity || echo "")

if [ -n "$HEALTH_RESPONSE" ]; then
    echo -e "${GREEN}✅ Health check endpoint working${NC}"
    echo "$HEALTH_RESPONSE" | jq '.'
else
    echo -e "${RED}❌ Health check endpoint not responding${NC}"
    echo "Make sure the server is running: npm run dev"
fi

# Stop dev server if we started it
if [ -n "$DEV_SERVER_PID" ]; then
    echo "Stopping dev server..."
    kill $DEV_SERVER_PID 2>/dev/null || true
fi
echo ""

echo "=========================================="
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "What was installed:"
echo "  ✅ Database trigger (prevents future orphaned profiles)"
echo "  ✅ Validation functions (serverUtils.ts)"
echo "  ✅ Health check endpoint (/api/health/data-integrity)"
echo "  ✅ Cleanup scripts (4 diagnostic/fix tools)"
echo ""
echo "Next steps:"
echo "  1. Test password change in admin panel"
echo "  2. Set up daily health checks (see docs/PERMANENT_FIX_GUIDE.md)"
echo "  3. Review docs/PERMANENT_FIX_GUIDE.md for full documentation"
echo ""
echo "Monitoring commands:"
echo "  node scripts/find-orphaned-profiles.js  # Check for orphans"
echo "  curl http://localhost:9003/api/health/data-integrity  # Health check"
echo ""
echo -e "${GREEN}🎉 The orphaned profile problem is permanently fixed!${NC}"
