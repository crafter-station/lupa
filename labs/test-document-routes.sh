#!/bin/bash

# Test script to verify document routing works correctly
# This assumes you have a valid project and API key

PROJECT_ID="i2yy7npzlh"
API_KEY="lupa_sk_i2yy7npzlh_6f0umliZ0PhfZROyhhF6iHngRMOu1knY"
BASE_URL="http://${PROJECT_ID}.localhost:3000"

echo "Testing Document Routes..."
echo "=========================="
echo ""

# Test 1: Base documents route (list/create)
echo "1. Testing base route: GET /api/documents"
curl -s -X GET \
  "${BASE_URL}/api/documents" \
  -H "Authorization: Bearer ${API_KEY}" \
  | jq -r '.error.code // "SUCCESS"'
echo ""

# Test 2: Specific document by ID
echo "2. Testing document by ID: GET /api/documents/doc_123"
curl -s -X GET \
  "${BASE_URL}/api/documents/doc_123" \
  -H "Authorization: Bearer ${API_KEY}" \
  | jq -r '.error.code // "SUCCESS"'
echo ""

# Test 3: Bulk route
echo "3. Testing bulk route: POST /api/documents/bulk"
curl -s -X POST \
  "${BASE_URL}/api/documents/bulk" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"documents":[]}' \
  | jq -r '.error.code // "SUCCESS"'
echo ""

echo "=========================="
echo "Tests completed!"
