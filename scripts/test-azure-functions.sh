#!/bin/bash

# Test Azure Functions Locally
# This script tests the Azure Functions endpoints to ensure they're working

set -e

echo "🧪 Testing Azure Functions locally..."

# Wait for Functions to be ready
echo "⏳ Waiting for Azure Functions to be ready..."
sleep 5

# Test negotiate endpoint
echo "🔍 Testing negotiate endpoint..."
NEGOTIATE_RESPONSE=$(curl -s -X POST http://localhost:7071/api/negotiate \
  -H "Content-Type: application/json" \
  -d '{"pollId":"test-poll","userId":"test-user"}')

if [ $? -eq 0 ]; then
    echo "✅ Negotiate endpoint working: $NEGOTIATE_RESPONSE"
else
    echo "❌ Negotiate endpoint failed"
    exit 1
fi

# Test vote endpoint
echo "🔍 Testing vote endpoint..."
VOTE_RESPONSE=$(curl -s -X POST http://localhost:7071/api/vote \
  -H "Content-Type: application/json" \
  -d '{"pollId":"test-poll","userId":"test-user","optionId":"option1","tokens":5}')

if [ $? -eq 0 ]; then
    echo "✅ Vote endpoint working: $VOTE_RESPONSE"
else
    echo "❌ Vote endpoint failed"
    exit 1
fi

# Test presence endpoint
echo "🔍 Testing presence endpoint..."
PRESENCE_RESPONSE=$(curl -s -X POST http://localhost:7071/api/presence \
  -H "Content-Type: application/json" \
  -d '{"pollId":"test-poll","clientId":"test-client","displayName":"Test User"}')

if [ $? -eq 0 ]; then
    echo "✅ Presence endpoint working: $PRESENCE_RESPONSE"
else
    echo "❌ Presence endpoint failed"
    exit 1
fi

echo "🎉 All Azure Functions tests passed!"

