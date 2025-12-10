#!/bin/bash

# Test script for Demo Time Companion API
# This script tests all the available API endpoints

BASE_URL="http://127.0.0.1:42042"

echo "==================================="
echo "Demo Time Companion API Test Script"
echo "==================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    
    echo -n "Testing $name... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✓ PASS${NC}"
        echo "  Response: $body"
    else
        echo -e "${RED}✗ FAIL (HTTP $http_code)${NC}"
        echo "  Response: $body"
    fi
    echo ""
    sleep 0.5
}

# Check if API is running
echo "Checking if API server is running..."
if ! curl -s "$BASE_URL/health" > /dev/null 2>&1; then
    echo -e "${RED}ERROR: API server is not running!${NC}"
    echo "Please start the Demo Time Companion app first."
    exit 1
fi
echo -e "${GREEN}✓ API server is running${NC}"
echo ""

# Test health endpoint
test_endpoint "Health Check" "GET" "/health"

# Test status endpoint
test_endpoint "Status" "GET" "/status"

# Test blur actions
test_endpoint "Blur Toggle" "POST" "/action" '{"action": "blur.toggle"}'
sleep 1
test_endpoint "Blur On" "POST" "/action" '{"action": "blur.on"}'
sleep 1
test_endpoint "Blur Off" "POST" "/action" '{"action": "blur.off"}'

# Test spotlight actions
test_endpoint "Spotlight Toggle" "POST" "/action" '{"action": "spotlight.toggle"}'
sleep 1
test_endpoint "Spotlight On" "POST" "/action" '{"action": "spotlight.on"}'
sleep 1
test_endpoint "Spotlight Off" "POST" "/action" '{"action": "spotlight.off"}'

# Test zoom actions
test_endpoint "Zoom In" "POST" "/action" '{"action": "zoom.in"}'
test_endpoint "Zoom In (again)" "POST" "/action" '{"action": "zoom.in"}'
test_endpoint "Zoom Out" "POST" "/action" '{"action": "zoom.out"}'
test_endpoint "Zoom Set 2.5x" "POST" "/action" '{"action": "zoom.set", "params": {"level": 2.5}}'
test_endpoint "Zoom Reset" "POST" "/action" '{"action": "zoom.reset"}'

# Test message actions
test_endpoint "Show Message" "POST" "/action" '{"action": "message.show", "params": {"text": "Test Message from API"}}'
sleep 2
test_endpoint "Hide Message" "POST" "/action" '{"action": "message.hide"}'

# Test invalid action
test_endpoint "Invalid Action" "POST" "/action" '{"action": "invalid.action"}'

echo "==================================="
echo "All tests completed!"
echo "==================================="
